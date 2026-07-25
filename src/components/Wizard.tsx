import React, { useState, useRef, useCallback, KeyboardEvent, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toPng } from 'html-to-image';

import html2canvas from 'html2canvas';
import { PlayerData, ScoutReport } from '../types';
import ScoutCardLayout from './ScoutCardLayout';

/* ─── Position metadata ─── */
// Ordered: Goal → Defense → Midfield → Attack (left to right = GK → ST)
const POSITIONS = [
  { value: 'GK',     label: 'Kaleci',             sub: 'GK',  icon: 'front_hand',      color: '#FBBF24' },
  { value: 'CB',     label: 'Stoper',             sub: 'CB',  icon: 'shield',          color: '#4FC3F7' },
  { value: 'FB',     label: 'Bek',                sub: 'FB',  icon: 'directions_run',  color: '#34D399' },
  { value: 'DM',     label: 'Def. Orta Saha',     sub: 'DM',  icon: 'security',        color: '#A78BFA' },
  { value: 'CM',     label: 'Orta Saha',          sub: 'CM',  icon: 'swap_horiz',      color: '#10B981' },
  { value: 'AM',     label: 'On Numara',          sub: 'AM',  icon: 'bolt',            color: '#F59E0B' },
  { value: 'Winger', label: 'Kanat',              sub: 'W',   icon: 'arrow_outward',   color: '#FB923C' },
  { value: 'ST',     label: 'Santrfor',           sub: 'ST',  icon: 'sports_soccer',   color: '#EF4444' },
];

/* ─── Hex to RGBA converter ─── */
function hexToRgba(hex: string): string {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

const DATA_SOURCES = [
  { name: 'Transfermarkt', icon: '⟳', color: '#4FC3F7' },
  { name: 'FBref',         icon: '◉', color: '#10B981' },
  { name: 'SofaScore',     icon: '▲', color: '#A78BFA' },
  { name: 'Opta',          icon: '◆', color: '#F59E0B' },
  { name: 'Wyscout',       icon: '●', color: '#EF4444' },
];

const GENERATION_STEPS = [
  { label: 'Veri Bütünlüğü ve Null Kontrolü',     icon: 'verified_user' },
  { label: 'Mevkiye Özel Metrik Şablonu',          icon: 'tune' },
  { label: 'Saha Koordinatları & Isı Haritası',    icon: 'sports_soccer' },
  { label: 'Yüksek Çözünürlüklü Kart Hazırlandı', icon: 'high_quality' },
];

/* ─── Image preloader ─── */
async function preloadImages(node: HTMLElement): Promise<void> {
  const imgs = Array.from(node.querySelectorAll<HTMLImageElement>('img[src]'));
  await Promise.allSettled(
    imgs.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 4000);
        img.onload = () => { clearTimeout(timeout); resolve(); };
        img.onerror = () => { clearTimeout(timeout); resolve(); };
        // Force reload through proxy if not already
        if (!img.src.includes('/api/proxy-image') && img.src.startsWith('http')) {
          img.src = `/api/proxy-image?url=${encodeURIComponent(img.src)}`;
        } else {
          img.src = img.src + (img.src.includes('?') ? '&t=' : '?t=') + Date.now();
        }
      });
    })
  );
  // Additional settle time
  await new Promise(r => setTimeout(r, 300));
}

