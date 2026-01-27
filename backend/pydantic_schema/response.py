from __future__ import annotations

from datetime import date
from typing import List, Optional

from pydantic import BaseModel


class VendorOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class TeamUserOut(BaseModel):
    id: int
    team_id: int
    user_id: int

    class Config:
        from_attributes = True


class UserOut(BaseModel):
    id: int
    user_name: str
    role: Optional[str] = None

    class Config:
        from_attributes = True


class AuthTokenOut(BaseModel):
    token: str
    token_type: str = "bearer"
    user_id: int
    user_name: str


class CategoryOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class AssetOut(BaseModel):
    id: int
    asset_name: str
    location: Optional[str] = None
    criticality: Optional[str] = None
    description: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    model_serial_no: Optional[str] = None
    year: Optional[int] = None
    asset_type: Optional[str] = None
    status: str
    vendor_id: Optional[int] = None

    class Config:
        from_attributes = True


class PartOut(BaseModel):
    id: int
    name: str
    units_in_stock: Optional[int] = None
    minimum_in_stock: Optional[int] = None
    unit_cost: Optional[float] = None
    description: Optional[str] = None
    part_type: Optional[str] = None
    location: Optional[str] = None
    vendor_id: Optional[int] = None

    class Config:
        from_attributes = True


class WorkOrderPartOut(BaseModel):
    part_id: int
    quantity: int
    part: Optional[PartOut] = None

    class Config:
        from_attributes = True


class TeamOut(BaseModel):
    id: int
    team_name: str
    description: Optional[str] = None
    users: List[UserOut] = []

    class Config:
        from_attributes = True


class WorkOrderOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    estimated_time_hours: Optional[int] = None
    estimated_time_minutes: Optional[int] = None
    due_date: Optional[date] = None
    start_date: Optional[date] = None
    recurrence: Optional[str] = None
    work_type: Optional[str] = None
    priority: Optional[str] = None
    status: str
    location: Optional[str] = None
    team_id: Optional[int] = None
    asset_id: Optional[int] = None
    assigned_user_id: Optional[int] = None
    vendor_id: Optional[int] = None
    procedure_id: Optional[int] = None
    assigned_user: Optional[UserOut] = None
    vendor: Optional[VendorOut] = None
    procedure: Optional["ProcedureOut"] = None
    categories: List[CategoryOut] = []
    parts: List[PartOut] = []
    work_order_parts: List[WorkOrderPartOut] = []

    class Config:
        from_attributes = True


class ProcedureFieldOut(BaseModel):
    id: int
    label: str
    field_type: str
    order: int
    required: int
    help_text: Optional[str] = None
    config: Optional[str] = None

    class Config:
        from_attributes = True


class ProcedureSectionOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    order: int
    fields: List[ProcedureFieldOut] = []

    class Config:
        from_attributes = True


class ProcedureOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    asset_id: int
    sections: List[ProcedureSectionOut] = []

    class Config:
        from_attributes = True
