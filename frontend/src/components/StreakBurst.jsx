import { useState, useEffect, useMemo } from 'react';

const INTENSITY = {
  gentle: { flames: 14, embers: 14, big: 3 },
  medium: { flames: 26, embers: 24, big: 4 },
  intense: { flames: 40, embers: 38, big: 5 },
};

const rand = (a, b) => a + Math.random() * (b - a);

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function StreakBurst({
  origin,
  number = 1,
  intensity = 'intense',
  speed = 1,
  onDone,
  caption,
  fontFamily,
}) {
  const cfg = INTENSITY[intensity] || INTENSITY.intense;
  const sp = 1 / (speed || 1);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const ox = origin.x;
  const oy = origin.y;

  const flames = useMemo(
    () =>
      Array.from({ length: cfg.flames }, () => {
        const dx = cx - ox + rand(-110, 110);
        const dy = cy - oy + rand(-90, 90);
        return {
          size: rand(16, 44),
          dx,
          dy,
          mx: dx * 0.5 + rand(-80, 80),
          my: dy * 0.5 - rand(40, 170),
          r1: rand(-40, 40),
          r2: rand(-200, 200),
          sE: rand(0.5, 1.15),
          delay: rand(0, 360),
          dur: rand(640, 940),
        };
      }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const sparks = useMemo(
    () =>
      Array.from({ length: cfg.embers }, () => {
        const dx = cx - ox + rand(-130, 130);
        const dy = cy - oy + rand(-110, 110);
        return {
          dx,
          dy,
          mx: dx * 0.5 + rand(-70, 70),
          my: dy * 0.5 - rand(30, 150),
          size: rand(4, 9),
          hue: rand(20, 46),
          delay: rand(0, 340),
          dur: rand(620, 900),
        };
      }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const riseEmbers = useMemo(
    () =>
      Array.from({ length: cfg.embers }, () => ({
        x: rand(-120, 120),
        ex: rand(-50, 50),
        size: rand(4, 11),
        hue: rand(18, 46),
        delay: rand(0, 1400),
        dur: rand(1100, 1900),
      })),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const bigFlames = useMemo(
    () =>
      Array.from({ length: cfg.big }, () => ({
        x: rand(-90, 90),
        y: rand(-10, 30),
        size: rand(90, 160),
        delay: rand(0, 500),
        dur: rand(900, 1500),
      })),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    const r = requestAnimationFrame(() => setMounted(true));
    const tm = setTimeout(() => setMounted(true), 24);
    const hold = prefersReducedMotion ? 1600 : 2700;
    const t1 = setTimeout(() => setClosing(true), hold * sp);
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(tm);
      clearTimeout(t1);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => onDone && onDone(), 520 * sp);
    return () => clearTimeout(t);
  }, [closing]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => !closing && setClosing(true);
  const ms = (n) => n * sp + 'ms';
  const show = mounted && !closing;
  const numFont = fontFamily ? { fontFamily } : undefined;

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 9999, cursor: 'pointer', overflow: 'hidden' }}>
      <style>{`
        @keyframes sbFly{
          0%{transform:translate(0,0) scale(.2) rotate(0);opacity:0;}
          14%{opacity:1;}
          50%{transform:translate(var(--mx),var(--my)) scale(1.05) rotate(var(--r1));opacity:1;}
          100%{transform:translate(var(--dx),var(--dy)) scale(var(--sE)) rotate(var(--r2));opacity:0;}
        }
        @keyframes sbReveal{
          0%{opacity:0;transform:translate(-50%,-46%) scale(.45);}
          60%{opacity:1;}
          100%{opacity:1;transform:translate(-50%,-50%) scale(1);}
        }
        @keyframes sbFlick{
          0%,100%{transform:translateY(0) scale(1) rotate(-5deg);}
          50%{transform:translateY(-10px) scale(1.1) rotate(5deg);}
        }
        @keyframes sbGlow{ 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.85;} 50%{transform:translate(-50%,-50%) scale(1.14);opacity:1;} }
        @keyframes sbShock{ 0%{transform:translate(-50%,-50%) scale(.2);opacity:.7;} 100%{transform:translate(-50%,-50%) scale(2.8);opacity:0;} }
        @keyframes sbRise{ 0%{transform:translate(0,0) scale(1);opacity:0;} 18%{opacity:1;} 100%{transform:translate(var(--ex),-180px) scale(.25);opacity:0;} }
        @keyframes sbFlash{ 0%{opacity:.9;} 100%{opacity:0;} }
        @keyframes sbNum{ 0%{transform:scale(.4);opacity:0;} 55%{transform:scale(1.12);opacity:1;} 100%{transform:scale(1);} }
      `}</style>

      {/* dim warm backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(50,18,6,.55), rgba(12,6,16,.88))',
          opacity: show ? 1 : 0,
          transition: `opacity ${ms(380)} ease`,
        }}
      />

      {/* ignition flash */}
      <div
        style={{
          position: 'absolute',
          left: ox,
          top: oy,
          width: 160,
          height: 160,
          marginLeft: -80,
          marginTop: -80,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,210,120,.95), rgba(255,120,30,0) 70%)',
          animation: `sbFlash ${ms(520)} ease-out forwards`,
        }}
      />

      {/* travelling flames */}
      {flames.map((f, i) => (
        <span
          key={'f' + i}
          style={{
            position: 'absolute',
            left: ox,
            top: oy,
            fontSize: f.size,
            lineHeight: 1,
            marginLeft: -f.size / 2,
            marginTop: -f.size / 2,
            filter: 'drop-shadow(0 0 10px rgba(255,140,40,.8))',
            pointerEvents: 'none',
            willChange: 'transform',
            '--dx': f.dx + 'px',
            '--dy': f.dy + 'px',
            '--mx': f.mx + 'px',
            '--my': f.my + 'px',
            '--r1': f.r1 + 'deg',
            '--r2': f.r2 + 'deg',
            '--sE': f.sE,
            animation: `sbFly ${ms(f.dur)} cubic-bezier(.4,.18,.25,1) ${ms(f.delay)} forwards`,
          }}
        >
          🔥
        </span>
      ))}

      {/* travelling sparks */}
      {sparks.map((s, i) => (
        <span
          key={'s' + i}
          style={{
            position: 'absolute',
            left: ox,
            top: oy,
            width: s.size,
            height: s.size,
            marginLeft: -s.size / 2,
            marginTop: -s.size / 2,
            borderRadius: '50%',
            background: `radial-gradient(circle, #fff, hsl(${s.hue},100%,55%) 60%, transparent)`,
            boxShadow: `0 0 8px hsl(${s.hue},100%,60%)`,
            pointerEvents: 'none',
            willChange: 'transform',
            '--dx': s.dx + 'px',
            '--dy': s.dy + 'px',
            '--mx': s.mx + 'px',
            '--my': s.my + 'px',
            '--r1': '0deg',
            '--r2': '0deg',
            '--sE': 0.4,
            animation: `sbFly ${ms(s.dur)} cubic-bezier(.4,.18,.25,1) ${ms(s.delay)} forwards`,
          }}
        />
      ))}

      {/* centre reveal */}
      <div
        style={{
          position: 'absolute',
          left: cx,
          top: cy,
          animation: closing
            ? `sbReveal ${ms(440)} cubic-bezier(.5,0,.75,0) reverse forwards`
            : `sbReveal ${ms(620)} cubic-bezier(.34,1.56,.64,1) ${ms(480)} both`,
          pointerEvents: 'none',
        }}
      >
        {/* glow */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 10,
            width: 420,
            height: 420,
            marginLeft: -210,
            marginTop: -210,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,180,60,.85), rgba(255,90,20,.35) 45%, transparent 70%)',
            filter: 'blur(6px)',
            animation: `sbGlow ${ms(1600)} ease-in-out infinite`,
          }}
        />

        {/* shockwave */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 160,
            height: 160,
            marginLeft: -80,
            marginTop: -80,
            borderRadius: '50%',
            border: '5px solid rgba(255,190,90,.9)',
            animation: `sbShock ${ms(900)} ease-out ${ms(520)} forwards`,
          }}
        />

        {/* rising embers */}
        {riseEmbers.map((e, i) => (
          <span
            key={'r' + i}
            style={{
              position: 'absolute',
              left: e.x,
              top: 60,
              width: e.size,
              height: e.size,
              marginLeft: -e.size / 2,
              borderRadius: '50%',
              background: `radial-gradient(circle,#fff,hsl(${e.hue},100%,55%) 60%,transparent)`,
              boxShadow: `0 0 7px hsl(${e.hue},100%,60%)`,
              '--ex': e.ex + 'px',
              animation: `sbRise ${ms(e.dur)} ease-out ${ms(700 + e.delay)} infinite`,
            }}
          />
        ))}

        {/* big licking flames behind the number */}
        {bigFlames.map((b, i) => (
          <span
            key={'b' + i}
            style={{
              position: 'absolute',
              left: b.x,
              top: b.y,
              fontSize: b.size,
              lineHeight: 1,
              marginLeft: -b.size / 2,
              marginTop: -b.size / 2,
              filter: 'drop-shadow(0 0 22px rgba(255,120,30,.85))',
              transformOrigin: 'bottom center',
              animation: `sbFlick ${ms(b.dur)} ease-in-out ${ms(b.delay)} infinite`,
            }}
          >
            🔥
          </span>
        ))}

        {/* number + caption */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: 'translate(-50%,-50%)',
            textAlign: 'center',
            width: 360,
            animation: `sbNum ${ms(620)} cubic-bezier(.34,1.56,.64,1) ${ms(620)} both`,
          }}
        >
          <div
            style={{
              ...numFont,
              fontSize: 'clamp(110px,16vw,190px)',
              fontWeight: 800,
              lineHeight: 0.9,
              background: 'linear-gradient(180deg,#fff 8%,#ffe08a 48%,#ff7a18 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              filter: 'drop-shadow(0 4px 26px rgba(255,120,20,.85))',
            }}
          >
            {number}
          </div>
          <div
            style={{
              ...numFont,
              marginTop: 6,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '.14em',
              color: '#ffd9a0',
              textShadow: '0 2px 18px rgba(255,120,20,.7)',
            }}
          >
            DAY STREAK
          </div>
          {caption && (
            <div style={{ marginTop: 4, fontSize: 16, fontWeight: 700, color: '#ffb877' }}>{caption}</div>
          )}
        </div>
      </div>

      {/* dismiss hint */}
      <div
        style={{
          position: 'absolute',
          bottom: 34,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,220,180,.7)',
          fontSize: 13,
          fontWeight: 600,
          opacity: show ? 1 : 0,
          transition: `opacity ${ms(400)} ease ${ms(900)}`,
        }}
      >
        Click anywhere to dismiss
      </div>
    </div>
  );
}
