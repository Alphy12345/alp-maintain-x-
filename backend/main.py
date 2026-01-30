from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import os

from db import init_db
from routes.health import router as health_router
from routes.vendors import router as vendors_router
from routes.assets import router as assets_router
from routes.parts import router as parts_router
from routes.teams import router as teams_router
from routes.work_orders import router as work_orders_router
from routes.procedures import router as procedures_router
from routes.categories import router as categories_router
from routes.users import router as users_router
from routes.team_users import router as team_users_router
from routes.auth import router as auth_router
from routes.events import router as events_router
from routes.output_data import router as output_data_router
from routes.locations import router as locations_router

app = FastAPI(title="MaintainX Backend")

_cors_origins_raw = os.getenv("CORS_ORIGINS", "*").strip()
_cors_origins = (
    ["*"]
    if _cors_origins_raw == "*"
    else [o.strip() for o in _cors_origins_raw.split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_cors_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(health_router)
app.include_router(auth_router)
app.include_router(events_router)
app.include_router(vendors_router)
app.include_router(assets_router)
app.include_router(parts_router)
app.include_router(teams_router)
app.include_router(users_router)
app.include_router(team_users_router)
app.include_router(work_orders_router)
app.include_router(categories_router)
app.include_router(procedures_router)
app.include_router(output_data_router)
app.include_router(locations_router)
