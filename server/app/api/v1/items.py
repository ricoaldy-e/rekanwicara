from fastapi import APIRouter

from app.api.deps import ContentDep
from app.api.schemas import Item
from app.api.v1.prefix import API_PREFIX

router = APIRouter(prefix=API_PREFIX, tags=["content"])


@router.get("/items", response_model=list[Item])
async def list_items(content: ContentDep) -> list[Item]:
    """Active learning items from items.json (SPEC §3)."""
    return content.active_items
