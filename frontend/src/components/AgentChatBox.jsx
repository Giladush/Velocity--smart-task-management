import { useRef, useState } from 'react';

export default function AgentChatBox({
  value,
  onChange,
  onSubmit,
  thinking = false,
  thinkingLabel = 'Thinking',
  placeholder = 'Break down a goal…',
  accent = ['#5b8cff', '#8a6bff'],
}) {
  const ref = useRef(null);
  const [focus, setFocus] = useState(false);

  const submit = () => {
    if (thinking || !value.trim()) return;
    const r = ref.current.getBoundingClientRect();
    onSubmit && onSubmit({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        background: '#f6f5fb',
        borderRadius: 12,
        border: '1.5px solid ' + (thinking ? '#aebcff' : focus ? '#c7cdff' : '#ecebf5'),
        boxShadow: thinking
          ? '0 0 0 4px rgba(150,170,255,.22), 0 14px 30px -14px rgba(110,120,255,.65)'
          : focus
          ? '0 0 0 3px rgba(150,170,255,.16)'
          : 'none',
        transition: 'box-shadow .3s, border-color .3s',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes acbWiggle{0%,100%{transform:rotate(-8deg) scale(1);}50%{transform:rotate(8deg) scale(1.12);}}
        @keyframes acbDot{0%,100%{transform:translateY(0);opacity:.4;}50%{transform:translateY(-4px);opacity:1;}}
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '10px 8px 10px 12px' }}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={thinking}
          rows={2}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder={placeholder}
          style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none', fontSize: 13.5, fontWeight: 600, color: '#2b2740', fontFamily: 'inherit', resize: 'none', lineHeight: 1.5 }}
        />
        <button
          onClick={submit}
          aria-label="Send"
          onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(.88)')}
          onPointerUp={(e) => (e.currentTarget.style.transform = '')}
          onPointerLeave={(e) => (e.currentTarget.style.transform = '')}
          style={{ width: 32, height: 32, flex: 'none', borderRadius: 9, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 15, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${accent[0]},${accent[1]})`, boxShadow: '0 8px 18px -8px rgba(110,120,255,.8)', transition: 'transform .16s cubic-bezier(.34,1.56,.64,1)' }}
        >
          ↑
        </button>
      </div>

      {thinking && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg,#eef2ff,#f3eeff 50%,#eafaff)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontSize: 13, fontWeight: 700, color: '#6a6bd0' }}>
          <span style={{ display: 'inline-block', animation: 'acbWiggle 1.3s ease-in-out infinite' }}>✨</span>
          {thinkingLabel}
          <span style={{ display: 'inline-flex', gap: 3 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#8a8bf0', animation: `acbDot 1s ease-in-out ${i * 0.18}s infinite` }} />
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
