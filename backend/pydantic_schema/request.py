from datetime import date
from typing import List, Optional

from pydantic import BaseModel


class VendorCreate(BaseModel):
    name: str


class VendorUpdate(BaseModel):
    name: Optional[str] = None


class AssetCreate(BaseModel):
    asset_name: str
    location: Optional[str] = None
    criticality: Optional[str] = None
    description: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    model_serial_no: Optional[str] = None
    year: Optional[int] = None
    asset_type: Optional[str] = None
    status: Optional[str] = "running"
    vendor_id: Optional[int] = None


class AssetUpdate(BaseModel):
    asset_name: Optional[str] = None
    location: Optional[str] = None
    criticality: Optional[str] = None
    description: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    model_serial_no: Optional[str] = None
    year: Optional[int] = None
    asset_type: Optional[str] = None
    status: Optional[str] = None
    vendor_id: Optional[int] = None


class PartCreate(BaseModel):
    name: str
    units_in_stock: Optional[int] = None
    minimum_in_stock: Optional[int] = None
    unit_cost: Optional[float] = None
    description: Optional[str] = None
    part_type: Optional[str] = None
    location: Optional[str] = None
    vendor_id: Optional[int] = None


class PartUpdate(BaseModel):
    name: Optional[str] = None
    units_in_stock: Optional[int] = None
    minimum_in_stock: Optional[int] = None
    unit_cost: Optional[float] = None
    description: Optional[str] = None
    part_type: Optional[str] = None
    location: Optional[str] = None
    vendor_id: Optional[int] = None


class TeamCreate(BaseModel):
    team_name: str
    description: Optional[str] = None


class TeamUpdate(BaseModel):
    team_name: Optional[str] = None
    description: Optional[str] = None


class LocationCreate(BaseModel):
    name: str
    address: Optional[str] = None
    description: Optional[str] = None
    team_id: Optional[int] = None
    vendor_ids: List[int] = []
    asset_ids: List[int] = []


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    team_id: Optional[int] = None
    vendor_ids: Optional[List[int]] = None
    asset_ids: Optional[List[int]] = None


class UserCreate(BaseModel):
    user_name: str
    password: str
    role: Optional[str] = None


class UserUpdate(BaseModel):
    user_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class TeamUserCreate(BaseModel):
    team_id: int
    user_id: int


class CategoryCreate(BaseModel):
    name: str


class WorkOrderCreate(BaseModel):
    name: str
    description: Optional[str] = None
    estimated_time_hours: Optional[int] = None
    estimated_time_minutes: Optional[int] = None
    due_date: Optional[date] = None
    start_date: Optional[date] = None
    recurrence: Optional[str] = None
    work_type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = "open"
    location: Optional[str] = None
    team_id: Optional[int] = None
    asset_id: Optional[int] = None
    assigned_user_id: Optional[int] = None
    vendor_id: Optional[int] = None
    procedure_id: Optional[int] = None
    category_ids: List[int] = []
    parts: List[int] = []


class WorkOrderUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    estimated_time_hours: Optional[int] = None
    estimated_time_minutes: Optional[int] = None
    due_date: Optional[date] = None
    start_date: Optional[date] = None
    recurrence: Optional[str] = None
    work_type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    location: Optional[str] = None
    team_id: Optional[int] = None
    asset_id: Optional[int] = None
    assigned_user_id: Optional[int] = None
    vendor_id: Optional[int] = None
    procedure_id: Optional[int] = None
    category_ids: Optional[List[int]] = None
    parts: Optional[List[int]] = None


class ProcedureFieldCreate(BaseModel):
    label: str
    field_type: str
    order: int
    required: int = 0
    help_text: Optional[str] = None
    config: Optional[str] = None


class ProcedureSectionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    order: int
    fields: List[ProcedureFieldCreate] = []


class ProcedureCreate(BaseModel):
    name: str
    description: Optional[str] = None
    asset_id: int
    sections: List[ProcedureSectionCreate] = []


class ProcedureUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    asset_id: Optional[int] = None
    sections: Optional[List[ProcedureSectionCreate]] = None


class ProcedureFieldValueIn(BaseModel):
    field_id: int
    value: Optional[str] = None


class ProcedureSaveRequest(BaseModel):
    work_order_id: int
    procedure_id: Optional[int] = None
    status: Optional[str] = "in_progress"
    values: List[ProcedureFieldValueIn] = []
