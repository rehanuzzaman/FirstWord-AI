"""Creates fake-microphone WAV files for the browser tests (16 kHz mono PCM).
  silence.wav   – 30 s of true silence (used to test the 8/16/24 s reactions)
  bhat.wav      – Bangla "ভাত দাও" spoken by Edge TTS (synthetic voice), then 2 s of silence
Run: python3 tests/browser/fixtures/make-audio.py
"""
import os, subprocess, tempfile, wave
import av
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))

def write_wav(path, samples):
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000)
        w.writeframes(samples.astype("<i2").tobytes())

def decode_mp3(path):
    container = av.open(path)
    resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
    chunks = []
    for frame in container.decode(audio=0):
        for out in resampler.resample(frame):
            chunks.append(out.to_ndarray().reshape(-1))
    return np.concatenate(chunks) if chunks else np.zeros(0, dtype=np.int16)

def main():
    write_wav(os.path.join(HERE, "silence.wav"), np.zeros(16000 * 30, dtype=np.int16))
    tmp = tempfile.mktemp(suffix=".mp3")
    subprocess.run(["python3", "-m", "edge_tts", "--voice", "bn-BD-NabanitaNeural",
                    "--text", "ভাত দাও", "--write-media", tmp], check=True, timeout=90)
    speech = decode_mp3(tmp)
    os.remove(tmp)
    pad = np.zeros(16000 * 2, dtype=np.int16)
    write_wav(os.path.join(HERE, "bhat.wav"), np.concatenate([speech, pad]))
    print("fixtures written:", os.listdir(HERE))

if __name__ == "__main__":
    main()