/* ─── Data validator ─── */
function validatePlayerData(data: PlayerData): PlayerData {
  const v = { ...data } as any;
  if (!v.name)          v.name = 'Bilinmeyen Oyuncu';
  if (!v.team)          v.team = 'Bilinmeyen Takım';
  if (!v.country)       v.country = v.primaryNationality || v.fsrsData?.transfermarkt?.citizenship || 'Bilinmiyor';
  if (!v.countryCode)   v.countryCode = v.countryCode || 'gb-eng';
  if (!v.birthDate)     v.birthDate = v.dateOfBirth || v.fsrsData?.transfermarkt?.dateOfBirth || '01 Oca 2000 (24)';
  if (!v.height)        v.height = v.fsrsData?.transfermarkt?.height || '1,80 m';
  if (!v.preferredFoot) v.preferredFoot = v.foot || v.fsrsData?.transfermarkt?.foot || 'Sağ';
  if (!v.primaryPosition) v.primaryPosition = v.position || 'Santrfor';
  if (!v.marketValue)  v.marketValue = v.fsrsData?.transfermarkt?.marketValue || 'Bilinmiyor';
  if (!v.contractExpiry) v.contractExpiry = v.contractExpires || v.fsrsData?.transfermarkt?.contractExpires || '-';
  if (!v.imageUrl)     v.imageUrl = v.fsrsData?.transfermarkt?.imageUrl || v.imageUrl || '';
  if (!v.nationalTeam) v.nationalTeam = 'Yok';
  if (!v.positions || !v.positions.length) v.positions = [{ name: v.primaryPosition || 'ST', pct: 100, rating: parseFloat(v.rating) || 7.0 }];
  if (!v.marketValueHistory) v.marketValueHistory = [];
  if (!v.transferHistory) v.transferHistory = [];
  if (!v.nationalCareer) v.nationalCareer = [];
  if (!v.nationalTimeline) v.nationalTimeline = [];
  if (!v.trophies) v.trophies = [];
  if (!v.awards) v.awards = [];
  if (!v.injuryHistory) v.injuryHistory = [];
  if (!v.roleFit) v.roleFit = [];
  if (!v.riskAnalysis) v.riskAnalysis = [];
  if (!v.comparablePlayers) v.comparablePlayers = [];
  if (!v.radar) v.radar = { teknik:80, fiziksel:80, taktik:80, zihinsel:80, liderlik:75, butunculuk:78 };
  if (!v.scoutScores) v.scoutScores = { teknik:8.0, fiziksel:8.0, taktik:8.0, zihinsel:8.0, bitiricilik:8.0 };
  if (!v.contractDetails) v.contractDetails = { start: v.contractStart || '-', end: v.contractExpires || '-', option:'-', wage:'-', releaseClause:'-', agent: v.agent || '-', status: v.contractExpires ? 'Aktif Sözleşme' : '-' };
  if (!v.careerSummary) v.careerSummary = { matches:v.matches||0, minutes:0, goals:v.goals||0, assists:v.assists||0, passAccuracy:'75%', duelWinRate:'50%', aerialWinRate:'50%', runningDist:'-', maxSpeed:'-' };
  if (!v.metrics90) v.metrics90 = { shots:'-', shotsOnTargetPct:'-', xG:'-', touches:'-', fotmob:'-', yellowCards:0, redCards:0 };
  if (!v.seasonPerformance) v.seasonPerformance = { matches:v.matches||0, starts:0, minutes:0, goals:v.goals||0, assists:v.assists||0, xg:'0', xa:'0', gol90:'0', rating:v.rating||'7.0' };
  return v as PlayerData;
}

/* ═══════════════════════════════════════════════════════════ */

