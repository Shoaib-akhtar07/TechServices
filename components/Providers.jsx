'use client';
import { createContext, useContext } from 'react';
import { SessionProvider } from 'next-auth/react';

// Admin-managed values the browser components need (read on the server in app/layout.jsx).
const SiteContext = createContext({ freeMode: false, tools: [] });

/** Free mode (admin → Settings): every tool is free, so Pro badges and pricing links are hidden. */
export const useFreeMode = () => useContext(SiteContext).freeMode;
/** Tools the admin has left visible, with their edited names (for menus and the tool grid). */
export const useTools = () => useContext(SiteContext).tools;

export default function Providers({ children, freeMode = false, tools = [] }) {
  // Keep the session in the browser instead of asking the server on every tab switch.
  // Pages that change the plan (pricing, account) call update() themselves.
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <SiteContext.Provider value={{ freeMode, tools }}>{children}</SiteContext.Provider>
    </SessionProvider>
  );
}
