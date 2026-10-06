from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.api.deps import get_db, get_current_organization
from app.schemas.crm_schemas import AppointmentCreate, AppointmentResponse
from app.models import Appointment, Organization

router = APIRouter(prefix="/appointments", tags=["Appointments"])

@router.get("/", response_model=List[AppointmentResponse])
async def list_appointments(
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Appointment)
        .filter(Appointment.organization_id == org.id)
        .order_by(Appointment.start_time.asc())
    )
    return result.scalars().all()

@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    appt_in: AppointmentCreate,
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    appt = Appointment(organization_id=org.id, **appt_in.model_dump())
    db.add(appt)
    await db.commit()
    await db.refresh(appt)
    return appt
