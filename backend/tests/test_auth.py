import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_user_registration():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        payload = {
            "email": "testadmin@apexrealty.com",
            "password": "SecurePassword123!",
            "full_name": "Test Admin",
            "organization_name": "Apex Realty Test",
            "organization_slug": "apex-realty-test"
        }
        # Testing endpoint structure validation
        response = await ac.post("/api/v1/auth/register", json=payload)
        assert response.status_code in [201, 400] # 400 if already created in test DB
