from typing import List

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db import get_db
from models.models import (
    Category,
    Part,
    Procedure,
    ProcedureExecution,
    ProcedureField,
    ProcedureFieldValue,
    User,
    Vendor,
    WorkOrder,
    WorkOrderPart,
)
from routes.auth import get_current_user
from pydantic_schema.request import WorkOrderCreate, WorkOrderUpdate
from pydantic_schema.response import WorkOrderOut

router = APIRouter(prefix="/work-orders", tags=["work_orders"])


@router.post("", response_model=WorkOrderOut, status_code=status.HTTP_201_CREATED)
def create_work_order(payload: WorkOrderCreate, db: Session = Depends(get_db)):
    data = payload.model_dump(exclude={"category_ids", "parts"})

    if payload.vendor_id is not None:
        vendor = db.query(Vendor).filter(Vendor.id == payload.vendor_id).first()
        if not vendor:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vendor not found")

    if payload.procedure_id is not None:
        procedure = db.query(Procedure).filter(Procedure.id == payload.procedure_id).first()
        if not procedure:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Procedure not found")

    if payload.assigned_user_id is not None:
        assignee = db.query(User).filter(User.id == payload.assigned_user_id).first()
        if not assignee:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned user not found")

    work_order = WorkOrder(**data)

    if payload.category_ids:
        categories = db.query(Category).filter(Category.id.in_(payload.category_ids)).all()
        if len(categories) != len(set(payload.category_ids)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more categories not found",
            )
        work_order.categories = categories

    if payload.parts:
        part_ids = payload.parts
        parts = db.query(Part).filter(Part.id.in_(part_ids)).all()
        if len(parts) != len(set(part_ids)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more parts not found",
            )

        work_order.work_order_parts = [WorkOrderPart(part_id=part_id, quantity=1) for part_id in part_ids]

    db.add(work_order)
    db.commit()
    db.refresh(work_order)
    return work_order


@router.get("", response_model=List[WorkOrderOut])
def list_work_orders(db: Session = Depends(get_db)):
    return db.query(WorkOrder).order_by(WorkOrder.id.desc()).all()


@router.get("/due-today", response_model=List[WorkOrderOut])
def work_orders_due_today(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    today = date.today()
    return (
        db.query(WorkOrder)
        .filter(WorkOrder.assigned_user_id == current_user.id)
        .filter(WorkOrder.due_date == today)
        .order_by(WorkOrder.id.desc())
        .all()
    )


@router.get("/{work_order_id}", response_model=WorkOrderOut)
def get_work_order(work_order_id: int, db: Session = Depends(get_db)):
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")
    return work_order


@router.get("/{work_order_id}/procedure-progress")
def work_order_procedure_progress(
    work_order_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")

    procedure_id = work_order.procedure_id
    if not procedure_id:
        return {"completed": 0, "total": 0}

    total = db.query(ProcedureField).join(ProcedureField.section).join(Procedure).filter(Procedure.id == procedure_id).count()

    execution = (
        db.query(ProcedureExecution)
        .filter(ProcedureExecution.work_order_id == work_order.id)
        .filter(ProcedureExecution.procedure_id == procedure_id)
        .order_by(ProcedureExecution.id.desc())
        .first()
    )

    if not execution:
        return {"completed": 0, "total": total}

    rows = (
        db.query(ProcedureFieldValue, ProcedureField)
        .join(ProcedureField, ProcedureField.id == ProcedureFieldValue.field_id)
        .filter(ProcedureFieldValue.execution_id == execution.id)
        .all()
    )

    completed = 0
    for fv, f in rows:
        t = (getattr(f, "field_type", "") or "").strip().lower()
        v = (getattr(fv, "value", None) or "").strip()
        if t in {"checkbox", "check"}:
            if v.lower() in {"true", "1", "yes", "y"}:
                completed += 1
        else:
            if v:
                completed += 1

    if completed > total:
        completed = total

    return {"completed": completed, "total": total}


@router.patch("/{work_order_id}", response_model=WorkOrderOut)
def update_work_order(work_order_id: int, payload: WorkOrderUpdate, db: Session = Depends(get_db)):
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")

    data = payload.model_dump(exclude_unset=True, exclude={"category_ids", "parts"})
    for k, v in data.items():
        setattr(work_order, k, v)

    if payload.vendor_id is not None:
        vendor = db.query(Vendor).filter(Vendor.id == payload.vendor_id).first()
        if not vendor:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vendor not found")

    if payload.procedure_id is not None:
        procedure = db.query(Procedure).filter(Procedure.id == payload.procedure_id).first()
        if not procedure:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Procedure not found")

    if payload.assigned_user_id is not None:
        assignee = db.query(User).filter(User.id == payload.assigned_user_id).first()
        if not assignee:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned user not found")

    if payload.category_ids is not None:
        categories = (
            db.query(Category).filter(Category.id.in_(payload.category_ids)).all()
            if payload.category_ids
            else []
        )
        if len(categories) != len(set(payload.category_ids or [])):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more categories not found",
            )
        work_order.categories = categories

    if payload.parts is not None:
        if payload.parts:
            part_ids = payload.parts
            parts = db.query(Part).filter(Part.id.in_(part_ids)).all()
            if len(parts) != len(set(part_ids)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="One or more parts not found",
                )

            work_order.work_order_parts = [WorkOrderPart(part_id=part_id, quantity=1) for part_id in part_ids]
        else:
            work_order.work_order_parts = []

    db.commit()
    db.refresh(work_order)
    return work_order


@router.delete("/{work_order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_work_order(work_order_id: int, db: Session = Depends(get_db)):
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")

    db.delete(work_order)
    db.commit()
    return None
