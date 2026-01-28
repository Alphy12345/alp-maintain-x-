from typing import List

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from db import get_db
from models.models import (
    Category,
    Part,
    Procedure,
    ProcedureExecution,
    ProcedureField,
    ProcedureFieldValue,
    TeamUser,
    User,
    Vendor,
    WorkOrder,
    WorkOrderPart,
)
from routes.auth import get_optional_current_user
from pydantic_schema.request import WorkOrderCreate, WorkOrderUpdate
from pydantic_schema.response import WorkOrderOut
from events import publish_work_order_event
from events import publish_output_data_event

router = APIRouter(prefix="/work-orders", tags=["work_orders"])


def _work_order_scope_filter(db: Session, current_user: User | None):
    if not current_user:
        return None

    if (current_user.role or "").strip().lower() == "admin":
        return None

    team_ids = [
        row[0]
        for row in db.query(TeamUser.team_id)
        .filter(TeamUser.user_id == current_user.id)
        .all()
    ]

    return or_(WorkOrder.assigned_user_id == current_user.id, WorkOrder.team_id.in_(team_ids or [-1]))


def _require_work_order_access(db: Session, current_user: User | None, work_order: WorkOrder):
    if not work_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")

    if not current_user:
        return

    if (current_user.role or "").strip().lower() == "admin":
        return

    scope = _work_order_scope_filter(db, current_user)
    allowed = (
        db.query(WorkOrder.id)
        .filter(WorkOrder.id == work_order.id)
        .filter(scope)
        .first()
        is not None
    )
    if not allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this work order")


@router.post("", response_model=WorkOrderOut, status_code=status.HTTP_201_CREATED)
def create_work_order(
    payload: WorkOrderCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_current_user),
):
    if current_user and (current_user.role or "").strip().lower() != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

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
    publish_work_order_event("created", work_order.id)
    return work_order


@router.get("", response_model=List[WorkOrderOut])
def list_work_orders(
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_current_user),
):
    q = db.query(WorkOrder)
    scope = _work_order_scope_filter(db, current_user)
    if scope is not None:
        q = q.filter(scope)
    return q.order_by(WorkOrder.id.desc()).all()


@router.get("/due-today", response_model=List[WorkOrderOut])
def work_orders_due_today(
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_current_user),
):
    today = date.today()
    q = db.query(WorkOrder).filter(WorkOrder.due_date == today)
    scope = _work_order_scope_filter(db, current_user)
    if scope is not None:
        q = q.filter(scope)
    return q.order_by(WorkOrder.id.desc()).all()


@router.get("/{work_order_id}", response_model=WorkOrderOut)
def get_work_order(
    work_order_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_current_user),
):
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    _require_work_order_access(db, current_user, work_order)
    return work_order


@router.get("/{work_order_id}/procedure-progress")
def work_order_procedure_progress(
    work_order_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_current_user),
):
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    _require_work_order_access(db, current_user, work_order)

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
def update_work_order(
    work_order_id: int,
    payload: WorkOrderUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_current_user),
):
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    _require_work_order_access(db, current_user, work_order)

    prev_status = (work_order.status or "").strip().lower() if work_order else ""

    if current_user and (current_user.role or "").strip().lower() != "admin":
        data_keys = set(payload.model_dump(exclude_unset=True).keys())
        allowed_keys = {"status"}
        if not data_keys.issubset(allowed_keys):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    data = payload.model_dump(exclude_unset=True, exclude={"category_ids", "parts"})
    for k, v in data.items():
        setattr(work_order, k, v)

    next_status = (work_order.status or "").strip().lower()
    is_now_done = next_status in {"done", "completed"}
    was_done = prev_status in {"done", "completed"}

    output_execution_id = None
    if is_now_done and not was_done and work_order.procedure_id:
        execution = (
            db.query(ProcedureExecution)
            .filter(ProcedureExecution.work_order_id == work_order.id)
            .filter(ProcedureExecution.procedure_id == work_order.procedure_id)
            .filter(ProcedureExecution.status != "completed")
            .order_by(ProcedureExecution.id.desc())
            .first()
        )
        if execution:
            now = datetime.utcnow()
            if not execution.started_at:
                execution.started_at = now
            if not execution.completed_at:
                execution.completed_at = now
            if execution.started_at and not execution.duration_seconds:
                execution.duration_seconds = int((execution.completed_at - execution.started_at).total_seconds())
            execution.status = "completed"
            output_execution_id = execution.id

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
    publish_work_order_event("updated", work_order.id)

    if output_execution_id:
        ex = db.query(ProcedureExecution).filter(ProcedureExecution.id == output_execution_id).first()
        if ex:
            proc = db.query(Procedure).filter(Procedure.id == ex.procedure_id).first() if ex.procedure_id else None
            user = db.query(User).filter(User.id == ex.performed_by).first() if ex.performed_by else None
            rows = (
                db.query(ProcedureFieldValue, ProcedureField)
                .join(ProcedureField, ProcedureField.id == ProcedureFieldValue.field_id)
                .filter(ProcedureFieldValue.execution_id == ex.id)
                .all()
            )
            fields = [
                {
                    "field_id": f.id,
                    "label": f.label,
                    "field_type": f.field_type,
                    "value": (fv.value or ""),
                }
                for fv, f in rows
            ]
            publish_output_data_event(
                {
                    "execution_id": ex.id,
                    "work_order_id": ex.work_order_id,
                    "work_order_name": work_order.name if work_order else None,
                    "procedure_id": ex.procedure_id,
                    "procedure_name": proc.name if proc else None,
                    "performed_by": ex.performed_by,
                    "performed_by_name": user.user_name if user else None,
                    "status": ex.status,
                    "performed_at": ex.performed_at.isoformat() if ex.performed_at else None,
                    "fields": fields,
                }
            )
    return work_order


@router.delete("/{work_order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_work_order(
    work_order_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_current_user),
):
    if current_user and (current_user.role or "").strip().lower() != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")

    deleted_id = work_order.id
    db.delete(work_order)
    db.commit()
    publish_work_order_event("deleted", deleted_id)
    return None
