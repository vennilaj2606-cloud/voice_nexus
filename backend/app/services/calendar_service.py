import httpx
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from app.core.config import settings
from app.core.logger import logger

class CalendarService:
    """Service to synchronize appointments with Google Calendar / Outlook."""

    @staticmethod
    async def create_google_calendar_event(
        access_token: str,
        title: str,
        start_time: datetime,
        end_time: datetime,
        description: str = ""
    ) -> Optional[str]:
        """Create event in Google Calendar using OAuth access token."""
        url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "summary": title,
            "description": description,
            "start": {"dateTime": start_time.isoformat() + "Z"},
            "end": {"dateTime": end_time.isoformat() + "Z"}
        }

        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code in [200, 201]:
                    data = res.json()
                    return data.get("id")
                else:
                    logger.error(f"Google Calendar event creation failed: {res.text}")
                    return None
        except Exception as e:
            logger.error(f"Error creating Google Calendar event: {e}")
            return None

    @staticmethod
    async def create_outlook_calendar_event(
        access_token: str,
        title: str,
        start_time: datetime,
        end_time: datetime,
        description: str = ""
    ) -> Optional[str]:
        """Create event in Outlook Calendar using Microsoft Graph API."""
        url = "https://graph.microsoft.com/v1.0/me/events"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "subject": title,
            "body": {"contentType": "HTML", "content": description},
            "start": {"dateTime": start_time.isoformat(), "timeZone": "UTC"},
            "end": {"dateTime": end_time.isoformat(), "timeZone": "UTC"}
        }

        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code in [200, 201]:
                    data = res.json()
                    return data.get("id")
                else:
                    logger.error(f"Outlook Calendar event creation failed: {res.text}")
                    return None
        except Exception as e:
            logger.error(f"Error creating Outlook Calendar event: {e}")
            return None
