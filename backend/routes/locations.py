from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from db import get_db
from models.models import Asset, Location, Team, Vendor
from pydantic_schema.request import LocationCreate, LocationUpdate
from pydantic_schema.response import LocationOut

router = APIRouter(prefix="/locations", tags=["locations"])


def _load_location(db: Session, location_id: int) -> Optional[Location]:
    location = (
        db.query(Location)
        .options(selectinload(Location.team), selectinload(Location.vendors), selectinload(Location.assets))
        .filter(Location.id == location_id)
        .first()
    )
    if not location:
        return None

    # Backward-compatible: assets historically store location as a string in Asset.location.
    legacy_assets = (
        db.query(Asset)
        .filter(Asset.location_id.is_(None))
        .filter(Asset.location == location.name)
        .all()
    )
    if legacy_assets:
        existing_ids = {a.id for a in (location.assets or [])}
        for a in legacy_assets:
            if a.id not in existing_ids:
                location.assets.append(a)
    return location


def _load_locations(db: Session) -> List[Location]:
    locations = (
        db.query(Location)
        .options(selectinload(Location.team), selectinload(Location.vendors), selectinload(Location.assets))
        .order_by(Location.id.desc())
        .all()
    )

    # Attach legacy assets by string match in one extra query.
    if not locations:
        return locations

    names = [l.name for l in locations if l.name]
    legacy_assets = (
        db.query(Asset)
        .filter(Asset.location_id.is_(None))
        .filter(Asset.location.in_(names))
        .all()
    )
    by_name = {}
    for a in legacy_assets:
        by_name.setdefault(a.location, []).append(a)

    for l in locations:
        if not l.name:
            continue
        extra = by_name.get(l.name) or []
        if not extra:
            continue
        existing_ids = {a.id for a in (l.assets or [])}
        for a in extra:
            if a.id not in existing_ids:
                l.assets.append(a)
    return locations


@router.post("", response_model=LocationOut, status_code=status.HTTP_201_CREATED)
def create_location(payload: LocationCreate, db: Session = Depends(get_db)):
    team = None
    if payload.team_id is not None:
        team = db.query(Team).filter(Team.id == payload.team_id).first()
        if not team:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    vendors: List[Vendor] = []
    if payload.vendor_ids:
        vendors = db.query(Vendor).filter(Vendor.id.in_(payload.vendor_ids)).all()
        found_ids = {v.id for v in vendors}
        missing = [vid for vid in payload.vendor_ids if vid not in found_ids]
        if missing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Vendors not found: {missing}")

    assets: List[Asset] = []
    if payload.asset_ids:
        assets = db.query(Asset).filter(Asset.id.in_(payload.asset_ids)).all()
        found_ids = {a.id for a in assets}
        missing = [aid for aid in payload.asset_ids if aid not in found_ids]
        if missing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Assets not found: {missing}")

    location = Location(
        name=payload.name,
        address=payload.address,
        description=payload.description,
        team_id=payload.team_id,
    )
    location.vendors = vendors

    db.add(location)
    db.flush()

    for a in assets:
        a.location_id = location.id
        a.location = location.name

    db.commit()
    db.refresh(location)
    loaded = _load_location(db, location.id)
    return loaded


@router.get("", response_model=List[LocationOut])
def list_locations(db: Session = Depends(get_db)):
    return _load_locations(db)


@router.get("/{location_id}", response_model=LocationOut)
def get_location(location_id: int, db: Session = Depends(get_db)):
    location = _load_location(db, location_id)
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    return location


@router.patch("/{location_id}", response_model=LocationOut)
def update_location(location_id: int, payload: LocationUpdate, db: Session = Depends(get_db)):
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    data = payload.model_dump(exclude_unset=True)

    if "team_id" in data:
        if data["team_id"] is None:
            location.team_id = None
        else:
            team = db.query(Team).filter(Team.id == data["team_id"]).first()
            if not team:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
            location.team_id = team.id

    if "vendor_ids" in data:
        vendor_ids = data.get("vendor_ids") or []
        if vendor_ids:
            vendors = db.query(Vendor).filter(Vendor.id.in_(vendor_ids)).all()
            found_ids = {v.id for v in vendors}
            missing = [vid for vid in vendor_ids if vid not in found_ids]
            if missing:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Vendors not found: {missing}")
            location.vendors = vendors
        else:
            location.vendors = []

    if "asset_ids" in data:
        asset_ids = data.get("asset_ids") or []
        if asset_ids:
            assets = db.query(Asset).filter(Asset.id.in_(asset_ids)).all()
            found_ids = {a.id for a in assets}
            missing = [aid for aid in asset_ids if aid not in found_ids]
            if missing:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Assets not found: {missing}")

            # Unassign assets currently in this location but not in the new list.
            db.query(Asset).filter(Asset.location_id == location.id).filter(~Asset.id.in_(asset_ids)).update(
                {Asset.location_id: None, Asset.location: None}, synchronize_session=False
            )

            # Assign selected assets.
            db.query(Asset).filter(Asset.id.in_(asset_ids)).update(
                {Asset.location_id: location.id, Asset.location: location.name}, synchronize_session=False
            )
        else:
            db.query(Asset).filter(Asset.location_id == location.id).update(
                {Asset.location_id: None, Asset.location: None}, synchronize_session=False
            )

    if "name" in data:
        location.name = data["name"]
    if "address" in data:
        location.address = data["address"]
    if "description" in data:
        location.description = data["description"]

    # Keep legacy Asset.location string aligned when the location name changes.
    if "name" in data:
        db.query(Asset).filter(Asset.location_id == location.id).update(
            {Asset.location: location.name}, synchronize_session=False
        )

    db.commit()
    db.refresh(location)

    loaded = _load_location(db, location_id)
    return loaded


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location(location_id: int, db: Session = Depends(get_db)):
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    db.delete(location)
    db.commit()
    return None


@router.post("/{location_id}/assign-asset/{asset_id}", response_model=LocationOut)
def assign_asset_to_location(location_id: int, asset_id: int, db: Session = Depends(get_db)):
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    asset.location_id = location.id
    asset.location = location.name
    db.commit()

    loaded = _load_location(db, location_id)
    return loaded
