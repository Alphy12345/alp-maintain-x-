from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from datetime import datetime

from db import get_db
from models.models import Procedure, ProcedureExecution, ProcedureField, ProcedureFieldValue, User, WorkOrder
from routes.auth import get_optional_current_user

router = APIRouter(prefix="/output-data", tags=["output_data"])


@router.get("")
def list_output_data(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    if current_user and (current_user.role or "").strip().lower() != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    executions = (
        db.query(ProcedureExecution)
        .order_by(ProcedureExecution.id.desc())
        .limit(500)
        .all()
    )

    items = []
    for ex in executions:
        wo = db.query(WorkOrder).filter(WorkOrder.id == ex.work_order_id).first() if ex.work_order_id else None
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

        items.append(
            {
                "execution_id": ex.id,
                "work_order_id": ex.work_order_id,
                "work_order_name": wo.name if wo else None,
                "procedure_id": ex.procedure_id,
                "procedure_name": proc.name if proc else None,
                "performed_by": ex.performed_by,
                "performed_by_name": user.user_name if user else None,
                "status": ex.status,
                "started_at": ex.started_at.isoformat() if ex.started_at else None,
                "completed_at": ex.completed_at.isoformat() if ex.completed_at else None,
                "duration_seconds": ex.duration_seconds,
                "performed_at": ex.performed_at.isoformat() if ex.performed_at else None,
                "fields": fields,
            }
        )

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "count": len(items),
        "items": items,
    }
