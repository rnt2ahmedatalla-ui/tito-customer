export function LeatherPattern() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 hero-glow" />
      <div className="absolute inset-0 leather-grain opacity-80" />
      {/* Full emblem watermark — keep inside the viewport (no negative inset crop) */}
      <img
        src="/brand/tito-icon-512.png"
        alt=""
        className="absolute end-6 top-1/2 w-[min(52vw,360px)] max-w-[360px] -translate-y-1/2 opacity-[0.09] select-none"
        style={{ height: 'auto' }}
        decoding="async"
        draggable={false}
      />
    </div>
  );
}

export function GoldDivider() {
  return <div className="gold-rule my-6 w-full" aria-hidden />;
}
