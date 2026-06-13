export interface Ingredient { a: number; u: string; n: string; }
export interface Step { id: string; t: string; timer: number | null; d: string; }
export interface Macros { kcal: number; prot: number; gluc: number; lip: number; }
export interface RatioPart { l: string; p: number; c: string; }
export interface MetaItem { v: string; l: string; }
export interface TryNote { date: string; text: string; }

export interface Recipe {
  id: string;
  cat: string;
  name: string;
  fullName: string;
  tag: string | null;
  desc: string;
  portions: number;
  prepTime: number;
  cookTime: number;
  difficulty: string;
  tags: string[];
  lifestyle: string;
  macros: Macros;
  meta: MetaItem[];
  ratio: RatioPart[] | null;
  ingredients: Ingredient[];
  steps: Step[];
  notes: string[];
  // métadonnées
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  rating: number;
  tested: boolean;
  photo: string | null;       // 'gist' => photos.json, sinon URL externe
  cookLog: string[];          // dates ISO
  tryNotes: TryNote[];
  isCustom: boolean;
  source: string | null;
}

export type SlotKey = 'matin' | 'midi' | 'soir';
export interface PlannerWeek { days: Record<string, Partial<Record<SlotKey, string>>>; updatedAt: string; }
export interface CourseItem { id: string; n: string; a: number | null; u: string; rayon: string; checked: boolean; updatedAt: string; deleted: boolean; }
export interface JournalEntry { text: string; updatedAt: string; deleted: boolean; }

export interface Doc {
  version: number;
  recipes: Recipe[];
  planner: Record<string, PlannerWeek>;
  courses: Record<string, CourseItem>;
  journal: Record<string, JournalEntry>;   // clé = YYYY-MM-DD
  updatedAt: string;
}

export type SyncStatus = 'off' | 'offline' | 'syncing' | 'ok' | 'error';
