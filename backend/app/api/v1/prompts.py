from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from uuid import UUID

from app.api.deps import get_db
from app.schemas.crm_schemas import AIPromptCreate, AIPromptUpdate, AIPromptResponse
from app.models import AIPrompt, Organization

router = APIRouter(prefix="/prompts", tags=["AI Prompts"])

@router.get("/", response_model=List[AIPromptResponse])
async def list_prompts(
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AIPrompt)
        .order_by(AIPrompt.created_at.desc())
    )
    return result.scalars().all()

@router.post("/", response_model=AIPromptResponse, status_code=status.HTTP_201_CREATED)
async def create_prompt(
    prompt_in: AIPromptCreate,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Organization))
    org = res.scalars().first()
    org_id = org.id if org else None

    prompt = AIPrompt(organization_id=org_id, **prompt_in.model_dump())
    db.add(prompt)
    await db.commit()
    await db.refresh(prompt)
    return prompt

@router.put("/{prompt_id}", response_model=AIPromptResponse)
async def update_prompt(
    prompt_id: UUID,
    prompt_in: AIPromptUpdate,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(AIPrompt).filter(AIPrompt.id == prompt_id))
    prompt = res.scalars().first()
    if not prompt:
        raise HTTPException(status_code=404, detail="AI Prompt configuration not found")

    update_data = prompt_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(prompt, field, val)

    await db.commit()
    await db.refresh(prompt)
    return prompt

@router.delete("/{prompt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prompt(
    prompt_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(AIPrompt).filter(AIPrompt.id == prompt_id))
    prompt = res.scalars().first()
    if not prompt:
        raise HTTPException(status_code=404, detail="AI Prompt configuration not found")

    await db.delete(prompt)
    await db.commit()
    return None
