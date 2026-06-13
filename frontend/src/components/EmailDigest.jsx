import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';

const GLOW = { soft: { blur: 10, op: 0.45 }, medium: { blur: 17, op: 0.7 }, strong: { blur: 26, op: 0.92 } };
const DEFAULT_TONE = ['#7dd3fc', '#a5b4fc', '#c4b5fd'];
const DEFAULT_STATUS = [
  'Connecting to your inbox…',
  'Reading your messages…',
  'Filtering by relevance…',
  'Writing a summary…',
];

function AutoHeight({ trigger, children }) {
  const ref = useRef(null);
  const prev = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = el.scrollHeight;
    if (prev.current != null && prev.current !== next) {
      el.style.height = prev.current + 'px';
      el.getBoundingClientRect();
      el.style.transition = 'height .5s cubic-bezier(.2,.85,.25,1)';
      el.style.height = next + 'px';
      const done = () => {
        el.style.height = 'auto';
        el.style.transition = '';
        el.removeEventListener('transitionend', done);
      };
      el.addEventListener('transitionend', done);
    }
    prev.current = next;
  }, [trigger]);
  return <div ref={ref} style={{ overflow: 'hidden' }}>{children}</div>;
}

function Scanner({ sp, tone, statuses }) {
  const ms = (n) => n * sp + 'ms';
  const [c1, c2] = tone;
  const lines = statuses && statuses.length ? statuses : DEFAULT_STATUS;
  const [si, setSi] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setSi((i) => (i + 1) % lines.length), 1000 * sp);
    return () => clearInterval(iv);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const envelopes = useMemo(
    () => Array.from({ length: 7 }, (_, i) => ({
      y: -54 + Math.random() * 108,
      delay: i * 430 + Math.random() * 120,
      dur: 1100 + Math.random() * 500,
      size: 15 + Math.random() * 9,
    })),
    []
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0 6px' }}>
      <div style={{ position: 'relative', width: 150, height: 150, display: 'grid', placeItems: 'center' }}>
        {envelopes.map((e, i) => (
          <span key={i} style={{ position: 'absolute', left: '50%', top: '50%', fontSize: e.size, filter: `drop-shadow(0 2px 5px ${c2}aa)`, '--ey': e.y + 'px', animation: `edInflow ${ms(e.dur)} ease-in ${ms(e.delay)} infinite` }}>✉️</span>
        ))}
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ position: 'absolute', width: 78, height: 78, borderRadius: '50%', border: `2px solid ${c2}`, animation: `edRing ${ms(2400)} ease-out ${ms(i * 800)} infinite` }} />
        ))}
        <div style={{ position: 'absolute', width: 104, height: 104, borderRadius: '50%', overflow: 'hidden', opacity: 0.85 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(from 0deg, transparent 0deg, ${c1}00 250deg, ${c1}cc 330deg, #ffffff 360deg)`, animation: `edSpin ${ms(1500)} linear infinite` }} />
        </div>
        <div style={{ position: 'relative', width: 74, height: 74, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 30, background: 'radial-gradient(circle at 40% 35%, #ffffff, #eaf0ff 60%, #dbe6ff)', boxShadow: `0 0 0 6px #ffffff, 0 0 30px 6px ${c2}66, inset 0 2px 6px rgba(255,255,255,.9)`, animation: `edCore ${ms(1800)} ease-in-out infinite` }}>📡</div>
      </div>
      <div style={{ height: 24, marginTop: 8, position: 'relative', width: '100%', textAlign: 'center' }}>
        <span key={si} style={{ position: 'absolute', left: 0, right: 0, fontSize: 14.5, fontWeight: 700, color: '#5b5f9c', animation: `edStatus ${ms(1000)} ease both` }}>{lines[si]}</span>
      </div>
      <div style={{ width: '72%', height: 7, borderRadius: 6, marginTop: 12, background: 'rgba(140,150,220,.18)', overflow: 'hidden', position: 'relative' }}>
        <div style={{ height: '100%', borderRadius: 6, background: `linear-gradient(90deg,${tone[0]},${tone[1]},${tone[2]})`, width: '40%', animation: `edProg ${ms(2200)} ease-in-out infinite` }} />
      </div>
    </div>
  );
}

function EmailCard({ e, i, sp, closing, onMakeTask, onOpenEmail }) {
  const ms = (n) => n * sp + 'ms';
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', gap: 13, padding: '13px 14px', borderRadius: 14,
        background: 'rgba(255,255,255,.72)',
        border: '1px solid ' + (hover ? 'rgba(150,160,240,.55)' : 'rgba(255,255,255,.9)'),
        boxShadow: hover ? '0 16px 30px -18px rgba(90,110,255,.6)' : '0 4px 14px -10px rgba(90,110,255,.4)',
        transform: hover ? 'translateY(-2px)' : 'none',
        transition: 'transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .25s, border-color .2s',
        animation: closing ? 'none' : `edCard ${ms(540)} cubic-bezier(.2,.85,.25,1.05) ${ms(120 + i * 150)} both`,
      }}
    >
      <div style={{ width: 42, height: 42, flex: 'none', borderRadius: 13, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 17, background: `linear-gradient(135deg, ${e.color}, ${e.color}bb)`, boxShadow: `0 6px 14px -6px ${e.color}cc` }}>{e.initial}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
          <span style={{ fontWeight: 800, fontSize: 14.5, color: '#3a3d66', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{e.from}</span>
          {e.time && <span style={{ fontSize: 12, color: '#9a99bb', fontWeight: 600, whiteSpace: 'nowrap', flex: 'none' }}>· {e.time}</span>}
          {e.tag && <span style={{ marginInlineStart: 'auto', flex: 'none', background: e.tag.bg, color: e.tag.c, fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>{e.tag.label}</span>}
        </div>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#4c5080', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.subject}</div>
        <div style={{ fontSize: 13, color: '#83849f', fontWeight: 600, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{e.snippet}</div>
        <div style={{ marginTop: 9, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span onClick={() => onMakeTask && onMakeTask(e)} style={{ fontSize: 12, fontWeight: 800, color: '#6b4bf2', background: '#efeaff', padding: '5px 11px', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap', opacity: hover ? 1 : 0.82, transition: 'opacity .2s' }}>+ הוסף כמשימה</span>
          <span onClick={() => onOpenEmail && onOpenEmail(e)} style={{ fontSize: 12, fontWeight: 700, color: '#8a8aa8', padding: '5px 4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>פתח</span>
        </div>
      </div>
    </div>
  );
}

export default function EmailDigest({
  phase,
  emails = [],
  subtitle,
  title = 'Email Digest',
  scanningTitle = 'Collecting Emails',
  statuses,
  onClose,
  onClosed,
  onMakeTask,
  onOpenEmail,
  tone = DEFAULT_TONE,
  glow = 'medium',
  speed = 1,
}) {
  const g = GLOW[glow] || GLOW.medium;
  const T = tone && tone.length >= 3 ? tone : DEFAULT_TONE;
  const [c1, c2, c3] = T;
  const sp = 1 / (speed || 1);
  const ms = (n) => n * sp + 'ms';
  const closing = phase === 'closing';
  const showResults = phase === 'open' || phase === 'closing';
  const wrapRef = useRef(null);
  const sub = subtitle || `${emails.length} מיילים רלוונטיים`;

  useEffect(() => {
    if (!closing || !onClosed) return;
    const t = setTimeout(onClosed, 420 * sp);
    return () => clearTimeout(t);
  }, [closing]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={wrapRef}
      onAnimationEnd={(e) => { if (closing && e.target === wrapRef.current) onClosed && onClosed(); }}
      style={{
        position: 'relative', borderRadius: 22, transformOrigin: 'top center',
        '--c1': c1, '--c2': c2, '--c3': c3, '--rb': g.blur + 'px', '--ro': g.op,
        animation: closing
          ? `edClose ${ms(380)} cubic-bezier(.5,0,.75,.3) forwards`
          : `edOpen ${ms(640)} cubic-bezier(.2,.85,.25,1.05) both`,
      }}
    >
      <style>{`
        @keyframes edOpen{0%{opacity:0;transform:translateY(-16px) scaleY(.66) scaleX(.97);filter:blur(8px);}55%{opacity:1;}100%{opacity:1;transform:none;filter:none;}}
        @keyframes edClose{0%{opacity:1;transform:none;filter:none;}100%{opacity:0;transform:translateY(-12px) scaleY(.7);filter:blur(6px);}}
        @keyframes edSpin{to{transform:rotate(360deg);}}
        @keyframes edCore{0%,100%{transform:scale(1);}50%{transform:scale(1.07);}}
        @keyframes edRing{0%{transform:scale(.6);opacity:.8;}100%{transform:scale(1.7);opacity:0;}}
        @keyframes edInflow{0%{transform:translate(140px,var(--ey)) scale(.9);opacity:0;}18%{opacity:1;}72%{opacity:1;}100%{transform:translate(-4px,0) scale(.2);opacity:0;}}
        @keyframes edStatus{0%{opacity:0;transform:translateY(7px);}100%{opacity:1;transform:none;}}
        @keyframes edProg{0%{transform:translateX(-130%);}100%{transform:translateX(330%);}}
        @keyframes edCard{0%{opacity:0;transform:translateY(16px) scale(.96);filter:blur(3px);}100%{opacity:1;transform:none;filter:none;}}
        @keyframes edBlobA{0%{transform:translate(-8%,-6%) scale(1);}50%{transform:translate(11%,9%) scale(1.22);}100%{transform:translate(-5%,7%) scale(.95);}}
        @keyframes edBlobB{0%{transform:translate(7%,5%) scale(1.06);}50%{transform:translate(-11%,-9%) scale(.88);}100%{transform:translate(9%,-5%) scale(1.16);}}
        @keyframes edBlobC{0%{transform:translate(0,9%) scale(1);}50%{transform:translate(-13%,-7%) scale(1.24);}100%{transform:translate(7%,3%) scale(.94);}}
        @keyframes edSheen{0%{transform:translateX(0) skewX(-18deg);opacity:0;}12%{opacity:1;}100%{transform:translateX(620%) skewX(-18deg);opacity:0;}}
        @keyframes edTwinkle{0%,100%{transform:scale(.7);opacity:.4;}50%{transform:scale(1.15);opacity:1;}}
        @keyframes edGlowPulse{0%,100%{opacity:var(--ro);}50%{opacity:calc(var(--ro)*1.25);}}
      `}</style>

      {/* lava-lamp glow */}
      <div style={{ position: 'absolute', inset: -16, zIndex: 0, borderRadius: 32, filter: `blur(calc(var(--rb) + 14px))`, opacity: 'var(--ro)', animation: `edGlowPulse ${ms(3200)} ease-in-out infinite` }}>
        <span style={{ position: 'absolute', top: '-22%', left: '1%', width: '46%', height: '150%', borderRadius: '50%', background: `radial-gradient(circle, var(--c1), transparent 68%)`, animation: `edBlobA ${ms(9000)} ease-in-out infinite alternate` }} />
        <span style={{ position: 'absolute', top: '-18%', right: '2%', width: '48%', height: '150%', borderRadius: '50%', background: `radial-gradient(circle, var(--c2), transparent 68%)`, animation: `edBlobB ${ms(11000)} ease-in-out infinite alternate` }} />
        <span style={{ position: 'absolute', bottom: '-24%', left: '14%', width: '52%', height: '150%', borderRadius: '50%', background: `radial-gradient(circle, var(--c3), transparent 68%)`, animation: `edBlobC ${ms(13000)} ease-in-out infinite alternate` }} />
      </div>

      {/* card */}
      <div style={{ position: 'relative', zIndex: 1, borderRadius: 20, overflow: 'hidden', padding: '20px 22px', background: 'linear-gradient(135deg,#eef4ff 0%,#f2ecfe 50%,#ebfbff 100%)', border: '1px solid rgba(255,255,255,.85)', boxShadow: '0 26px 60px -28px rgba(90,110,255,.6), inset 0 1px 0 rgba(255,255,255,.95)' }}>
        <div style={{ position: 'absolute', top: 0, left: '-45%', width: '45%', height: '100%', pointerEvents: 'none', background: 'linear-gradient(100deg,transparent,rgba(255,255,255,.7),transparent)', animation: `edSheen ${ms(1100)} ease-out ${ms(220)} 1` }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, position: 'relative' }}>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ width: 34, height: 34, borderRadius: 11, display: 'grid', placeItems: 'center', color: '#6b6f9e', fontSize: 16, background: 'rgba(255,255,255,.6)', border: 'none', cursor: 'pointer', transition: 'background .2s,color .2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.95)'; e.currentTarget.style.color = '#3a3d66'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.6)'; e.currentTarget.style.color = '#6b6f9e'; }}
          >✕</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 19, fontWeight: 800, color: '#474a86' }}>
            <span style={{ filter: 'drop-shadow(0 2px 8px rgba(140,120,255,.7))', animation: `edTwinkle ${ms(1800)} ease-in-out infinite` }}>✨</span>
            {showResults ? title : scanningTitle}
          </div>
        </div>

        <AutoHeight trigger={showResults}>
          {showResults ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#8587b0', margin: '0 4px 12px' }}>{sub}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {emails.map((e, i) => (
                  <EmailCard key={i} e={e} i={i} sp={sp} closing={closing} onMakeTask={onMakeTask} onOpenEmail={onOpenEmail} />
                ))}
              </div>
            </div>
          ) : (
            <Scanner sp={sp} tone={T} statuses={statuses} />
          )}
        </AutoHeight>
      </div>
    </div>
  );
}
