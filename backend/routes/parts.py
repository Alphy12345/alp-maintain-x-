from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db import get_db
from models.models import Part
from pydantic_schema.request import PartCreate, PartUpdate
from pydantic_schema.response import PartOut

router = APIRouter(prefix="/parts", tags=["parts"])


@router.post("", response_model=PartOut, status_code=status.HTTP_201_CREATED)
def create_part(payload: PartCreate, db: Session = Depends(get_db)):
    part = Part(**payload.model_dump())
    db.add(part)
    db.commit()
    db.refresh(part)
    return part


@router.get("", response_model=List[PartOut])
def list_parts(db: Session = Depends(get_db)):
    return db.query(Part).order_by(Part.id.desc()).all()


@router.get("/{part_id}", response_model=PartOut)
def get_part(part_id: int, db: Session = Depends(get_db)):
    part = db.query(Part).filter(Part.id == part_id).first()
    if not part:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Part not found")
    return part


@router.patch("/{part_id}", response_model=PartOut)
def update_part(part_id: int, payload: PartUpdate, db: Session = Depends(get_db)):
    part = db.query(Part).filter(Part.id == part_id).first()
    if not part:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Part not found")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(part, k, v)

    db.commit()
    db.refresh(part)
    return part


@router.delete("/{part_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_part(part_id: int, db: Session = Depends(get_db)):
    part = db.query(Part).filter(Part.id == part_id).first()
    if not part:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Part not found")

    db.delete(part)
    db.commit()
    return None
