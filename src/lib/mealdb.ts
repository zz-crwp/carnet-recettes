/* Import TheMealDB — API publique, conversion impériale → métrique */

import type { Recipe } from './types';
import { nowISO, uid } from './utils';

const BASE = 'https://www.themealdb.com/api/json/v1/1';

export async function mealCategories(): Promise<{ name: string; thumb: string }[]> {
  const r = await fetch(`${BASE}/categories.php`);
  const j = await r.json();
  return (j.categories || []).map((c: any) => ({ name: c.strCategory, thumb: c.strCategoryThumb }));
}

export async function mealsByCategory(cat: string): Promise<{ id: string; name: string; thumb: string }[]> {
  const r = await fetch(`${BASE}/filter.php?c=${encodeURIComponent(cat)}`);
  const j = await r.json();
  return (j.meals || []).map((m: any) => ({ id: m.idMeal, name: m.strMeal, thumb: m.strMealThumb }));
}

export async function mealLookup(id: string): Promise<Recipe | null> {
  const r = await fetch(`${BASE}/lookup.php?i=${id}`);
  const j = await r.json();
  const m = j.meals?.[0];
  if (!m) return null;
  return mapMeal(m);
}

/* ---- Conversion mesures ---- */
const VOL_ML: Record<string, number> = { cup: 240, cups: 240, tbsp: 15, tbs: 15, tablespoon: 15, tablespoons: 15, tsp: 5, teaspoon: 5, teaspoons: 5, 'fl oz': 30, pint: 473, pints: 473, quart: 946, ml: 1, l: 1000, litre: 1000, liter: 1000, dl: 100, cl: 10 };
const WT_G: Record<string, number> = { oz: 28.35, ounce: 28.35, ounces: 28.35, lb: 453.6, lbs: 453.6, pound: 453.6, pounds: 453.6, g: 1, gr: 1, gram: 1, grams: 1, kg: 1000 };

function parseAmount(s: string): number | null {
  s = s.trim();
  // "1 1/2", "1/2", "1.5", "2"
  const mix = s.match(/^(\d+)\s+(\d+)\/(\d+)/);
  if (mix) return +mix[1] + (+mix[2] / +mix[3]);
  const frac = s.match(/^(\d+)\/(\d+)/);
  if (frac) return +frac[1] / +frac[2];
  const num = s.match(/^(\d+(?:[.,]\d+)?)/);
  if (num) return parseFloat(num[1].replace(',', '.'));
  return null;
}

export function convertMeasure(measure: string): { a: number; u: string; extra: string } {
  const raw = (measure || '').trim();
  if (!raw) return { a: 0, u: '', extra: '' };
  const amount = parseAmount(raw);
  const rest = raw.replace(/^[\d\s./,]+/, '').trim().toLowerCase();

  if (amount !== null) {
    for (const [unit, ml] of Object.entries(VOL_ML)) {
      if (rest === unit || rest.startsWith(unit + ' ')) {
        const extra = rest.slice(unit.length).trim();
        const v = amount * ml;
        if (unit === 'tbsp' || unit === 'tbs' || unit.startsWith('tablespoon')) return { a: amount, u: 'càs', extra };
        if (unit === 'tsp' || unit.startsWith('teaspoon')) return { a: amount, u: 'càc', extra };
        return v >= 1000 ? { a: Math.round(v / 10) / 100, u: 'l', extra } : { a: Math.round(v), u: 'ml', extra };
      }
    }
    for (const [unit, g] of Object.entries(WT_G)) {
      if (rest === unit || rest.startsWith(unit + ' ')) {
        const extra = rest.slice(unit.length).trim();
        const v = amount * g;
        return v >= 1000 ? { a: Math.round(v / 10) / 100, u: 'kg', extra } : { a: Math.round(v), u: 'g', extra };
      }
    }
    // unité inconnue ("2 large", "3 cloves"…) : garder le texte
    return { a: amount, u: '', extra: rest };
  }
  return { a: 0, u: '', extra: raw }; // "to taste", "dash"…
}

const CAT_MAP: Record<string, string> = {
  Beef: 'Viande', Chicken: 'Viande', Lamb: 'Viande', Pork: 'Viande', Goat: 'Viande',
  Seafood: 'Poisson', Vegetarian: 'Légumes', Vegan: 'Légumes', Side: 'Légumes',
  Pasta: 'Pâte', Dessert: 'Dessert', Breakfast: 'Pain', Starter: 'Salade', Miscellaneous: 'Pâte',
};

