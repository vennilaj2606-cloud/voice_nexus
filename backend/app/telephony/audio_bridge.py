import audioop
import base64

class AudioBridge:
    """Utility class to handle telephony audio codec conversions (mulaw / pcm16)."""

    @staticmethod
    def mulaw_to_pcm16(mulaw_bytes: bytes) -> bytes:
        """Convert 8kHz u-law (Telnyx/Twilio format) to 16kHz linear PCM for Deepgram STT."""
        pcm_8k = audioop.ulaw2lin(mulaw_bytes, 2)
        pcm_16k, _ = audioop.ratecv(pcm_8k, 2, 1, 8000, 16000, None)
        return pcm_16k

    @staticmethod
    def pcm16_to_mulaw(pcm16_bytes: bytes) -> bytes:
        """Convert 16kHz linear PCM (ElevenLabs TTS output) to 8kHz u-law for Telnyx/Twilio media stream."""
        pcm_8k, _ = audioop.ratecv(pcm16_bytes, 2, 1, 16000, 8000, None)
        mulaw = audioop.lin2ulaw(pcm_8k, 2)
        return mulaw

    @staticmethod
    def base64_mulaw_to_pcm16(base64_payload: str) -> bytes:
        raw_mulaw = base64.b64decode(base64_payload)
        return AudioBridge.mulaw_to_pcm16(raw_mulaw)

    @staticmethod
    def pcm16_to_base64_mulaw(pcm16_bytes: bytes) -> str:
        mulaw_bytes = AudioBridge.pcm16_to_mulaw(pcm16_bytes)
        return base64.b64encode(mulaw_bytes).decode('utf-8')
