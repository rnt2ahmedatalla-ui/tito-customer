export function LeatherPattern() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 hero-glow" />
      <div className="absolute inset-0 leather-grain opacity-80" />
      <div
        className="absolute -end-20 top-[12%] size-[min(72vw,440px)] opacity-[0.07]"
        style={{
          backgroundImage: 'url(/brand/tito-icon-512.png)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      />
    </div>
  );
}

export function GoldDivider() {
  return <div className="gold-rule my-6 w-full" aria-hidden />;
}
