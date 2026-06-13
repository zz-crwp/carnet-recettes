import { el, esc, dateKey, fmtDateKey, toast } from '../lib/utils';
import { state, liveRecipes, setJournal, on } from '../lib/store';
import { icons } from '../lib/ui';
import type { Route } from '../router';

export function journalView(root: HTMLElement, _r: Route) {
  root.appendChild(el(`
    <div>
      <div class="hdr">
        <button class="iconbtn" onclick="history.back()">${icons.back}</button>
        <h1 style="flex:1;margin:0;font-size:24px">Journal</h1>
      </div>
      <div class="card" style="margin-top:14px">
        <label class="fld"><span>Date</span><input type="date" id="jdate" value="${dateKey(new Date())}"></label>
        <label class="fld"><span>Note du jour</span><textarea id="jtext" placeholder="Fournée du matin, idées, réussites…"></textarea></label>
        <button class="btn block" id="jsave">Enregistrer</button>
      </div>
      <div id="jlist"></div>
    </div>`));

  const dateInp = root.querySelector('#jdate') as HTMLInputElement;
  const textInp = root.querySelector('#jtext') as HTMLTextAreaElement;
  const list = root.querySelector('#jlist') as HTMLElement;

  const loadDay = () => {
    const e = state.doc.journal[dateInp.value];
    textInp.value = e && !e.deleted ? e.text : '';
  };
  dateInp.addEventListener('change', loadDay);
  loadDay();

  root.querySelector('#jsave')!.addEventListener('click', () => {
    setJournal(dateInp.value, textInp.value);
    toast('Journal enregistré ✓');
    render();
  });

  function render() {
    list.innerHTML = '';
    // Fusion : notes manuelles + entrées auto du journal de cuisson
    const days = new Map<string, { note?: string; cooked: string[] }>();
    for (const [k, e] of Object.entries(state.doc.journal)) {
      if (e.deleted || !e.text.trim()) continue;
      days.set(k, { note: e.text, cooked: [] });
    }
    for (const r of liveRecipes()) {
      for (const iso of r.cookLog) {
        const k = iso.slice(0, 10);
        if (!days.has(k)) days.set(k, { cooked: [] });
        days.get(k)!.cooked.push(r.name);
      }
    }
    const keys = [...days.keys()].sort().reverse().slice(0, 60);
    if (!keys.length) {
      list.appendChild(el('<div class="empty-state"><span class="em">📓</span>Le journal se remplit avec tes notes<br>et les recettes marquées « cuisinée ».</div>'));
      return;
    }
    for (const k of keys) {
      const d = days.get(k)!;
      list.appendChild(el(`<div class="card">
        <h3>${fmtDateKey(k)}</h3>
        ${d.cooked.length ? `<p style="font-size:13.5px;margin:4px 0"><span class="badge">🍳 ${d.cooked.map(esc).join(' · ')}</span></p>` : ''}
        ${d.note ? `<p style="font-size:14.5px;line-height:1.5;color:var(--k2);margin:6px 0 0;white-space:pre-wrap">${esc(d.note)}</p>` : ''}
      </div>`));
    }
  }

  const off = on('change', render);
  render();
  return () => off();
}
