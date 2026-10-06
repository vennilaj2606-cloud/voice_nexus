from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_db
from app.telephony.telnyx_adapter import TelnyxProvider
from app.telephony.twilio_adapter import TwilioProvider
from app.models import Call, Organization, CallStatus
from app.core.config import settings
from app.core.logger import logger

router = APIRouter(prefix="/webhooks", tags=["Telephony Webhooks"])

@router.post("/telnyx/incoming")
async def telnyx_incoming_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.json()
    telnyx = TelnyxProvider()
    parsed = await telnyx.parse_incoming_call(payload)

    if parsed["event_type"] in ["call.initiated", "call.incoming"]:
        # Find default organization or match by receiver number
        org_res = await db.execute(select(Organization))
        org = org_res.scalars().first()
        if not org:
            return Response(content="No organization registered", status_code=400)

        # Create new Call entry in database
        call = Call(
            organization_id=org.id,
            caller_number=parsed.get("caller_number", "+10000000000"),
            receiver_number=parsed.get("receiver_number", "+18005550199"),
            direction="inbound",
            status=CallStatus.INITIATED.value,
            telephony_session_id=parsed.get("call_control_id")
        )
        db.add(call)
        await db.commit()
        await db.refresh(call)

        ws_url = f"ws://localhost:8000/api/v1/ws/call/{call.id}"
        texml_response = await telnyx.generate_websocket_stream_response(str(call.id), ws_url)
        return Response(content=texml_response, media_type="application/xml")

    return {"status": "event_received"}

@router.post("/twilio/incoming")
async def twilio_incoming_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    form_data = await request.form()
    payload = dict(form_data)
    twilio = TwilioProvider()
    parsed = await twilio.parse_incoming_call(payload)

    org_res = await db.execute(select(Organization))
    org = org_res.scalars().first()
    if not org:
        return Response(content="No organization registered", status_code=400)

    call = Call(
        organization_id=org.id,
        caller_number=parsed.get("caller_number", "+10000000000"),
        receiver_number=parsed.get("receiver_number", "+18005550199"),
        direction="inbound",
        status=CallStatus.INITIATED.value,
        telephony_session_id=parsed.get("call_control_id")
    )
    db.add(call)
    await db.commit()
    await db.refresh(call)

    ws_url = f"ws://localhost:8000/api/v1/ws/call/{call.id}"
    twiml_response = await twilio.generate_websocket_stream_response(str(call.id), ws_url)
    return Response(content=twiml_response, media_type="application/xml")
