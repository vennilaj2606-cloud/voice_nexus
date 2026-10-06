import boto3
from typing import AsyncGenerator, Optional
from app.tts.base import BaseTTSService
from app.core.config import settings
from app.core.logger import logger
from app.telephony.audio_bridge import AudioBridge

class PollyTTS(BaseTTSService):
    """Amazon Polly TTS adapter for secondary / fallback text-to-speech."""

    def __init__(self, region: str = "us-east-1"):
        try:
            self.client = boto3.client("polly", region_name=region)
        except Exception:
            self.client = None

    async def stream_speech(self, text: str, voice_id: str = "Joanna") -> AsyncGenerator[bytes, None]:
        if not self.client:
            mock_pcm = b"\x00\x00" * 16000
            yield AudioBridge.pcm16_to_mulaw(mock_pcm)
            return

        try:
            response = self.client.synthesize_speech(
                Text=text,
                OutputFormat="pcm",
                SampleRate="16000",
                VoiceId=voice_id,
                Engine="neural"
            )
            if "AudioStream" in response:
                pcm_data = response["AudioStream"].read()
                mulaw_data = AudioBridge.pcm16_to_mulaw(pcm_data)
                yield mulaw_data
        except Exception as e:
            logger.error(f"Amazon Polly TTS synthesis failed: {e}")
