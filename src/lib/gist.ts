/* Sync GitHub Gist — recipes.json (données) + photos.json (images compressées).
   - pull au boot, toutes les 45 s, au retour d'onglet, au retour réseau
   - push debounce 2,5 s après mutation
   - merge granulaire par updatedAt (store.mergeDoc), jamais d'écrasement
   - gère la troncature API (fichiers > 1 Mo → raw_url) */

import { state, settings, mergeDoc, emit } from './store';
import type { Doc, SyncStatus } from './types';
import { idbSet } from './db';

const API = 'https://api.github.com/gists/';
let etag = '';
let pushTimer: any = null;
let pulling = false;
let pushing = false;

function setStatus(s: SyncStatus, msg = '') {
  state.syncStatus = s;
  emit('sync:status', { s, msg });
}

const configured = () => !!(settings.token && settings.gistId);

function headers() {
  return {
    Authorization: 'Bearer ' + settings.token,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function fileContent(file: any): Promise<string> {
  if (!file) return '';
  if (file.truncated && file.raw_url) {
    const r = await fetch(file.raw_url);
    return r.text();
  }
  return file.content || '';
}

export async function pull(force = false): Promise<void> {
  if (!configured() || pulling) return;
  if (!navigator.onLine) { setStatus('offline'); return; }
  pulling = true;
  setStatus('syncing');
  try {
    const h: Record<string, string> = { ...headers() };
    if (etag && !force) h['If-None-Match'] = etag;
    const res = await fetch(API + settings.gistId, { headers: h });

    if (res.status === 304) { setStatus('ok'); pulling = false; maybePush(); return; }
    if (!res.ok) throw new Error('Gist HTTP ' + res.status);
    etag = res.headers.get('ETag') || '';

    const gist = await res.json();
    const recTxt = await fileContent(gist.files?.['recipes.json']);
    const phoTxt = await fileContent(gist.files?.['photos.json']);

    let remote: Doc | null = null;
    try { remote = recTxt ? JSON.parse(recTxt) : null; } catch { remote = null; }

    if (!remote || !Array.isArray(remote.recipes) || !remote.recipes.length) {
      // Gist vide → seeding avec les données locales
      await push(true);
    } else {
      const localAhead = mergeDoc(remote);
      if (localAhead || state.dirty) schedulePush(300);
    }

    if (phoTxt) {
      try {
        const remotePhotos = JSON.parse(phoTxt) as Record<string, string>;
        // photos : union, le local gagne s'il a marqué dirty
        if (!state.photosDirty) state.photos = { ...state.photos, ...remotePhotos };
        else state.photos = { ...remotePhotos, ...state.photos };
        await idbSet('photos', state.photos);
      } catch { /* photos illisibles : on ignore */ }
    }
    setStatus('ok');
  } catch (e: any) {
    setStatus('error', e?.message || 'Erreur sync');
  } finally {
    pulling = false;
  }
}

export async function push(seeding = false): Promise<void> {
  if (!configured() || pushing) return;
  if (!navigator.onLine) { setStatus('offline'); return; }
  pushing = true;
  setStatus('syncing');
  try {
    const files: Record<string, { content: string }> = {
      'recipes.json': { content: JSON.stringify(state.doc) },
    };
    if (state.photosDirty || seeding) {
      files['photos.json'] = { content: JSON.stringify(state.photos) };
    }
    const res = await fetch(API + settings.gistId, {
      method: 'PATCH',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ files }),
    });
    if (!res.ok) throw new Error('Gist HTTP ' + res.status);
    etag = ''; // le contenu a changé
    state.dirty = false;
    state.photosDirty = false;
    setStatus('ok');
  } catch (e: any) {
    setStatus('error', e?.message || 'Erreur sync');
  } finally {
    pushing = false;
  }
}

function maybePush() { if (state.dirty || state.photosDirty) schedulePush(300); }

export function schedulePush(ms = 2500) {
  if (!configured()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => push(), ms);
}

export function startSync() {
  if (configured()) pull(true);
  else setStatus('off');

  setInterval(() => { if (configured()) pull(); }, 45_000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && configured()) pull();
  });
  window.addEventListener('online', () => { if (configured()) pull(); });
  window.addEventListener('offline', () => setStatus('offline'));
}

/** Test de connexion depuis les réglages */
export async function testConnection(): Promise<{ ok: boolean; msg: string }> {
  if (!configured()) return { ok: false, msg: 'Token ou ID de Gist manquant' };
  try {
    const res = await fetch(API + settings.gistId, { headers: headers() });
    if (res.status === 401) return { ok: false, msg: 'Token invalide (401)' };
    if (res.status === 404) return { ok: false, msg: 'Gist introuvable (404) — vérifie l\'ID et le scope "gist" du token' };
    if (!res.ok) return { ok: false, msg: 'HTTP ' + res.status };
    const g = await res.json();
    const n = Object.keys(g.files || {}).length;
    return { ok: true, msg: `Connecté — ${n} fichier(s) dans le gist` };
  } catch {
    return { ok: false, msg: 'Réseau injoignable' };
  }
}
