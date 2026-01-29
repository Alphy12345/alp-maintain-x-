from sqlalchemy import (
    Table,
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    Date,
    Float,
    DateTime,
)
from datetime import datetime
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

# =====================================================
# Vendor
# =====================================================
class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)

    assets = relationship("Asset", back_populates="vendor")
    parts = relationship("Part", back_populates="vendor")


# =====================================================
# Asset
# =====================================================
class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    asset_name = Column(String(255), nullable=False)
    location = Column(String(255))
    criticality = Column(String(50))
    description = Column(Text)
    manufacturer = Column(String(255))
    model = Column(String(255))
    model_serial_no = Column(String(255))
    year = Column(Integer)
    asset_type = Column(String(100))
    status = Column(String(50), nullable=False, default="running")

    vendor_id = Column(Integer, ForeignKey("vendors.id"))

    vendor = relationship("Vendor", back_populates="assets")
    work_orders = relationship("WorkOrder", back_populates="asset")
    procedures = relationship(
        "Procedure",
        back_populates="asset",
        cascade="all, delete-orphan"
    )


# =====================================================
# Part
# =====================================================
class Part(Base):
    __tablename__ = "parts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    units_in_stock = Column(Integer)
    minimum_in_stock = Column(Integer)
    unit_cost = Column(Float)
    description = Column(Text)
    part_type = Column(String(100))
    location = Column(String(255))

    vendor_id = Column(Integer, ForeignKey("vendors.id"))

    vendor = relationship("Vendor", back_populates="parts")


# =====================================================
# Team
# =====================================================
class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, autoincrement=True)
    team_name = Column(String(255), nullable=False)
    description = Column(Text)

    work_orders = relationship("WorkOrder", back_populates="team")

    team_users = relationship(
        "TeamUser",
        back_populates="team",
        cascade="all, delete-orphan",
    )

    users = relationship(
        "User",
        secondary="team_users",
        viewonly=True,
    )


# =====================================================
# User
# =====================================================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_name = Column(String(255), nullable=False, unique=True)
    password = Column(String(255), nullable=False)
    role = Column(String(50))

    team_users = relationship(
        "TeamUser",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    teams = relationship(
        "Team",
        secondary="team_users",
        viewonly=True,
    )


class TeamUser(Base):
    __tablename__ = "team_users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    team = relationship("Team", back_populates="team_users")
    user = relationship("User", back_populates="team_users")


# =====================================================
# Work Order
# =====================================================
class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)

    estimated_time_hours = Column(Integer)
    estimated_time_minutes = Column(Integer)

    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)

    due_date = Column(Date)
    start_date = Column(Date)

    recurrence = Column(String(100))
    work_type = Column(String(100))
    priority = Column(String(50))
    status = Column(String(50), nullable=False, default="open")
    location = Column(String(255))

    team_id = Column(Integer, ForeignKey("teams.id"))
    asset_id = Column(Integer, ForeignKey("assets.id"))
    assigned_user_id = Column(Integer, ForeignKey("users.id"))
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    procedure_id = Column(Integer, ForeignKey("procedures.id"))

    team = relationship("Team", back_populates="work_orders")
    asset = relationship("Asset", back_populates="work_orders")
    assigned_user = relationship("User")
    vendor = relationship("Vendor")
    procedure = relationship("Procedure")

    work_order_parts = relationship(
        "WorkOrderPart",
        back_populates="work_order",
        cascade="all, delete-orphan",
    )

    parts = relationship(
        "Part",
        secondary="work_order_parts",
        viewonly=True,
    )


work_order_categories = Table(
    "work_order_categories",
    Base.metadata,
    Column("work_order_id", ForeignKey("work_orders.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True),
)


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)

    work_orders = relationship(
        "WorkOrder",
        secondary=work_order_categories,
        back_populates="categories",
    )


WorkOrder.categories = relationship(
    "Category",
    secondary=work_order_categories,
    back_populates="work_orders",
)


class WorkOrderPart(Base):
    __tablename__ = "work_order_parts"

    work_order_id = Column(
        Integer,
        ForeignKey("work_orders.id", ondelete="CASCADE"),
        primary_key=True,
    )
    part_id = Column(
        Integer,
        ForeignKey("parts.id", ondelete="CASCADE"),
        primary_key=True,
    )
    quantity = Column(Integer, nullable=False, default=1)

    work_order = relationship("WorkOrder", back_populates="work_order_parts")
    part = relationship("Part")


# =====================================================
# Procedure (Template)
# =====================================================
class Procedure(Base):
    __tablename__ = "procedures"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)

    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)

    asset = relationship("Asset", back_populates="procedures")
    sections = relationship(
        "ProcedureSection",
        back_populates="procedure",
        cascade="all, delete-orphan",
        order_by="ProcedureSection.order"
    )


# =====================================================
# Procedure Section
# =====================================================
class ProcedureSection(Base):
    __tablename__ = "procedure_sections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    order = Column(Integer, nullable=False)

    procedure_id = Column(
        Integer,
        ForeignKey("procedures.id", ondelete="CASCADE"),
        nullable=False
    )

    procedure = relationship("Procedure", back_populates="sections")
    fields = relationship(
        "ProcedureField",
        back_populates="section",
        cascade="all, delete-orphan",
        order_by="ProcedureField.order"
    )


# =====================================================
# Procedure Field (Dynamic)
# =====================================================
class ProcedureField(Base):
    __tablename__ = "procedure_fields"

    id = Column(Integer, primary_key=True, autoincrement=True)
    label = Column(String(255), nullable=False)
    field_type = Column(String(50), nullable=False)

    order = Column(Integer, nullable=False)
    required = Column(Integer, default=0)
    help_text = Column(Text)

    config = Column(Text)  # JSON string

    section_id = Column(
        Integer,
        ForeignKey("procedure_sections.id", ondelete="CASCADE"),
        nullable=False
    )

    section = relationship("ProcedureSection", back_populates="fields")


# =====================================================
# Procedure Execution
# =====================================================
class ProcedureExecution(Base):
    __tablename__ = "procedure_executions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=True)
    procedure_id = Column(Integer, ForeignKey("procedures.id"), nullable=False)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)

    performed_by = Column(Integer, ForeignKey("users.id"))
    performed_at = Column(Date)
    status = Column(String(50))  # in_progress / completed

    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    duration_seconds = Column(Integer)


# =====================================================
# Procedure Field Value
# =====================================================
class ProcedureFieldValue(Base):
    __tablename__ = "procedure_field_values"

    id = Column(Integer, primary_key=True, autoincrement=True)
    execution_id = Column(
        Integer,
        ForeignKey("procedure_executions.id", ondelete="CASCADE"),
        nullable=False
    )
    field_id = Column(
        Integer,
        ForeignKey("procedure_fields.id", ondelete="CASCADE"),
        nullable=False
    )

    value = Column(Text)
