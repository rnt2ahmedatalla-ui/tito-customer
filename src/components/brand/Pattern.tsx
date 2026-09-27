export function LeatherPattern() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 hero-glow" />
      <div className="absolute inset-0 leather-grain opacity-80" />
      {/* Full emblem watermark — keep inside the viewport (no negative inset crop) */}
      <img
        src="/brand/tito-icon-512.png"
        alt=""
        className="absolute end-2 top-[12%] w-[min(40vw,180px)] opacity-[0.08] select-none sm:end-6 sm:top-1/2 sm:w-[min(52vw,360px)] sm:-translate-y-1/2 sm:opacity-[0.09]"
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
