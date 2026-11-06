'use client';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

/** Submit button that asks before running a destructive admin action. */
export default function ConfirmButton({ confirm: message, className, children, ...props }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => message && !window.confirm(message) && e.preventDefault()}
      className={`inline-flex items-center gap-1.5 disabled:opacity-60 ${className || ''}`}
      {...props}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
