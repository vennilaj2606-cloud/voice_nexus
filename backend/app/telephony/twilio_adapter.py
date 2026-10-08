import httpx
from typing import Dict, Any
from app.telephony.base import BaseTelephonyProvider
from app.core.config import settings
from app.core.logger import logger

class TwilioProvider(BaseTelephonyProvider):

    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.base_url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}"

    async def parse_incoming_call(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "event_type": "call.incoming",
            "call_control_id": payload.get("CallSid"),
            "call_leg_id": payload.get("CallSid"),
            "caller_number": payload.get("From"),
            "receiver_number": payload.get("To"),
            "direction": payload.get("Direction", "inbound"),
            "raw": payload
        }

    async def generate_websocket_stream_response(self, call_id: str, ws_url: str) -> str:
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Connecting to R4R AI assistant...</Say>
    <Connect>
        <Stream url="{ws_url}">
            <Parameter name="call_id" value="{call_id}" />
        </Stream>
    </Connect>
</Response>"""
        return twiml

    async def make_outbound_call(self, from_number: str, to_number: str, ws_url: str) -> Dict[str, Any]:
        twiml = await self.generate_websocket_stream_response("outbound", ws_url)
        async with httpx.AsyncClient(auth=(self.account_sid, self.auth_token)) as client:
            response = await client.post(
                f"{self.base_url}/Calls.json",
                data={
                    "To": to_number,
                    "From": from_number,
                    "Twiml": twiml
                }
            )
            if response.status_code in [200, 201]:
                return response.json()
            else:
                logger.error(f"Twilio outbound call failed: {response.text}")
                raise Exception(f"Twilio API Error: {response.text}")

    async def transfer_call(self, call_control_id: str, transfer_to_number: str) -> bool:
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Transferring your call to a human specialist. Please stay on the line.</Say>
    <Dial>{transfer_to_number}</Dial>
</Response>"""
        async with httpx.AsyncClient(auth=(self.account_sid, self.auth_token)) as client:
            response = await client.post(
                f"{self.base_url}/Calls/{call_control_id}.json",
                data={"Twiml": twiml}
            )
            return response.status_code == 200

    async def hangup_call(self, call_control_id: str) -> bool:
        async with httpx.AsyncClient(auth=(self.account_sid, self.auth_token)) as client:
            response = await client.post(
                f"{self.base_url}/Calls/{call_control_id}.json",
                data={"Status": "completed"}
            )
            return response.status_code == 200
