from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_organization
from app.schemas.analytics_schemas import AnalyticsOverviewResponse
from app.services.analytics_service import AnalyticsService
from app.models import Organization

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview", response_model=AnalyticsOverviewResponse)
async def get_analytics_overview(
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    service = AnalyticsService(db, org.id)
    return await service.get_metrics()
