import { ImageResponse } from 'next/og';
import { SITE } from './site';

// Shared 1200×630 social preview (WhatsApp, Facebook, LinkedIn, X) in the site's ink/cream/bronze colours.
export const OG_SIZE = { width: 1200, height: 630 };

export function ogImage({ eyebrow, title, subtitle }) {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: 'linear-gradient(135deg, #141a24 0%, #1d2129 60%, #5c4128 100%)', color: '#fdfbf7', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#fdfbf7', color: '#8a6739', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 700 }}>S</div>
          <div style={{ fontSize: 34, fontWeight: 600 }}>{SITE.name}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {eyebrow && <div style={{ fontSize: 30, color: '#d9bf94', marginBottom: 16 }}>{eyebrow}</div>}
          <div style={{ fontSize: title.length > 40 ? 64 : 84, fontWeight: 700, lineHeight: 1.05 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 32, color: '#ebe3d5', marginTop: 24, maxWidth: 980 }}>{subtitle}</div>}
        </div>
        <div style={{ display: 'flex', gap: 28, fontSize: 26, color: '#d9bf94' }}>
          <span>Free</span>
          <span>·</span>
          <span>Private</span>
          <span>·</span>
          <span>No watermarks</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
