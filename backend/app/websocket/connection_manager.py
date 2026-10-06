from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    """Manages active WebSocket connections for live calls and frontend dashboard monitoring."""

    def __init__(self):
        self.active_calls: Dict[str, WebSocket] = {}
        self.dashboard_subscribers: List[WebSocket] = []

    async def connect_call(self, call_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_calls[call_id] = websocket

    def disconnect_call(self, call_id: str):
        if call_id in self.active_calls:
            del self.active_calls[call_id]

    async def connect_dashboard(self, websocket: WebSocket):
        await websocket.accept()
        self.dashboard_subscribers.append(websocket)

    def disconnect_dashboard(self, websocket: WebSocket):
        if websocket in self.dashboard_subscribers:
            self.dashboard_subscribers.remove(websocket)

    async def broadcast_to_dashboard(self, message: dict):
        disconnected = []
        for ws in self.dashboard_subscribers:
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(ws)

        for ws in disconnected:
            self.disconnect_dashboard(ws)

ws_manager = ConnectionManager()
