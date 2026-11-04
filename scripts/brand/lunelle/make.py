# 루넬(LUNELLE) 데모 브랜드 자료를 만듭니다.
#
#   python3 scripts/brand/lunelle/make.py
#   node scripts/brand/render-icons.cjs lunelle     # apple-touch-icon · og-image PNG
#
# 만드는 파일 (src/brand/lunelle/)
#   logoPaths.ts  엠블럼(이미지 생성 결과 emblem.png 를 potrace 로 벡터화) + 워드마크·태그라인(글꼴 윤곽)
#   brand.json    데모 빌드(vite --mode lunelle)가 쓰는 문구 치환표와 디자인 시스템 페이지 로고
#   public/favicon.svg
#
# 필요: pip install potracer fonttools brotli pillow numpy
import json
from pathlib import Path
from urllib.parse import quote

import numpy as np
import potrace
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = ROOT / 'src' / 'brand' / 'lunelle'
CAP_TOP, CAP_HEIGHT = 27.6, 70  # src/brand/logoPaths.ts 와 같은 좌표계


def trace_emblem(src: Path) -> dict:
    im = Image.open(src).convert('L')
    a = np.array(im)
    ys, xs = np.where(a < 128)
    pad = 6
    crop = im.crop((xs.min() - pad, ys.min() - pad, xs.max() + pad, ys.max() + pad))
    s = 4
    big = crop.resize((crop.width * s, crop.height * s), Image.BICUBIC).filter(ImageFilter.GaussianBlur(s * 0.4))
    bits = np.array(big) >= 128  # potracer 는 밝은 쪽을 True 로 받아야 어두운 획을 그립니다
    plist = potrace.Bitmap(bits).trace(turdsize=20, alphamax=1.0, opticurve=True, opttolerance=0.2)
    k = 163.0 / (crop.height * s)
    f = lambda v: f'{v * k:.2f}'.rstrip('0').rstrip('.')
    parts = []
    for c in plist:
        sp = c.start_point
        d = [f'M{f(sp.x)} {f(sp.y)}']
        for seg in c.segments:
            if seg.is_corner:
                d.append(f'L{f(seg.c.x)} {f(seg.c.y)}L{f(seg.end_point.x)} {f(seg.end_point.y)}')
            else:
                d.append(f'C{f(seg.c1.x)} {f(seg.c1.y)} {f(seg.c2.x)} {f(seg.c2.y)} {f(seg.end_point.x)} {f(seg.end_point.y)}')
        d.append('Z')
        parts.append(''.join(d))
    return {'width': round(crop.width * s * k, 2), 'height': 163.0, 'd': ''.join(parts)}


def text_path(font: TTFont, text: str, tracking_em: float) -> dict:
    gs, cmap = font.getGlyphSet(), font.getBestCmap()
    upm = font['head'].unitsPerEm
    sc = CAP_HEIGHT / (font['OS/2'].sCapHeight or upm * 0.63)
    pen, x = SVGPathPen(gs), 0.0
    for ch in text:
        g = gs[cmap[ord(ch)]]
        if ch != ' ':
            g.draw(TransformPen(pen, (sc, 0, 0, -sc, x, CAP_TOP + CAP_HEIGHT)))
        x += g.width * sc + tracking_em * upm * sc
    x -= tracking_em * upm * sc
    return {'width': round(x, 2), 'd': pen.getCommands()}


def tt(x: float, top: float, cap_h: float) -> str:
    s = cap_h / CAP_HEIGHT
    return f'translate({x:.2f} {top - CAP_TOP * s:.2f}) scale({s:.5f})'


