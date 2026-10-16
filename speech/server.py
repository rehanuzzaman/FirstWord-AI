"""Optional local speech recognition. No audio or transcripts are written to disk."""
import io
import os
import threading
import re
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from faster_whisper import WhisperModel

# Model must be cached once; WHISPER_OFFLINE=1 prevents runtime downloads.
model_name = os.getenv('WHISPER_MODEL', 'tiny')
model = WhisperModel(model_name, device='cpu', compute_type='int8', cpu_threads=2,
                     download_root=os.getenv('WHISPER_CACHE', os.path.expanduser('~/.cache/firstword-whisper')),
                     local_files_only=os.getenv('WHISPER_OFFLINE', '0') == '1')
lock = threading.Lock()
app = FastAPI(docs_url=None, redoc_url=None)

@app.get('/health')
def health():
    return {'ready': True, 'model': model_name, 'language': ['bn', 'en'], 'local': True}

@app.post('/transcribe')
def transcribe(audio: UploadFile = File(...), language: str = Form('bn')):
    if language not in ['bn', 'en']:
        raise HTTPException(400, 'Unsupported language')
    content = audio.file.read(8 * 1024 * 1024 + 1)
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(413, 'Audio too large')
    if not lock.acquire(blocking=False):
        raise HTTPException(429, 'Speech service busy')
    try:
        segments, info = model.transcribe(io.BytesIO(content), language=language, beam_size=3,
             vad_filter=True, condition_on_previous_text=False)
        if info.duration > 35:
            raise HTTPException(400, 'Please record less than 30 seconds')
        text = ' '.join(s.text.strip() for s in segments if s.no_speech_prob < 0.7)
        # A Bengali-only request producing no Bengali script is not a reliable transcript.
        # This is a script sanity check, not a speech confidence or pronunciation score.
        if language == 'bn' and text and not re.search(r'[\u0980-\u09ff]', text):
            return {'text': '', 'provider': 'faster-whisper', 'model': model_name,
                    'warning': 'Bengali script not recovered; use English mode for English speech or the text fallback.'}
        return {'text': text, 'provider': 'faster-whisper', 'model': model_name}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, 'Could not decode this audio')
    finally:
        lock.release()
