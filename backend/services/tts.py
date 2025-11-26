# backend/services/tts.py
import os
from gtts import gTTS
from backend.services.extract import UPLOAD_DIR

# Map frontend keys to gTTS Top-Level Domains (TLDs) for accents
# gTTS uses 'en' language + specific TLDs for accents
ACCENT_MAP = {
    "us": "com",        # US English
    "uk": "co.uk",      # UK English
    "aus": "com.au",    # Australian English
    "ind": "co.in",     # Indian English
    "ca": "ca"          # Canadian English
}

def generate_audio_for_summary(text: str, accent_key: str, summary_id: int) -> str:
    """
    Generates an MP3 file for the given text using Google TTS.
    Returns the filename.
    """
    # Default to US if key not found
    tld = ACCENT_MAP.get(accent_key, "com")
    
    # Create unique filename
    filename = f"summary_audio_{summary_id}.mp3"
    output_path = os.path.join(UPLOAD_DIR, filename)
    
    try:
        # gTTS is synchronous, no await needed
        tts = gTTS(text=text, lang="en", tld=tld, slow=False)
        tts.save(output_path)
        return filename
    except Exception as e:
        print(f"gTTS Error: {e}")
        return None