import { el, esc, richName, fmtMin } from './utils';
import type { Recipe } from './types';
import { photoSrc } from './store';

/* ---- Icônes SVG (trait 1.8, style SF-like) ---- */
const P = (d: string, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${extra}<path d="${d}"/></svg>`;

export const icons = {
  home: P('M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9.5 21v-6h5v6'),
  book: P('M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21V5.5ZM4 18.5A2.5 2.5 0 0 1 6.5 16H20'),
  cal: P('M5 5h14a1.6 1.6 0 0 1 1.6 1.6V19a1.6 1.6 0 0 1-1.6 1.6H5A1.6 1.6 0 0 1 3.4 19V6.6A1.6 1.6 0 0 1 5 5Zm-1.6 5h17.2M8 3v4M16 3v4'),
  cart: P('M3 4h2.2l2.2 11.5a1.6 1.6 0 0 0 1.6 1.3h7.9a1.6 1.6 0 0 0 1.6-1.2L20.5 8H6', '<circle cx="9.7" cy="20.3" r="1.2" fill="currentColor"/><circle cx="17.2" cy="20.3" r="1.2" fill="currentColor"/>'),
  dots: P('', '<circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none"/>'),
  search: P('M10.8 18a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4ZM21 21l-4.9-4.9'),
  plus: P('M12 5v14M5 12h14'),
  back: P('M15 19 8 12l7-7'),
  fwd: P('m9 5 7 7-7 7'),
  play: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.7v12.6c0 .8.9 1.3 1.6.9l10-6.3c.6-.4.6-1.4 0-1.8l-10-6.3c-.7-.4-1.6.1-1.6.9Z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>`,
  reset: P('M4 10a8 8 0 1 1 2 7.4M4 10V4m0 6h6'),
  check: P('m4.5 12.5 5 5 10-11'),
  trash: P('M5 7h14M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2M7 7l1 13h8l1-13M10 11v6M14 11v6'),
  edit: P('M4 20h4.5L20 8.5a2.1 2.1 0 0 0-3-3L5.5 17 4 20ZM14.5 7 17 9.5'),
  share: P('M12 3v12M8 7l4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6'),
  copy: P('M9 9h10v12H9zM5 15H4V3h11v1'),
  flame: P('M12 21c4 0 6.5-2.6 6.5-6 0-3-2-5-3.4-7.1-.3-.5-1-.4-1.2.1-.4 1-.9 2-1.9 2-1.4 0-1.7-2.2-1.7-4 0-.7-.8-1.1-1.3-.6C7 7.5 5.5 10.4 5.5 13c0 4.5 2.5 8 6.5 8Z'),
  star: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3 2.7 5.8 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3.1 1.2-6.2L3 9.6l6.3-.8L12 3Z"/></svg>`,
  cam: P('M4 8h3l1.5-2.5h7L17 8h3a1.5 1.5 0 0 1 1.5 1.5V19A1.5 1.5 0 0 1 20 20.5H4A1.5 1.5 0 0 1 2.5 19V9.5A1.5 1.5 0 0 1 4 8Z', '<circle cx="12" cy="14" r="3.4" fill="none" stroke="currentColor" stroke-width="1.9"/>'),
  fridge: P('M6 3h12v18H6zM6 10h12M9 6v2M9 13v3'),
  dice: P('M5 5h14v14H5z', '<circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="15" r="1.2" fill="currentColor" stroke="none"/>'),
  download: P('M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 19h16'),
  upload: P('M12 15V3m0 0 4.5 4.5M12 3 7.5 7.5M4 19h16'),
  gear: P('M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm7.5-3.2c0 .5 0 1-.1 1.4l2 1.6-1.9 3.3-2.4-.9c-.7.6-1.6 1.1-2.5 1.4l-.4 2.6h-3.8l-.4-2.6a7.6 7.6 0 0 1-2.5-1.4l-2.4.9-1.9-3.3 2-1.6a7.8 7.8 0 0 1 0-2.8l-2-1.6 1.9-3.3 2.4.9c.7-.6 1.6-1.1 2.5-1.4l.4-2.6h3.8l.4 2.6c.9.3 1.8.8 2.5 1.4l2.4-.9 1.9 3.3-2 1.6c.1.4.1.9.1 1.4Z'),
  journal: P('M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm3 5h6M9 12h6M9 16h4'),
  clock: P('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3.2 2'),
  x: P('M6 6l12 12M18 6 6 18'),
  chef: P('M8.5 9.5A3.8 3.8 0 0 1 7 2.7 4.6 4.6 0 0 1 12 2a4.6 4.6 0 0 1 5 .7 3.8 3.8 0 0 1-1.5 6.8V14h-7V9.5ZM8.5 14v4a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-4'),
};

