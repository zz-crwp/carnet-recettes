import { el, esc } from '../lib/utils';
import { liveRecipes, state, on } from '../lib/store';
import { icons, recipeCard, openSheet, ALL_CATS } from '../lib/ui';
import { matchRecipe } from '../lib/recipes-logic';
import type { Route } from '../router';

const GRID = [
  { em: '🍳', lb: 'Petit-déj', q: 'tag=Breakfast' },
  { em: '🥪', lb: 'Déjeuner', q: 'tag=Lunch' },
  { em: '🍽️', lb: 'Dîner', q: 'tag=Dinner' },
  { em: '🥦', lb: 'Healthy', q: 'life=Healthy' },
  { em: '🍰', lb: 'Desserts', q: 'cat=Dessert' },
  { em: '🥨', lb: 'Snacks', q: 'tag=Snack' },
  { em: '⚡', lb: 'Express', q: 'tag=Rapide' },
  { em: '🍹', lb: 'Boissons', q: 'cat=Boisson' },
  { em: '📖', lb: 'Tout voir', q: '' },
];

export function homeView(root: HTMLElement, _r: Route) {
  const recipes = liveRecipes();
  const hour = new Date().getHours();
  const hello = hour < 11 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  root.appendChild(el(`
    <div>
      <div class="hdr">
        <div><h1>${hello} 👨‍🍳</h1><p class="sub">${recipes.length} recettes dans ton carnet</p></div>
      </div>
      <div class="search-wrap">${icons.search}<input id="hq" type="search" placeholder="Recette, ingrédient, catégorie…" autocomplete="off" enterkeyhint="search"></div>
      <div id="hres"></div>
      <div id="hmain">
        <div class="catgrid" id="hgrid"></div>
        <div style="display:flex;gap:9px;margin-top:14px">
          <button class="btn sec" style="flex:1" id="hdice">${icons.dice} Je cuisine quoi ?</button>
          <button class="btn sec" style="flex:1" onclick="location.hash='#/frigo'">${icons.fridge} Mode frigo</button>
        </div>
        <div id="hrecents"></div>
      </div>
    </div>`));

  // Grille
  const grid = root.querySelector('#hgrid')!;
  for (const c of GRID) {
    const cell = el(`<button class="catcell"><span class="em">${c.em}</span><span class="lb">${esc(c.lb)}</span></button>`);
    cell.addEventListener('click', () => { location.hash = '#/recettes' + (c.q ? '?' + c.q : ''); });
    grid.appendChild(cell);
  }

  // Récentes
  const renderRecents = () => {
    const wrap = root.querySelector('#hrecents') as HTMLElement;
    if (!wrap) return;
    wrap.innerHTML = '';
    const rec = state.recents.map(id => recipes.find(r => r.id === id)).filter(Boolean).slice(0, 4);
    if (!rec.length) return;
    wrap.appendChild(el('<h2>Récentes</h2>'));
    for (const r of rec) wrap.appendChild(recipeCard(r!));
  };
  renderRecents();

  // Recherche live — l'input n'est JAMAIS re-rendu, seul #hres change → clavier stable
  const input = root.querySelector('#hq') as HTMLInputElement;
  const res = root.querySelector('#hres') as HTMLElement;
  const main = root.querySelector('#hmain') as HTMLElement;
  input.addEventListener('input', () => {
    const q = input.value.trim();
    res.innerHTML = '';
    main.style.display = q ? 'none' : '';
    if (!q) return;
    const found = recipes.filter(r => matchRecipe(r, q)).slice(0, 25);
    if (!found.length) { res.appendChild(el('<div class="empty-state"><span class="em">🔍</span>Aucune recette trouvée</div>')); return; }
    for (const r of found) res.appendChild(recipeCard(r));
  });

  // Suggestion aléatoire
  root.querySelector('#hdice')!.addEventListener('click', () => {
    let cat = '', maxTime = 0;
    const c = el(`<div>
      <h3 style="margin:2px 4px 12px">Je cuisine quoi ?</h3>
      <div class="chips" id="dcats"><button class="chip on" data-c="">Tout</button>${ALL_CATS.map(x => `<button class="chip" data-c="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      <div class="chips" id="dtime">
        <button class="chip on" data-t="0">Peu importe</button>
        <button class="chip" data-t="30">≤ 30 min</button>
        <button class="chip" data-t="60">≤ 1 h</button>
      </div>
      <button class="btn block" data-go style="margin-top:10px">${icons.dice} Surprends-moi</button>
      <div data-out style="margin-top:12px"></div>
    </div>`);
    const close = openSheet(c);
    c.querySelector('#dcats')!.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('.chip') as HTMLElement; if (!b) return;
      c.querySelectorAll('#dcats .chip').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); cat = b.dataset.c || '';
    });
    c.querySelector('#dtime')!.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('.chip') as HTMLElement; if (!b) return;
      c.querySelectorAll('#dtime .chip').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); maxTime = +(b.dataset.t || 0);
    });
    c.querySelector('[data-go]')!.addEventListener('click', () => {
      const pool = recipes.filter(r =>
        (!cat || r.cat === cat) && (!maxTime || (r.prepTime + r.cookTime) <= maxTime));
      const out = c.querySelector('[data-out]') as HTMLElement;
      out.innerHTML = '';
      if (!pool.length) { out.appendChild(el('<p class="muted" style="text-align:center">Rien ne correspond — élargis les filtres.</p>')); return; }
      const pick = pool[Math.floor(Math.random() * pool.length)];
      const card = recipeCard(pick);
      card.addEventListener('click', close);
      out.appendChild(card);
    });
  });

  const off = on('change', renderRecents);
  return () => off();
}
