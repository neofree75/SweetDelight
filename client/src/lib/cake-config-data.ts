/**
 * Dáta pre konfigurátor torty – tvar, korpus, krém, doplnok, vrstvy, priemer.
 * Ceny sú v EUR bez DPH. DPH sa aplikuje pri výpočte.
 *
 * Rozšíriteľnosť: korpus má atribút glutenFree, krém lactoseFree (pripravené na budúce zapnutie).
 */

export interface ShapeOption {
  id: string;
  name: string;
  price: number;
}

export interface KorpusOption {
  id: string;
  name: string;
  price: number;
  /** Pre budúce: bezlepková verzia */
  glutenFree?: boolean;
}

export interface KremOption {
  id: string;
  name: string;
  price: number;
  /** Pre budúce: bezlaktózová verzia */
  lactoseFree?: boolean;
}

export interface DoplnokOption {
  id: string;
  name: string;
  price: number;
}

export interface LayersOption {
  value: number;
  label: string;
  /** Príplatok oproti 1 vrstve (v EUR bez DPH) */
  priceAdd: number;
}

export interface DiameterOption {
  id: string;
  label: string;
  cm: number;
  price: number;
}

// --- Tvar torty ---
export const CAKE_SHAPES: ShapeOption[] = [
  { id: 'round', name: 'Okrúhla', price: 0 },
  { id: 'square', name: 'Hranatá', price: 2 },
];

// --- Počet poschodí: 1–5 ---
export const TIER_COUNTS = [1, 2, 3, 4, 5] as const;
export type TierCount = (typeof TIER_COUNTS)[number];

// --- Korpus (s atribútom pre bezlepkovú verziu) ---
export const KORPUS_OPTIONS: KorpusOption[] = [
  { id: 'cokoladovy', name: 'Čokoládový', price: 5, glutenFree: false },
  { id: 'vanilkovy', name: 'Vanilkový', price: 4, glutenFree: false },
  { id: 'citronovy', name: 'Citrónový', price: 5, glutenFree: false },
  { id: 'orechovy', name: 'Orechový', price: 6, glutenFree: false },
  { id: 'mrkvovy', name: 'Mrkvový', price: 5, glutenFree: false },
  { id: 'medovnik', name: 'Medovníkový', price: 6, glutenFree: false },
];

// --- Krém (s atribútom pre bezlaktózovú verziu) ---
export const KREM_OPTIONS: KremOption[] = [
  { id: 'maslo', name: 'Maslový', price: 4, lactoseFree: false },
  { id: 'smotana', name: 'Smotanový', price: 5, lactoseFree: false },
  { id: 'tvaroh', name: 'Tvarohový', price: 5, lactoseFree: false },
  { id: 'mascarpone', name: 'Mascarpone', price: 7, lactoseFree: false },
  { id: 'syr', name: 'Syrový (Philadelphia)', price: 6, lactoseFree: false },
];

// --- Doplnok do krému (voliteľné; "žiadny" = 0) ---
export const DOPLNOK_OPTIONS: DoplnokOption[] = [
  { id: 'ziadny', name: 'Žiadny', price: 0 },
  { id: 'ovocie', name: 'Ovocie', price: 3 },
  { id: 'orechy', name: 'Orechy', price: 2 },
  { id: 'cokolada', name: 'Čokoláda', price: 2 },
  { id: 'maracuja', name: 'Marakuja', price: 3 },
];

// --- Počet vrstiev korpusu ---
export const LAYERS_OPTIONS: LayersOption[] = [
  { value: 1, label: '1 vrstva', priceAdd: 0 },
  { value: 2, label: '2 vrstvy', priceAdd: 2 },
  { value: 3, label: '3 vrstvy', priceAdd: 4 },
];

// --- Priemer / veľkosť (v cm) – cena podľa veľkosti ---
export const DIAMETER_OPTIONS: DiameterOption[] = [
  { id: '18', label: '18 cm', cm: 18, price: 0 },
  { id: '22', label: '22 cm', cm: 22, price: 5 },
  { id: '26', label: '26 cm', cm: 26, price: 10 },
  { id: '30', label: '30 cm', cm: 30, price: 15 },
  { id: '35', label: '35 cm', cm: 35, price: 22 },
];

/** Torta na mieru sa neoceňuje v konfigurátore – žiadne príplatky za počet poschodí */
export const TIER_SURCHARGES: Record<number, number> = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
};

export const DEFAULT_VAT_RATE = 20;
