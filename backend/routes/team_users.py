from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db import get_db
from models.models import Team, TeamUser, User
from pydantic_schema.request import TeamUserCreate
from pydantic_schema.response import TeamOut, TeamUserOut

router = APIRouter(prefix="/team-users", tags=["team-users"])


@router.post("", response_model=TeamUserOut, status_code=status.HTTP_201_CREATED)
def assign_user_to_team(payload: TeamUserCreate, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == payload.team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Team not found")

    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not found")

    existing = (
        db.query(TeamUser)
        .filter(TeamUser.team_id == payload.team_id)
        .filter(TeamUser.user_id == payload.user_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already assigned to team")

    team_user = TeamUser(team_id=payload.team_id, user_id=payload.user_id)
    db.add(team_user)
    db.commit()
    db.refresh(team_user)
    return team_user


@router.get("", response_model=List[TeamUserOut])
def list_team_users(db: Session = Depends(get_db)):
    return db.query(TeamUser).order_by(TeamUser.id.desc()).all()


@router.get("/teams/{team_id}", response_model=TeamOut)
def get_team_with_users(team_id: int, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return team


@router.delete("/{team_user_id}", status_code=status.HTTP_204_NO_CONTENT)
def unassign_user_from_team(team_user_id: int, db: Session = Depends(get_db)):
    team_user = db.query(TeamUser).filter(TeamUser.id == team_user_id).first()
    if not team_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team user mapping not found")

    db.delete(team_user)
    db.commit()
    return None
