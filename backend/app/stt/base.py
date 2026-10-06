from abc import ABC, abstractmethod
from typing import Callable, Awaitable, Dict, Any

class BaseSTTService(ABC):

    @abstractmethod
    async def connect(self, on_transcript_callback: Callable[[str, bool], Awaitable[None]]):
        """Establish connection with the Speech-to-Text streaming provider."""
        pass

    @abstractmethod
    async def send_audio_chunk(self, pcm_chunk: bytes):
        """Send audio buffer chunk to STT engine."""
        pass

    @abstractmethod
    async def close(self):
        """Close connection to STT engine."""
        pass
