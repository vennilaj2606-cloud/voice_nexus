import httpx
from typing import AsyncGenerator, Optional
from app.tts.base import BaseTTSService
from app.core.config import settings
from app.core.logger import logger
from app.telephony.audio_bridge import AudioBridge

class ElevenLabsStreamingTTS(BaseTTSService):
    """Low-latency ElevenLabs Text-to-Speech Streaming Service."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.ELEVENLABS_API_KEY
        self.base_url = "https://api.elevenlabs.io/v1/text-to-speech"

    async def stream_speech(self, text: str, voice_id: str = "21m00Tcm4TlvDq8ikWAM") -> AsyncGenerator[bytes, None]:
        if not self.api_key or self.api_key == "mock-elevenlabs-key":
            logger.info("Using ElevenLabs Mock Audio Generator")
            # Generate 1 second of dummy PCM audio for testing
            mock_pcm = b"\x00\x00" * 16000
            yield AudioBridge.pcm16_to_mulaw(mock_pcm)
            return

        url = f"{self.base_url}/{voice_id}/stream?output_format=pcm_16000"
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "text": text,
            "model_id": "eleven_turbo_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }

        try:
            async with httpx.AsyncClient() as client:
                async with client.stream("POST", url, headers=headers, json=payload) as response:
                    if response.status_code == 200:
                        async for chunk in response.aiter_bytes(chunk_size=1024):
                            # Convert 16kHz PCM chunk to 8kHz mulaw for telephony
                            mulaw_chunk = AudioBridge.pcm16_to_mulaw(chunk)
                            yield mulaw_chunk
                    else:
                        error_text = await response.aread()
                        logger.error(f"ElevenLabs TTS streaming failed: {error_text.decode('utf-8')}")
        except Exception as e:
            logger.error(f"Error in ElevenLabs TTS streaming: {e}")
