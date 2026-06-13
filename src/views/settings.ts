import { el, esc, toast, nowISO } from '../lib/utils';
import { state, settings, save, mergeDoc, on } from '../lib/store';
import { pull, push, testConnection } from '../lib/gist';
import { icons } from '../lib/ui';
import type { Doc } from '../lib/types';
import type { Route } from '../router';

const STATUS_LB: Record<string, string> = {
  off: 'Non configurée', offline: 'Hors-ligne', syncing: 'Synchronisation…', ok: 'À jour', error: 'Erreur',
};

export function settingsView(root: HTMLElement, _r: Route) {
  root.appendChild(el(`
    <div>
      <div class="hdr">
        <button class="iconbtn" onclick="history.back()">${icons.back}</button>
        <h1 style="flex:1;margin:0;font-size:24px">Réglages</h1>
      </div>

      <h2>Synchronisation GitHub Gist</h2>
      <div class="card">
        <label class="fld"><span>Token GitHub (classique, scope « gist »)</span>
          <input type="password" id="stok" value="${esc(settings.token)}" placeholder="ghp_…" autocomplete="off"></label>
        <label class="fld"><span>ID du Gist</span>
          <input type="text" id="sgist" value="${esc(settings.gistId)}" placeholder="ex. a1b2c3d4…" autocomplete="off"></label>
        <div style="display:flex;gap:9px">
          <button class="btn sec" style="flex:1" id="stest">Tester</button>
          <button class="btn" style="flex:1" id="ssync">Synchroniser</button>
        </div>
        <p class="small" style="margin:12px 2px 0;display:flex;align-items:center;gap:7px">
          <span class="sync-dot ${esc(state.syncStatus)}" id="sdot"></span>
          <span id="slb">${STATUS_LB[state.syncStatus]}</span>
        </p>
        <p class="small muted" style="margin:8px 2px 0">Le token reste sur cet appareil (localStorage). Les données vivent dans ton gist secret — chaque sync crée une révision, donc historique et retour arrière gratuits côté GitHub.</p>
      </div>

      <h2>Apparence</h2>
      <div class="card">
        <div class="seg" id="stheme">
          <button data-t="light" class="${settings.theme === 'light' ? 'on' : ''}">☀️ Clair</button>
          <button data-t="auto" class="${settings.theme === 'auto' ? 'on' : ''}">Auto</button>
          <button data-t="dark" class="${settings.theme === 'dark' ? 'on' : ''}">🌙 Sombre</button>
        </div>
      </div>

      <h2>Données</h2>
      <div class="list">
        <div class="row row-tap" id="sexport"><span style="color:var(--ac)">${icons.download}</span><div class="grow">Exporter tout (JSON)</div></div>
        <div class="row row-tap" id="simport"><span style="color:var(--ac)">${icons.upload}</span><div class="grow">Importer un export (fusion)</div></div>
      </div>

      <p class="small muted" style="text-align:center;margin-top:22px">Mon Carnet de Recettes v2 · PWA hors-ligne<br>GitHub Pages + Gist · fait maison 🍞</p>
    </div>`));

  const tok = root.querySelector('#stok') as HTMLInputElement;
  const gid = root.querySelector('#sgist') as HTMLInputElement;
  tok.addEventListener('change', () => { settings.token = tok.value.trim(); });
  gid.addEventListener('change', () => { settings.gistId = gid.value.trim(); });

  root.querySelector('#stest')!.addEventListener('click', async () => {
    settings.token = tok.value.trim();
    settings.gistId = gid.value.trim();
    const r = await testConnection();
    toast(r.msg, !r.ok);
  });

  root.querySelector('#ssync')!.addEventListener('click', async () => {
    settings.token = tok.value.trim();
    settings.gistId = gid.value.trim();
    await pull(true);
    if (state.dirty || state.photosDirty) await push();
    toast(state.syncStatus === 'ok' ? 'Synchronisé ✓' : 'Sync impossible — vérifie la config', state.syncStatus !== 'ok');
  });

  root.querySelector('#stheme')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button') as HTMLElement;
    if (!b) return;
    root.querySelectorAll('#stheme button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    settings.theme = b.dataset.t!;
  });

  root.querySelector('#sexport')!.addEventListener('click', () => {
    const payload = { ...state.doc, photos: state.photos, exportedAt: nowISO() };
    const blob = new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `carnet-recettes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Export téléchargé ✓');
  });

  root.querySelector('#simport')!.addEventListener('click', () => {
    const fi = document.createElement('input');
    fi.type = 'file';
    fi.accept = 'application/json,.json';
    fi.onchange = async () => {
      const f = fi.files?.[0];
      if (!f) return;
      try {
        const obj = JSON.parse(await f.text());
        if (!Array.isArray(obj.recipes)) throw new Error('format');
        if (obj.photos) {
          state.photos = { ...state.photos, ...obj.photos };
          state.photosDirty = true;
        }
        mergeDoc(obj as Doc);
        save();
        toast(`Import fusionné — ${obj.recipes.length} recettes traitées ✓`);
      } catch {
        toast('Fichier illisible ou format inattendu', true);
      }
    };
    fi.click();
  });

  const off = on('sync:status', ({ s, msg }: any) => {
    const dot = root.querySelector('#sdot'), lb = root.querySelector('#slb');
    if (dot) dot.className = 'sync-dot ' + s;
    if (lb) lb.textContent = STATUS_LB[s] + (s === 'error' && msg ? ' — ' + msg : '');
  });
  return () => off();
}
