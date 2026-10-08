import httpx
from typing import Dict, Any
from app.telephony.base import BaseTelephonyProvider
from app.core.config import settings
from app.core.logger import logger

class TelnyxProvider(BaseTelephonyProvider):

    def __init__(self):
        self.api_key = settings.TELNYX_API_KEY
        self.base_url = "https://api.telnyx.com/v2"

    async def parse_incoming_call(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = payload.get("data", {})
        event_type = data.get("event_type")
        payload_data = data.get("payload", {})
        
        return {
            "event_type": event_type,
            "call_control_id": payload_data.get("call_control_id"),
            "call_leg_id": payload_data.get("call_leg_id"),
            "caller_number": payload_data.get("from"),
            "receiver_number": payload_data.get("to"),
            "direction": payload_data.get("direction", "inbound"),
            "raw": payload
        }

    async def generate_websocket_stream_response(self, call_id: str, ws_url: str) -> str:
        # Telnyx TeXML response to start streaming
        texml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Connecting to R4R AI assistant...</Say>
    <Connect>
        <Stream url="{ws_url}">
            <Parameter name="call_id" value="{call_id}" />
        </Stream>
    </Connect>
</Response>"""
        return texml

    async def make_outbound_call(self, from_number: str, to_number: str, ws_url: str) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/calls",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "to": to_number,
                    "from": from_number,
                    "stream_url": ws_url,
                    "stream_track": "both_tracks"
                }
            )
            if response.status_code in [200, 201]:
                return response.json()
            else:
                logger.error(f"Telnyx outbound call failed: {response.text}")
                raise Exception(f"Telnyx API Error: {response.text}")

    async def transfer_call(self, call_control_id: str, transfer_to_number: str) -> bool:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/calls/{call_control_id}/actions/transfer",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={"to": transfer_to_number}
            )
            return response.status_code == 200

    async def hangup_call(self, call_control_id: str) -> bool:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/calls/{call_control_id}/actions/hangup",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={}
            )
            return response.status_code == 200
