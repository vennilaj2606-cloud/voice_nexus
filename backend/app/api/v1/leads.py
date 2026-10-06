from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from uuid import UUID

from app.api.deps import get_db, get_current_organization
from app.schemas.crm_schemas import LeadCreate, LeadResponse
from app.models import Lead, Organization

router = APIRouter(prefix="/leads", tags=["Leads"])

@router.get("/", response_model=List[LeadResponse])
async def list_leads(
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Lead).filter(Lead.organization_id == org.id).order_by(Lead.created_at.desc())
    )
    return result.scalars().all()

@router.post("/", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    lead_in: LeadCreate,
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    lead = Lead(organization_id=org.id, **lead_in.model_dump())
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return lead
