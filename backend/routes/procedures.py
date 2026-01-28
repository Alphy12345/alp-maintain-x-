from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from db import get_db
from datetime import date, datetime

from models.models import Procedure, ProcedureExecution, ProcedureField, ProcedureFieldValue, ProcedureSection, User, WorkOrder
from routes.auth import get_current_user
from pydantic_schema.request import ProcedureCreate, ProcedureSaveRequest, ProcedureUpdate
from pydantic_schema.response import ProcedureOut
from events import publish_output_data_event

router = APIRouter(prefix="/procedures", tags=["procedures"])


@router.post("", response_model=ProcedureOut, status_code=status.HTTP_201_CREATED)
def create_procedure(payload: ProcedureCreate, db: Session = Depends(get_db)):
    procedure = Procedure(
        name=payload.name,
        description=payload.description,
        asset_id=payload.asset_id,
    )

    for section_in in payload.sections:
        section = ProcedureSection(
            title=section_in.title,
            description=section_in.description,
            order=section_in.order,
        )

        for field_in in section_in.fields:
            field = ProcedureField(
                label=field_in.label,
                field_type=field_in.field_type,
                order=field_in.order,
                required=field_in.required,
                help_text=field_in.help_text,
                config=field_in.config,
            )
            section.fields.append(field)

        procedure.sections.append(section)

    db.add(procedure)
    db.commit()
    db.refresh(procedure)
    return procedure


@router.post("/save", status_code=status.HTTP_200_OK)
def save_procedure_values(
    payload: ProcedureSaveRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    work_order = db.query(WorkOrder).filter(WorkOrder.id == payload.work_order_id).first()
    if not work_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")

    procedure_id = payload.procedure_id or work_order.procedure_id
    if not procedure_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No procedure assigned to this work order")

    asset_id = work_order.asset_id
    if not asset_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No asset assigned to this work order")

    next_status = (payload.status or "in_progress").strip().lower()

    execution = (
        db.query(ProcedureExecution)
        .filter(ProcedureExecution.work_order_id == work_order.id)
        .filter(ProcedureExecution.procedure_id == procedure_id)
        .filter(ProcedureExecution.status != "completed")
        .order_by(ProcedureExecution.id.desc())
        .first()
    )

    if not execution:
        execution = ProcedureExecution(
            work_order_id=work_order.id,
            procedure_id=procedure_id,
            asset_id=asset_id,
            performed_by=current_user.id,
            performed_at=date.today(),
            status="in_progress" if next_status in {"in_progress", "in progress"} else next_status,
            started_at=datetime.utcnow(),
        )
        db.add(execution)
        db.commit()
        db.refresh(execution)
    else:
        execution.status = "in_progress" if next_status in {"in_progress", "in progress"} else next_status
        execution.performed_by = current_user.id
        execution.performed_at = execution.performed_at or date.today()
        if not execution.started_at:
            execution.started_at = datetime.utcnow()
        db.commit()

    if next_status in {"completed", "done"}:
        if not execution.completed_at:
            execution.completed_at = datetime.utcnow()
        if execution.started_at and not execution.duration_seconds:
            execution.duration_seconds = int((execution.completed_at - execution.started_at).total_seconds())
        execution.status = "completed"
        db.commit()

        wo = db.query(WorkOrder).filter(WorkOrder.id == execution.work_order_id).first() if execution.work_order_id else None
        proc = db.query(Procedure).filter(Procedure.id == execution.procedure_id).first() if execution.procedure_id else None
        user = db.query(User).filter(User.id == execution.performed_by).first() if execution.performed_by else None
        rows = (
            db.query(ProcedureFieldValue, ProcedureField)
            .join(ProcedureField, ProcedureField.id == ProcedureFieldValue.field_id)
            .filter(ProcedureFieldValue.execution_id == execution.id)
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
                "execution_id": execution.id,
                "work_order_id": execution.work_order_id,
                "work_order_name": wo.name if wo else None,
                "procedure_id": execution.procedure_id,
                "procedure_name": proc.name if proc else None,
                "performed_by": execution.performed_by,
                "performed_by_name": user.user_name if user else None,
                "status": execution.status,
                "performed_at": execution.performed_at.isoformat() if execution.performed_at else None,
                "fields": fields,
            }
        )

    saved = 0
    for item in payload.values or []:
        field = db.query(ProcedureField).filter(ProcedureField.id == item.field_id).first()
        if not field:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Field not found: {item.field_id}")

        existing = (
            db.query(ProcedureFieldValue)
            .filter(ProcedureFieldValue.execution_id == execution.id)
            .filter(ProcedureFieldValue.field_id == item.field_id)
            .first()
        )

        if not existing:
            existing = ProcedureFieldValue(execution_id=execution.id, field_id=item.field_id, value=item.value)
            db.add(existing)
        else:
            existing.value = item.value

        saved += 1

    db.commit()

    return {"execution_id": execution.id, "saved": saved, "status": execution.status}


