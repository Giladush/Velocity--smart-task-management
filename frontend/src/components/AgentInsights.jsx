import { useEffect, useRef } from 'react';

const GLOW = {
  soft: { blur: 10, op: 0.45 },
  medium: { blur: 17, op: 0.7 },
  strong: { blur: 26, op: 0.92 },
};

const DEFAULT_TONE = ['#7dd3fc', '#a5b4fc', '#c4b5fd'];

export default function AgentInsights({
  lines,
  htmlLines,
  title = 'Agent Insights',
  closing = false,
  onClose,
  onClosed,
  tone = DEFAULT_TONE,
  glow = 'medium',
  speed = 1,
  rtl = false,
  fontFamily,
}) {
  const g = GLOW[glow] || GLOW.medium;
  const [c1, c2, c3] = tone && tone.length >= 3 ? tone : DEFAULT_TONE;
  const sp = 1 / (speed || 1);
  const ms = (n) => n * sp + 'ms';
  const body = htmlLines || lines || [];
  const titleFont = fontFamily ? { fontFamily } : undefined;
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!closing || !onClosed) return;
    const t = setTimeout(onClosed, 420 * sp);
    return () => clearTimeout(t);
  }, [closing]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={wrapRef}
      className="ai-wrap"
      onAnimationEnd={(e) => {
        if (closing && e.target === wrapRef.current) onClosed && onClosed();
      }}
      style={{
        position: 'relative',
        borderRadius: 22,
        transformOrigin: 'top center',
        '--c1': c1, '--c2': c2, '--c3': c3,
        '--rb': g.blur + 'px',
        '--ro': g.op,
        animation: closing
          ? `aiClose ${ms(380)} cubic-bezier(.5,0,.75,.3) forwards`
          : `aiOpen ${ms(640)} cubic-bezier(.2,.85,.25,1.05) both`,
      }}
    >
      <style>{`
        @keyframes aiOpen{
          0%{opacity:0;transform:translateY(-16px) scaleY(.66) scaleX(.97);filter:blur(8px);}
          55%{opacity:1;}
          100%{opacity:1;transform:none;filter:none;}
        }
        @keyframes aiClose{
          0%{opacity:1;transform:none;filter:none;}
          100%{opacity:0;transform:translateY(-12px) scaleY(.7);filter:blur(6px);}
        }
        @keyframes blobA{ 0%{transform:translate(-8%,-6%) scale(1);} 50%{transform:translate(11%,9%) scale(1.22);} 100%{transform:translate(-5%,7%) scale(.95);} }
        @keyframes blobB{ 0%{transform:translate(7%,5%) scale(1.06);} 50%{transform:translate(-11%,-9%) scale(.88);} 100%{transform:translate(9%,-5%) scale(1.16);} }
        @keyframes blobC{ 0%{transform:translate(0,9%) scale(1);} 50%{transform:translate(-13%,-7%) scale(1.24);} 100%{transform:translate(7%,3%) scale(.94);} }
        @keyframes aiSheen{ 0%{transform:translateX(0) skewX(-18deg);opacity:0;} 12%{opacity:1;} 100%{transform:translateX(420%) skewX(-18deg);opacity:0;} }
        @keyframes aiFlash{ 0%{transform:translateX(-50%) scale(.3);opacity:.95;} 100%{transform:translateX(-50%) scale(2.4);opacity:0;} }
        @keyframes aiLine{ 0%{opacity:0;transform:translateY(12px);filter:blur(4px);} 100%{opacity:1;transform:none;filter:none;} }
        @keyframes aiTwinkle{ 0%,100%{transform:scale(.7);opacity:.4;} 50%{transform:scale(1.15);opacity:1;} }
        @keyframes aiGlowPulse{ 0%,100%{opacity:var(--ro);} 50%{opacity:calc(var(--ro) * 1.25);} }
        .ai-wrap strong{ color:#5a52d6;font-weight:800; }
      `}</style>

      {/* lava-lamp glow blobs */}
      <div style={{
        position: 'absolute', inset: -16, zIndex: 0, borderRadius: 32,
        overflow: 'visible', filter: `blur(calc(var(--rb) + 14px))`,
        opacity: 'var(--ro)', animation: `aiGlowPulse ${ms(3200)} ease-in-out infinite`,
      }}>
        <span style={{ position: 'absolute', top: '-22%', left: '1%', width: '46%', height: '150%', borderRadius: '50%', background: 'radial-gradient(circle, var(--c1), transparent 68%)', animation: `blobA ${ms(9000)} ease-in-out infinite alternate` }} />
        <span style={{ position: 'absolute', top: '-18%', right: '2%', width: '48%', height: '150%', borderRadius: '50%', background: 'radial-gradient(circle, var(--c2), transparent 68%)', animation: `blobB ${ms(11000)} ease-in-out infinite alternate` }} />
        <span style={{ position: 'absolute', bottom: '-24%', left: '14%', width: '52%', height: '150%', borderRadius: '50%', background: 'radial-gradient(circle, var(--c3), transparent 68%)', animation: `blobC ${ms(13000)} ease-in-out infinite alternate` }} />
        <span style={{ position: 'absolute', bottom: '-20%', right: '16%', width: '44%', height: '140%', borderRadius: '50%', background: 'radial-gradient(circle, var(--c2), transparent 70%)', animation: `blobA ${ms(10000)} ease-in-out ${ms(1200)} infinite alternate` }} />
      </div>

      {/* arrival flash */}
      <div style={{
        position: 'absolute', top: -30, left: '50%',
        width: 240, height: 240, marginTop: -120, zIndex: 0,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,.95), rgba(150,180,255,.5) 40%, transparent 70%)',
        animation: `aiFlash ${ms(700)} ease-out forwards`,
      }} />

      {/* card */}
      <div style={{
        position: 'relative', zIndex: 1, borderRadius: 20, overflow: 'hidden',
        padding: '22px 26px',
        background: 'linear-gradient(135deg,#eef4ff 0%,#f2ecfe 50%,#ebfbff 100%)',
        border: '1px solid rgba(255,255,255,.85)',
        boxShadow: '0 26px 60px -28px rgba(90,110,255,.6), inset 0 1px 0 rgba(255,255,255,.95)',
      }}>
        {/* sheen sweep */}
        <div style={{
          position: 'absolute', top: 0, left: '-45%', width: '45%', height: '100%',
          pointerEvents: 'none',
          background: 'linear-gradient(100deg,transparent,rgba(255,255,255,.7),transparent)',
          animation: `aiSheen ${ms(1100)} ease-out ${ms(220)} 1`,
        }} />

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, position: 'relative' }}>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ width: 34, height: 34, borderRadius: 11, display: 'grid', placeItems: 'center', color: '#6b6f9e', fontSize: 16, background: 'rgba(255,255,255,.6)', border: 'none', cursor: 'pointer', transition: 'background .2s,color .2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.95)'; e.currentTarget.style.color = '#3a3d66'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.6)'; e.currentTarget.style.color = '#6b6f9e'; }}
          >
            ✕
          </button>
          <div style={{ ...titleFont, display: 'flex', alignItems: 'center', gap: 9, fontSize: 20, fontWeight: 800, color: '#474a86' }}>
            <span style={{ filter: 'drop-shadow(0 2px 8px rgba(140,120,255,.7))', animation: `aiTwinkle ${ms(1800)} ease-in-out infinite` }}>✨</span>
            {title}
          </div>
        </div>

        {/* body lines */}
        <div dir={rtl ? 'rtl' : 'ltr'} style={{ display: 'flex', flexDirection: 'column', gap: 13, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          {body.map((line, i) => {
            const common = {
              margin: 0, fontSize: 15.5, lineHeight: 1.7,
              color: '#4c5080', fontWeight: 600,
              animation: closing ? 'none' : `aiLine ${ms(520)} ease ${ms(360 + i * 230)} both`,
            };
            return htmlLines ? (
              <p key={i} style={common} dangerouslySetInnerHTML={{ __html: line }} />
            ) : (
              <p key={i} style={common}>{line}</p>
            );
          })}
        </div>

        {/* drifting sparkles */}
        {[{ t: 14, l: '18%', s: 11, d: 0 }, { t: 54, l: '46%', s: 8, d: 600 }, { t: 24, l: '72%', s: 13, d: 1100 }].map((sp2, i) => (
          <span key={i} style={{ position: 'absolute', top: sp2.t, left: sp2.l, fontSize: sp2.s, pointerEvents: 'none', color: '#a9b6ff', animation: `aiTwinkle ${ms(2200)} ease-in-out ${ms(sp2.d)} infinite` }}>
            ✦
          </span>
        ))}
      </div>
    </div>
  );
}
