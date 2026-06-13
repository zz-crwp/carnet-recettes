import { el, esc } from '../lib/utils';
import { liveRecipes, state, on } from '../lib/store';
import { icons, recipeCard } from '../lib/ui';
import type { Route } from '../router';

export function plusView(root: HTMLElement, _r: Route) {
  const rs = liveRecipes();
  const cooked = rs.filter(r => r.cookLog.length);
  const totalCooks = rs.reduce((s, r) => s + r.cookLog.length, 0);
  const tested = rs.filter(r => r.tested).length;
  const custom = rs.filter(r => r.isCustom).length;

  const mostCooked = [...cooked].sort((a, b) => b.cookLog.length - a.cookLog.length).slice(0, 3);
  const neverTested = rs.filter(r => !r.tested).sort(() => Math.random() - .5).slice(0, 3);

  root.appendChild(el(`
    <div>
      <h1>Plus</h1>
      <div class="list" style="margin-top:14px">
        <div class="row row-tap" onclick="location.hash='#/journal'"><span style="color:var(--ac)">${icons.journal}</span><div class="grow">Journal de cuisine</div>${icons.fwd}</div>
        <div class="row row-tap" onclick="location.hash='#/frigo'"><span style="color:var(--ac)">${icons.fridge}</span><div class="grow">Mode frigo</div>${icons.fwd}</div>
        <div class="row row-tap" onclick="location.hash='#/reglages'"><span style="color:var(--ac)">${icons.gear}</span><div class="grow">Réglages & synchronisation</div><span class="sync-dot ${esc(state.syncStatus)}" id="psync"></span>${icons.fwd}</div>
      </div>

      <h2>Statistiques</h2>
      <div class="card"><div class="kpis">
        <div class="kpi"><div class="v">${rs.length}</div><div class="l">Recettes</div></div>
        <div class="kpi"><div class="v">${totalCooks}</div><div class="l">Cuissons</div></div>
        <div class="kpi"><div class="v">${tested}</div><div class="l">Testées</div></div>
        <div class="kpi"><div class="v">${custom}</div><div class="l">Persos</div></div>
      </div></div>

      ${mostCooked.length ? '<h2>Les plus cuisinées</h2><div id="pmost"></div>' : ''}
      ${neverTested.length ? '<h2>À tester un de ces jours</h2><div id="pnever"></div>' : ''}
    </div>`));

  const most = root.querySelector('#pmost');
  if (most) for (const r of mostCooked) most.appendChild(recipeCard(r, `${r.cookLog.length} ×`));
  const nev = root.querySelector('#pnever');
  if (nev) for (const r of neverTested) nev.appendChild(recipeCard(r));

  const off = on('sync:status', ({ s }: any) => {
    const dot = root.querySelector('#psync');
    if (dot) dot.className = 'sync-dot ' + s;
  });
  return () => off();
}