def ds_logo(m: dict, w: dict, t: dict) -> dict:
    """디자인 시스템 페이지의 로고 심볼 — src/brand/Logo.tsx 의 가로·세로 배치 계산과 같습니다."""
    use = lambda ref, tr, fill: f'<use href="#{ref}" transform="{tr}" style="fill: {fill}"/>'
    mono_fill, word_fill, tag_fill = 'var(--logo-mono, url(#ds-gold))', 'var(--logo-word, currentColor)', 'var(--logo-tag, #7d766b)'
    # 가로형
    H = 60
    mw = m['width'] * H / m['height']
    x, cap, top = mw + 12, 23, 13
    ww = w['width'] * cap / CAP_HEIGHT
    tag_cap = CAP_HEIGHT * ww / t['width']
    hw = x + ww + 2
    h_body = use('ds-m', f'translate(0.00 0.00) scale({H / m["height"]:.5f})', mono_fill) + use('ds-w', tt(x, top, cap), word_fill) + use('ds-t', tt(x + 0.5, top + cap + 8, tag_cap), tag_fill)
    # 세로형
    W, mh, cap2 = 300, 150, 30
    mw2 = m['width'] * mh / m['height']
    ww2 = w['width'] * cap2 / CAP_HEIGHT
    top2 = mh + 26
    tag_cap2 = CAP_HEIGHT * ww2 / t['width']
    tag_top = top2 + cap2 + 12
    sh = tag_top + tag_cap2 + 2
    s_body = use('ds-m', f'translate({(W - mw2) / 2:.2f} 0.00) scale({mh / m["height"]:.5f})', mono_fill) + use('ds-w', tt((W - ww2) / 2, top2, cap2), word_fill) + use('ds-t', tt((W - ww2) / 2, tag_top, tag_cap2), tag_fill)
    return {
        'paths': {'ds-m': m['d'], 'ds-w': w['d'], 'ds-t': t['d']},
        'symbols': {'ds-logo-h': h_body, 'ds-logo-s': s_body},
        'viewBoxes': {'0 0 157 163': f'0 0 {m["width"]:g} {m["height"]:g}', '0 0 289.5 60': f'0 0 {hw:.1f} 60', '0 0 300 229.7': f'0 0 300 {sh:.1f}'},
    }


ADDRESS = '서울특별시 송파구 송이로26길 16-27'
ADDRESS_Q = quote('송이로26길 16-27')

# 길게 겹치는 표현부터 바꿉니다 (순서가 곧 우선순위)
REPLACEMENTS = [
    # 브랜드
    ['https://www.엔젤스데이.com', 'https://hobbytan-venue.web.app/demo/'],
    ['https://www.angelsdaycatering.com/', 'https://hobbytan-venue.web.app/demo/catering'],
    ['엔젤스데이 파티하우스', '루넬 파티하우스'],
    # 받침이 생기니 조사도 함께 바꿉니다 (엔젤스데이가 → 루넬이)
    ['엔젤스데이가', '루넬이'],
    ['엔젤스데이와', '루넬과'],
    ['엔젤스데이는', '루넬은'],
    ['엔젤스데이를', '루넬을'],
    ['엔젤스데이예요', '루넬이에요'],
    ['엔젤스데이', '루넬'],
    ['엔젤스', '루넬'],
    ['ANGELSDAY PARTY HOUSE', 'LUNELLE PARTY HOUSE'],
    ['ANGELSDAY', 'LUNELLE'],
    ['Angelsday', 'Lunelle'],
    ['angelsday', 'lunelle'],
    # 업체 정보 (shared/venue.ts) — 데모 문의는 하비탄AI 로 연결
    ['경기도 김포시 김포한강4로 113 신한프라자 12층', ADDRESS],
    ['김포 장기역 2번 출구 · 신한프라자 12층 스카이라운지', '서울 송파 · 데모용 가상 베뉴'],
    ['신한프라자 지하 주차장 이용', '건물 지하 주차장 이용'],
    ['%EA%B9%80%ED%8F%AC%ED%95%9C%EA%B0%954%EB%A1%9C%20113', ADDRESS_Q],
    ['010-7113-4005', '010-0000-0000'],
    ['031-986-1415', '02-000-0000'],
    ['hjkh75@naver.com', 'pablo@hobbytan.com'],
    ["ceo: '이희자'", "ceo: '홍길동'"],
    ['대표 이희자', '대표 홍길동'],
    ['129-34-17826', '000-00-00000'],
    # 지역 문구
    ['김포 프라이빗 웨딩 베뉴', '프라이빗 웨딩 베뉴'],
    ['장기역 2번 출구 스카이라운지에서', '도심 스카이라운지에서'],
    ['김포 장기역 스카이라운지에서', '도심 스카이라운지에서'],
    ['김포의 프라이빗 연회장', '도심의 프라이빗 연회장'],
    ['김포 스카이라운지', '도심 스카이라운지'],
    ["'장기역'", "'가까운 역'"],
    ['경기도 김포시 김포한강9로', '서울특별시 송파구 송파대로'],
    ['경기도 김포시 …', '서울특별시 송파구 …'],
    ['김포중앙교회', '송파중앙교회'],
    ['김포바이오', '한강바이오'],
    ['gimpobio', 'hangangbio'],
    ['김포시 상공회의소', '송파 상공인 연합회'],
    ['김포시청 행정과', '송파구청 행정과'],
    # 홀 이름 (보증 인원·좌석·사진은 그대로)
    ['러블리룸', '루체홀'],
    ['알로하룸', '아우라홀'],
    ['벨리타룸', '베르데홀'],
    ['시아룸', '노아홀'],
    ['러블리', '루체'],
    ['알로하', '아우라'],
    ['벨리타', '베르데'],
    ["'시아'", "'노아'"],
    ["'LOVELY'", "'LUCE'"],
    ["'ALOHA'", "'AURA'"],
    ["'BELLITA'", "'VERDE'"],
    ["'SIA'", "'NOA'"],
    # 디자인 시스템 페이지의 예시 문구
    ['<i>LOVELY</i>', '<i>LUCE</i>'],
    ['<i>ALOHA</i>', '<i>AURA</i>'],
    ['<i>BELLITA</i>', '<i>VERDE</i>'],
    ['<i>SIA</i>', '<i>NOA</i>'],
]


