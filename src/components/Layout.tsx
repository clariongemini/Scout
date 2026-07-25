import React from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface-container-lowest text-on-surface font-body-lg min-h-screen flex flex-col">

      {/* ── Main Content (no nav, no sidebar) ── */}
      <main className="flex-1 flex justify-center items-start pb-16">
        <div className="w-full max-w-[1500px] px-4 md:px-8 mt-10">
          {children}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10"
              style={{
                background: 'rgba(8, 10, 16, 0.98)',
                borderTop: '1px solid rgba(212, 175, 55, 0.08)',
              }}>
        <div className="flex justify-between items-center px-8 py-4">
          <span className="text-[11px] font-medium text-on-surface-variant tracking-wide">
            © 2026 ScoutCard Generator · Yüksek Performanslı Futbolcu Keşif Platformu
          </span>
          <div className="flex gap-6 text-[11px] font-medium text-on-surface-variant">
            <span>Scout: <span style={{ color: '#D4AF37' }}>@_Salih_klc_</span></span>
            <span>Architect: <span style={{ color: '#4FC3F7' }}>@UlasKasikci</span></span>
            <span style={{ color: '#10B981' }}>FSRS v8.1</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
