import './styles.css';
import { loadLocal, on, state } from './lib/store';
import { restoreTimers, renderPill } from './lib/timers';
import { startSync } from './lib/gist';
import { armAudio } from './lib/utils';
import { route, startRouter } from './router';
import { icons } from './lib/ui';

import { homeView } from './views/home';
import { recipesView } from './views/recipes';
import { recipeView } from './views/recipe';
import { cookView } from './views/cook';
import { editView } from './views/edit';
import { plannerView } from './views/planner';
import { coursesView } from './views/courses';
import { plusView } from './views/plus';
import { journalView } from './views/journal';
import { frigoView } from './views/frigo';
import { settingsView } from './views/settings';

/* ---- Onglets ---- */
const TABS = [
  { hash: '#/', icon: icons.home, lb: 'Accueil', match: (p: string) => p === '/' },
  { hash: '#/recettes', icon: icons.book, lb: 'Recettes', match: (p: string) => p.startsWith('/recett') || p.startsWith('/recette') || p.startsWith('/new') || p.startsWith('/edit') || p.startsWith('/cuisine') || p.startsWith('/frigo') },
  { hash: '#/planning', icon: icons.cal, lb: 'Planning', match: (p: string) => p.startsWith('/planning') },
  { hash: '#/courses', icon: icons.cart, lb: 'Courses', match: (p: string) => p.startsWith('/courses') },
  { hash: '#/plus', icon: icons.dots, lb: 'Plus', match: (p: string) => p.startsWith('/plus') || p.startsWith('/journal') || p.startsWith('/reglages') },
];

function renderTabs() {
  const bar = document.getElementById('tabbar')!;
  const path = (location.hash.slice(1).split('?')[0]) || '/';
  // Le mode cuisine masque la tab bar
  bar.style.display = path.startsWith('/cuisine') ? 'none' : '';
  bar.innerHTML = '';
  for (const t of TABS) {
    const b = document.createElement('button');
    b.className = t.match(path) ? 'on' : '';
    b.innerHTML = `${t.icon}<span>${t.lb}</span>`;
    b.addEventListener('click', () => { location.hash = t.hash; });
    bar.appendChild(b);
  }
}

async function boot() {
  await loadLocal();
  restoreTimers();

  route('/', homeView);
  route('/recettes', recipesView);
  route('/recette/:id', recipeView);
  route('/cuisine/:id', cookView);
  route('/edit/:id', editView);
  route('/new', editView);
  route('/planning', plannerView);
  route('/courses', coursesView);
  route('/plus', plusView);
  route('/journal', journalView);
  route('/frigo', frigoView);
  route('/reglages', settingsView);

  startRouter();
  renderTabs();
  window.addEventListener('hashchange', renderTabs);

  on('timers', renderPill);
  renderPill();

  armAudio();
  startSync();

  // Badge sync sur l'onglet Plus déjà géré dans la vue ; ici on garde l'état frais
  on('sync:status', ({ s }: any) => { state.syncStatus = s; });
}

boot();

/* ---- Service Worker (auto-update) ---- */
import { registerSW } from 'virtual:pwa-register';
registerSW({ immediate: true });
