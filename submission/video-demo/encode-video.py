import sys, struct
from pathlib import Path
import cv2
import numpy as np

if len(sys.argv) != 3:
    raise SystemExit('usage: encode-video.py OUTPUT.mp4 FPS')
out = Path(sys.argv[1])
fps = float(sys.argv[2])
writer = None
frames = 0

def exact(n):
    chunks=[]
    while n:
        b=sys.stdin.buffer.read(n)
        if not b: return None
        chunks.append(b); n-=len(b)
    return b''.join(chunks)

try:
    while True:
        header = exact(4)
        if header is None: break
        (size,) = struct.unpack('>I', header)
        payload = exact(size)
        if payload is None: raise RuntimeError('truncated frame stream')
        encoded = np.frombuffer(payload, dtype=np.uint8)
        frame = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
        if frame is None: raise RuntimeError(f'could not decode frame {frames}')
        if writer is None:
            h,w = frame.shape[:2]
            writer = cv2.VideoWriter(str(out), cv2.VideoWriter_fourcc(*'mp4v'), fps, (w,h))
            if not writer.isOpened(): raise RuntimeError('OpenCV MP4 encoder could not open output')
        writer.write(frame)
        frames += 1
        if frames % int(fps*10) == 0: print(f'encoded {frames} frames', flush=True)
finally:
    if writer is not None: writer.release()
if frames == 0: raise RuntimeError('no frames received')
capture = cv2.VideoCapture(str(out))
ok, first = capture.read()
width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
reported = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
capture.release()
if not ok or first is None or width != 1920 or height != 1080:
    raise RuntimeError(f'encoded MP4 failed playback check: opened={ok}, size={width}x{height}')
print(f'playback check passed: {width}x{height}, {reported} frames at {fps:g} fps', flush=True)
print(f'encoded {frames} frames to {out}', flush=True)
