import type { Recipe, Ingredient } from './types';

/* ---------- Scaling ----------
   Un seul facteur global : modifier N portions OU n'importe quelle quantité
   d'ingrédient recalcule tout proportionnellement (macros restent /portion). */

export function scaledIngredients(r: Recipe, factor: number): Ingredient[] {
  return r.ingredients.map(i => ({ ...i, a: i.a ? i.a * factor : i.a }));
}

/** factor tel que l'ingrédient idx atteigne la valeur cible */
export function factorForIngredient(r: Recipe, idx: number, target: number): number {
  const base = r.ingredients[idx]?.a;
  if (!base || base <= 0 || !target || target <= 0) return 1;
  return target / base;
}

/* ---------- Pourcentages du boulanger ---------- */
const FLOUR_RE = /farine|épeautre(?!.*flocons)|seigle|sarrasin/i;
const WATER_RE = /^eau|eau /i;
const SALT_RE = /\bsel\b/i;
const YEAST_RE = /levure|levain/i;

export interface BakerPct { flourTotal: number; rows: { n: string; pct: number; kind: string }[]; }

export function bakerPercentages(r: Recipe, factor: number): BakerPct | null {
  if (r.cat !== 'Pain' && r.cat !== 'Pizza' && r.cat !== 'Viennoiserie') return null;
  const ings = scaledIngredients(r, factor);
  const flours = ings.filter(i => FLOUR_RE.test(i.n) && i.u === 'g' && i.a > 0);
  if (!flours.length) return null;
  const flourTotal = flours.reduce((s, i) => s + i.a, 0);
  const rows = ings
    .filter(i => i.u === 'g' && i.a > 0)
    .map(i => ({
      n: i.n,
      pct: Math.round((i.a / flourTotal) * 1000) / 10,
      kind: FLOUR_RE.test(i.n) ? 'farine' : WATER_RE.test(i.n) ? 'eau' : SALT_RE.test(i.n) ? 'sel' : YEAST_RE.test(i.n) ? 'levure' : 'autre',
    }));
  return { flourTotal: Math.round(flourTotal), rows };
}

/** Levure fraîche g → sèche active/instantanée */
export function dryYeast(freshG: number) {
  return { active: Math.round(freshG * 0.4 * 10) / 10, instant: Math.round(freshG * 0.33 * 10) / 10 };
}

export function findFreshYeast(r: Recipe, factor: number): number | null {
  const i = scaledIngredients(r, factor).find(x => /levure fraîche/i.test(x.n) && x.u === 'g');
  return i ? i.a : null;
}

/* ---------- Rayons de courses ---------- */
const RAYONS: [string, RegExp][] = [
  ['Fruits & Légumes', /pomme|poire|banane|citron|orange|fraise|framboise|mangue|ananas|avocat|tomate|oignon|ail\b|échalote|carotte|courgette|aubergine|poivron|piment|salade|laitue|roquette|épinard|chou|brocoli|poireau|céleri|concombre|champignon|patate|pomme de terre|courge|potiron|betterave|radis|navet|fenouil|haricot vert|petits? pois|gingembre|herbe|persil|coriandre|basilic|menthe|ciboulette|thym|romarin|laurier|aneth|estragon|citronnelle|fruit/i],
  ['Boucherie & Poisson', /bœuf|boeuf|veau|porc|agneau|poulet|dinde|canard|lardon|jambon|saucisse|chorizo|merguez|viande|steak|escalope|filet mignon|saumon|thon|cabillaud|crevette|moule|poisson|lieu|dorade|bar\b|anchois|sardine|calamar|lotte/i],
  ['Crèmerie & Œufs', /lait(?! de coco)|crème|beurre|yaourt|fromage|parmesan|gruyère|emmental|mozzarella|feta|chèvre|comté|ricotta|mascarpone|œuf|oeuf/i],
  ['Épicerie salée', /farine|riz\b|pâtes|spaghetti|penne|nouille|semoule|boulgour|quinoa|lentille|pois chiche|haricot (rouge|blanc|noir)|polenta|huile|vinaigre|moutarde|sauce soja|nuoc|bouillon|fumet|concentré|tomates? (pelées|concassées)|coulis|olive|câpre|cornichon|anchois|lait de coco|curry|paprika|cumin|curcuma|cannelle|muscade|sel\b|poivre|épice|levure|maïzena|fécule|graine|sésame|tournesol|courge \(graines|noix|amande|noisette|pignon|cacahuète|conserve|thon en boîte/i],
  ['Épicerie sucrée', /sucre|miel|chocolat|cacao|vanille|confiture|sirop|caramel|praliné|tonka|raisin sec|datte|abricot sec|fruits? confits?|pépites/i],
  ['Boulangerie', /pain\b|baguette|brioche|tortilla|wrap|pita|naan/i],
  ['Boissons', /vin\b|bière|rhum|eau gazeuse|jus de|café|thé\b|lait d'avoine|lait d'amande/i],
  ['Surgelés', /surgelé|glace\b/i],
];

export function rayonOf(name: string): string {
  for (const [r, re] of RAYONS) if (re.test(name)) return r;
  return 'Autres';
}

export const RAYON_ORDER = ['Fruits & Légumes', 'Boucherie & Poisson', 'Crèmerie & Œufs', 'Épicerie salée', 'Épicerie sucrée', 'Boulangerie', 'Boissons', 'Surgelés', 'Autres'];

/* ---------- Recettes similaires ---------- */
export function similar(r: Recipe, all: Recipe[], n = 4): Recipe[] {
  return all
    .filter(x => x.id !== r.id)
    .map(x => {
      let s = 0;
      if (x.cat === r.cat) s += 3;
      if (x.lifestyle === r.lifestyle) s += 1;
      s += x.tags.filter(t => r.tags.includes(t)).length;
      return { x, s };
    })
    .filter(o => o.s > 1)
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map(o => o.x);
}

/* ---------- Recherche ---------- */
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function matchRecipe(r: Recipe, q: string): boolean {
  const f = fold(q);
  return fold(r.name).includes(f) || fold(r.desc).includes(f) || fold(r.cat).includes(f)
    || r.tags.some(t => fold(t).includes(f))
    || r.ingredients.some(i => fold(i.n).includes(f));
}

/** Mode frigo : score par nb d'ingrédients matchés */
export function fridgeScore(r: Recipe, ingredients: string[]): number {
  let s = 0;
  for (const q of ingredients) {
    if (r.ingredients.some(i => fold(i.n).includes(fold(q)))) s++;
  }
  return s;
}
