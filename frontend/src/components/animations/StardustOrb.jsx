import { useMemo, useEffect } from 'react';

const rnd = (a, b) => a + Math.random() * (b - a);
const DEFAULT_TONE = ['#7dd3fc', '#a5b4fc', '#c4b5fd'];

export default function StardustOrb({ origin, target, tone = DEFAULT_TONE, speed = 1, onDone }) {
  const ox = origin.x, oy = origin.y;
  const tx = target.x, ty = target.y;
  const sp = 1 / (speed || 1);
  const ms = (n) => n * sp + 'ms';
  const cols = tone && tone.length >= 3 ? tone : DEFAULT_TONE;

  const trail = useMemo(
    () =>
      Array.from({ length: 150 }, (_, i) => {
        const star = Math.random() < 0.24;
        return {
          dx: tx - ox + rnd(-22, 22),
          dy: ty - oy + rnd(-20, 20),
          mx: (tx - ox) * 0.5 + rnd(-44, 44),
          my: (ty - oy) * 0.5 - rnd(10, 86),
          star,
          size: star ? rnd(7, 12) : rnd(2.5, 6.5),
          delay: rnd(0, 580),
          dur: rnd(540, 980),
          col: cols[i % cols.length],
          tw: rnd(480, 940),
          op: star ? 1 : rnd(0.85, 1),
        };
      }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!onDone) return;
    const t = setTimeout(onDone, 980 * sp);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none', filter: 'saturate(2) brightness(1.12)' }}>
      <style>{`
        @keyframes soFly{
          0%{transform:translate(0,0) scale(.3);opacity:0;}
          14%{opacity:1;}
          55%{transform:translate(var(--mx),var(--my)) scale(1.15);}
          100%{transform:translate(var(--dx),var(--dy)) scale(.45);opacity:0;}
        }
        @keyframes soSparkle{
          0%{transform:scale(.3) rotate(0deg);opacity:.2;}
          50%{transform:scale(1.15) rotate(45deg);opacity:1;}
          100%{transform:scale(.5) rotate(90deg);opacity:.3;}
        }
        @keyframes soTwinkle{
          0%{transform:scale(.7);opacity:.6;}
          50%{transform:scale(1.2);opacity:1;}
          100%{transform:scale(.8);opacity:.7;}
        }
      `}</style>

      {/* main orb */}
      <div
        style={{
          position: 'absolute',
          left: ox, top: oy,
          width: 30, height: 30,
          marginLeft: -15, marginTop: -15,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 35%, #ffffff, #aacbff 45%, #6a8bff 80%)',
          boxShadow: `0 0 22px 5px ${cols[1]}aa, 0 0 42px 12px ${cols[0]}55`,
          '--dx': tx - ox + 'px',
          '--dy': ty - oy + 'px',
          '--mx': (tx - ox) * 0.5 + 'px',
          '--my': (ty - oy) * 0.5 - 70 + 'px',
          animation: `soFly ${ms(780)} cubic-bezier(.4,.15,.2,1) forwards`,
        }}
      />

      {/* stardust trail */}
      {trail.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: ox, top: oy,
            marginLeft: -p.size / 2, marginTop: -p.size / 2,
            '--dx': p.dx + 'px', '--dy': p.dy + 'px',
            '--mx': p.mx + 'px', '--my': p.my + 'px',
            animation: `soFly ${ms(p.dur)} cubic-bezier(.4,.15,.2,1) ${ms(p.delay)} forwards`,
          }}
        >
          {p.star ? (
            <span style={{
              display: 'block', fontSize: p.size, lineHeight: 1,
              color: p.col, textShadow: `0 0 14px ${p.col}, 0 0 6px #fff`,
              animation: `soSparkle ${ms(p.tw)} ease-in-out infinite`,
            }}>✦</span>
          ) : (
            <span style={{
              display: 'block', width: p.size, height: p.size,
              borderRadius: '50%', opacity: p.op,
              background: `radial-gradient(circle, #fff, ${p.col} 62%, ${p.col} 80%, transparent 92%)`,
              boxShadow: `0 0 ${p.size * 2.8}px ${p.col}, 0 0 ${p.size * 1.2}px #fff`,
              animation: `soTwinkle ${ms(p.tw)} ease-in-out infinite`,
            }} />
          )}
        </span>
      ))}
    </div>
  );
}
