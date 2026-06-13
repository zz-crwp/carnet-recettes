/* Helpers génériques — DOM, formats, dates, feedback */

export const $ = (sel: string, root: ParentNode = document) => root.querySelector(sel) as HTMLElement | null;
export const $$ = (sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll(sel)) as HTMLElement[];

export function el(html: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}

export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

/** fullName contient du <em> volontaire — on échappe tout sauf em */
export function richName(s: string): string {
  return esc(s).replace(/&lt;em&gt;/g, '<em>').replace(/&lt;\/em&gt;/g, '</em>');
}

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const nowISO = () => new Date().toISOString();

/* ---- Quantités ---- */
export function fmtQty(a: number | null, u: string): string {
  if (a === null || a === undefined || a === 0) return u || '—';
  let v: string;
  if (a >= 100) v = String(Math.round(a));
  else if (a >= 10) v = String(Math.round(a * 10) / 10);
  else v = String(Math.round(a * 100) / 100);
  return u ? `${v} ${u}` : v;
}

export function fmtMin(min: number): string {
  if (!min) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

export function fmtSec(s: number): string {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60), r = s % 60;
  if (m >= 60) { const h = Math.floor(m / 60); return `${h}:${String(m % 60).padStart(2, '0')}:${String(r).padStart(2, '0')}`; }
  return `${m}:${String(r).padStart(2, '0')}`;
}

/* ---- Dates / semaines ---- */
export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function isoWeekKey(d: Date): string {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const y = dt.getUTCFullYear();
  const yStart = new Date(Date.UTC(y, 0, 1));
  const wk = Math.ceil((((dt.getTime() - yStart.getTime()) / 86400000) + 1) / 7);
  return `${y}-W${String(wk).padStart(2, '0')}`;
}

/** Lundi de la semaine ISO */
export function mondayOf(weekKey: string): Date {
  const [y, w] = weekKey.split('-W').map(Number);
  const jan4 = new Date(y, 0, 4);
  const mon1 = new Date(jan4);
  mon1.setDate(jan4.getDate() - ((jan4.getDay() || 7) - 1));
  const d = new Date(mon1);
  d.setDate(mon1.getDate() + (w - 1) * 7);
  return d;
}

export function shiftWeek(weekKey: string, delta: number): string {
  const d = mondayOf(weekKey);
  d.setDate(d.getDate() + delta * 7);
  return isoWeekKey(d);
}

export const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function fmtDateKey(k: string): string {
  const [y, m, d] = k.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

/* ---- Feedback ---- */
export function toast(msg: string, err = false) {
  const root = $('#toast-root')!;
  const t = el(`<div class="toast ${err ? 'err' : ''}">${esc(msg)}</div>`);
  root.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); }, 2400);
}

export function vibrate(pattern: number | number[] = 12) {
  try { (navigator as any).vibrate?.(pattern); } catch { /* iOS: no-op */ }
}

let actx: AudioContext | null = null;
export function beep(times = 3) {
  try {
    actx = actx || new (window.AudioContext || (window as any).webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    for (let i = 0; i < times; i++) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = 880;
      const t0 = actx.currentTime + i * 0.32;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      o.connect(g).connect(actx.destination);
      o.start(t0); o.stop(t0 + 0.25);
    }
  } catch { /* silencieux */ }
}

/** Débloque l'AudioContext au premier geste (requis iOS) */
export function armAudio() {
  const fn = () => { try { actx = actx || new (window.AudioContext || (window as any).webkitAudioContext)(); actx.resume(); } catch {} window.removeEventListener('touchstart', fn); window.removeEventListener('click', fn); };
  window.addEventListener('touchstart', fn, { once: true, passive: true });
  window.addEventListener('click', fn, { once: true });
}

export function debounce<T extends (...a: any[]) => void>(fn: T, ms: number): T {
  let h: any;
  return ((...a: any[]) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }) as T;
}

/* ---- Compression photo ---- */
export function compressImage(file: File, maxW = 900, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * scale);
      cv.height = Math.round(img.height * scale);
      cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
    img.src = url;
  });
}