function mapMeal(m: any): Recipe {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const n = (m['strIngredient' + i] || '').trim();
    if (!n) continue;
    const { a, u, extra } = convertMeasure(m['strMeasure' + i] || '');
    ingredients.push({ a, u, n: extra ? `${n} (${extra})` : n });
  }
  const stepsTxt: string[] = (m.strInstructions || '')
    .split(/\r?\n+/)
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 3);

  return {
    id: 'mealdb-' + m.idMeal + '-' + uid().slice(0, 4),
    cat: CAT_MAP[m.strCategory] || 'Viande',
    name: m.strMeal,
    fullName: m.strMeal,
    tag: m.strArea || null,
    desc: `${m.strCategory}${m.strArea ? ' · ' + m.strArea : ''} — importée de TheMealDB.`,
    portions: 4,
    prepTime: 20,
    cookTime: 30,
    difficulty: 'Moyen',
    tags: ['Importée'],
    lifestyle: 'Équilibré',
    macros: { kcal: 0, prot: 0, gluc: 0, lip: 0 },
    meta: [],
    ratio: null,
    ingredients,
    steps: stepsTxt.map((d, i) => ({ id: 's' + (i + 1), t: `Étape ${i + 1}`, timer: null, d })),
    notes: m.strYoutube ? ['Vidéo : ' + m.strYoutube] : [],
    createdAt: nowISO(),
    updatedAt: nowISO(),
    deleted: false,
    rating: 0,
    tested: false,
    photo: m.strMealThumb || null,
    cookLog: [],
    tryNotes: [],
    isCustom: true,
    source: 'TheMealDB',
  };
}

/* ---- Import JSON collé (mapping tolérant) ---- */
export function parseLooseRecipe(obj: any): Recipe {
  const g = (...keys: string[]) => { for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k]; return undefined; };
  const ingredients = (g('ingredients', 'ingredient', 'ings') || []).map((i: any) => {
    if (typeof i === 'string') {
      const m = i.match(/^([\d.,/]+)?\s*(g|kg|ml|cl|l|càs|càc|c\. à s\.|c\. à c\.|pincée|botte)?\s*(.+)$/i);
      return { a: m?.[1] ? parseFloat(m[1].replace(',', '.')) : 0, u: (m?.[2] || '').toLowerCase(), n: (m?.[3] || i).trim() };
    }
    return { a: +(i.a ?? i.amount ?? i.qty ?? i.quantite ?? i.quantité ?? 0) || 0, u: String(i.u ?? i.unit ?? i.unite ?? i.unité ?? ''), n: String(i.n ?? i.name ?? i.nom ?? i.ingredient ?? '') };
  }).filter((i: any) => i.n);

  const rawSteps = g('steps', 'etapes', 'étapes', 'instructions') || [];
  const steps = (Array.isArray(rawSteps) ? rawSteps : String(rawSteps).split(/\r?\n+/)).map((s: any, i: number) => {
    if (typeof s === 'string') return { id: 's' + (i + 1), t: `Étape ${i + 1}`, timer: null, d: s.trim() };
    return { id: s.id || 's' + (i + 1), t: String(s.t ?? s.title ?? s.titre ?? `Étape ${i + 1}`), timer: s.timer ?? null, d: String(s.d ?? s.desc ?? s.description ?? s.text ?? '') };
  }).filter((s: any) => s.d);

  const name = String(g('name', 'nom', 'title', 'titre') || 'Recette importée');
  const mac = g('macros') || {};
  return {
    id: (g('id') || 'imp-' + uid()),
    cat: String(g('cat', 'category', 'categorie', 'catégorie') || 'Viande'),
    name,
    fullName: String(g('fullName') || name),
    tag: g('tag') ?? null,
    desc: String(g('desc', 'description') || ''),
    portions: +(g('portions', 'servings') ?? 4) || 4,
    prepTime: +(g('prepTime', 'prep') ?? 15) || 15,
    cookTime: +(g('cookTime', 'cook') ?? 20) || 20,
    difficulty: String(g('difficulty', 'difficulte', 'difficulté') || 'Moyen'),
    tags: g('tags') || [],
    lifestyle: String(g('lifestyle') || 'Équilibré'),
    macros: { kcal: +(mac.kcal ?? g('kcal') ?? 0) || 0, prot: +(mac.prot ?? 0) || 0, gluc: +(mac.gluc ?? 0) || 0, lip: +(mac.lip ?? 0) || 0 },
    meta: g('meta') || [],
    ratio: g('ratio') ?? null,
    ingredients,
    steps,
    notes: g('notes') ? (Array.isArray(g('notes')) ? g('notes') : [String(g('notes'))]) : [],
    createdAt: nowISO(),
    updatedAt: nowISO(),
    deleted: false,
    rating: 0,
    tested: false,
    photo: g('photo') ?? null,
    cookLog: [],
    tryNotes: [],
    isCustom: true,
    source: g('source') ?? 'import',
  };
}
