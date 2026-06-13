import { el, esc, fmtSec, vibrate } from '../lib/utils';
import { getRecipe, on } from '../lib/store';
import { icons } from '../lib/ui';
import { getTimer, startTimer, pauseTimer, resetTimer, remainingOf } from '../lib/timers';
import type { Route } from '../router';

export function cookView(root: HTMLElement, route: Route) {
  const r = getRecipe(route.params.id);
  if (!r) { history.back(); return; }
  let idx = 0;
  let lock: any = null;

  async function acquireLock() {
    try { lock = await (navigator as any).wakeLock?.request('screen'); } catch { /* non supporté */ }
  }
  acquireLock();
  const onVis = () => { if (document.visibilityState === 'visible') acquireLock(); };
  document.addEventListener('visibilitychange', onVis);

  const wrap = el(`<div class="cook">
    <div class="top">
      <span>${esc(r.name)}</span>
      <button data-x>Quitter</button>
    </div>
    <div class="prog">${r.steps.map(() => '<i></i>').join('')}</div>
    <div class="body" data-body></div>
    <div class="nav">
      <button data-prev>← Préc.</button>
      <button class="next" data-next>Suivant →</button>
    </div>
  </div>`);
  root.appendChild(wrap);

  const body = wrap.querySelector('[data-body]') as HTMLElement;

  function render() {
    const s = r.steps[idx];
    wrap.querySelectorAll('.prog i').forEach((p, i) => p.classList.toggle('on', i <= idx));
    body.innerHTML = `
      <div style="color:#7C7C82;font:600 14px/1 var(--font)">Étape ${idx + 1} / ${r.steps.length}</div>
      <div class="stitle">${esc(s.t)}</div>
      <div class="sdesc">${esc(s.d)}</div>
      ${s.timer ? `<div class="timer-ui" data-tkey="${esc(r.id + '|' + s.id)}" data-dur="${s.timer}">
        <span class="tt">${fmtSec(s.timer)}</span>
        <button class="go">${icons.play}</button>
        <button class="r" style="background:#3A3A3C;color:#fff">${icons.reset}</button>
      </div>` : ''}`;
    refreshTimer();
    (wrap.querySelector('[data-prev]') as HTMLButtonElement).style.visibility = idx === 0 ? 'hidden' : '';
    (wrap.querySelector('[data-next]') as HTMLButtonElement).textContent = idx === r.steps.length - 1 ? 'Terminer ✓' : 'Suivant →';
  }

  function refreshTimer() {
    const ui = body.querySelector('.timer-ui') as HTMLElement;
    if (!ui) return;
    const key = ui.dataset.tkey!, dur = +ui.dataset.dur!;
    const t = getTimer(key);
    const tt = ui.querySelector('.tt')!, go = ui.querySelector('.go')!;
    ui.classList.toggle('running', !!t && t.endAt !== null && !t.done);
    if (!t) { tt.textContent = fmtSec(dur); go.innerHTML = icons.play; }
    else if (t.done) { tt.textContent = '✓ fini'; go.innerHTML = icons.play; }
    else { tt.textContent = fmtSec(remainingOf(t)); go.innerHTML = t.endAt === null ? icons.play : icons.pause; }
  }

  body.addEventListener('click', (e) => {
    const ui = (e.target as HTMLElement).closest('.timer-ui') as HTMLElement;
    if (!ui) return;
    const key = ui.dataset.tkey!, dur = +ui.dataset.dur!;
    const s = r.steps[idx];
    if ((e.target as HTMLElement).closest('.r')) { resetTimer(key); refreshTimer(); return; }
    if ((e.target as HTMLElement).closest('.go')) {
      const t = getTimer(key);
      if (t && !t.done && t.endAt !== null) pauseTimer(key);
      else if (t?.done) { resetTimer(key); startTimer(key, r.name + ' — ' + s.t, dur); }
      else startTimer(key, r.name + ' — ' + s.t, dur);
      vibrate(10);
      refreshTimer();
    }
  });

  wrap.querySelector('[data-prev]')!.addEventListener('click', () => { if (idx > 0) { idx--; render(); } });
  wrap.querySelector('[data-next]')!.addEventListener('click', () => {
    if (idx < r.steps.length - 1) { idx++; render(); vibrate(6); }
    else { location.hash = '#/recette/' + r.id; }
  });
  wrap.querySelector('[data-x]')!.addEventListener('click', () => { location.hash = '#/recette/' + r.id; });

  const offT = on('timers', refreshTimer);
  render();

  return () => {
    offT();
    document.removeEventListener('visibilitychange', onVis);
    try { lock?.release(); } catch {}
  };
}