def favicon(m: dict) -> str:
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -8 {m["width"] + 60:.1f} {m["height"] + 16:.1f}">'
            '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8C6B2E"/>'
            '<stop offset=".48" stop-color="#C9A55C"/><stop offset="1" stop-color="#A8823C"/></linearGradient></defs>'
            f'<path fill="url(#g)" d="{m["d"]}"/></svg>\n')


def main():
    font = TTFont(HERE / 'CormorantGaramond-SemiBold.woff2')
    mono = trace_emblem(HERE / 'emblem.png')
    word = text_path(font, 'LUNELLE', 0.16)
    tag = text_path(font, 'WEDDING · PARTY · CATERING', 0.22)
    (OUT / 'public').mkdir(parents=True, exist_ok=True)
    (OUT / 'logoPaths.ts').write_text(
        '// 루넬(LUNELLE) 데모 브랜드 로고 경로 — scripts/brand/lunelle/make.py 가 만든 파일입니다. 직접 고치지 마세요.\n'
        '// 엠블럼은 이미지 생성 결과(emblem.png)를 벡터화했고, 워드마크는 Cormorant Garamond SemiBold 윤곽입니다.\n'
        '// 형식은 src/brand/logoPaths.ts 와 같으며, 데모 빌드에서 그 파일 대신 쓰입니다.\n'
        f'export const MONOGRAM = {json.dumps(mono)};\nexport const WORDMARK = {json.dumps(word)};\n'
        f'export const TAGLINE = {json.dumps(tag)};\nexport const CAP_TOP = {CAP_TOP};\nexport const CAP_HEIGHT = {CAP_HEIGHT};\n')
    brand = {
        'id': 'lunelle',
        'name': '루넬 파티하우스',
        'base': '/demo/',
        'replacements': REPLACEMENTS,
        'designSystem': ds_logo(mono, word, tag),
    }
    (OUT / 'brand.json').write_text(json.dumps(brand, ensure_ascii=False, indent=1) + '\n')
    (OUT / 'public' / 'favicon.svg').write_text(favicon(mono))
    print('logoPaths.ts, brand.json, public/favicon.svg', '| mono', mono['width'], 'x', mono['height'], '| word', word['width'])


if __name__ == '__main__':
    main()
