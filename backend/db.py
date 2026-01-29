import os

from sqlalchemy import inspect, text
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models.models import Base
from models.models import Asset, Category, Part, Procedure, ProcedureField, ProcedureSection, User, WorkOrder, WorkOrderPart
from datetime import date

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/maintainx"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)

    def _table_exists(conn, table_name: str) -> bool:
        return (
            conn.execute(
                text(
                    """
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = :table
                    LIMIT 1
                    """
                ),
                {"table": table_name},
            ).scalar()
            is not None
        )

    def _column_exists(conn, table_name: str, column_name: str) -> bool:
        return (
            conn.execute(
                text(
                    """
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = :table
                      AND column_name = :column
                    LIMIT 1
                    """
                ),
                {"table": table_name, "column": column_name},
            ).scalar()
            is not None
        )

    with engine.begin() as conn:
        if _table_exists(conn, "assets"):
            if not _column_exists(conn, "assets", "status"):
                conn.execute(text("ALTER TABLE assets ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'running'"))

        if _table_exists(conn, "work_orders"):
            if not _column_exists(conn, "work_orders", "vendor_id"):
                conn.execute(text("ALTER TABLE work_orders ADD COLUMN vendor_id INTEGER"))
            if not _column_exists(conn, "work_orders", "procedure_id"):
                conn.execute(text("ALTER TABLE work_orders ADD COLUMN procedure_id INTEGER"))
            if not _column_exists(conn, "work_orders", "assigned_user_id"):
                conn.execute(text("ALTER TABLE work_orders ADD COLUMN assigned_user_id INTEGER"))
            if not _column_exists(conn, "work_orders", "status"):
                conn.execute(text("ALTER TABLE work_orders ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'open'"))
            if not _column_exists(conn, "work_orders", "created_at"):
                conn.execute(text("ALTER TABLE work_orders ADD COLUMN created_at TIMESTAMP"))
            if not _column_exists(conn, "work_orders", "completed_at"):
                conn.execute(text("ALTER TABLE work_orders ADD COLUMN completed_at TIMESTAMP"))

        if not _table_exists(conn, "team_users"):
            conn.execute(
                text(
                    """
                    CREATE TABLE team_users (
                        id SERIAL PRIMARY KEY,
                        team_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        CONSTRAINT uq_team_users UNIQUE (team_id, user_id),
                        FOREIGN KEY(team_id) REFERENCES teams (id) ON DELETE CASCADE,
                        FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
                    )
                    """
                )
            )

        if not _table_exists(conn, "work_order_parts"):
            conn.execute(
                text(
                    """
                    CREATE TABLE work_order_parts (
                        work_order_id INTEGER NOT NULL,
                        part_id INTEGER NOT NULL,
                        quantity INTEGER NOT NULL DEFAULT 1,
                        PRIMARY KEY (work_order_id, part_id),
                        FOREIGN KEY(work_order_id) REFERENCES work_orders (id) ON DELETE CASCADE,
                        FOREIGN KEY(part_id) REFERENCES parts (id) ON DELETE CASCADE
                    )
                    """
                )
            )
        else:
            if not _column_exists(conn, "work_order_parts", "quantity"):
                conn.execute(text("ALTER TABLE work_order_parts ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1"))

        if _table_exists(conn, "procedure_executions"):
            if not _column_exists(conn, "procedure_executions", "work_order_id"):
                conn.execute(text("ALTER TABLE procedure_executions ADD COLUMN work_order_id INTEGER"))
            if not _column_exists(conn, "procedure_executions", "started_at"):
                conn.execute(text("ALTER TABLE procedure_executions ADD COLUMN started_at TIMESTAMP"))
            if not _column_exists(conn, "procedure_executions", "completed_at"):
                conn.execute(text("ALTER TABLE procedure_executions ADD COLUMN completed_at TIMESTAMP"))
            if not _column_exists(conn, "procedure_executions", "duration_seconds"):
                conn.execute(text("ALTER TABLE procedure_executions ADD COLUMN duration_seconds INTEGER"))

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.user_name == "admin").first()
        if not existing:
            existing = User(user_name="admin", password="12345", role="admin")
            db.add(existing)
            db.commit()
            db.refresh(existing)

        demo_part_a = db.query(Part).filter(Part.name == "Bearing 6205").first()
        if not demo_part_a:
            demo_part_a = Part(name="Bearing 6205", units_in_stock=25, minimum_in_stock=5, unit_cost=120.0)
            db.add(demo_part_a)
            db.commit()
            db.refresh(demo_part_a)

        demo_part_b = db.query(Part).filter(Part.name == "Hydraulic Oil 1L").first()
        if not demo_part_b:
            demo_part_b = Part(name="Hydraulic Oil 1L", units_in_stock=60, minimum_in_stock=10, unit_cost=75.0)
            db.add(demo_part_b)
            db.commit()
            db.refresh(demo_part_b)

        demo_asset = db.query(Asset).filter(Asset.asset_name == "Demo Conveyor Motor").first()
        if not demo_asset:
            demo_asset = Asset(
                asset_name="Demo Conveyor Motor",
                location="Main Plant - Line 2",
                status="running",
                criticality="high",
                description="Seeded asset for admin demo work order",
            )
            db.add(demo_asset)
            db.commit()
            db.refresh(demo_asset)

        demo_cat_a = db.query(Category).filter(Category.name == "Safety").first()
        if not demo_cat_a:
            demo_cat_a = Category(name="Safety")
            db.add(demo_cat_a)
            db.commit()
            db.refresh(demo_cat_a)

        demo_cat_b = db.query(Category).filter(Category.name == "Preventive").first()
        if not demo_cat_b:
            demo_cat_b = Category(name="Preventive")
            db.add(demo_cat_b)
            db.commit()
            db.refresh(demo_cat_b)

        demo_proc = db.query(Procedure).filter(Procedure.name == "Demo Inspection Procedure").first()
        if not demo_proc:
            demo_proc = Procedure(
                name="Demo Inspection Procedure",
                description="Seeded procedure for admin demo work order",
                asset_id=demo_asset.id,
            )

            s1 = ProcedureSection(title="Pre-checks", description="", order=1)
            s1.fields.append(
                ProcedureField(
                    label="Lockout/Tagout applied",
                    field_type="checkbox",
                    order=1,
                    required=1,
                    help_text="Confirm LOTO before starting",
                    config=None,
                )
            )
            s1.fields.append(
                ProcedureField(
                    label="Area is clear",
                    field_type="checkbox",
                    order=2,
                    required=1,
                    help_text="Ensure no obstruction",
                    config=None,
                )
            )

            s2 = ProcedureSection(title="Inspection", description="", order=2)
            s2.fields.append(
                ProcedureField(
                    label="Noise level",
                    field_type="text",
                    order=1,
                    required=0,
                    help_text="Record observations",
                    config=None,
                )
            )
            s2.fields.append(
                ProcedureField(
                    label="Photo",
                    field_type="photo",
                    order=2,
                    required=0,
                    help_text="Attach a photo if needed",
                    config=None,
                )
            )

            demo_proc.sections = [s1, s2]
            db.add(demo_proc)
            db.commit()
            db.refresh(demo_proc)

        demo_wo = db.query(WorkOrder).filter(WorkOrder.name == "Admin Demo Work Order (Parts)").first()
        if not demo_wo:
            demo_wo = WorkOrder(
                name="Admin Demo Work Order (Parts)",
                description="Demo WO seeded for admin to preview Parts section",
                status="open",
                due_date=date.today(),
                start_date=date.today(),
                recurrence="One-time",
                priority="high",
                work_type="inspection",
                assigned_user_id=existing.id,
                location="Main Plant - Line 2",
                asset_id=demo_asset.id,
                procedure_id=demo_proc.id,
            )
            demo_wo.work_order_parts = [
                WorkOrderPart(part_id=demo_part_a.id, quantity=2),
                WorkOrderPart(part_id=demo_part_b.id, quantity=1),
            ]
            demo_wo.categories = [demo_cat_a, demo_cat_b]
            db.add(demo_wo)
            db.commit()
        else:
            changed = False
            if not demo_wo.assigned_user_id:
                demo_wo.assigned_user_id = existing.id
                changed = True
            if not demo_wo.asset_id:
                demo_wo.asset_id = demo_asset.id
                changed = True
            if not demo_wo.procedure_id:
                demo_wo.procedure_id = demo_proc.id
                changed = True
            if not demo_wo.location:
                demo_wo.location = "Main Plant - Line 2"
                changed = True
            if demo_wo.due_date is None:
                demo_wo.due_date = date.today()
                changed = True
            if demo_wo.start_date is None:
                demo_wo.start_date = date.today()
                changed = True
            if not demo_wo.recurrence:
                demo_wo.recurrence = "One-time"
                changed = True
            if not demo_wo.priority:
                demo_wo.priority = "high"
                changed = True
            if not demo_wo.work_type:
                demo_wo.work_type = "inspection"
                changed = True
            if not demo_wo.categories:
                demo_wo.categories = [demo_cat_a, demo_cat_b]
                changed = True
            if not demo_wo.work_order_parts:
                demo_wo.work_order_parts = [
                    WorkOrderPart(part_id=demo_part_a.id, quantity=2),
                    WorkOrderPart(part_id=demo_part_b.id, quantity=1),
                ]
                changed = True
            if changed:
                db.commit()
    finally:
        db.close()