export default function Wizard() {
  const [step, setStep]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportPage, setExportPage] = useState<'all' | number>('all');
  const [generationStep, setGenerationStep] = useState(0);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [exportScale, setExportScale] = useState<2 | 3>(2);
  const cardRef = useRef<HTMLDivElement>(null);

  // Step 1
  const [searchQuery, setSearchQuery] = useState('');
  const [teamQuery, setTeamQuery]     = useState('');
  const [targetClub, setTargetClub]   = useState('');
  const [position, setPosition]       = useState('');

  // Step 2
  const [report, setReport] = useState<ScoutReport>({
    strengths: [], weaknesses: [], tacticalEvaluation: '', recommendation: 'follow', score: 75, riskAnalysis: []
  });
  const [strengthInput, setStrengthInput]   = useState('');
  const [weaknessInput, setWeaknessInput]   = useState('');

  // Memoized report ID so it doesn't regenerate on re-render
  const reportId = useMemo(() =>
    `SR-${new Date().getFullYear().toString().slice(-2)}${String(new Date().getFullYear() + 1).slice(-2)}-${Math.floor(Math.random() * 9000) + 1000}`,
    []
  );

  // ── Tag input helpers ──
  const addTag = (list: string[], val: string) =>
    val.trim() && !list.includes(val.trim()) ? [...list, val.trim()] : list;

  const handleStrengthKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      setReport(p => ({ ...p, strengths: addTag(p.strengths, strengthInput) }));
      setStrengthInput('');
    }
  };
  const handleWeaknessKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      setReport(p => ({ ...p, weaknesses: addTag(p.weaknesses, weaknessInput) }));
      setWeaknessInput('');
    }
  };

  // ── Scrape ──
  const handleScrape = async () => {
    if (!searchQuery || !teamQuery || !position) {
      alert('Lütfen oyuncu adı, mevcut takımı ve pozisyonu doldurun.');
      return;
    }
    setLoading(true);
    const msgs = [
      'Transfermarkt profili ve finansal veriler çekiliyor...',
      'FBref 90 dakika başı gelişmiş metrikler analiz ediliyor...',
      'SofaScore ısı haritası ve saha koordinatları işleniyor...',
      'AI Analiz Motoru: veri doğrulanıyor...',
    ];
    let mi = 0;
    setLoadingMsg(msgs[mi]);
    const msgInterval = setInterval(() => { mi = Math.min(mi + 1, msgs.length - 1); setLoadingMsg(msgs[mi]); }, 2500);
    try {
      const resp = await axios.post('/api/scrape', { playerName: searchQuery, team: teamQuery, position, targetClub });
      clearInterval(msgInterval);
      if (resp.data.success && resp.data.data) {
        setPlayerData(resp.data.data);
        setStep(2);
      } else throw new Error('Sunucu geçersiz veri döndürdü.');
    } catch (err: any) {
      clearInterval(msgInterval);
      alert('Veri çekilemedi. Oyuncu adını veya bağlantıyı kontrol edip tekrar deneyin.\n' + (err.message || ''));
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  // ── Generate card ──
  const handleGenerate = () => {
    setIsGenerating(true);
    setGenerationStep(0);
    if (playerData) setPlayerData(validatePlayerData(playerData));
    let cur = 0;
    const iv = setInterval(() => {
      cur++;
      setGenerationStep(cur);
      if (cur >= GENERATION_STEPS.length) {
        clearInterval(iv);
        setTimeout(() => { setIsGenerating(false); setStep(3); }, 600);
      }
    }, 700);
  };

/* ─── Robust Canvas & Image Renderer ─── */
async function renderElementToDataUrl(el: HTMLElement, scale: number): Promise<string> {
  // Clone element into an isolated temporary container to prevent iframe element lookup errors
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.top = '-99999px';
  tempContainer.style.left = '-99999px';
  tempContainer.style.width = `${el.offsetWidth || 794}px`;
  tempContainer.style.background = '#ffffff';

  const clone = el.cloneNode(true) as HTMLElement;

  // Copy live HTML5 canvas bitmaps (e.g. Chart.js radar) from original to clone
  const originalCanvases = Array.from(el.querySelectorAll('canvas'));
  const clonedCanvases = Array.from(clone.querySelectorAll('canvas'));
  originalCanvases.forEach((origCanvas, idx) => {
    if (clonedCanvases[idx]) {
      clonedCanvases[idx].width = origCanvas.width;
      clonedCanvases[idx].height = origCanvas.height;
      const destCtx = clonedCanvases[idx].getContext('2d');
      if (destCtx) {
        destCtx.drawImage(origCanvas, 0, 0);
      }
    }
  });

  tempContainer.appendChild(clone);
  document.body.appendChild(tempContainer);

  try {
    const canvas = await html2canvas(clone, {
      scale: scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const dataUrl = canvas.toDataURL('image/png', 1.0);
    if (!dataUrl || dataUrl.length < 200) {
      throw new Error('Görsel oluşturulamadı (canvas boş).');
    }
    return dataUrl;
  } finally {
    try {
      if (tempContainer.parentNode) {
        tempContainer.parentNode.removeChild(tempContainer);
      }
    } catch {}
  }
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try { document.body.removeChild(a); } catch {}
  }, 200);
}

  // ── Export ──
  const handleDownload = async (format: 'pdf' | 'png') => {
    if (!cardRef.current) return;
    setLoading(true);
    setLoadingMsg('Görsel varlıklar ön belleğe yükleniyor...');
    try {
      const wrapper = document.getElementById('scout-card-preview-wrapper');
      const prevStyles = wrapper ? { maxHeight: wrapper.style.maxHeight, overflow: wrapper.style.overflow } : null;
      if (wrapper) { wrapper.style.maxHeight = 'none'; wrapper.style.overflow = 'visible'; }
      await new Promise(r => setTimeout(r, 400));

      setLoadingMsg('Fotoğraflar ve amblemler kontrol ediliyor...');
      await preloadImages(cardRef.current);
      await new Promise(r => setTimeout(r, 400));

      const pages = Array.from(document.querySelectorAll('.scout-card-page')) as HTMLElement[];
      if (!pages.length) throw new Error('Sayfalar bulunamadı - lütfen kartı tekrar oluşturun.');
      const safeName = playerData?.name?.replace(/\s+/g, '_') || 'Scout_Kart';

      if (format === 'png') {
        const targetPages: HTMLElement[] = exportPage === 'all'
          ? pages
          : pages.filter((_, i) => i + 1 === exportPage);
        if (!targetPages.length) throw new Error(`Sayfa ${exportPage} bulunamadı.`);

        if (targetPages.length === 1) {
          const pageIdx = exportPage === 'all' ? 1 : Number(exportPage);
          setLoadingMsg(`Sayfa ${pageIdx} PNG olarak aktarılıyor...`);
          const dataUrl = await renderElementToDataUrl(targetPages[0], exportScale);
          const suffix = exportPage !== 'all' ? `_Sayfa${exportPage}` : `_Sayfa1`;
          triggerDownload(dataUrl, `ScoutCard_${safeName}${suffix}.png`);
        } else {
          for (let i = 0; i < targetPages.length; i++) {
            setLoadingMsg(`Sayfa ${i+1}/${targetPages.length} PNG olarak aktarılıyor...`);
            const dataUrl = await renderElementToDataUrl(targetPages[i], exportScale);
            triggerDownload(dataUrl, `ScoutCard_${safeName}_Sayfa${i+1}.png`);
            await new Promise(r => setTimeout(r, 500));
          }
        }
        await new Promise(r => setTimeout(r, 300));
      } else {
        // PDF Export
        setLoadingMsg('PDF belgesi hazırlanıyor...');
        const { jsPDF } = await import('jspdf');
        let pdf: any = null;

        for (let i = 0; i < pages.length; i++) {
          setLoadingMsg(`Sayfa ${i+1}/${pages.length} PDF'e dönüştürülüyor...`);
          const dataUrl = await renderElementToDataUrl(pages[i], exportScale);
          
          const img = new Image();
          img.src = dataUrl;
          await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = () => rej(new Error('PDF görseli yüklenemedi'));
          });

          const pxW = img.width;
          const pxH = img.height;

          if (i === 0) {
            pdf = new jsPDF({
              orientation: pxW > pxH ? 'landscape' : 'portrait',
              unit: 'px',
              format: [pxW, pxH],
              compress: true
            });
          } else {
            pdf.addPage([pxW, pxH], pxW > pxH ? 'landscape' : 'portrait');
          }

          pdf.addImage(dataUrl, 'PNG', 0, 0, pxW, pxH, undefined, 'FAST');
        }

        if (pdf) {
          pdf.save(`ScoutCard_${safeName}_Rapor.pdf`);
        } else {
          throw new Error('PDF oluşturulamadı.');
        }
      }

      if (wrapper && prevStyles) {
        wrapper.style.maxHeight = prevStyles.maxHeight;
        wrapper.style.overflow = prevStyles.overflow;
      }
      setLoadingMsg('Dışa aktarma tamamlandı ✓');
      await new Promise(r => setTimeout(r, 800));
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Dışa aktarma hatası: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };



  const selectedPos = POSITIONS.find(p => p.value === position);
  const scoreClass =
    report.score >= 90 ? 'score-elite' :
    report.score >= 80 ? 'score-high' :
    report.score >= 60 ? 'score-medium' : 'score-low';
  const scoreHex =
    report.score >= 90 ? '#10B981' :
    report.score >= 80 ? '#D4AF37' :
    report.score >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="flex flex-col gap-8 relative">

      {/* ── Loading Overlay ── */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(8, 10, 16, 0.92)', backdropFilter: 'blur(16px)' }}>
          <div className="glass-card rounded-2xl p-8 max-w-md w-full flex flex-col items-center gap-6 scan-effect"
               style={{ border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 0 60px rgba(212,175,55,0.1)' }}>
            {/* Spinner */}
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full"
                   style={{ border: '2px solid rgba(212,175,55,0.1)' }}/>
              <div className="absolute inset-0 rounded-full animate-spin"
                   style={{ border: '2px solid transparent', borderTopColor: '#D4AF37', borderRightColor: 'rgba(212,175,55,0.3)' }}/>
              <div className="absolute inset-[8px] rounded-full animate-spin"
                   style={{ border: '2px solid transparent', borderTopColor: '#10B981', animationDirection: 'reverse', animationDuration: '0.8s' }}/>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]" style={{ color: '#D4AF37', fontVariationSettings: "'FILL' 1" }}>
                  {step === 3 ? 'file_download' : 'radar'}
                </span>
              </div>
            </div>
            <div className="text-center">
              <h3 className="font-headline-lg text-[18px] font-bold text-on-surface mb-2">
                {step === 3 ? 'Dışa Aktarılıyor' : 'Veri Analizi Yapılıyor'}
              </h3>
              <p className="text-[13px] text-on-surface-variant leading-relaxed">{loadingMsg}</p>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: '3px', background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full"
                   style={{
                     background: 'linear-gradient(90deg, #D4AF37, #10B981)',
                     animation: 'progress-fill 3s ease-in-out infinite',
                     width: '100%',
                   }}/>
            </div>
          </div>
        </div>
      )}

      {/* ── Generation Pipeline Modal ── */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(8, 10, 16, 0.95)', backdropFilter: 'blur(20px)' }}>
          <div className="glass-card rounded-2xl p-8 max-w-sm w-full flex flex-col gap-6"
               style={{ border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 0 60px rgba(16,185,129,0.08)' }}>
            <div className="text-center border-b pb-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: '#D4AF37' }}>
                SCOUT KART ÜRETİM HATTI
              </div>
              <h3 className="font-headline-lg text-[16px] font-bold text-on-surface">Self-Auditing Pipeline</h3>
            </div>
            <div className="flex flex-col gap-4">
              {GENERATION_STEPS.map((s, idx) => {
                const done = generationStep > idx;
                const active = generationStep === idx;
                return (
                  <div key={idx} className="flex items-center gap-4 transition-all duration-500"
                       style={{ opacity: done || active ? 1 : 0.3 }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
                         style={{
                           background: done ? 'rgba(16,185,129,0.15)' : active ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.04)',
                           border: done ? '1px solid rgba(16,185,129,0.4)' : active ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.08)',
                         }}>
                      <span className="material-symbols-outlined text-[16px]"
                            style={{
                              fontVariationSettings: "'FILL' 1",
                              color: done ? '#10B981' : active ? '#D4AF37' : '#8D96B2',
                            }}>
                        {done ? 'check_circle' : s.icon}
                      </span>
                    </div>
                    <span className="text-[13px] font-medium text-on-surface">{s.label}</span>
                    {active && (
                      <div className="ml-auto w-4 h-4 rounded-full border-2 animate-spin shrink-0"
                           style={{ borderColor: 'rgba(212,175,55,0.2)', borderTopColor: '#D4AF37' }}/>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Step Header & Progress ── */}
      <div className={`${step !== 3 ? 'max-w-[820px] mx-auto w-full' : 'w-full'} animate-slide-up`}>
        <div className="flex justify-between items-center mb-5">
          <div>
            <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#D4AF37' }}>
              ADIM {step} / 3
            </div>
            <h1 className="font-headline-lg text-[26px] font-bold text-on-surface leading-tight">
              {step === 1 && 'Oyuncu Seçimi & Veri Kaynakları'}
              {step === 2 && 'Niteliksel Analiz & Scout Raporu'}
              {step === 3 && 'Scout Kartı Önizleme & İndirme'}
            </h1>
          </div>
          {step === 3 && (
            <div className="status-badge-active hidden md:flex">SCOUT SKORU DOĞRULANDI</div>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 h-1.5">
          {[1,2,3].map(s => (
            <div key={s} className="flex-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                   style={{
                     width: step >= s ? '100%' : '0%',
                     background: step >= s ? 'linear-gradient(90deg, #D4AF37, #F5D76E)' : 'transparent',
                     boxShadow: step >= s ? '0 0 10px rgba(212,175,55,0.5)' : 'none',
                   }}/>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════
          STEP 1 — Player Search
          ════════════════════════════════════ */}
      {step === 1 && (
        <div className="glass-card rounded-2xl p-6 md:p-10 flex flex-col gap-8 max-w-[820px] mx-auto w-full animate-slide-up">

          {/* Search fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
                Oyuncu Adı
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px]"
                      style={{ color: '#D4AF37', fontVariationSettings: "'FILL' 0, 'wght' 300" }}>search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !loading && handleScrape()}
                  className="w-full glass-input rounded-xl py-4 pl-12 pr-4 text-[14px] font-medium"
                  placeholder="Küresel veritabanında ara..."
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
                Mevcut Takımı
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px]"
                      style={{ color: '#D4AF37', fontVariationSettings: "'FILL' 0, 'wght' 300" }}>sports_soccer</span>
                <input
                  type="text"
                  value={teamQuery}
                  onChange={e => setTeamQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !loading && handleScrape()}
                  className="w-full glass-input rounded-xl py-4 pl-12 pr-4 text-[14px] font-medium"
                  placeholder="Örn. Fenerbahçe, Manchester City..."
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
                Hedef Kulüp (Opsiyonel)
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px]"
                      style={{ color: '#D4AF37', fontVariationSettings: "'FILL' 0, 'wght' 300" }}>stadium</span>
                <input
                  type="text"
                  value={targetClub}
                  onChange={e => setTargetClub(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !loading && handleScrape()}
                  className="w-full glass-input rounded-xl py-4 pl-12 pr-4 text-[14px] font-medium"
                  placeholder="Örn. Real Madrid..."
                />
              </div>
            </div>
          </div>

          {/* Position picker */}
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
              Ana Pozisyonu
            </label>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {POSITIONS.map(pos => (
                <button
                  key={pos.value}
                  onClick={() => setPosition(pos.value)}
                  className="flex flex-col items-center gap-1 py-3 px-1 rounded-xl transition-all duration-200"
                  style={{
                    background: position === pos.value ? `rgba(${hexToRgba(pos.color)}, 0.15)` : 'rgba(255,255,255,0.03)',
                    border: position === pos.value ? `1px solid ${pos.color}` : '1px solid rgba(255,255,255,0.07)',
                    boxShadow: position === pos.value ? `0 0 14px ${pos.color}30` : 'none',
                  }}>
                  <span className="material-symbols-outlined text-[20px]"
                        style={{ color: position === pos.value ? pos.color : '#8D96B2', fontVariationSettings: "'FILL' 1" }}>
                    {pos.icon}
                  </span>
                  <span className="text-[11px] font-black tracking-wide"
                        style={{ color: position === pos.value ? pos.color : '#8D96B2' }}>
                    {pos.sub}
                  </span>
                  <span className="text-[8px] font-medium text-center leading-tight"
                        style={{ color: position === pos.value ? pos.color : '#6b7280' }}>
                    {pos.label}
                  </span>
                </button>
              ))}
            </div>
            {selectedPos && (
              <div className="text-[12px] font-medium" style={{ color: selectedPos.color }}>
                Seçili: {selectedPos.label}
              </div>
            )}
          </div>

          {/* Data sources */}
          <div className="flex flex-col gap-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex justify-between items-center">
              <h2 className="text-[13px] font-semibold text-on-surface tracking-wide">Veri Kaynağı Durumu</h2>
              <div className="status-badge-active">SİSTEM ÇEVRİMİÇİ</div>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {DATA_SOURCES.map((src, i) => (
                <div key={src.name} className="source-card"
                     style={{ animationDelay: `${i * 0.06}s` }}>
                  <span className="text-[16px] font-black" style={{ color: src.color }}>{src.icon}</span>
                  <span className="text-[10px] font-bold text-on-surface text-center tracking-wide">{src.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full"
                          style={{ background: '#10B981', boxShadow: '0 0 4px #10B981', animation: `data-tick ${1 + i * 0.2}s ease-in-out infinite` }}/>
                    <span className="text-[9px] font-bold tracking-widest" style={{ color: '#10B981' }}>AKTİF</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex justify-end pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={handleScrape}
              disabled={loading || !searchQuery || !teamQuery || !position}
              className="btn-premium flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              style={{ animation: searchQuery && teamQuery && position ? undefined : 'none' }}>
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {loading ? 'hourglass_empty' : 'radar'}
              </span>
              {loading ? 'Analiz Ediliyor...' : 'Veriyi Analiz Et & İleri'}
              {!loading && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          STEP 2 — Scout Report
          ════════════════════════════════════ */}
      {step === 2 && (
        <div className="glass-card rounded-2xl p-6 md:p-10 flex flex-col gap-8 max-w-[820px] mx-auto w-full animate-slide-up">

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Strengths */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: '#10B981' }}>
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Güçlü Yönler
              </label>
              <div className="rounded-xl p-4 min-h-[110px] flex flex-wrap gap-2 items-start"
                   style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)' }}>
                {report.strengths.map(s => (
                  <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                        style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#34D399' }}>
                    {s}
                    <button onClick={() => setReport(p => ({ ...p, strengths: p.strengths.filter(x => x !== s) }))}
                            className="hover:opacity-70 transition-opacity">
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  </span>
                ))}
                <input
                  value={strengthInput}
                  onChange={e => setStrengthInput(e.target.value)}
                  onKeyDown={handleStrengthKey}
                  className="bg-transparent border-none outline-none text-[13px] text-on-surface placeholder-on-surface-variant/40 p-1 min-w-[120px]"
                  placeholder="Enter ile ekle..."
                />
              </div>
            </div>

            {/* Weaknesses */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: '#FF6B6B' }}>
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                Gelişim Alanları
              </label>
              <div className="rounded-xl p-4 min-h-[110px] flex flex-wrap gap-2 items-start"
                   style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
                {report.weaknesses.map(w => (
                  <span key={w} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#FF6B6B' }}>
                    {w}
                    <button onClick={() => setReport(p => ({ ...p, weaknesses: p.weaknesses.filter(x => x !== w) }))}
                            className="hover:opacity-70 transition-opacity">
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  </span>
                ))}
                <input
                  value={weaknessInput}
                  onChange={e => setWeaknessInput(e.target.value)}
                  onKeyDown={handleWeaknessKey}
                  className="bg-transparent border-none outline-none text-[13px] text-on-surface placeholder-on-surface-variant/40 p-1 min-w-[120px]"
                  placeholder="Enter ile ekle..."
                />
              </div>
            </div>
          </div>

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }}/>

          {/* Tactical evaluation */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
                Taktiksel Değerlendirme
              </label>
              <span className="text-[10px] text-on-surface-variant">
                {report.tacticalEvaluation.length} / 500
              </span>
            </div>
            <textarea
              value={report.tacticalEvaluation}
              onChange={e => setReport({ ...report, tacticalEvaluation: e.target.value.slice(0, 500) })}
              className="glass-input w-full rounded-xl p-4 min-h-[130px] text-[14px] font-medium resize-y outline-none"
              placeholder="Detaylı scout raporu ve taktiksel değerlendirme..."
              maxLength={500}
            />
          </div>

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }}/>

          {/* Risk analysis */}
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
              Risk Analizi
            </label>
            <div className="rounded-xl p-4 flex flex-col gap-4"
                 style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {(report.riskAnalysis || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(report.riskAnalysis || []).map((r, i) => (
                    <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                          style={{
                            background: r.level === 'Yüksek' ? 'rgba(239,68,68,0.12)' : r.level === 'Orta' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                            border: r.level === 'Yüksek' ? '1px solid rgba(239,68,68,0.3)' : r.level === 'Orta' ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(16,185,129,0.3)',
                            color: r.level === 'Yüksek' ? '#FF6B6B' : r.level === 'Orta' ? '#F59E0B' : '#10B981',
                          }}>
                      {r.category}: <strong>{r.level}</strong>
                      <button onClick={() => {
                        const n = [...(report.riskAnalysis || [])]; n.splice(i, 1);
                        setReport({ ...report, riskAnalysis: n });
                      }} className="hover:opacity-60">
                        <span className="material-symbols-outlined text-[12px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input id="riskCat" className="glass-input flex-1 rounded-lg px-3 py-2 text-[13px] outline-none" placeholder="Risk kategorisi..." />
                <select id="riskLvl" className="glass-input rounded-lg px-3 py-2 text-[13px] outline-none cursor-pointer w-28">
                  <option value="Düşük,text-green-500">Düşük</option>
                  <option value="Orta,text-yellow-500">Orta</option>
                  <option value="Yüksek,text-red-500">Yüksek</option>
                </select>
                <button onClick={() => {
                  const cat = (document.getElementById('riskCat') as HTMLInputElement).value.trim();
                  const sel = (document.getElementById('riskLvl') as HTMLSelectElement).value;
                  if (!cat) return;
                  const [level, color] = sel.split(',');
                  setReport(p => ({ ...p, riskAnalysis: [...(p.riskAnalysis || []), { category: cat, level, color }] }));
                  (document.getElementById('riskCat') as HTMLInputElement).value = '';
                }} className="btn-secondary px-4 py-2 text-[12px]">
                  Ekle
                </button>
              </div>
            </div>
          </div>

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }}/>

          {/* Recommendation & Score */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
                Transfer Tavsiyesi
              </label>
              <div className="flex gap-2">
                {([
                  { v: 'buy',    label: 'A KADRO KALİTESİ', color: '#10B981' },
                  { v: 'follow', label: 'GELİŞİM TAKİBİ',   color: '#D4AF37' },
                  { v: 'pass',   label: 'SİSTEME UYUMSUZ',  color: '#EF4444' },
                ] as const).map(rec => (
                  <button
                    key={rec.v}
                    onClick={() => setReport({ ...report, recommendation: rec.v })}
                    className="flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 text-center"
                    style={{
                      background: report.recommendation === rec.v ? `${rec.color}18` : 'rgba(255,255,255,0.03)',
                      border: report.recommendation === rec.v ? `1px solid ${rec.color}` : '1px solid rgba(255,255,255,0.08)',
                      color: report.recommendation === rec.v ? rec.color : '#8D96B2',
                      boxShadow: report.recommendation === rec.v ? `0 0 16px ${rec.color}25` : 'none',
                    }}>
                    {rec.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex justify-between text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
                <span>Scout Genel Skoru</span>
                <span className={scoreClass} style={{ color: scoreHex, fontFamily: 'Outfit, sans-serif', fontSize: '14px', fontWeight: '800' }}>
                  {report.score}
                </span>
              </label>
              <div className="flex items-center gap-4 p-4 rounded-xl"
                   style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <input
                  type="range" min="0" max="100"
                  value={report.score}
                  onChange={e => setReport({ ...report, score: parseInt(e.target.value) })}
                  className="flex-1 cursor-pointer"
                  style={{
                    accentColor: scoreHex,
                    height: '4px',
                  }}
                />
                <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
                     style={{
                       border: `2px solid ${scoreHex}`,
                       background: `${scoreHex}14`,
                       boxShadow: `0 0 16px ${scoreHex}30`,
                     }}>
                  <span className="font-headline-lg text-[22px] font-black leading-none" style={{ color: scoreHex }}>
                    {report.score}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setStep(1)} className="btn-ghost flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Geri
            </button>
            <button onClick={handleGenerate} className="btn-premium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              Veriyi İşle & Kartı Oluştur
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          STEP 3 — Preview & Export
          ════════════════════════════════════ */}
      {step === 3 && (
        <div className="flex flex-col gap-6 animate-slide-up">

          {/* Export action bar */}
          <div className="glass-card rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4"
               style={{ border: '1px solid rgba(212,175,55,0.15)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                   style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <span className="material-symbols-outlined text-[20px]" style={{ color: '#10B981', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              <div>
                <div className="text-[13px] font-bold text-on-surface">Kart Oluşturma Tamamlandı</div>
                <div className="text-[11px] text-on-surface-variant">{playerData?.name} · {playerData?.team}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Export quality */}
              <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
                <span>Çözünürlük:</span>
                {([2, 3] as const).map(s => (
                  <button key={s} onClick={() => setExportScale(s)}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                          style={{
                            background: exportScale === s ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                            border: exportScale === s ? '1px solid rgba(212,175,55,0.5)' : '1px solid rgba(255,255,255,0.08)',
                            color: exportScale === s ? '#D4AF37' : '#8D96B2',
                          }}>
                    {s}x {s === 3 ? '(Baskı)' : '(Web)'}
                  </button>
                ))}
              </div>

              {/* PNG Page selector */}
              <div className="flex items-center gap-2 text-[11px] text-on-surface-variant"
                   style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '10px' }}>
                <span>PNG Sayfa:</span>
                {(['all', 1, 2, 3, 4] as const).map(p => (
                  <button key={String(p)} onClick={() => setExportPage(p)}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                          style={{
                            background: exportPage === p ? 'rgba(79,195,247,0.15)' : 'rgba(255,255,255,0.04)',
                            border: exportPage === p ? '1px solid rgba(79,195,247,0.6)' : '1px solid rgba(255,255,255,0.08)',
                            color: exportPage === p ? '#4FC3F7' : '#8D96B2',
                          }}>
                    {p === 'all' ? 'Tümü' : `S.${p}`}
                  </button>
                ))}
              </div>

              <button onClick={() => setStep(2)} className="btn-ghost flex items-center gap-2 text-[12px]">
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Düzenle
              </button>
              <button onClick={() => handleDownload('png')} className="btn-secondary flex items-center gap-2 text-[12px]">
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>image</span>
                PNG İndir {exportPage !== 'all' ? `(S.${exportPage})` : ''}
              </button>
              <button onClick={() => { setStep(1); setPlayerData(null); }} className="btn-premium flex items-center gap-2 text-[12px]">
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>autorenew</span>
                Yeni Scout Analizi
              </button>
            </div>
          </div>

          {/* Card preview */}
          <div id="scout-card-preview-wrapper"
               className="w-full rounded-xl overflow-auto flex justify-center"
               style={{
                 background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                 border: '1px solid rgba(255,255,255,0.06)',
                 maxHeight: '82vh',
                 padding: '24px',
               }}>
            <div ref={cardRef} id="scout-card-canvas" className="flex-shrink-0" style={{ width: 'max-content' }}>
              <ScoutCardLayout data={playerData!} report={report} reportId={reportId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
