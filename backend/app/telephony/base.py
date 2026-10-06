from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class BaseTelephonyProvider(ABC):

    @abstractmethod
    async def parse_incoming_call(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Parse incoming call webhook from telephony provider into a unified format."""
        pass

    @abstractmethod
    async def generate_websocket_stream_response(self, call_id: str, ws_url: str) -> Any:
        """Generate provider-specific markup (TeXML / TwiML) to initiate audio streaming to our WebSocket."""
        pass

    @abstractmethod
    async def make_outbound_call(self, from_number: str, to_number: str, ws_url: str) -> Dict[str, Any]:
        """Initiate an outbound call via Telephony provider."""
        pass

    @abstractmethod
    async def transfer_call(self, call_control_id: str, transfer_to_number: str) -> bool:
        """Transfer call to a human agent."""
        pass

    @abstractmethod
    async def hangup_call(self, call_control_id: str) -> bool:
        """Hang up active call session."""
        pass
