import { useMemo } from 'react';

const PRESETS = {
  cool09:   { base: '#dCe9f7', blobs: ['#46d2da', '#6fb6f2', '#8f9cf0', '#b894e0', '#ee9ec8', '#f3b1bb'] },
  warm04:   { base: '#3a2f55', blobs: ['#f0915a', '#ec6f8e', '#9b6cf0', '#5b4bd6', '#f6c07a', '#ef7fa6'] },
  mint06:   { base: '#dff3ef', blobs: ['#3fd0c0', '#7be0a8', '#f2a9c4', '#7cc0ee', '#b59ae6', '#f4d58a'] },
  pastel14: { base: '#eef0fb', blobs: ['#f4b78a', '#f2a9c4', '#b9a6ee', '#8fc4f2', '#7be0cf', '#f6d79a'] },
};

const PATHS = `
  @keyframes lavaA{0%,100%{transform:translate(0,0) scale(1);}30%{transform:translate(16vw,14vh) scale(1.18);}62%{transform:translate(-12vw,22vh) scale(.92);}}
  @keyframes lavaB{0%,100%{transform:translate(0,0) scale(1.05);}28%{transform:translate(-18vw,10vh) scale(.9);}58%{transform:translate(10vw,-16vh) scale(1.22);}}
  @keyframes lavaC{0%,100%{transform:translate(0,0) scale(.95);}35%{transform:translate(14vw,-12vh) scale(1.2);}70%{transform:translate(20vw,16vh) scale(1);}}
  @keyframes lavaD{0%,100%{transform:translate(0,0) scale(1.1);}32%{transform:translate(-16vw,-14vh) scale(.95);}66%{transform:translate(-8vw,18vh) scale(1.25);}}
  @keyframes lavaE{0%,100%{transform:translate(0,0) scale(1);}40%{transform:translate(18vw,8vh) scale(1.15);}72%{transform:translate(-14vw,-10vh) scale(.9);}}
  @keyframes lavaF{0%,100%{transform:translate(0,0) scale(1.08);}30%{transform:translate(-10vw,16vh) scale(1.2);}64%{transform:translate(16vw,-18vh) scale(.94);}}
  @media (prefers-reduced-motion:reduce){ .lava-blob{ animation:none !important; } }
`;
const NAMES = ['lavaA', 'lavaB', 'lavaC', 'lavaD', 'lavaE', 'lavaF'];

const LAYOUT = [
  { x: '18%', y: '24%', s: 64, dur: 26 },
  { x: '74%', y: '18%', s: 58, dur: 30 },
  { x: '60%', y: '66%', s: 70, dur: 24 },
  { x: '24%', y: '72%', s: 60, dur: 32 },
  { x: '46%', y: '40%', s: 54, dur: 28 },
  { x: '86%', y: '58%', s: 50, dur: 34 },
];

export default function LavaBackground({
  palette = 'cool09',
  blur = 28,
  speed = 2,
  animate = true,
  grain = true,
  blobCount = 6,
  style,
}) {
  const P = typeof palette === 'string' ? (PRESETS[palette] || PRESETS.cool09) : palette;
  const blobs = P.blobs && P.blobs.length ? P.blobs : PRESETS.cool09.blobs;
  const sp = 1 / (speed || 1);
  const n = Math.max(1, Math.min(blobCount, LAYOUT.length));

  const wash = useMemo(() => ({
    a: blobs[2 % blobs.length],
    b: blobs[4 % blobs.length],
  }), [blobs]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: P.base, ...style }}>
      <style>{PATHS}</style>

      <div style={{
        position: 'absolute', inset: '-10%',
        background: `radial-gradient(60% 60% at 30% 30%, ${wash.a}55, transparent 70%),
                     radial-gradient(60% 60% at 75% 70%, ${wash.b}55, transparent 70%)`,
      }} />

      {LAYOUT.slice(0, n).map((b, i) => {
        const color = blobs[i % blobs.length];
        const size = `${b.s}vmax`;
        return (
          <div key={i} className="lava-blob" style={{
            position: 'absolute', left: b.x, top: b.y, width: size, height: size,
            marginLeft: `-${b.s / 2}vmax`, marginTop: `-${b.s / 2}vmax`,
            borderRadius: '50%',
            background: `radial-gradient(circle at 50% 50%, ${color}, ${color}99 38%, transparent 68%)`,
            filter: `blur(${blur}px)`,
            animation: animate ? `${NAMES[i % NAMES.length]} ${b.dur * sp}s ease-in-out infinite` : 'none',
            willChange: 'transform',
          }} />
        );
      })}

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(70% 70% at 50% 45%, rgba(255,255,255,.18), transparent 70%)' }} />

      {grain && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5, mixBlendMode: 'overlay',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '160px 160px',
        }} />
      )}
    </div>
  );
}
