import { el, esc } from '../lib/utils';
import { liveRecipes } from '../lib/store';
import { icons, recipeCard } from '../lib/ui';
import { fridgeScore } from '../lib/recipes-logic';
import type { Route } from '../router';

const COMMON = ['œufs', 'poulet', 'bœuf', 'lardons', 'saumon', 'thon', 'tomate', 'oignon', 'ail', 'courgette', 'poivron', 'champignon', 'pomme de terre', 'carotte', 'épinard', 'riz', 'pâtes', 'farine', 'crème', 'fromage', 'lait de coco', 'citron', 'avocat', 'pois chiche', 'lentilles'];

export function frigoView(root: HTMLElement, _r: Route) {
  const picked = new Set<string>();

  root.appendChild(el(`
    <div>
      <div class="hdr">
        <button class="iconbtn" onclick="history.back()">${icons.back}</button>
        <h1 style="flex:1;margin:0;font-size:24px">Mode frigo</h1>
      </div>
      <p class="sub" style="margin-top:6px">Qu'est-ce qu'il y a dans le frigo ? Je trouve quoi en faire.</p>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <input type="text" id="fq" placeholder="Un ingrédient…" enterkeyhint="done">
        <button class="btn" id="fgo" style="flex:none">${icons.plus}</button>
      </div>
      <div class="chips" id="fpicked" style="flex-wrap:wrap"></div>
      <div class="chips" id="fcommon" style="flex-wrap:wrap">
        ${COMMON.map(c => `<button class="chip sm" data-c="${esc(c)}">${esc(c)}</button>`).join('')}
      </div>
      <div id="fres" style="margin-top:10px"></div>
    </div>`));

  const pickedBox = root.querySelector('#fpicked') as HTMLElement;
  const res = root.querySelector('#fres') as HTMLElement;
  const inp = root.querySelector('#fq') as HTMLInputElement;

  function render() {
    pickedBox.innerHTML = [...picked].map(p => `<button class="chip on" data-r="${esc(p)}">${esc(p)} ✕</button>`).join('');
    res.innerHTML = '';
    if (!picked.size) return;
    const arr = [...picked];
    const scored = liveRecipes()
      .map(r => ({ r, s: fridgeScore(r, arr) }))
      .filter(o => o.s > 0)
      .sort((a, b) => b.s - a.s || (a.r.prepTime + a.r.cookTime) - (b.r.prepTime + b.r.cookTime))
      .slice(0, 20);
    if (!scored.length) {
      res.appendChild(el('<div class="empty-state"><span class="em">🤷</span>Rien trouvé avec ça</div>'));
      return;
    }
    for (const { r, s } of scored) res.appendChild(recipeCard(r, `${s}/${picked.size} ingrédients ✓`));
  }

  const add = (v: string) => {
    v = v.trim().toLowerCase();
    if (v) { picked.add(v); render(); }
    inp.value = '';
  };
  root.querySelector('#fgo')!.addEventListener('click', () => add(inp.value));
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') add(inp.value); });
  root.querySelector('#fcommon')!.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest('.chip') as HTMLElement;
    if (b) add(b.dataset.c!);
  });
  pickedBox.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest('.chip') as HTMLElement;
    if (b) { picked.delete(b.dataset.r!); render(); }
  });
}
