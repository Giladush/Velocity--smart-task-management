import { useRef, useCallback, useLayoutEffect } from 'react';

/* 1 — keyframes (inject once) */
export function CrudKeyframes() {
  return (
    <style>{`
      @keyframes crudRowIn   {0%{opacity:0;transform:translateY(-12px);}100%{opacity:1;transform:none;}}
      @keyframes crudRowOut  {0%{opacity:1;transform:none;}100%{opacity:0;transform:translateX(30px);}}
      @keyframes crudCardIn  {0%{opacity:0;transform:translateY(-14px) scale(.96);}100%{opacity:1;transform:none;}}
      @keyframes crudCardOut {0%{opacity:1;transform:none;}100%{opacity:0;transform:translateX(30px) scale(.94);}}
      @keyframes crudGlowRow  {0%{box-shadow:inset 0 0 0 2px var(--agent,#7c5cff), inset 0 0 24px rgba(124,92,255,.35);background:#f4f0ff;}100%{box-shadow:inset 0 0 0 0 transparent;}}
      @keyframes crudGlowCard {0%{box-shadow:0 0 0 2px var(--agent,#7c5cff), 0 0 26px rgba(124,92,255,.5);}100%{box-shadow:0 3px 10px -6px rgba(80,70,160,.3);}}
    `}</style>
  );
}

/* 2 — FLIP: measures offsetTop/offsetLeft, never fights CSS enter/exit animation.
   Call once per list/column container. */
export function useFlip() {
  const nodes = useRef(new Map());
  const prev = useRef(new Map());
  const register = useCallback((id) => (el) => {
    if (el) nodes.current.set(id, el); else nodes.current.delete(id);
  }, []);
  useLayoutEffect(() => {
    nodes.current.forEach((el, id) => {
      const before = prev.current.get(id);
      const top = el.offsetTop, left = el.offsetLeft;
      if (before) {
        const dx = before.left - left, dy = before.top - top;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          el.style.transition = 'none';
          el.style.transform = `translate(${dx}px,${dy}px)`;
          requestAnimationFrame(() => {
            el.style.transition = 'transform calc(.4s * var(--speed, 1)) cubic-bezier(.4,0,.2,1)';
            el.style.transform = '';
          });
        }
      }
    });
    const m = new Map();
    nodes.current.forEach((el, id) => m.set(id, { top: el.offsetTop, left: el.offsetLeft }));
    prev.current = m;
  });
  return { register };
}

/* 3 — per-item animation shorthand.
   kind: 'row' | 'card'  ·  leaving: bool  ·  source: 'form'|'agent'|undefined */
const POP = 'cubic-bezier(.34,1.56,.64,1)';
const SOFT = 'cubic-bezier(.4,0,.2,1)';

export function crudAnimation({ kind = 'row', leaving = false, source } = {}) {
  const card = kind === 'card';
  const inName = card ? 'crudCardIn' : 'crudRowIn';
  const outName = card ? 'crudCardOut' : 'crudRowOut';
  const glow = card ? 'crudGlowCard' : 'crudGlowRow';
  if (leaving) return `${outName} calc(.5s * var(--speed,1)) ${SOFT} forwards`;
  const enter = `${inName} calc(${card ? .44 : .4}s * var(--speed,1)) ${POP}`;
  if (source === 'agent') return `${enter}, ${glow} calc(${card ? 1.6 : 1.5}s * var(--speed,1)) ease-out`;
  return enter;
}

/* optional: background tint for an AGENT-deleted item (red flash). */
export function crudLeavingBg(task) {
  return task && task.leaving && task.source === 'agent' ? '#fff0f1' : null;
}
