export default function Logo({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#3b52f0" />
      <path d="M10 6h8l6 6v12a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" fill="#fff" />
      <path d="M18 6v6h6" fill="#c7d2fe" />
      <path d="M12 22v-6l5 6v-6" stroke="#3b52f0" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
