import type { Doc, Recipe, CourseItem, PlannerWeek, JournalEntry, SyncStatus } from './types';
import { idbGet, idbSet } from './db';
import { nowISO, debounce } from './utils';
import seed from '../data/seed-recipes.json';

/* ---------------- Événements ---------------- */
type Handler = (data?: any) => void;
const listeners = new Map<string, Set<Handler>>();

export function on(evt: string, fn: Handler) {
  if (!listeners.has(evt)) listeners.set(evt, new Set());
  listeners.get(evt)!.add(fn);
  return () => listeners.get(evt)!.delete(fn);
}
export function emit(evt: string, data?: any) {
  listeners.get(evt)?.forEach(fn => fn(data));
}

/* ---------------- État ---------------- */
function emptyDoc(): Doc {
  return { version: 2, recipes: [], planner: {}, courses: {}, journal: {}, updatedAt: nowISO() };
}

export const state = {
  doc: emptyDoc(),
  photos: {} as Record<string, string>,   // recipeId -> dataURL (fichier gist séparé)
  photosDirty: false,
  recents: [] as string[],
  syncStatus: 'off' as SyncStatus,
  dirty: false,
};

/* ---------------- Réglages (localStorage) ---------------- */
export const settings = {
  get token() { return localStorage.getItem('gh_token') || ''; },
  set token(v: string) { localStorage.setItem('gh_token', v); },
  get gistId() { return localStorage.getItem('gh_gist') || ''; },
  set gistId(v: string) { localStorage.setItem('gh_gist', v); },
  get theme() { return localStorage.getItem('theme') || 'dark'; },
  set theme(v: string) { localStorage.setItem('theme', v); applyTheme(); },
};

