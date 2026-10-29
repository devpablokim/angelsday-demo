import { useId } from 'react';
import { CAP_HEIGHT, CAP_TOP, MONOGRAM, TAGLINE, WORDMARK } from './logoPaths';

export type LogoVariant = 'ink' | 'gold' | 'white' | 'black';
export type LogoLayout = 'horizontal' | 'stacked' | 'monogram' | 'wordmark';

interface LogoProps {
  layout?: LogoLayout;
  variant?: LogoVariant;
  /** 렌더링 높이(px). 너비는 비율에 맞춰 자동 계산됩니다. */
  height?: number;
  showTagline?: boolean;
  className?: string;
  title?: string;
}

const GOLD_STOPS = [
  { offset: 0, color: '#8C6B2E' },
  { offset: 0.48, color: '#E2C985' },
  { offset: 1, color: '#A8823C' },
];

function fills(variant: LogoVariant, gold: string) {
  switch (variant) {
    case 'gold':
      return { mono: gold, word: gold, tag: '#8C6B2E' };
    case 'white':
      return { mono: gold, word: '#FFFFFF', tag: '#D9BF85' };
    case 'black':
      return { mono: '#141210', word: '#141210', tag: '#141210' };
    case 'ink':
    default:
      return { mono: gold, word: '#141210', tag: '#7D766B' };
  }
}

/** 대문자 높이(capH)와 상단 위치(top)를 기준으로 텍스트 경로를 배치합니다. */
function textTransform(x: number, top: number, capH: number) {
  const s = capH / CAP_HEIGHT;
  return { transform: `translate(${x.toFixed(2)} ${(top - CAP_TOP * s).toFixed(2)}) scale(${s.toFixed(5)})`, scale: s };
}

export function Logo({
  layout = 'horizontal',
  variant = 'ink',
  height = 40,
  showTagline = true,
  className,
  title = '엔젤스데이 ANGELSDAY',
}: LogoProps) {
  const gid = `adg-${useId().replace(/:/g, '')}`;
  const c = fills(variant, `url(#${gid})`);
  const defs = (
    <defs>
      <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
        {GOLD_STOPS.map((s) => (
          <stop key={s.offset} offset={s.offset} stopColor={s.color} />
        ))}
      </linearGradient>
    </defs>
  );

  if (layout === 'monogram') {
    return (
      <svg className={className} viewBox={`0 0 ${MONOGRAM.width} ${MONOGRAM.height}`} height={height} role="img" aria-label={title}>
        {defs}
        <path fill={c.mono} d={MONOGRAM.d} />
      </svg>
    );
  }

  if (layout === 'wordmark') {
    const capH = 23;
    const w = WORDMARK.width * (capH / CAP_HEIGHT);
    const t = textTransform(0, 1, capH);
    return (
      <svg className={className} viewBox={`0 0 ${w.toFixed(1)} 25`} height={height} role="img" aria-label={title}>
        {defs}
        <path fill={c.word} transform={t.transform} d={WORDMARK.d} />
      </svg>
    );
  }

  if (layout === 'stacked') {
    const W = 300;
    const mh = 150;
    const mw = (MONOGRAM.width * mh) / MONOGRAM.height;
    const capH = 30;
    const ww = WORDMARK.width * (capH / CAP_HEIGHT);
    const wTop = mh + 26;
    const tagCap = (CAP_HEIGHT * ww) / TAGLINE.width;
    const tagTop = wTop + capH + 12;
    const H = showTagline ? tagTop + tagCap + 2 : wTop + capH + 2;
    const word = textTransform((W - ww) / 2, wTop, capH);
    const tag = textTransform((W - ww) / 2, tagTop, tagCap);
    return (
      <svg className={className} viewBox={`0 0 ${W} ${H.toFixed(1)}`} height={height} role="img" aria-label={title}>
        {defs}
        <path fill={c.mono} transform={`translate(${((W - mw) / 2).toFixed(2)} 0) scale(${(mh / MONOGRAM.height).toFixed(5)})`} d={MONOGRAM.d} />
        <path fill={c.word} transform={word.transform} d={WORDMARK.d} />
        {showTagline && <path fill={c.tag} transform={tag.transform} d={TAGLINE.d} />}
      </svg>
    );
  }

  // horizontal
  const H = 60;
  const mw = (MONOGRAM.width * H) / MONOGRAM.height;
  const x = mw + 12;
  const capH = showTagline ? 23 : 26;
  const wTop = showTagline ? 13 : 17;
  const ww = WORDMARK.width * (capH / CAP_HEIGHT);
  const tagCap = (CAP_HEIGHT * ww) / TAGLINE.width;
  const word = textTransform(x, wTop, capH);
  const tag = textTransform(x + 0.5, wTop + capH + 8, tagCap);
  const W = x + ww + 2;
  return (
    <svg className={className} viewBox={`0 0 ${W.toFixed(1)} ${H}`} height={height} role="img" aria-label={title}>
      {defs}
      <path fill={c.mono} transform={`scale(${(H / MONOGRAM.height).toFixed(5)})`} d={MONOGRAM.d} />
      <path fill={c.word} transform={word.transform} d={WORDMARK.d} />
      {showTagline && <path fill={c.tag} transform={tag.transform} d={TAGLINE.d} />}
    </svg>
  );
}
