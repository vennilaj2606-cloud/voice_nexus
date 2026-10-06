from pydantic import BaseModel
from typing import List, Dict

class DailyCallStat(BaseModel):
    date: str
    total_calls: int
    completed_calls: int

class AnalyticsOverviewResponse(BaseModel):
    total_calls: int
    total_leads: int
    total_appointments: int
    conversion_rate_percentage: float
    avg_call_duration_seconds: float
    avg_ai_response_time_ms: int
    daily_stats: List[DailyCallStat]
    sentiment_breakdown: Dict[str, int]
