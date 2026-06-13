/* Minuteurs globaux — basés sur timestamps (endAt), donc fiables même si
   iOS gèle le JS en arrière-plan : au retour, le temps restant est recalculé.
   Plusieurs minuteurs simultanés, pastille flottante visible partout. */

import { emit } from './store';
import { beep, vibrate, toast, fmtSec } from './utils';

export interface Timer {
  key: string;          // recipeId|stepId
  label: string;
  duration: number;     // secondes
  endAt: number | null; // timestamp ms (null = en pause)
  remaining: number;    // secondes (utilisé en pause)
  done: boolean;
}

const timers = new Map<string, Timer>();
let tick: any = null;

function persist() {
  try { localStorage.setItem('timers', JSON.stringify([...timers.values()])); } catch {}
}

export function restoreTimers() {
  try {
    const arr = JSON.parse(localStorage.getItem('timers') || '[]') as Timer[];
    for (const t of arr) {
      if (t.done) continue;
      timers.set(t.key, t);
    }
    if (timers.size) startTick();
  } catch {}
}

export function getTimer(key: string) { return timers.get(key); }
export function activeTimers(): Timer[] { return [...timers.values()].filter(t => !t.done); }

export function startTimer(key: string, label: string, duration: number) {
  const ex = timers.get(key);
  if (ex && !ex.done) {
    // reprise après pause
    if (ex.endAt === null) ex.endAt = Date.now() + ex.remaining * 1000;
  } else {
    timers.set(key, { key, label, duration, endAt: Date.now() + duration * 1000, remaining: duration, done: false });
  }
  startTick();
  persist();
  emit('timers');
}

export function pauseTimer(key: string) {
  const t = timers.get(key);
  if (!t || t.endAt === null) return;
  t.remaining = Math.max(0, (t.endAt - Date.now()) / 1000);
  t.endAt = null;
  persist();
  emit('timers');
}

export function resetTimer(key: string) {
  timers.delete(key);
  persist();
  emit('timers');
}

export function remainingOf(t: Timer): number {
  return t.endAt === null ? t.remaining : Math.max(0, (t.endAt - Date.now()) / 1000);
}

function startTick() {
  if (tick) return;
  tick = setInterval(() => {
    let any = false;
    for (const t of timers.values()) {
      if (t.done) continue;
      any = true;
      if (t.endAt !== null && Date.now() >= t.endAt) {
        t.done = true;
        beep(4);
        vibrate([180, 90, 180, 90, 320]);
        toast(`⏱ ${t.label} — terminé !`);
      }
    }
    if (!any) { clearInterval(tick); tick = null; }
    persist();
    emit('timers');
  }, 500);
}

/* Pastille flottante */
export function renderPill() {
  const pill = document.getElementById('timer-pill')!;
  const act = activeTimers().filter(t => !t.done);
  if (!act.length) { pill.hidden = true; return; }
  const next = act.reduce((a, b) => remainingOf(a) < remainingOf(b) ? a : b);
  pill.hidden = false;
  pill.innerHTML = `<span class="dot"></span>${act.length > 1 ? act.length + ' · ' : ''}${fmtSec(remainingOf(next))}`;
}
