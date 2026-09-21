export function LeatherPattern() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, transparent, transparent 8px, rgba(204,149,66,0.4) 8px, rgba(204,149,66,0.4) 9px)',
        }}
      />
      <div
        className="absolute -end-24 -top-24 size-96 opacity-[0.04]"
        style={{
          backgroundImage: 'url(/brand/tito-icon-512.png)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div
        className="absolute start-1/2 top-1/3 size-[500px] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #CC9542 0%, transparent 70%)' }}
      />
    </div>
  );
}

export function GoldDivider() {
  return (
    <div
      className="my-6 h-px w-full"
      style={{ background: 'linear-gradient(90deg, transparent, var(--gold, #CC9542), transparent)' }}
      aria-hidden
    />
  );
}
