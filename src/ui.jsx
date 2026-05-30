/* ── Reusable Enterprise UI Primitives ── */
const { useState: _uS, useEffect: _uE, useRef: _uR } = React;

function Ic({ n, s = 18, c = "currentColor", sw = 1.7 }) {
  const p = {
    flask: <path d="M9 3h6M10 3v5.5L5 18h14L14 8.5V3" strokeLinecap="round" strokeLinejoin="round" />,
    spark: <><path d="M12 2v3M12 19v3M5 5l2 2M17 17l2 2M2 12h3M19 12h3M5 19l2-2M17 7l2-2" strokeLinecap="round" /><circle cx="12" cy="12" r="2.5" /></>,
    book: <><path d="M4 19.5A2.5 2.5 0 016.5 17H20V4H6.5A2.5 2.5 0 004 6.5z" /><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /></>,
    chart: <><path d="M3 3v18h18" /><path d="M7 14l3-4 4 3 5-7" strokeLinecap="round" strokeLinejoin="round" /></>,
    check: <polyline points="4 12 9 17 20 6" strokeLinecap="round" strokeLinejoin="round" />,
    arrow: <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></>,
    back: <><path d="M19 12H5" /><path d="M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></>,
    play: <polygon points="6 4 20 12 6 20" strokeLinejoin="round" />,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-6-3.5-9s1-6.5 3.5-9z" /></>,
    shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" strokeLinejoin="round" />,
    atom: <><circle cx="12" cy="12" r="2" /><ellipse cx="12" cy="12" rx="9" ry="3.5" /><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(120 12 12)" /></>,
    star: <path d="M12 2l2.9 6.3 6.6.6-5 4.4 1.5 6.7L12 17l-5.9 3 1.5-6.7-5-4.4 6.6-.6z" strokeLinejoin="round" />,
    bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" strokeLinejoin="round" strokeLinecap="round" />,
    lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
    drop: <path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z" strokeLinejoin="round" />,
    beaker: <><path d="M8 3h8M9 3v6l-4 9a2 2 0 002 3h12a2 2 0 002-3l-4-9V3" strokeLinejoin="round" strokeLinecap="round" /><path d="M6.5 15h11" /></>,
    note: <><path d="M4 4a2 2 0 012-2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2z" /><path d="M14 2v6h6M8 13h8M8 17h5" strokeLinecap="round" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" /></>,
    trophy: <><path d="M7 4h10v5a5 5 0 01-10 0z" /><path d="M7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3M9 18h6M10 18v-3M14 18v-3M8 21h8" strokeLinecap="round" strokeLinejoin="round" /></>,
    home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" strokeLinejoin="round" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    send: <path d="M4 12l16-7-7 16-2-7z" strokeLinejoin="round" strokeLinecap="round" />,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" strokeLinecap="round" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" strokeLinecap="round" /></>,
    refresh: <><path d="M3 12a9 9 0 0115-6.7L21 8M21 4v4h-4" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 12a9 9 0 01-15 6.7L3 16M3 20v-4h4" strokeLinecap="round" strokeLinejoin="round" /></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
    medal: <><circle cx="12" cy="9" r="6" /><path d="M9 14l-2 7 5-3 5 3-2-7" strokeLinejoin="round" /></>,
    briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>,
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw}>{p[n] || p['info']}</svg>;
}

function Btn({ children, v = "primary", lg, sm, icon, iconL, onClick, disabled, full, style }) {
  const cName = `btn btn-${v} press ${lg ? "btn-lg" : sm ? "btn-sm" : ""}`;
  
  return (
    <button 
      onClick={disabled ? undefined : onClick} 
      className={cName}
      disabled={disabled}
      style={{
        width: full ? "100%" : "auto",
        padding: lg ? "13px 28px" : sm ? "7px 14px" : "10px 20px",
        fontSize: lg ? "15px" : sm ? "12px" : "13.5px",
        ...style
      }}
    >
      {iconL && <Ic n={iconL} s={lg ? 17 : 15} c="currentColor" sw={2} />}
      {children}
      {icon && <Ic n={icon} s={lg ? 17 : 15} c="currentColor" sw={2} />}
    </button>
  );
}

/* VoiceWaveform sound wave visualizer */
function VoiceWaveform({ active, color = C.emBright }) {
  const [bars] = _uS(() => Array.from({ length: 18 }, (_, i) => ({ 
    id: i, 
    h: 5 + Math.random() * 20,
    speed: 0.5 + Math.random() * 0.4 
  })));

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 3.5, height: 32, padding: "0 10px" }}>
      {bars.map((b) => (
        <span 
          key={b.id} 
          style={{
            width: 3.5,
            height: b.h,
            borderRadius: 99,
            background: color,
            transformOrigin: "center",
            animation: active ? `voicePulse ${b.speed}s ease-in-out infinite` : "none",
            opacity: active ? 1 : 0.3,
            transition: "all 0.3s"
          }} 
        />
      ))}
    </div>
  );
}

/* Reveal scroll trigger hook */
function useReveal() {
  const ref = _uR(null);
  _uE(() => {
    const els = ref.current?.querySelectorAll(".reveal");
    if (!els) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in"); }),
      { threshold: 0.08 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* Sleek Gemini Spark AI Avatar */
function SparkAvatar({ size = 40, mood = "happy", glow }) {
  return (
    <div 
      className="press"
      style={{
        width: size, 
        height: size, 
        borderRadius: "24%", 
        flexShrink: 0,
        background: `linear-gradient(135deg, #6366f1, #8b5cf6)`, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        position: "relative",
        boxShadow: glow ? `0 0 0 3px ${C.violetPale}, 0 6px 16px rgba(99,102,241,.24)` : "0 3px 8px rgba(99,102,241,.15)",
        transition: "transform 0.3s cubic-bezier(.16,1,.3,1)"
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.08)"}
      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none">
        <path d="M12 3c.13 2.83 2.17 4.87 5 5-2.83.13-4.87 2.17-5 5-.13-2.83-2.17-4.87-5-5 2.83-.13 4.87-2.17 5-5z" fill="#ffffff" />
        <path d="M19 14c.07 1.41 1.09 2.43 2.5 2.5-1.41.07-2.43 1.09-2.5 2.5-.07-1.41-1.09-2.43-2.5-2.5 1.41-.07 2.43-1.09 2.5-2.5z" fill="#cbd5e1" />
      </svg>
      {mood === "thinking" && (
        <span 
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: C.goldBright,
            border: "1.5px solid #ffffff",
            boxShadow: "0 0 8px #f59e0b"
          }} 
        />
      )}
    </div>
  );
}

function Chip({ children, c = C.ink70, bg, icon, style }) {
  return (
    <span 
      style={{
        display: "inline-flex", 
        alignItems: "center", 
        gap: 5, 
        padding: "4.5px 10px", 
        borderRadius: 6,
        fontSize: 11, 
        fontWeight: 600, 
        letterSpacing: "0.02em", 
        color: c, 
        background: bg || C.paperWarm, 
        border: `1px solid rgba(0,0,0,0.03)`,
        ...style,
      }}
    >
      {icon && <Ic n={icon} s={12} c={c} sw={2} />}{children}
    </span>
  );
}

Object.assign(window, { Ic, Btn, VoiceWaveform, useReveal, SparkAvatar, Chip });
