# 데모용 행사 미디어(원본 사진 · 하이라이트 영상)를 만듭니다.
#   python3 scripts/demo-media/make.py
# - public/images/media/orig-g-NN.webp  : 데모 고객 갤러리 사진을 보정 전 느낌(채도·대비 낮춤)으로 만든 ‘원본’ 예시
# - public/images/media/highlight.mp4    : 갤러리 사진 6장으로 만든 15초 하이라이트 영상 (ffmpeg 필요)
import subprocess
from pathlib import Path

from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'public' / 'images' / 'gallery'
OUT = ROOT / 'public' / 'images' / 'media'
OUT.mkdir(parents=True, exist_ok=True)

# src/data/seed.ts 의 GALLERY 와 같은 사진들
SHOTS = ['g-11', 'g-10', 'g-15', 'g-17', 'g-12', 'g-14']
for old in OUT.glob('orig-*.webp'):
    old.unlink()
for name in SHOTS:
    im = Image.open(SRC / f'{name}.webp').convert('RGB')
    im = ImageEnhance.Color(im).enhance(0.78)
    im = ImageEnhance.Contrast(im).enhance(0.86)
    im = ImageEnhance.Brightness(im).enhance(0.96)
    im.save(OUT / f'orig-{name}.webp', quality=78)

frames = [SRC / f'{n}.webp' for n in SHOTS]
tmp = OUT / '_frames'
tmp.mkdir(exist_ok=True)
for k, f in enumerate(frames):
    Image.open(f).convert('RGB').save(tmp / f'{k}.jpg', quality=92)
D, X = 3.0, 0.8  # 장면 길이 · 전환 길이 (초)
inputs = sum([['-loop', '1', '-t', str(D), '-i', str(tmp / f'{k}.jpg')] for k in range(len(frames))], [])
prep = ';'.join(f'[{k}:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fps=30,format=yuv420p[v{k}]' for k in range(len(frames)))
chain, last = [], 'v0'
for k in range(1, len(frames)):
    off = k * (D - X)
    chain.append(f'[{last}][v{k}]xfade=transition=fade:duration={X}:offset={off:.2f}[x{k}]')
    last = f'x{k}'
cmd = ['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', prep + ';' + ';'.join(chain), '-map', f'[{last}]',
       '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-movflags', '+faststart', '-pix_fmt', 'yuv420p', str(OUT / 'highlight.mp4')]
subprocess.run(cmd, check=True)
for f in tmp.iterdir():
    f.unlink()
tmp.rmdir()
print('done', sorted(p.name for p in OUT.iterdir()))
