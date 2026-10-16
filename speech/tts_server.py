"""Local Bengali text-to-speech with Meta MMS-TTS (facebook/mms-tts-ben).

Licence: CC-BY-NC-4.0 (non-commercial use). Runs fully on this machine after
the one-time model download. Bind to loopback only.
"""
import io
import threading

import numpy as np
import soundfile as sf
import torch
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from transformers import AutoTokenizer, VitsModel

MODEL_ID = "facebook/mms-tts-ben"
app = FastAPI()
lock = threading.Lock()
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = VitsModel.from_pretrained(MODEL_ID).eval()
torch.set_num_threads(2)


class Speak(BaseModel):
    text: str = Field(min_length=1, max_length=400)


@app.get("/health")
def health():
    return {"ready": True, "model": MODEL_ID, "sample_rate": model.config.sampling_rate}


@app.post("/speak")
def speak(body: Speak):
    text = body.text.strip()
    with lock:
        inputs = tokenizer(text, return_tensors="pt")
        if inputs.input_ids.shape[1] == 0:
            raise HTTPException(400, "empty text")
        with torch.no_grad():
            audio = model(**inputs).waveform[0].cpu().numpy()
    peak = float(np.max(np.abs(audio))) or 1.0
    audio = (audio / max(peak, 1.0) * 0.9).astype("float32")
    buf = io.BytesIO()
    sf.write(buf, audio, model.config.sampling_rate, format="WAV", subtype="PCM_16")
    return Response(buf.getvalue(), media_type="audio/wav")