/* ---- Emojis catégories ---- */
export const CAT_EMOJI: Record<string, string> = {
  Pain: '🍞', Pizza: '🍕', Viennoiserie: '🥐', Boisson: '🍹', Viande: '🥩', Poisson: '🐟',
  'Légumes': '🥦', Soupe: '🍲', 'Pâte': '🍝', Salade: '🥗', Dessert: '🍰', Sauce: '🥣', Conserve: '🫙',
};
export const ALL_CATS = ['Pain', 'Pizza', 'Viennoiserie', 'Viande', 'Poisson', 'Légumes', 'Soupe', 'Pâte', 'Salade', 'Dessert', 'Sauce', 'Boisson', 'Conserve'];
export const ALL_TAGS = ['Fait maison', 'Végétarien', 'Vegan', 'Rapide', 'Festif', 'Été', 'Hiver', 'Épicé', 'Week-end', 'Healthy', 'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Apéro', 'Importée'];
export const LIFESTYLES = ['Healthy', 'Équilibré', 'Plaisir', 'Festif'];

/* ---- Carte recette ---- */
export function recipeCard(r: Recipe, sub?: string): HTMLElement {
  const src = photoSrc(r);
  const thumb = src
    ? `<div class="thumb"><img src="${esc(src)}" alt="" loading="lazy"></div>`
    : `<div class="thumb">${CAT_EMOJI[r.cat] || '🍽'}</div>`;
  const stars = r.rating ? `<span class="badge gold">★ ${r.rating}</span>` : '';
  const card = el(`
    <article class="rcard" data-id="${esc(r.id)}">
      ${thumb}
      <div class="grow" style="min-width:0">
        <div class="t">${richName(r.fullName || r.name)}</div>
        <div class="m">
          <span class="badge plain">${esc(r.cat)}</span>
          <span>⏱ ${fmtMin(r.prepTime + r.cookTime)}</span>
          ${r.macros?.kcal ? `<span>${r.macros.kcal} kcal</span>` : ''}
          ${stars}
          ${sub ? `<span>${esc(sub)}</span>` : ''}
        </div>
      </div>
      <span style="color:var(--k3)">${icons.fwd}</span>
    </article>`);
  card.addEventListener('click', () => { location.hash = '#/recette/' + r.id; });
  return card;
}

/* ---- Bottom sheet ---- */
export function openSheet(content: HTMLElement, onClose?: () => void): () => void {
  const root = document.getElementById('sheet-root')!;
  const scrim = el('<div class="scrim"></div>');
  const sheet = el('<div class="sheet" role="dialog"><div class="grab"></div><div class="sheet-body"></div></div>');
  sheet.querySelector('.sheet-body')!.appendChild(content);
  const close = () => { scrim.remove(); sheet.remove(); onClose?.(); };
  scrim.addEventListener('click', close);
  root.append(scrim, sheet);
  return close;
}

export function confirmSheet(msg: string, okLabel = 'Confirmer', danger = true): Promise<boolean> {
  return new Promise(resolve => {
    const c = el(`<div>
      <p style="font:600 16px/1.45 var(--font);margin:4px 4px 16px">${esc(msg)}</p>
      <button class="btn block ${danger ? 'danger' : ''}" data-ok>${esc(okLabel)}</button>
      <button class="btn block ghost" data-no style="margin-top:9px">Annuler</button>
    </div>`);
    const close = openSheet(c, () => resolve(false));
    c.querySelector('[data-ok]')!.addEventListener('click', () => { resolve(true); close(); });
    c.querySelector('[data-no]')!.addEventListener('click', () => { resolve(false); close(); });
  });
}