@router.get("/saved-values/{work_order_id}")
def get_saved_values(
    work_order_id: int,
    procedure_id: int | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")

    pid = procedure_id or work_order.procedure_id
    if not pid:
        return {"execution_id": None, "values": {}}

    execution = (
        db.query(ProcedureExecution)
        .filter(ProcedureExecution.work_order_id == work_order.id)
        .filter(ProcedureExecution.procedure_id == pid)
        .order_by(ProcedureExecution.id.desc())
        .first()
    )

    if not execution:
        return {"execution_id": None, "values": {}}

    field_values = db.query(ProcedureFieldValue).filter(ProcedureFieldValue.execution_id == execution.id).all()
    values = {str(fv.field_id): (fv.value or "") for fv in field_values}
    return {"execution_id": execution.id, "values": values}


@router.get("", response_model=List[ProcedureOut])
def list_procedures(db: Session = Depends(get_db)):
    return (
        db.query(Procedure)
        .options(selectinload(Procedure.sections).selectinload(ProcedureSection.fields))
        .order_by(Procedure.id.desc())
        .all()
    )


@router.get("/{procedure_id}", response_model=ProcedureOut)
def get_procedure(procedure_id: int, db: Session = Depends(get_db)):
    procedure = (
        db.query(Procedure)
        .options(selectinload(Procedure.sections).selectinload(ProcedureSection.fields))
        .filter(Procedure.id == procedure_id)
        .first()
    )
    if not procedure:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Procedure not found")
    return procedure


@router.patch("/{procedure_id}", response_model=ProcedureOut)
def update_procedure(procedure_id: int, payload: ProcedureUpdate, db: Session = Depends(get_db)):
    procedure = db.query(Procedure).filter(Procedure.id == procedure_id).first()
    if not procedure:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Procedure not found")

    data = payload.model_dump(exclude_unset=True, exclude={"sections"})
    for k, v in data.items():
        setattr(procedure, k, v)

    if payload.sections is not None:
        procedure.sections = []

        for section_in in payload.sections:
            section = ProcedureSection(
                title=section_in.title,
                description=section_in.description,
                order=section_in.order,
            )

            for field_in in section_in.fields:
                field = ProcedureField(
                    label=field_in.label,
                    field_type=field_in.field_type,
                    order=field_in.order,
                    required=field_in.required,
                    help_text=field_in.help_text,
                    config=field_in.config,
                )
                section.fields.append(field)

            procedure.sections.append(section)

    db.commit()

    return (
        db.query(Procedure)
        .options(selectinload(Procedure.sections).selectinload(ProcedureSection.fields))
        .filter(Procedure.id == procedure_id)
        .first()
    )


@router.delete("/{procedure_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_procedure(procedure_id: int, db: Session = Depends(get_db)):
    procedure = db.query(Procedure).filter(Procedure.id == procedure_id).first()
    if not procedure:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Procedure not found")

    db.delete(procedure)
    db.commit()
    return None
