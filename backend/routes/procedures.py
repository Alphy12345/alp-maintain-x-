from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from db import get_db
from models.models import Procedure, ProcedureSection, ProcedureField
from pydantic_schema.request import ProcedureCreate, ProcedureUpdate
from pydantic_schema.response import ProcedureOut

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
