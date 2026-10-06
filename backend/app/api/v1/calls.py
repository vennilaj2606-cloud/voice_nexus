from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
from uuid import UUID

from app.api.deps import get_db, get_current_organization
from app.schemas.crm_schemas import CallResponse
from app.models import Call, Organization

router = APIRouter(prefix="/calls", tags=["Calls"])

@router.get("/", response_model=List[CallResponse])
async def list_calls(
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Call)
        .options(selectinload(Call.conversations))
        .filter(Call.organization_id == org.id)
        .order_by(Call.created_at.desc())
    )
    return result.scalars().all()

@router.get("/{call_id}", response_model=CallResponse)
async def get_call_detail(
    call_id: UUID,
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Call)
        .options(selectinload(Call.conversations))
        .filter(Call.id == call_id, Call.organization_id == org.id)
    )
    call = result.scalars().first()
    if not call:
        raise HTTPException(status_code=404, detail="Call log not found")
    return call
