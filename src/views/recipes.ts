import { el, esc, daysAgo } from '../lib/utils';
import { liveRecipes } from '../lib/store';
import { icons, recipeCard, ALL_CATS } from '../lib/ui';
import { matchRecipe } from '../lib/recipes-logic';
import type { Route } from '../router';

const SORTS = [
  { id: 'name', lb: 'A → Z' },
  { id: 'rating', lb: 'Mieux notées' },
  { id: 'forgotten', lb: 'Pas cuisiné depuis…' },
  { id: 'recent', lb: 'Modifiées récemment' },
];

export function recipesView(root: HTMLElement, r: Route) {
  let cat = r.query.get('cat') || '';
  const tag = r.query.get('tag') || '';
  const life = r.query.get('life') || '';
  let sort = 'name';
  let q = r.query.get('q') || '';

  const title = tag ? tag : life ? life : cat || 'Recettes';

  root.appendChild(el(`
    <div>
      <div class="hdr">
        <button class="iconbtn" onclick="history.back()">${icons.back}</button>
        <h1 style="flex:1;margin:0;font-size:24px">${esc(title)}</h1>
        <button class="iconbtn" onclick="location.hash='#/new'">${icons.plus}</button>
      </div>
      <div class="search-wrap" style="margin-top:12px">${icons.search}<input id="rq" type="search" placeholder="Filtrer…" value="${esc(q)}" autocomplete="off"></div>
      <div class="chips" id="rcats">
        <button class="chip ${!cat ? 'on' : ''}" data-c="">Toutes</button>
        ${ALL_CATS.map(x => `<button class="chip ${cat === x ? 'on' : ''}" data-c="${esc(x)}">${esc(x)}</button>`).join('')}
      </div>
      <div class="chips" id="rsorts">
        ${SORTS.map((s, i) => `<button class="chip sm ${i === 0 ? 'on' : ''}" data-s="${s.id}">${s.lb}</button>`).join('')}
      </div>
      <div id="rlist" style="margin-top:6px"></div>
    </div>`));

  const list = root.querySelector('#rlist') as HTMLElement;

  function lastCook(rcp: any): number {
    if (!rcp.cookLog?.length) return Infinity;
    return daysAgo(rcp.cookLog[rcp.cookLog.length - 1]);
  }

  function render() {
    list.innerHTML = '';
    let rs = liveRecipes().filter(x =>
      (!cat || x.cat === cat) &&
      (!tag || x.tags.includes(tag)) &&
      (!life || x.lifestyle === life) &&
      (!q || matchRecipe(x, q)));

    if (sort === 'name') rs.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    if (sort === 'rating') rs.sort((a, b) => (b.rating - a.rating) || a.name.localeCompare(b.name, 'fr'));
    if (sort === 'recent') rs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (sort === 'forgotten') rs.sort((a, b) => lastCook(b) - lastCook(a));

    if (!rs.length) { list.appendChild(el('<div class="empty-state"><span class="em">🫥</span>Aucune recette ici</div>')); return; }
    for (const x of rs) {
      let sub: string | undefined;
      if (sort === 'forgotten') {
        const d = lastCook(x);
        sub = d === Infinity ? 'jamais cuisiné' : d === 0 ? "aujourd'hui" : `il y a ${d} j`;
      }
      list.appendChild(recipeCard(x, sub));
    }
  }

  root.querySelector('#rq')!.addEventListener('input', (e) => { q = (e.target as HTMLInputElement).value.trim(); render(); });
  root.querySelector('#rcats')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('.chip') as HTMLElement; if (!b) return;
    root.querySelectorAll('#rcats .chip').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); cat = b.dataset.c || ''; render();
  });
  root.querySelector('#rsorts')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('.chip') as HTMLElement; if (!b) return;
    root.querySelectorAll('#rsorts .chip').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); sort = b.dataset.s || 'name'; render();
  });

  render();
}
