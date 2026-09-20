export function Logo({ compact = false }: { compact?: boolean }) {
  return <span className="brand"><svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M6 5.5 16 1l10 4.5v9L16 19 6 14.5z" fill="#8b5de0"/><path className="brand-layer" d="m6 12 10 4.5L26 12v8.5L16 25 6 20.5z" fill="#6f35d2"/><path d="m6 19 10 4.5L26 19v7.5L16 31 6 26.5z" fill="#3d1a75"/></svg>{!compact && <span>PURPO</span>}</span>;
}
