import { el, esc, toast, uid, nowISO } from '../lib/utils';
import { getRecipe, upsertRecipe } from '../lib/store';
import { icons, openSheet, ALL_CATS, ALL_TAGS, LIFESTYLES } from '../lib/ui';
import { mealCategories, mealsByCategory, mealLookup, parseLooseRecipe } from '../lib/mealdb';
import type { Recipe } from '../lib/types';
import type { Route } from '../router';

function blank(): Recipe {
  return {
    id: 'r-' + uid(), cat: 'Viande', name: '', fullName: '', tag: null, desc: '',
    portions: 4, prepTime: 15, cookTime: 20, difficulty: 'Moyen', tags: [],
    lifestyle: 'Équilibré', macros: { kcal: 0, prot: 0, gluc: 0, lip: 0 }, meta: [], ratio: null,
    ingredients: [], steps: [], notes: [],
    createdAt: nowISO(), updatedAt: nowISO(), deleted: false, rating: 0, tested: false,
    photo: null, cookLog: [], tryNotes: [], isCustom: true, source: null,
  };
}

export function editView(root: HTMLElement, route: Route) {
  const existing = route.params.id ? getRecipe(route.params.id) : null;
  const r: Recipe = existing ? JSON.parse(JSON.stringify(existing)) : blank();
  const isNew = !existing;

  root.appendChild(el(`
    <div>
      <div class="hdr" style="margin-bottom:14px">
        <button class="iconbtn" onclick="history.back()">${icons.back}</button>
        <h1 style="flex:1;margin:0;font-size:23px">${isNew ? 'Nouvelle recette' : 'Modifier'}</h1>
      </div>
      ${isNew ? `<div style="display:flex;gap:9px;margin-bottom:16px">
        <button class="btn sec sm" style="flex:1" id="ejson">${icons.upload} Coller du JSON</button>
        <button class="btn sec sm" style="flex:1" id="emealdb">🌍 TheMealDB</button>
      </div>` : ''}
      <form id="eform" autocomplete="off"></form>
    </div>`));

  const form = root.querySelector('#eform') as HTMLElement;

  function renderForm() {
    form.innerHTML = `
      <label class="fld"><span>Nom</span><input type="text" name="name" value="${esc(r.name)}" required></label>
      <label class="fld"><span>Nom riche (avec &lt;em&gt; pour l'accent vert, optionnel)</span><input type="text" name="fullName" value="${esc(r.fullName)}"></label>
      <label class="fld"><span>Description</span><textarea name="desc">${esc(r.desc)}</textarea></label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <label class="fld"><span>Catégorie</span><select name="cat">${ALL_CATS.map(c => `<option ${r.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        <label class="fld"><span>Difficulté</span><select name="difficulty">${['Facile', 'Moyen', 'Difficile'].map(d => `<option ${r.difficulty === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
        <label class="fld"><span>Portions</span><input type="number" name="portions" inputmode="numeric" value="${r.portions}"></label>
        <label class="fld"><span>Lifestyle</span><select name="lifestyle">${LIFESTYLES.map(l => `<option ${r.lifestyle === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="fld"><span>Préparation (min)</span><input type="number" name="prepTime" inputmode="numeric" value="${r.prepTime}"></label>
        <label class="fld"><span>Cuisson (min)</span><input type="number" name="cookTime" inputmode="numeric" value="${r.cookTime}"></label>
      </div>

      <h2>Macros par portion</h2>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
        <label class="fld"><span>kcal</span><input type="number" name="kcal" inputmode="numeric" value="${r.macros.kcal}"></label>
        <label class="fld"><span>Prot (g)</span><input type="number" name="prot" inputmode="decimal" value="${r.macros.prot}"></label>
        <label class="fld"><span>Gluc (g)</span><input type="number" name="gluc" inputmode="decimal" value="${r.macros.gluc}"></label>
        <label class="fld"><span>Lip (g)</span><input type="number" name="lip" inputmode="decimal" value="${r.macros.lip}"></label>
      </div>

      <h2>Tags</h2>
      <div class="chips" style="flex-wrap:wrap" id="etags">
        ${ALL_TAGS.map(t => `<button type="button" class="chip sm ${r.tags.includes(t) ? 'on' : ''}" data-t="${esc(t)}">${esc(t)}</button>`).join('')}
      </div>

      <h2>Ingrédients</h2>
      <div id="eings"></div>
      <button type="button" class="btn sm ghost" id="eaddi">${icons.plus} Ingrédient</button>

      <h2>Étapes</h2>
      <div id="esteps"></div>
      <button type="button" class="btn sm ghost" id="eadds">${icons.plus} Étape</button>

      <h2>Notes de chef</h2>
      <div id="enotes"></div>
      <button type="button" class="btn sm ghost" id="eaddn">${icons.plus} Note</button>

      <h2>Ratio farines (pains — optionnel)</h2>
      <div id="eratio"></div>
      <button type="button" class="btn sm ghost" id="eaddr">${icons.plus} Farine</button>

      <hr class="sep">
      <button type="submit" class="btn block">${isNew ? 'Créer la recette' : 'Enregistrer'}</button>
    `;

    /* lignes dynamiques */
    const ingBox = form.querySelector('#eings') as HTMLElement;
    const addIng = (i = { a: 0, u: 'g', n: '' }) => {
      const row = el(`<div class="dyn-row">
        <input type="number" inputmode="decimal" step="any" placeholder="Qté" value="${i.a || ''}" style="max-width:78px" data-a>
        <input type="text" placeholder="g" value="${esc(i.u)}" style="max-width:64px" data-u>
        <input type="text" placeholder="Ingrédient" value="${esc(i.n)}" data-n>
        <button type="button" class="iconbtn del" style="width:32px;height:32px">${icons.x}</button>
      </div>`);
      row.querySelector('.del')!.addEventListener('click', () => row.remove());
      ingBox.appendChild(row);
    };
    r.ingredients.forEach(addIng);
    if (!r.ingredients.length) addIng();
    form.querySelector('#eaddi')!.addEventListener('click', () => addIng());

    const stepBox = form.querySelector('#esteps') as HTMLElement;
    const addStep = (s = { id: '', t: '', timer: null as number | null, d: '' }) => {
      const row = el(`<div class="card" style="padding:12px">
        <div class="dyn-row" style="margin-bottom:8px">
          <input type="text" placeholder="Titre de l'étape" value="${esc(s.t)}" data-st>
          <input type="number" inputmode="numeric" placeholder="min ⏱" value="${s.timer ? Math.round(s.timer / 60) : ''}" style="max-width:84px" data-stm>
          <button type="button" class="iconbtn del" style="width:32px;height:32px">${icons.x}</button>
        </div>
        <textarea placeholder="Description…" data-sd style="min-height:60px">${esc(s.d)}</textarea>
      </div>`);
      row.querySelector('.del')!.addEventListener('click', () => row.remove());
      stepBox.appendChild(row);
    };
    r.steps.forEach(addStep);
    if (!r.steps.length) addStep();
    form.querySelector('#eadds')!.addEventListener('click', () => addStep());

    const noteBox = form.querySelector('#enotes') as HTMLElement;
    const addNote = (n = '') => {
      const row = el(`<div class="dyn-row">
        <input type="text" placeholder="Astuce, conservation…" value="${esc(n)}" data-note>
        <button type="button" class="iconbtn del" style="width:32px;height:32px">${icons.x}</button>
      </div>`);
      row.querySelector('.del')!.addEventListener('click', () => row.remove());
      noteBox.appendChild(row);
    };
    r.notes.forEach(addNote);
    form.querySelector('#eaddn')!.addEventListener('click', () => addNote());

    const ratioBox = form.querySelector('#eratio') as HTMLElement;
    const COLORS = ['#7A8C4A', '#C8D490', '#A87C4F', '#D9B36C', '#8C6E4A'];
    const addRatio = (p = { l: '', p: 0, c: '' }) => {
      const row = el(`<div class="dyn-row">
        <input type="text" placeholder="T80, Seigle…" value="${esc(p.l)}" data-rl>
        <input type="number" inputmode="numeric" placeholder="%" value="${p.p || ''}" style="max-width:74px" data-rp>
        <button type="button" class="iconbtn del" style="width:32px;height:32px">${icons.x}</button>
      </div>`);
      row.querySelector('.del')!.addEventListener('click', () => row.remove());
      ratioBox.appendChild(row);
    };
    (r.ratio || []).forEach(addRatio);
    form.querySelector('#eaddr')!.addEventListener('click', () => addRatio());

    form.querySelector('#etags')!.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('.chip');
      if (b) b.classList.toggle('on');
    });

    /* submit */
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form as HTMLFormElement);
      const g = (k: string) => String(fd.get(k) || '').trim();
      const gn = (k: string) => parseFloat(String(fd.get(k) || '0').replace(',', '.')) || 0;

      r.name = g('name');
      if (!r.name) { toast('Le nom est requis', true); return; }
      r.fullName = g('fullName') || r.name;
      r.desc = g('desc');
      r.cat = g('cat'); r.difficulty = g('difficulty'); r.lifestyle = g('lifestyle');
      r.portions = Math.max(1, gn('portions') || 4);
      r.prepTime = gn('prepTime'); r.cookTime = gn('cookTime');
      r.macros = { kcal: gn('kcal'), prot: gn('prot'), gluc: gn('gluc'), lip: gn('lip') };
      r.tags = Array.from(form.querySelectorAll('#etags .chip.on')).map(b => (b as HTMLElement).dataset.t!);

      r.ingredients = Array.from(ingBox.querySelectorAll('.dyn-row')).map(row => ({
        a: parseFloat(((row.querySelector('[data-a]') as HTMLInputElement).value || '0').replace(',', '.')) || 0,
        u: (row.querySelector('[data-u]') as HTMLInputElement).value.trim(),
        n: (row.querySelector('[data-n]') as HTMLInputElement).value.trim(),
      })).filter(i => i.n);

      r.steps = Array.from(stepBox.querySelectorAll('.card')).map((row, i) => {
        const min = parseFloat((row.querySelector('[data-stm]') as HTMLInputElement).value) || 0;
        return {
          id: 's' + (i + 1),
          t: (row.querySelector('[data-st]') as HTMLInputElement).value.trim() || `Étape ${i + 1}`,
          timer: min > 0 ? Math.round(min * 60) : null,
          d: (row.querySelector('[data-sd]') as HTMLTextAreaElement).value.trim(),
        };
      }).filter(s => s.d);

      r.notes = Array.from(noteBox.querySelectorAll('[data-note]')).map(i => (i as HTMLInputElement).value.trim()).filter(Boolean);

      const ratio = Array.from(ratioBox.querySelectorAll('.dyn-row')).map((row, i) => ({
        l: (row.querySelector('[data-rl]') as HTMLInputElement).value.trim(),
        p: parseFloat((row.querySelector('[data-rp]') as HTMLInputElement).value) || 0,
        c: (r.ratio?.[i]?.c) || COLORS[i % COLORS.length],
      })).filter(p => p.l && p.p > 0);
      r.ratio = ratio.length ? ratio : null;

      if (!r.ingredients.length) { toast('Ajoute au moins un ingrédient', true); return; }
      if (!r.steps.length) { toast('Ajoute au moins une étape', true); return; }

      upsertRecipe(r);
      toast(isNew ? 'Recette créée ✓' : 'Modifications enregistrées ✓');
      location.hash = '#/recette/' + r.id;
    });
  }

  renderForm();

  /* ---- Import JSON collé ---- */
  root.querySelector('#ejson')?.addEventListener('click', () => {
    const c = el(`<div>
      <h3 style="margin:2px 4px 10px">Coller une recette JSON</h3>
      <textarea data-j style="min-height:180px;font-family:ui-monospace,monospace;font-size:13px" placeholder='{"name":"…","ingredients":[…],"steps":[…]}'></textarea>
      <button class="btn block" data-go style="margin-top:10px">Importer</button>
    </div>`);
    const close = openSheet(c);
    c.querySelector('[data-go]')!.addEventListener('click', () => {
      try {
        const obj = JSON.parse((c.querySelector('[data-j]') as HTMLTextAreaElement).value);
        const parsed = parseLooseRecipe(obj);
        Object.assign(r, parsed, { id: r.id });
        renderForm();
        toast('Recette importée — vérifie et enregistre');
        close();
      } catch { toast('JSON invalide', true); }
    });
  });

  /* ---- Import TheMealDB ---- */
  root.querySelector('#emealdb')?.addEventListener('click', async () => {
    const c = el(`<div><h3 style="margin:2px 4px 10px">TheMealDB</h3><div data-b><p class="muted small">Chargement…</p></div></div>`);
    const close = openSheet(c);
    const box = c.querySelector('[data-b]') as HTMLElement;
    try {
      const cats = await mealCategories();
      box.innerHTML = '';
      const chips = el(`<div class="chips" style="flex-wrap:wrap">${cats.map(x => `<button class="chip sm" data-c="${esc(x.name)}">${esc(x.name)}</button>`).join('')}</div>`);
      const out = el('<div style="margin-top:10px;max-height:46dvh;overflow-y:auto"></div>');
      box.append(chips, out);
      chips.addEventListener('click', async (e) => {
        const b = (e.target as HTMLElement).closest('.chip') as HTMLElement; if (!b) return;
        chips.querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        out.innerHTML = '<p class="muted small">Chargement…</p>';
        const meals = await mealsByCategory(b.dataset.c!);
        out.innerHTML = '';
        for (const m of meals.slice(0, 30)) {
          const row = el(`<div class="row row-tap"><img src="${esc(m.thumb)}/preview" alt="" style="width:42px;height:42px;border-radius:9px;object-fit:cover"><div class="grow">${esc(m.name)}</div></div>`);
          row.addEventListener('click', async () => {
            out.innerHTML = '<p class="muted small">Import…</p>';
            const rec = await mealLookup(m.id);
            if (rec) {
              Object.assign(r, rec, { id: r.id });
              renderForm();
              toast('Importée — quantités converties en métrique ✓');
            }
            close();
          });
          out.appendChild(row);
        }
      });
    } catch {
      box.innerHTML = '<p class="muted">TheMealDB injoignable (hors-ligne ?)</p>';
    }
  });
}
