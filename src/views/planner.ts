import { el, esc, isoWeekKey, mondayOf, shiftWeek, DAYS, MONTHS, toast, vibrate } from '../lib/utils';
import { state, liveRecipes, getRecipe, plannerWeek, setSlot, addCourseItem, save, on } from '../lib/store';
import { icons, openSheet } from '../lib/ui';
import { matchRecipe, rayonOf, scaledIngredients } from '../lib/recipes-logic';
import type { SlotKey } from '../lib/types';
import type { Route } from '../router';

const SLOTS: { k: SlotKey; lb: string }[] = [
  { k: 'matin', lb: 'Matin' },
  { k: 'midi', lb: 'Midi' },
  { k: 'soir', lb: 'Soir' },
];

export function plannerView(root: HTMLElement, _r: Route) {
  let week = isoWeekKey(new Date());

  root.appendChild(el(`
    <div>
      <h1>Planning</h1>
      <p class="sub">Une recette par créneau · totaux macros par jour (1 portion)</p>
      <div class="weeknav">
        <button class="iconbtn" data-w="-1">${icons.back}</button>
        <div class="wk" id="pwk"></div>
        <button class="iconbtn" data-w="1">${icons.fwd}</button>
      </div>
      <div id="pdays"></div>
      <button class="btn block sec" id="pgen" style="margin-top:6px">${icons.cart} Générer les courses de la semaine</button>
    </div>`));

  const daysBox = root.querySelector('#pdays') as HTMLElement;
  const wkLabel = root.querySelector('#pwk') as HTMLElement;

  function render() {
    const wk = state.doc.planner[week] || { days: {} };
    const mon = mondayOf(week);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    wkLabel.innerHTML = `Semaine ${week.split('-W')[1]}<small>${mon.getDate()} ${MONTHS[mon.getMonth()]} – ${sun.getDate()} ${MONTHS[sun.getMonth()]}</small>`;

    daysBox.innerHTML = '';
    const today = new Date();
    for (let d = 0; d < 7; d++) {
      const date = new Date(mon); date.setDate(mon.getDate() + d);
      const isToday = date.toDateString() === today.toDateString();
      const dayData = (wk.days as any)[String(d)] || {};

      // Totaux macros du jour (1 portion par recette planifiée)
      let kcal = 0, prot = 0;
      for (const s of SLOTS) {
        const rid = dayData[s.k];
        const rec = rid ? getRecipe(rid) : null;
        if (rec?.macros) { kcal += rec.macros.kcal || 0; prot += rec.macros.prot || 0; }
      }

      const card = el(`<div class="day">
        <div class="dh">
          <span class="dn" style="${isToday ? 'color:var(--ac)' : ''}">${DAYS[d]} ${date.getDate()}</span>
          ${kcal ? `<span class="dm"><b>${kcal} kcal</b> · ${prot} g prot</span>` : ''}
        </div>
        <div class="list">${SLOTS.map(s => {
          const rid = dayData[s.k];
          const rec = rid ? getRecipe(rid) : null;
          return `<div class="row row-tap slot" data-d="${d}" data-s="${s.k}">
            <span class="sl">${s.lb}</span>
            <span class="sv ${rec ? '' : 'empty'}">${rec ? esc(rec.name) : '— choisir —'}</span>
            ${rec ? `<button class="iconbtn" data-clear style="width:30px;height:30px">${icons.x}</button>` : ''}
          </div>`;
        }).join('')}</div>
      </div>`);
      daysBox.appendChild(card);
    }
  }

  daysBox.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const slot = target.closest('.slot') as HTMLElement;
    if (!slot) return;
    const d = +slot.dataset.d!, s = slot.dataset.s as SlotKey;

    if (target.closest('[data-clear]')) {
      setSlot(week, d, s, null);
      render();
      vibrate(8);
      return;
    }
    openPicker(d, s);
  });

  function openPicker(d: number, s: SlotKey) {
    const c = el(`<div>
      <h3 style="margin:2px 4px 10px">${DAYS[d]} — ${SLOTS.find(x => x.k === s)!.lb}</h3>
      <div class="search-wrap">${icons.search}<input type="search" data-q placeholder="Chercher une recette…" autocomplete="off"></div>
      <div data-out style="max-height:52dvh;overflow-y:auto"></div>
    </div>`);
    const close = openSheet(c);
    const out = c.querySelector('[data-out]') as HTMLElement;
    const inp = c.querySelector('[data-q]') as HTMLInputElement;

    const draw = (q = '') => {
      const rs = liveRecipes().filter(r => !q || matchRecipe(r, q)).sort((a, b) => a.name.localeCompare(b.name, 'fr')).slice(0, 60);
      out.innerHTML = '';
      for (const r of rs) {
        const row = el(`<div class="row row-tap"><div class="grow">${esc(r.name)}<div class="small muted">${esc(r.cat)} · ${r.macros?.kcal || '—'} kcal</div></div></div>`);
        row.addEventListener('click', () => { setSlot(week, d, s, r.id); close(); render(); vibrate(8); });
        out.appendChild(row);
      }
    };
    inp.addEventListener('input', () => draw(inp.value.trim()));
    draw();
  }

  root.querySelectorAll('[data-w]').forEach(b => b.addEventListener('click', () => {
    week = shiftWeek(week, +(b as HTMLElement).dataset.w!);
    render();
  }));

  root.querySelector('#pgen')!.addEventListener('click', () => {
    const wk = state.doc.planner[week];
    if (!wk) { toast('Semaine vide'); return; }
    let count = 0;
    const seen = new Set<string>();
    for (const d of Object.values(wk.days)) {
      for (const rid of Object.values(d as any)) {
        if (!rid || seen.has(rid as string)) continue;
        seen.add(rid as string);
        const r = getRecipe(rid as string);
        if (!r) continue;
        for (const i of scaledIngredients(r, 1)) {
          addCourseItem({ n: i.n, a: i.a || null, u: i.u, rayon: rayonOf(i.n) });
          count++;
        }
      }
    }
    if (!count) { toast('Aucune recette planifiée cette semaine'); return; }
    save();
    toast(`${count} ingrédients → courses 🛒`);
    vibrate([12, 40, 12]);
  });

  const off = on('change', render);
  render();
  return () => off();
}
