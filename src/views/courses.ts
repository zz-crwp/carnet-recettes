import { el, esc, fmtQty, nowISO, toast, vibrate } from '../lib/utils';
import { state, addCourseItem, save, on } from '../lib/store';
import { icons } from '../lib/ui';
import { rayonOf, RAYON_ORDER } from '../lib/recipes-logic';
import type { Route } from '../router';

export function coursesView(root: HTMLElement, _r: Route) {
  root.appendChild(el(`
    <div>
      <div class="hdr"><h1>Courses</h1><button class="btn sm ghost" id="cclear">Effacer les cochés</button></div>
      <div style="display:flex;gap:8px;margin:10px 0 6px">
        <input type="text" id="cadd" placeholder="Ajouter un article…" enterkeyhint="done">
        <button class="btn" id="cgo" style="flex:none">${icons.plus}</button>
      </div>
      <div id="clist"></div>
    </div>`));

  const list = root.querySelector('#clist') as HTMLElement;

  function render() {
    list.innerHTML = '';
    const items = Object.values(state.doc.courses).filter(c => !c.deleted);
    if (!items.length) {
      list.appendChild(el('<div class="empty-state"><span class="em">🛒</span>Liste vide.<br>Ajoute depuis une recette ou le planning.</div>'));
      return;
    }
    for (const rayon of RAYON_ORDER) {
      const group = items.filter(i => (i.rayon || 'Autres') === rayon)
        .sort((a, b) => Number(a.checked) - Number(b.checked) || a.n.localeCompare(b.n, 'fr'));
      if (!group.length) continue;
      list.appendChild(el(`<div class="rayon-h">${esc(rayon)}</div>`));
      const box = el('<div class="list"></div>');
      for (const i of group) {
        const row = el(`<div class="row ${i.checked ? 'done' : ''}">
          <button class="check ${i.checked ? 'on' : ''}" data-id="${esc(i.id)}">${i.checked ? icons.check : ''}</button>
          <div class="grow" style="font-size:15px">${esc(i.n)}${i.a ? ` <b style="color:var(--ad)">· ${fmtQty(i.a, i.u)}</b>` : ''}</div>
          <button class="iconbtn" data-del="${esc(i.id)}" style="width:30px;height:30px;color:var(--k3)">${icons.x}</button>
        </div>`);
        box.appendChild(row);
      }
      list.appendChild(box);
    }
  }

  list.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const chk = t.closest('.check') as HTMLElement;
    if (chk) {
      const i = state.doc.courses[chk.dataset.id!];
      if (i) { i.checked = !i.checked; i.updatedAt = nowISO(); save(); vibrate(10); render(); }
      return;
    }
    const del = t.closest('[data-del]') as HTMLElement;
    if (del) {
      const i = state.doc.courses[del.dataset.del!];
      if (i) { i.deleted = true; i.updatedAt = nowISO(); save(); render(); }
    }
  });

  const addManual = () => {
    const inp = root.querySelector('#cadd') as HTMLInputElement;
    const v = inp.value.trim();
    if (!v) return;
    // "500 g farine" → qté/unité/nom ; sinon nom simple
    const m = v.match(/^([\d.,]+)\s*(g|kg|ml|cl|l|càs|càc|pcs?)?\s+(.+)$/i);
    if (m) addCourseItem({ n: m[3], a: parseFloat(m[1].replace(',', '.')), u: m[2] || '', rayon: rayonOf(m[3]) });
    else addCourseItem({ n: v, rayon: rayonOf(v) });
    save();
    inp.value = '';
    render();
    vibrate(8);
  };
  root.querySelector('#cgo')!.addEventListener('click', addManual);
  root.querySelector('#cadd')!.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') addManual(); });

  root.querySelector('#cclear')!.addEventListener('click', () => {
    let n = 0;
    for (const i of Object.values(state.doc.courses)) {
      if (!i.deleted && i.checked) { i.deleted = true; i.updatedAt = nowISO(); n++; }
    }
    if (n) { save(); render(); toast(`${n} article(s) retiré(s)`); }
  });

  const off = on('change', render);
  render();
  return () => off();
}