export function applyTheme() {
  const pref = settings.theme;
  const dark = pref === 'dark' || (pref === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const tc = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
  if (tc) tc.content = dark ? '#0A0A0B' : '#F7F7F4';
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

/* ---------------- Chargement initial ---------------- */
export async function loadLocal() {
  const doc = await idbGet<Doc>('doc');
  if (doc && doc.recipes?.length) {
    state.doc = doc;
  } else {
    // Premier lancement : seed du catalogue (~106 recettes)
    state.doc = emptyDoc();
    state.doc.recipes = (seed as unknown as Recipe[]).map(r => ({ ...r }));
    await idbSet('doc', state.doc);
  }
  state.photos = (await idbGet<Record<string, string>>('photos')) || {};
  state.recents = (await idbGet<string[]>('recents')) || [];
  applyTheme();
}

/* ---------------- Persistance ---------------- */
const persist = debounce(async () => {
  await idbSet('doc', state.doc);
  if (state.photosDirty) await idbSet('photos', state.photos);
}, 250);

/** À appeler après toute mutation. Persiste localement + programme un push gist. */
export function save(touchDoc = true) {
  if (touchDoc) state.doc.updatedAt = nowISO();
  state.dirty = true;
  persist();
  emit('change');
  emit('sync:request');
}

/* ---------------- Accès recettes ---------------- */
export const liveRecipes = () => state.doc.recipes.filter(r => !r.deleted);
export const getRecipe = (id: string) => state.doc.recipes.find(r => r.id === id && !r.deleted);

export function upsertRecipe(r: Recipe) {
  r.updatedAt = nowISO();
  const i = state.doc.recipes.findIndex(x => x.id === r.id);
  if (i >= 0) state.doc.recipes[i] = r; else state.doc.recipes.push(r);
  save();
}

export function deleteRecipe(id: string) {
  const r = state.doc.recipes.find(x => x.id === id);
  if (!r) return;
  r.deleted = true;
  r.updatedAt = nowISO();
  delete state.photos[id];
  state.photosDirty = true;
  save();
}

export function setPhoto(id: string, dataUrl: string | null) {
  if (dataUrl) { state.photos[id] = dataUrl; }
  else delete state.photos[id];
  state.photosDirty = true;
  const r = getRecipe(id);
  if (r) { r.photo = dataUrl ? 'gist' : null; r.updatedAt = nowISO(); }
  save();
}

export function photoSrc(r: Recipe): string | null {
  if (!r.photo) return null;
  if (r.photo === 'gist') return state.photos[r.id] || null;
  return r.photo; // URL externe (TheMealDB…)
}

export function touchRecent(id: string) {
  state.recents = [id, ...state.recents.filter(x => x !== id)].slice(0, 8);
  idbSet('recents', state.recents);
}

/* ---------------- Planner / Courses / Journal ---------------- */
export function plannerWeek(key: string): PlannerWeek {
  if (!state.doc.planner[key]) state.doc.planner[key] = { days: {}, updatedAt: nowISO() };
  return state.doc.planner[key];
}
export function setSlot(weekKey: string, day: number, slot: string, recipeId: string | null) {
  const wk = plannerWeek(weekKey);
  const d = (wk.days[String(day)] = wk.days[String(day)] || {});
  if (recipeId) (d as any)[slot] = recipeId; else delete (d as any)[slot];
  wk.updatedAt = nowISO();
  save();
}

export function addCourseItem(item: Partial<CourseItem> & { n: string }) {
  // Agrégation : même nom (insensible casse) + même unité → on additionne
  const norm = item.n.trim().toLowerCase();
  const existing = Object.values(state.doc.courses).find(c =>
    !c.deleted && c.n.trim().toLowerCase() === norm && (c.u || '') === (item.u || ''));
  if (existing && item.a && existing.a !== null) {
    existing.a = Math.round((existing.a + item.a) * 100) / 100;
    existing.checked = false;
    existing.updatedAt = nowISO();
  } else if (existing && !item.a) {
    existing.checked = false;
    existing.updatedAt = nowISO();
  } else {
    const id = 'c' + Math.random().toString(36).slice(2, 10);
    state.doc.courses[id] = {
      id, n: item.n.trim(), a: item.a ?? null, u: item.u || '',
      rayon: item.rayon || 'Autres', checked: false, updatedAt: nowISO(), deleted: false,
    };
  }
}

export function setJournal(dateKey: string, text: string) {
  state.doc.journal[dateKey] = { text, updatedAt: nowISO(), deleted: !text.trim() };
  save();
}

/* ---------------- Merge (sync gist) ----------------
   Granulaire, par updatedAt, tombstones conservés : aucun écrasement aveugle. */
export function mergeDoc(remote: Doc): boolean {
  let localChanged = false;   // le doc local contient-il des choses absentes du remote ?
  const local = state.doc;

  // Recettes par id
  const map = new Map(local.recipes.map(r => [r.id, r]));
  for (const rr of remote.recipes || []) {
    const lr = map.get(rr.id);
    if (!lr) { local.recipes.push(rr); }
    else if (rr.updatedAt > lr.updatedAt) { Object.assign(lr, rr); }
    else if (lr.updatedAt > rr.updatedAt) { localChanged = true; }
  }
  const remoteIds = new Set((remote.recipes || []).map(r => r.id));
  if (local.recipes.some(r => !remoteIds.has(r.id))) localChanged = true;

  // Maps génériques keyed
  const mergeMap = (lm: Record<string, any>, rm: Record<string, any>) => {
    for (const k of Object.keys(rm || {})) {
      if (!lm[k] || rm[k].updatedAt > lm[k].updatedAt) lm[k] = rm[k];
      else if (lm[k].updatedAt > rm[k].updatedAt) localChanged = true;
    }
    if (Object.keys(lm).some(k => !(rm || {})[k])) localChanged = true;
  };
  mergeMap(local.planner, remote.planner);
  mergeMap(local.courses, remote.courses);
  mergeMap(local.journal, remote.journal);

  idbSet('doc', local);
  emit('change');
  return localChanged;
}
