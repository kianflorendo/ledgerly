import cv2, numpy as np
from pathlib import Path
p=Path(__file__).resolve().parent
v=cv2.VideoCapture(str(p.parent/'ledgerly-agent-benchmark-video.mp4'))
fps=v.get(cv2.CAP_PROP_FPS); count=int(v.get(cv2.CAP_PROP_FRAME_COUNT))
frames=[]
for t in [3,42,67,73,81,113.5]:
 v.set(cv2.CAP_PROP_POS_MSEC,t*1000);ok,im=v.read()
 if not ok: raise RuntimeError(f'Cannot decode frame at {t}s')
 im=cv2.resize(im,(640,360));cv2.putText(im,f'{t}s',(18,32),cv2.FONT_HERSHEY_SIMPLEX,.8,(255,255,255),2);frames.append(im)
out=p/'artifacts';out.mkdir(exist_ok=True)
cv2.imwrite(str(out/'motion-review.jpg'),np.vstack([np.hstack(frames[:3]),np.hstack(frames[3:])]))
v.set(cv2.CAP_PROP_POS_MSEC,113100);_,a=v.read();v.set(cv2.CAP_PROP_POS_MSEC,113900);_,b=v.read()
print({'fps':fps,'frames':count,'seconds':count/fps,'closing_hold_pixel_difference':float(np.abs(a.astype(float)-b.astype(float)).mean())})
