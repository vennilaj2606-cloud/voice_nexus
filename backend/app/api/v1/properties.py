from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from uuid import UUID

from app.api.deps import get_db, get_current_organization
from app.schemas.crm_schemas import PropertyCreate, PropertyUpdate, PropertyResponse
from app.models import Property, Organization

router = APIRouter(prefix="/properties", tags=["Properties"])

async def get_demo_or_current_org(db: AsyncSession, org: Organization = Depends(get_current_organization)) -> Organization:
    if org:
        return org
    res = await db.execute(select(Organization))
    first_org = res.scalars().first()
    if first_org:
        return first_org
    raise HTTPException(status_code=401, detail="Organization not found")

@router.get("/", response_model=List[PropertyResponse])
async def list_properties(
    db: AsyncSession = Depends(get_db)
):
    # Fetch all properties for dashboard UI management
    result = await db.execute(
        select(Property)
        .order_by(Property.created_at.desc())
    )
    return result.scalars().all()

@router.post("/", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
async def create_property(
    prop_in: PropertyCreate,
    db: AsyncSession = Depends(get_db)
):
    # Retrieve default or active organization
    res = await db.execute(select(Organization))
    org = res.scalars().first()
    org_id = org.id if org else None

    prop = Property(organization_id=org_id, **prop_in.model_dump())
    db.add(prop)
    await db.commit()
    await db.refresh(prop)
    return prop

@router.put("/{property_id}", response_model=PropertyResponse)
async def update_property(
    property_id: UUID,
    prop_in: PropertyUpdate,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Property).filter(Property.id == property_id))
    prop = res.scalars().first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property listing not found")

    update_data = prop_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(prop, field, val)

    await db.commit()
    await db.refresh(prop)
    return prop

@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_property(
    property_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Property).filter(Property.id == property_id))
    prop = res.scalars().first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property listing not found")

    await db.delete(prop)
    await db.commit()
    return None
