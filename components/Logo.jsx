export default function Logo({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="softservices-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#141a24" />
          <stop offset="0.6" stopColor="#1d2129" />
          <stop offset="1" stopColor="#5c4128" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#softservices-logo)" />
      <path d="M10 6h8l6 6v12a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" fill="#fdfbf7" />
      <path d="M18 6v6h6" fill="#d9bf94" />
      <path d="M17.2 16.4c-.6-.8-1.6-1.2-2.7-1.2-1.4 0-2.5.8-2.5 1.9 0 2.7 5.4 1.5 5.4 4.3 0 1.2-1.1 2.1-2.8 2.1-1.2 0-2.2-.4-2.8-1.3" stroke="#8a6739" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
