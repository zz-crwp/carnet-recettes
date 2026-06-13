import { el, esc, richName, fmtMin, fmtQty, fmtSec, toast, vibrate, nowISO, compressImage, dateKey, fmtDateKey } from '../lib/utils';
import { getRecipe, liveRecipes, upsertRecipe, deleteRecipe, save, touchRecent, photoSrc, setPhoto, addCourseItem } from '../lib/store';
import { on } from '../lib/store';
import { icons, CAT_EMOJI, openSheet, confirmSheet } from '../lib/ui';
import { scaledIngredients, factorForIngredient, bakerPercentages, dryYeast, findFreshYeast, similar, rayonOf } from '../lib/recipes-logic';
import { getTimer, startTimer, pauseTimer, resetTimer, remainingOf } from '../lib/timers';
import { recipeCard } from '../lib/ui';
import type { Route } from '../router';
import { uid } from '../lib/utils';

export function recipeView(root: HTMLElement, route: Route) {
  const r = getRecipe(route.params.id);
  if (!r) { root.appendChild(el('<div class="empty-state"><span class="em">🫥</span>Recette introuvable</div>')); return; }
  touchRecent(r.id);

  let factor = 1;

  const src = photoSrc(r);
  root.appendChild(el(`
    <div>
      <div class="hdr" style="margin-bottom:12px">
        <button class="iconbtn" onclick="history.back()">${icons.back}</button>
        <div style="flex:1"></div>
        <button class="iconbtn" id="dshare">${icons.share}</button>
        <button class="iconbtn" onclick="location.hash='#/edit/${esc(r.id)}'">${icons.edit}</button>
        <button class="iconbtn" id="dmore">${icons.dots}</button>
      </div>
      <div id="dphoto">${src ? `<img class="hero-photo" src="${esc(src)}" alt="${esc(r.name)}">` : ''}</div>
      <h1 style="font-size:26px">${richName(r.fullName || r.name)}</h1>
      <p class="sub" style="margin-bottom:8px">${esc(r.desc)}</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">
        <span class="badge plain">${CAT_EMOJI[r.cat] || ''} ${esc(r.cat)}</span>
        <span class="badge plain">${esc(r.difficulty)}</span>
        <span class="badge">${esc(r.lifestyle)}</span>
        ${r.tags.map(t => `<span class="badge plain">${esc(t)}</span>`).join('')}
      </div>
      <div class="metas">
        <div class="meta-box"><div class="v">${fmtMin(r.prepTime)}</div><div class="l">Préparation</div></div>
        <div class="meta-box"><div class="v">${fmtMin(r.cookTime)}</div><div class="l">Cuisson</div></div>
        ${(r.meta || []).slice(0, 4).map(m => `<div class="meta-box"><div class="v">${esc(m.v)}</div><div class="l">${esc(m.l)}</div></div>`).join('')}
      </div>
      ${r.macros?.kcal ? `<div class="card"><div class="kpis">
        <div class="kpi"><div class="v">${r.macros.kcal}</div><div class="l">kcal</div></div>
        <div class="kpi"><div class="v">${r.macros.prot} g</div><div class="l">Prot</div></div>
        <div class="kpi"><div class="v">${r.macros.gluc} g</div><div class="l">Gluc</div></div>
        <div class="kpi"><div class="v">${r.macros.lip} g</div><div class="l">Lip</div></div>
      </div><p class="small muted" style="text-align:center;margin:8px 0 0">par portion</p></div>` : ''}
      ${r.ratio?.length ? `<div class="card"><h3>Farines</h3><div class="ratio-bar">${r.ratio.map(p => `<div style="flex:${p.p};background:${esc(p.c)}">${esc(p.l)} ${p.p}%</div>`).join('')}</div></div>` : ''}

      <div class="card" id="dings"></div>
      <div id="dbaker"></div>

      <div class="actions-grid">
        <button class="btn" id="dcook">${icons.chef} Mode cuisine</button>
        <button class="btn sec" id="dcourses">${icons.cart} → Courses</button>
      </div>

      <div class="card"><h3>Étapes</h3><div id="dsteps"></div></div>

      <div class="card" id="dfeedback"></div>
      ${r.notes?.length ? `<div class="card"><h3>Notes de chef</h3>${r.notes.map(n => `<p style="font-size:14.5px;line-height:1.5;color:var(--k2);margin:6px 0">💡 ${esc(n)}</p>`).join('')}</div>` : ''}
      <div class="card" id="dtry"></div>
      <div id="dsimilar"></div>
    </div>`));

  /* ---------- Ingrédients + scaling ---------- */
  const ingBox = root.querySelector('#dings') as HTMLElement;
  const bakerBox = root.querySelector('#dbaker') as HTMLElement;

  function renderIngredients() {
    const ings = scaledIngredients(r, factor);
    const portions = Math.round(r.portions * factor * 10) / 10;
    ingBox.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <h3 style="margin:0">Ingrédients</h3>
        <div style="display:flex;align-items:center;gap:8px">
          <button class="iconbtn" data-p="-1" style="width:32px;height:32px">−</button>
          <b style="min-width:74px;text-align:center;font-size:14px">${portions} port.</b>
          <button class="iconbtn" data-p="1" style="width:32px;height:32px">＋</button>
        </div>
      </div>
      <div class="chips" style="padding-top:10px">
        <button class="chip sm" data-f="0.5">× 0,5</button>
        <button class="chip sm" data-f="2">× 2</button>
        <button class="chip sm" data-f="1">Réinitialiser</button>
      </div>
      <div data-list></div>
      ${factor !== 1 ? `<div class="scale-note">⚖️ Recette ajustée × ${Math.round(factor * 100) / 100} — tape une quantité pour ajuster autrement</div>` : '<p class="small muted" style="margin:8px 2px 0">Astuce : tape une quantité pour tout recalculer à partir d\'elle.</p>'}`;

    const listEl = ingBox.querySelector('[data-list]') as HTMLElement;
    ings.forEach((i, idx) => {
      const row = el(`<div class="ing-row">
        <button class="ing-qty ${factor !== 1 ? 'scaled' : ''}">${fmtQty(i.a, i.u)}</button>
        <span class="ing-name">${esc(i.n)}</span>
      </div>`);
      const btn = row.querySelector('.ing-qty') as HTMLButtonElement;
      btn.addEventListener('click', () => {
        if (!r.ingredients[idx].a) return;
        const inp = el(`<input type="number" inputmode="decimal" step="any" style="max-width:96px;padding:6px 9px;font-size:15px;text-align:right" value="${Math.round(i.a * 100) / 100}">`) as HTMLInputElement;
        btn.replaceWith(inp);
        inp.focus();
        inp.select();
        const apply = () => {
          const v = parseFloat(inp.value.replace(',', '.'));
          if (v > 0) factor = factorForIngredient(r, idx, v);
          renderIngredients();
          renderBaker();
          vibrate(8);
        };
        inp.addEventListener('change', apply);
        inp.addEventListener('blur', apply);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
      });
      listEl.appendChild(row);
    });

    ingBox.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => {
      const dir = +(b as HTMLElement).dataset.p!;
      const cur = r.portions * factor;
      const next = Math.max(1, Math.round(cur + dir));
      factor = next / r.portions;
      renderIngredients(); renderBaker(); vibrate(8);
    }));
    ingBox.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
      factor = +(b as HTMLElement).dataset.f!;
      renderIngredients(); renderBaker(); vibrate(8);
    }));
  }

  function renderBaker() {
    const bp = bakerPercentages(r, factor);
    bakerBox.innerHTML = '';
    if (!bp) return;
    const fresh = findFreshYeast(r, factor);
    const dy = fresh ? dryYeast(fresh) : null;
    bakerBox.appendChild(el(`<div class="card">
      <h3>Pourcentages du boulanger</h3>
      <p class="small muted" style="margin:0 0 8px">Base farine : <b>${bp.flourTotal} g</b></p>
      ${bp.rows.map(x => `<div style="display:flex;justify-content:space-between;font-size:14px;padding:5px 0;border-bottom:.5px solid var(--line)">
        <span style="color:var(--k2)">${esc(x.n)}</span><b style="color:${x.kind === 'eau' ? 'var(--ac)' : 'var(--ink)'}">${x.pct} %</b></div>`).join('')}
      ${dy ? `<div class="scale-note" style="background:var(--al);color:var(--ad)">🧫 ${fmtQty(fresh!, 'g')} levure fraîche ≈ ${dy.active} g sèche active · ${dy.instant} g instantanée</div>` : ''}
    </div>`));
  }

  renderIngredients();
  renderBaker();

  /* ---------- Étapes + minuteurs ---------- */
  const stepsBox = root.querySelector('#dsteps') as HTMLElement;
  r.steps.forEach((s, i) => {
    const row = el(`<div class="step">
      <div class="num">${i + 1}</div>
      <div class="grow">
        <div class="t">${esc(s.t)}</div>
        <div class="d">${esc(s.d)}</div>
        ${s.timer ? `<div class="timer-ui" data-tkey="${esc(r.id + '|' + s.id)}" data-dur="${s.timer}">
          <span class="tt">${fmtSec(s.timer)}</span>
          <button class="go">${icons.play}</button>
          <button class="r">${icons.reset}</button>
        </div>` : ''}
      </div>
    </div>`);
    stepsBox.appendChild(row);
  });

  function refreshTimers() {
    root.querySelectorAll('.timer-ui').forEach(elm => {
      const key = (elm as HTMLElement).dataset.tkey!;
      const dur = +(elm as HTMLElement).dataset.dur!;
      const t = getTimer(key);
      const tt = elm.querySelector('.tt')!;
      const go = elm.querySelector('.go')!;
      elm.classList.toggle('running', !!t && t.endAt !== null && !t.done);
      elm.classList.toggle('done', !!t?.done);
      if (!t) { tt.textContent = fmtSec(dur); go.innerHTML = icons.play; }
      else if (t.done) { tt.textContent = '✓ fini'; go.innerHTML = icons.play; }
      else { tt.textContent = fmtSec(remainingOf(t)); go.innerHTML = t.endAt === null ? icons.play : icons.pause; }
    });
  }

  stepsBox.addEventListener('click', (e) => {
    const ui = (e.target as HTMLElement).closest('.timer-ui') as HTMLElement;
    if (!ui) return;
    const key = ui.dataset.tkey!, dur = +ui.dataset.dur!;
    const label = r.name + ' — ' + (r.steps.find(s => r.id + '|' + s.id === key)?.t || 'minuteur');
    if ((e.target as HTMLElement).closest('.r')) { resetTimer(key); refreshTimers(); return; }
    if ((e.target as HTMLElement).closest('.go')) {
      const t = getTimer(key);
      if (t && !t.done && t.endAt !== null) pauseTimer(key);
      else if (t?.done) { resetTimer(key); startTimer(key, label, dur); }
      else startTimer(key, label, dur);
      vibrate(10);
      refreshTimers();
    }
  });
  const offTimers = on('timers', refreshTimers);
  refreshTimers();

  /* ---------- Feedback (note, testé, cuisiné) ---------- */
  const fb = root.querySelector('#dfeedback') as HTMLElement;
  function renderFeedback() {
    const last = r.cookLog.length ? fmtDateKey(r.cookLog[r.cookLog.length - 1].slice(0, 10)) : null;
    fb.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div class="stars">${[1, 2, 3, 4, 5].map(n => `<button class="${r.rating >= n ? 'on' : ''}" data-n="${n}">★</button>`).join('')}</div>
        <button class="btn sm ${r.tested ? '' : 'ghost'}" data-tested>${r.tested ? '✓ Testée' : 'Marquer testée'}</button>
      </div>
      <hr class="sep">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <div class="small muted">${r.cookLog.length ? `Cuisinée ${r.cookLog.length} fois · dernière : ${last}` : 'Jamais cuisinée pour l\'instant'}</div>
        <button class="btn sm sec" data-cooked>${icons.chef} Cuisinée aujourd'hui</button>
      </div>`;
    fb.querySelectorAll('.stars button').forEach(b => b.addEventListener('click', () => {
      const n = +(b as HTMLElement).dataset.n!;
      r.rating = r.rating === n ? 0 : n;
      upsertRecipe(r); renderFeedback(); vibrate(8);
    }));
    fb.querySelector('[data-tested]')!.addEventListener('click', () => {
      r.tested = !r.tested; upsertRecipe(r); renderFeedback(); vibrate(8);
    });
    fb.querySelector('[data-cooked]')!.addEventListener('click', () => {
      r.cookLog.push(nowISO());
      if (!r.tested) r.tested = true;
      upsertRecipe(r); renderFeedback();
      toast('Ajoutée au journal de cuisson 🍳'); vibrate([12, 40, 12]);
    });
  }
  renderFeedback();

  /* ---------- Notes d'essai ---------- */
  const tryBox = root.querySelector('#dtry') as HTMLElement;
  function renderTry() {
    tryBox.innerHTML = `<h3>Notes d'essai</h3>
      ${r.tryNotes.slice().reverse().map(n => `<p style="font-size:14px;line-height:1.45;margin:7px 0;color:var(--k2)"><b style="color:var(--k3);font-size:12px">${fmtDateKey(n.date)}</b><br>${esc(n.text)}</p>`).join('') || '<p class="small muted">Consigne tes ajustements (« 15 g de levure au lieu de 20 → meilleure mie »).</p>'}
      <div style="display:flex;gap:8px;margin-top:8px">
        <input type="text" data-tn placeholder="Nouvel essai…" enterkeyhint="done">
        <button class="btn sm" data-tnadd>OK</button>
      </div>`;
    const inp = tryBox.querySelector('[data-tn]') as HTMLInputElement;
    const add = () => {
      const v = inp.value.trim(); if (!v) return;
      r.tryNotes.push({ date: dateKey(new Date()), text: v });
      upsertRecipe(r); renderTry(); vibrate(8);
    };
    tryBox.querySelector('[data-tnadd]')!.addEventListener('click', add);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { add(); } });
  }
  renderTry();

  /* ---------- Similaires ---------- */
  const sim = similar(r, liveRecipes());
  if (sim.length) {
    const box = root.querySelector('#dsimilar') as HTMLElement;
    box.appendChild(el('<h2>Dans le même esprit</h2>'));
    for (const x of sim) box.appendChild(recipeCard(x));
  }

  /* ---------- Actions ---------- */
  root.querySelector('#dcook')!.addEventListener('click', () => { location.hash = '#/cuisine/' + r.id; });

  root.querySelector('#dcourses')!.addEventListener('click', () => {
    const ings = scaledIngredients(r, factor);
    for (const i of ings) addCourseItem({ n: i.n, a: i.a || null, u: i.u, rayon: rayonOf(i.n) });
    save();
    toast(`${ings.length} ingrédients → liste de courses 🛒`);
    vibrate([12, 40, 12]);
  });

  root.querySelector('#dshare')!.addEventListener('click', async () => {
    const ings = scaledIngredients(r, factor);
    const txt = `${r.name}\n${r.desc}\n\nIngrédients (${Math.round(r.portions * factor)} portions) :\n` +
      ings.map(i => `• ${fmtQty(i.a, i.u)} ${i.n}`).join('\n') +
      `\n\nÉtapes :\n` + r.steps.map((s, i) => `${i + 1}. ${s.t} — ${s.d}`).join('\n');
    if (navigator.share) {
      try { await navigator.share({ title: r.name, text: txt }); } catch { /* annulé */ }
    } else {
      await navigator.clipboard?.writeText(txt);
      toast('Recette copiée 📋');
    }
  });

  root.querySelector('#dmore')!.addEventListener('click', () => {
    const c = el(`<div>
      <button class="btn block ghost" data-photo>${icons.cam} ${photoSrc(r) ? 'Changer la photo' : 'Ajouter une photo'}</button>
      ${photoSrc(r) && r.photo === 'gist' ? '<button class="btn block ghost" data-delphoto style="margin-top:9px">Retirer la photo</button>' : ''}
      <button class="btn block ghost" data-dup style="margin-top:9px">${icons.copy} Dupliquer (variante)</button>
      <button class="btn block danger" data-del style="margin-top:9px">${icons.trash} Supprimer la recette</button>
    </div>`);
    const close = openSheet(c);
    c.querySelector('[data-photo]')!.addEventListener('click', () => {
      const fi = document.createElement('input');
      fi.type = 'file'; fi.accept = 'image/*';
      fi.onchange = async () => {
        const f = fi.files?.[0]; if (!f) return;
        try {
          const data = await compressImage(f);
          setPhoto(r.id, data);
          toast('Photo enregistrée 📷');
          close();
          rerenderPhoto();
        } catch { toast('Image illisible', true); }
      };
      fi.click();
    });
    c.querySelector('[data-delphoto]')?.addEventListener('click', () => { setPhoto(r.id, null); rerenderPhoto(); close(); });
    c.querySelector('[data-dup]')!.addEventListener('click', () => {
      const copy = JSON.parse(JSON.stringify(r));
      copy.id = r.id + '-v' + uid().slice(0, 4);
      copy.name = r.name + ' (variante)';
      copy.fullName = (r.fullName || r.name) + ' — variante';
      copy.createdAt = nowISO(); copy.rating = 0; copy.tested = false; copy.cookLog = []; copy.tryNotes = []; copy.isCustom = true;
      copy.photo = null;
      upsertRecipe(copy);
      close();
      location.hash = '#/edit/' + copy.id;
    });
    c.querySelector('[data-del]')!.addEventListener('click', async () => {
      close();
      if (await confirmSheet(`Supprimer « ${r.name} » ?`, 'Supprimer')) {
        deleteRecipe(r.id);
        toast('Recette supprimée');
        location.hash = '#/recettes';
      }
    });
  });

  function rerenderPhoto() {
    const box = root.querySelector('#dphoto') as HTMLElement;
    const s = photoSrc(r);
    box.innerHTML = s ? `<img class="hero-photo" src="${esc(s)}" alt="${esc(r.name)}">` : '';
  }

  return () => offTimers();
}
