import { useMemo } from 'react';

const GLOW = { soft: { blur: 10, op: 0.45 }, medium: { blur: 17, op: 0.7 }, strong: { blur: 26, op: 0.92 } };
const DEFAULT_TONE = ['#7dd3fc', '#a5b4fc', '#c4b5fd'];

let _uid = 0;

export default function GlowHalo({
  children,
  tone = DEFAULT_TONE,
  glow = 'medium',
  speed = 1,
  radius = 22,
  spread = 16,
  style,
}) {
  const g = GLOW[glow] || GLOW.medium;
  const [c1, c2, c3] = tone && tone.length >= 3 ? tone : DEFAULT_TONE;
  const sp = 1 / (speed || 1);
  const ms = (n) => n * sp + 'ms';
  const id = useMemo(() => 'gh' + _uid++, []);

  return (
    <div style={{ position: 'relative', borderRadius: radius, ...style }}>
      <style>{`
        @keyframes ${id}A{0%{transform:translate(-8%,-6%) scale(1);}50%{transform:translate(11%,9%) scale(1.22);}100%{transform:translate(-5%,7%) scale(.95);}}
        @keyframes ${id}B{0%{transform:translate(7%,5%) scale(1.06);}50%{transform:translate(-11%,-9%) scale(.88);}100%{transform:translate(9%,-5%) scale(1.16);}}
        @keyframes ${id}C{0%{transform:translate(0,9%) scale(1);}50%{transform:translate(-13%,-7%) scale(1.24);}100%{transform:translate(7%,3%) scale(.94);}}
        @keyframes ${id}Pulse{0%,100%{opacity:${g.op};}50%{opacity:${Math.min(1, g.op * 1.25)};}}
      `}</style>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: -spread,
          zIndex: 0,
          borderRadius: radius + spread,
          pointerEvents: 'none',
          filter: `blur(${g.blur + 14}px)`,
          opacity: g.op,
          animation: `${id}Pulse ${ms(3200)} ease-in-out infinite`,
        }}
      >
        <span style={{ position: 'absolute', top: '-22%', left: '1%', width: '46%', height: '150%', borderRadius: '50%', background: `radial-gradient(circle, ${c1}, transparent 68%)`, animation: `${id}A ${ms(9000)} ease-in-out infinite alternate` }} />
        <span style={{ position: 'absolute', top: '-18%', right: '2%', width: '48%', height: '150%', borderRadius: '50%', background: `radial-gradient(circle, ${c2}, transparent 68%)`, animation: `${id}B ${ms(11000)} ease-in-out infinite alternate` }} />
        <span style={{ position: 'absolute', bottom: '-24%', left: '14%', width: '52%', height: '150%', borderRadius: '50%', background: `radial-gradient(circle, ${c3}, transparent 68%)`, animation: `${id}C ${ms(13000)} ease-in-out infinite alternate` }} />
        <span style={{ position: 'absolute', bottom: '-20%', right: '16%', width: '44%', height: '140%', borderRadius: '50%', background: `radial-gradient(circle, ${c2}, transparent 70%)`, animation: `${id}A ${ms(10000)} ease-in-out ${ms(1200)} infinite alternate` }} />
      </div>

      {children != null && <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>}
    </div>
  );
}
