from motor.motor_asyncio import AsyncIOMotorClient
from config import get_settings

settings = get_settings()

_client: AsyncIOMotorClient | None = None


async def get_db():
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongodb_uri)
    return _client[settings.mongodb_db_name]


async def close_db():
    global _client
    if _client:
        _client.close()
        _client = None

