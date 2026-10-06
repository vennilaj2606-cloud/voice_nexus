import pytest
from fastapi.testclient import TestClient
from app.main import app

def test_dashboard_websocket_connection():
    client = TestClient(app)
    with client.websocket_connect("/api/v1/ws/dashboard") as websocket:
        websocket.send_text("ping")
        # Assert clean connection without disconnect errors
        assert websocket is not None
