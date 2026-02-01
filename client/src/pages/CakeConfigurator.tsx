import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Cake,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Circle,
  Layers,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/format-price';
import SEO from '@/components/SEO';
import {
  CAKE_SHAPES,
  TIER_COUNTS,
  TIER_SURCHARGES,
  DEFAULT_VAT_RATE,
  KORPUS_OPTIONS,
  KREM_OPTIONS,
  DOPLNOK_OPTIONS,
  LAYERS_OPTIONS,
  DIAMETER_OPTIONS,
} from '@/lib/cake-config-data';

// --- Typy ---

/** Atribúty pre jedno poschodie – kľúč (z ERPNext spec) -> vybraná hodnota (môže obsahovať cenu napr. "Vanilka {5}") */
export type TierConfig = Record<string, string>;

export interface TierToggles {
  glutenFree: boolean;
  lactoseFree: boolean;
}

interface SpecificationOption {
  id: string;
  name: string;
  options: string[];
  optionPrices: Record<string, number>;
}

interface CakeConfiguratorProps {
  onAddToCart: (product: Record<string, unknown>, quantity: number) => void;
  onCartOpen: () => void;
}

function useCustomCakeProduct() {
  return useQuery({
    queryKey: ['/api/products', 'TORTCUS001'],
    queryFn: async () => {
      const res = await fetch('/api/products/TORTCUS001');
      if (!res.ok) throw new Error('Failed to fetch custom cake product');
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });
}

function useWebsiteItem(websiteItemId: string) {
  return useQuery({
    queryKey: ['/api/website-items', websiteItemId],
    queryFn: async () => {
      const res = await fetch(`/api/website-items/${websiteItemId}`);
      if (!res.ok) throw new Error('Failed to fetch website item');
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
    enabled: Boolean(websiteItemId),
  });
}

/** Parsuje hodnotu atribútu s cenou, napr. "Vanilka {5}" → { name: "Vanilka", price: 5 } */
function parseAttributeWithPrice(value: string): { name: string; price: number } {
  const match = value.match(/^(.+?)\s*\{(\d+(?:\.\d+)?)\}/);
  if (match) {
    return { name: match[1].trim(), price: parseFloat(match[2]) };
  }
  return { name: value.trim(), price: 0 };
}

/** Či je atribút „počet poschodí“ – zobrazuje sa len v kroku 0, nie v konfigurácii poschodí */
function isPocetPoschodiAttribute(opt: SpecificationOption): boolean {
  const s = `${opt.id} ${opt.name}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return s.includes('poschod');
}

/** Či je atribút „Tvar torty“ – zobrazuje sa len v kroku 0, nie v konfigurácii poschodí */
function isTvarAttribute(opt: SpecificationOption): boolean {
  const s = `${opt.id} ${opt.name}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return s.includes('tvar');
}

/** Či je atribút „Zápich“ – zobrazuje sa len v kroku 0, nie v konfigurácii poschodí */
function isZapichAttribute(opt: SpecificationOption): boolean {
  const s = `${opt.id} ${opt.name}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return s.includes('zapich');
}

/** Extrahuje počet poschodí z hodnoty atribútu, napr. "2 poschodia {35}" → 2, "1" → 1 */
function parseTierCountFromValue(value: string): number {
  const match = value.match(/(\d+)/);
  const n = match ? parseInt(match[1], 10) : 1;
  return Math.max(1, Math.min(5, n));
}

/** Či je atribút „Korpus“ (bežný, nie bezlepkový) */
function isKorpusAttribute(opt: SpecificationOption): boolean {
  const s = `${opt.id} ${opt.name}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return s.includes('korpus') && !s.includes('bezlepk');
}

/** Či je atribút „Korpus bezlepkový“ */
function isKorpusBezlepkovyAttribute(opt: SpecificationOption): boolean {
  const s = `${opt.id} ${opt.name}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return s.includes('korpus') && s.includes('bezlepk');
}

/** Či je atribút „Krém“ (bežný, nie bez laktózy) */
function isKremAttribute(opt: SpecificationOption): boolean {
  const s = `${opt.id} ${opt.name}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return (s.includes('krem') || s.includes('krém')) && !s.includes('laktoz') && !s.includes('laktóz');
}

/** Či je atribút „Krém bez laktózy“ */
function isKremBezLaktozyAttribute(opt: SpecificationOption): boolean {
  const s = `${opt.id} ${opt.name}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return (s.includes('krem') || s.includes('krém')) && (s.includes('laktoz') || s.includes('laktóz'));
}

function roundCurrency(v: number) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

export default function CakeConfigurator({ onAddToCart, onCartOpen }: CakeConfiguratorProps) {
  const [step, setStep] = useState(0);
  const [tierCount, setTierCount] = useState<number>(1);
  const [tvarValue, setTvarValue] = useState<string>(''); // tvar z ERPNext atribútu
  const [zapichValue, setZapichValue] = useState<string>(''); // zápich z ERPNext atribútu
  const [pocetPoschodiValue, setPocetPoschodiValue] = useState<string>(''); // hodnota z ERPNext atribútu
  const [tierConfigs, setTierConfigs] = useState<TierConfig[]>([]);
  const [tierToggles, setTierToggles] = useState<TierToggles[]>([]); // glutenFree, lactoseFree per tier
  const { toast } = useToast();

  const { data: customCakeProduct, isLoading: productLoading } = useCustomCakeProduct();
  const { data: websiteItem, isLoading: websiteItemLoading } = useWebsiteItem('WEB-ITM-0425');

  const vatRate = customCakeProduct?.vatRate ?? DEFAULT_VAT_RATE;
  const minOrderQuantity = customCakeProduct?.minOrderQuantity ?? 1;

  /** Atribúty z ERPNext Website Item – rovnaká štruktúra ako na torta-na-mieru. Fallback na statické dáta ak ERPNext nemá špecifikácie. */
  const configurationOptions: SpecificationOption[] = useMemo(() => {
    const fallbackTvar: SpecificationOption = {
      id: 'tvar',
      name: 'Tvar torty',
      options: CAKE_SHAPES.map((s) => `${s.name} {${s.price}}`),
      optionPrices: Object.fromEntries(CAKE_SHAPES.map((s) => [`${s.name} {${s.price}}`, s.price])),
    };
    const fallbackZapich: SpecificationOption = {
      id: 'zapich',
      name: 'Zápich',
      options: ['Žiadny {0}', 'Zápich {3}'],
      optionPrices: { 'Žiadny {0}': 0, 'Zápich {3}': 3 },
    };
    if (websiteItem?.specifications && websiteItem.specifications.length > 0) {
      const fromErp = websiteItem.specifications.map((spec: { key: string; label: string; value: string }) => {
        const rawValues = spec.value
          .split(',')
          .map((v: string) => v.trim())
          .filter((v: string) => v.length > 0);
        const uniqueValues = Array.from(new Set(rawValues));
        const optionPrices: Record<string, number> = {};
        uniqueValues.forEach((rawValue: string) => {
          const parsed = parseAttributeWithPrice(rawValue);
          optionPrices[rawValue] = parsed.price;
        });
        return {
          id: spec.key,
          name: spec.label,
          options: uniqueValues,
          optionPrices,
        };
      });
      const hasTvar = fromErp.some((opt: SpecificationOption) => isTvarAttribute(opt));
      const hasZapich = fromErp.some((opt: SpecificationOption) => isZapichAttribute(opt));
      let result = hasTvar ? fromErp : [fallbackTvar, ...fromErp];
      if (!hasZapich) result = [fallbackZapich, ...result];
      return result;
    }
    // Fallback: statické dáta z cake-config-data
    const korpus: SpecificationOption = {
      id: 'korpus',
      name: 'Korpus',
      options: KORPUS_OPTIONS.map((k) => `${k.name} {${k.price}}`),
      optionPrices: Object.fromEntries(KORPUS_OPTIONS.map((k) => [`${k.name} {${k.price}}`, k.price])),
    };
    const krem: SpecificationOption = {
      id: 'krem',
      name: 'Krém',
      options: KREM_OPTIONS.map((k) => `${k.name} {${k.price}}`),
      optionPrices: Object.fromEntries(KREM_OPTIONS.map((k) => [`${k.name} {${k.price}}`, k.price])),
    };
    const doplnok: SpecificationOption = {
      id: 'doplnok',
      name: 'Doplnok',
      options: DOPLNOK_OPTIONS.map((d) => `${d.name} {${d.price}}`),
      optionPrices: Object.fromEntries(DOPLNOK_OPTIONS.map((d) => [`${d.name} {${d.price}}`, d.price])),
    };
    const vrstvy: SpecificationOption = {
      id: 'vrstvy',
      name: 'Vrstvy',
      options: LAYERS_OPTIONS.map((l) => `${l.label} {${l.priceAdd}}`),
      optionPrices: Object.fromEntries(LAYERS_OPTIONS.map((l) => [`${l.label} {${l.priceAdd}}`, l.priceAdd])),
    };
    const priemer: SpecificationOption = {
      id: 'priemer',
      name: 'Priemer',
      options: DIAMETER_OPTIONS.map((d) => `${d.label} {${d.price}}`),
      optionPrices: Object.fromEntries(DIAMETER_OPTIONS.map((d) => [`${d.label} {${d.price}}`, d.price])),
    };
    const korpusBezlepkovy: SpecificationOption = {
      id: 'korpus-bezlepkovy',
      name: 'Korpus bezlepkový',
      options: KORPUS_OPTIONS.map((k) => `${k.name} {${k.price + 2}}`),
      optionPrices: Object.fromEntries(KORPUS_OPTIONS.map((k) => [`${k.name} {${k.price + 2}}`, k.price + 2])),
    };
    const kremBezLaktozy: SpecificationOption = {
      id: 'krem-bez-laktozy',
      name: 'Krém bez laktózy',
      options: KREM_OPTIONS.map((k) => `${k.name} {${k.price + 2}}`),
      optionPrices: Object.fromEntries(KREM_OPTIONS.map((k) => [`${k.name} {${k.price + 2}}`, k.price + 2])),
    };
    const pocetPoschodi: SpecificationOption = {
      id: 'pocet-poschodi',
      name: 'Počet poschodí',
      options: TIER_COUNTS.map((n) => {
        const price = TIER_SURCHARGES[n] ?? 0;
        return `${n} ${n === 1 ? 'poschodie' : n >= 2 && n <= 4 ? 'poschodia' : 'poschodí'} {${price}}`;
      }),
      optionPrices: Object.fromEntries(
        TIER_COUNTS.map((n) => {
          const price = TIER_SURCHARGES[n] ?? 0;
          const label = `${n} ${n === 1 ? 'poschodie' : n >= 2 && n <= 4 ? 'poschodia' : 'poschodí'} {${price}}`;
          return [label, price];
        })
      ),
    };
    return [fallbackTvar, fallbackZapich, pocetPoschodi, korpus, korpusBezlepkovy, krem, kremBezLaktozy, doplnok, vrstvy, priemer];
  }, [websiteItem]);

  /** Atribút „Tvar torty“ – len pre krok 0 */
  const tvarOption = useMemo(
    () => configurationOptions.find((opt) => isTvarAttribute(opt)),
    [configurationOptions]
  );

  /** Atribút „Zápich“ – len pre krok 0 */
  const zapichOption = useMemo(
    () => configurationOptions.find((opt) => isZapichAttribute(opt)),
    [configurationOptions]
  );

  /** Atribút „počet poschodí“ – len pre krok 0 */
  const pocetPoschodiOption = useMemo(
    () => configurationOptions.find((opt) => isPocetPoschodiAttribute(opt)),
    [configurationOptions]
  );

  /** Atribúty pre konfiguráciu poschodí – bez „počet poschodí“, „tvar torty“ a „zápich“ */
  const tierOptions = useMemo(
    () => configurationOptions.filter((opt) =>
      !isPocetPoschodiAttribute(opt) && !isTvarAttribute(opt) && !isZapichAttribute(opt)
    ),
    [configurationOptions]
  );

  /** Získa prepínače pre dané poschodie (default: oba vypnuté) */
  const getTierToggles = (tierIndex: number): TierToggles => {
    const t = tierToggles[tierIndex];
    return t ?? { glutenFree: false, lactoseFree: false };
  };

  const updateTierToggles = (tierIndex: number, patch: Partial<TierToggles>) => {
    setTierToggles((prev) => {
      const next = [...prev];
      while (next.length <= tierIndex) {
        next.push({ glutenFree: false, lactoseFree: false });
      }
      next[tierIndex] = { ...next[tierIndex], ...patch };
      return next;
    });
  };

  /** Atribúty zobrazené pre dané poschodie – podľa prepínačov Bezlepku / Bez laktózy */
  const getDisplayedTierOptions = (tierIndex: number): SpecificationOption[] => {
    const toggles = getTierToggles(tierIndex);
    return tierOptions.filter((opt) => {
      if (isKorpusAttribute(opt)) return !toggles.glutenFree; // Korpus: zobraz keď Bezlepku vypnuté
      if (isKorpusBezlepkovyAttribute(opt)) return toggles.glutenFree; // Korpus bezlepkový: zobraz keď Bezlepku zapnuté
      if (isKremAttribute(opt)) return !toggles.lactoseFree; // Krém: zobraz keď Bez laktózy vypnuté
      if (isKremBezLaktozyAttribute(opt)) return toggles.lactoseFree; // Krém bez laktózy: zobraz keď Bez laktózy zapnuté
      return true; // ostatné atribúty vždy zobraz
    });
  };

  // Efektívny počet poschodí – z ERPNext atribútu alebo z vlastného výberu
  const effectiveTierCount = useMemo(() => {
    if (pocetPoschodiOption && pocetPoschodiValue) {
      return parseTierCountFromValue(pocetPoschodiValue);
    }
    return tierCount;
  }, [pocetPoschodiOption, pocetPoschodiValue, tierCount]);

  // Po zmeně effectiveTierCount inicializujeme/orežeme tierConfigs
  const safeTierConfigs = useMemo(() => {
    const base: TierConfig[] = tierConfigs.length >= effectiveTierCount
      ? tierConfigs.slice(0, effectiveTierCount)
      : [...tierConfigs];
    while (base.length < effectiveTierCount) {
      base.push({});
    }
    return base;
  }, [effectiveTierCount, tierConfigs]);

  const updateTierConfig = (tierIndex: number, patch: Partial<TierConfig>) => {
    setTierConfigs((prev) => {
      const next = [...(prev.length >= effectiveTierCount ? prev.slice(0, effectiveTierCount) : prev)];
      while (next.length <= tierIndex) {
        next.push({});
      }
      const cleanPatch = Object.fromEntries(
        Object.entries(patch).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      ) as TierConfig;
      next[tierIndex] = { ...next[tierIndex], ...cleanPatch };
      return next;
    });
  };

  // Kroky: 0 = tvar+poschodia, 1..effectiveTierCount = poschodie 1..N, effectiveTierCount+1 = súhrn
  const totalSteps = 1 + effectiveTierCount + 1;
  const isSummaryStep = step === 1 + effectiveTierCount;
  const isTierStep = step >= 1 && step <= effectiveTierCount;
  const tierIndex = isTierStep ? step - 1 : -1;

  // Povinné: tvar, počet poschodí; v každom poschodí: všetky atribúty (bez počet poschodí, bez tvar)
  const canProceedFromStep0 = Boolean(
    tvarValue &&
    (pocetPoschodiOption ? Boolean(pocetPoschodiValue) : tierCount >= 1)
  );
  const canProceedFromTierStep = useMemo(() => {
    if (!isTierStep || tierIndex < 0) return false;
    const t = safeTierConfigs[tierIndex];
    const displayed = getDisplayedTierOptions(tierIndex);
    return displayed.every((opt) => Boolean(t?.[opt.id]));
  }, [isTierStep, tierIndex, safeTierConfigs, tierToggles, tierOptions]);

  const canGoToSummary = effectiveTierCount >= 1 && safeTierConfigs.every((_, i) => {
    const t = safeTierConfigs[i];
    const displayed = getDisplayedTierOptions(i);
    return displayed.every((opt) => Boolean(t?.[opt.id]));
  });

  // --- Cenotvorba ---

  const { priceWithoutVat, priceWithVat, tierBreakdown, surcharge, surchargeLabel } = useMemo(() => {
    const shapePrice = tvarOption && tvarValue ? (tvarOption.optionPrices[tvarValue] ?? 0) : 0;
    const zapichPrice = zapichOption && zapichValue ? (zapichOption.optionPrices[zapichValue] ?? 0) : 0;
    let total = shapePrice + zapichPrice;
    const breakdown: { tier: number; label: string; amount: number }[] = [];

    for (let i = 0; i < effectiveTierCount; i++) {
      const t = safeTierConfigs[i];
      if (!t) continue;

      let tierSum = 0;
      getDisplayedTierOptions(i).forEach((opt) => {
        const selectedValue = t[opt.id];
        if (selectedValue) {
          tierSum += opt.optionPrices[selectedValue] ?? 0;
        }
      });

      total += tierSum;
      breakdown.push({
        tier: i + 1,
        label: `Poschodie ${i + 1}`,
        amount: roundCurrency(tierSum),
      });
    }

    const surchargeAmount = TIER_SURCHARGES[effectiveTierCount] ?? 0;
    const surchargeLabel =
      effectiveTierCount === 2 ? 'Príplatok za 2-poschodovú tortu' : effectiveTierCount >= 3 ? 'Príplatok za viacposchodovú tortu' : '';

    total = roundCurrency(total + surchargeAmount);
    const withVat = roundCurrency(total * (1 + vatRate / 100));

    return {
      priceWithoutVat: total,
      priceWithVat: withVat,
      tierBreakdown: breakdown,
      surcharge: surchargeAmount,
      surchargeLabel,
    };
  }, [tvarOption, tvarValue, zapichOption, zapichValue, effectiveTierCount, safeTierConfigs, tierToggles, tierOptions, vatRate]);

  // --- Pridanie do košíka ---

  const buildDescription = () => {
    const tvarName = tvarOption && tvarValue ? parseAttributeWithPrice(tvarValue).name : '';
    const parts: string[] = [
      `Tvar: ${tvarName}`,
      `Poschodí: ${effectiveTierCount}`,
    ];
    if (pocetPoschodiOption && pocetPoschodiValue) {
      const parsed = parseAttributeWithPrice(pocetPoschodiValue);
      parts.push(`Počet poschodí: ${parsed.name}`);
    }
    if (zapichOption && zapichValue) {
      const parsed = parseAttributeWithPrice(zapichValue);
      parts.push(`Zápich: ${parsed.name}`);
    }
    safeTierConfigs.forEach((t, i) => {
      const toggles = getTierToggles(i);
      const hasKorpusPair = tierOptions.some((o) => isKorpusAttribute(o) || isKorpusBezlepkovyAttribute(o));
      const hasKremPair = tierOptions.some((o) => isKremAttribute(o) || isKremBezLaktozyAttribute(o));
      const tierParts: string[] = [];
      if (hasKorpusPair) tierParts.push(`Bezlepku: ${toggles.glutenFree ? 'Áno' : 'Nie'}`);
      if (hasKremPair) tierParts.push(`Bez laktózy: ${toggles.lactoseFree ? 'Áno' : 'Nie'}`);
      getDisplayedTierOptions(i).forEach((opt) => {
        const val = t[opt.id];
        if (!val) return;
        const parsed = parseAttributeWithPrice(val);
        tierParts.push(`${opt.name}: ${parsed.name}`);
      });
      parts.push(`P${i + 1}: ${tierParts.join(', ')}`);
    });
    if (surcharge > 0) parts.push(surchargeLabel);
    return parts.join(' | ');
  };

  const handleAddToCart = () => {
    const customAttributesWithPrices: Array<{ name: string; value: string; price: number }> = [];
    if (tvarOption && tvarValue) {
      const parsed = parseAttributeWithPrice(tvarValue);
      const price = tvarOption.optionPrices[tvarValue] ?? 0;
      customAttributesWithPrices.push({ name: tvarOption.name, value: parsed.name, price });
    }
    if (pocetPoschodiOption && pocetPoschodiValue) {
      const parsed = parseAttributeWithPrice(pocetPoschodiValue);
      const price = pocetPoschodiOption.optionPrices[pocetPoschodiValue] ?? 0;
      customAttributesWithPrices.push({ name: pocetPoschodiOption.name, value: parsed.name, price });
    }
    if (zapichOption && zapichValue) {
      const parsed = parseAttributeWithPrice(zapichValue);
      const price = zapichOption.optionPrices[zapichValue] ?? 0;
      customAttributesWithPrices.push({ name: zapichOption.name, value: parsed.name, price });
    }
    safeTierConfigs.forEach((t, i) => {
      const toggles = getTierToggles(i);
      const hasKorpusPair = tierOptions.some((o) => isKorpusAttribute(o) || isKorpusBezlepkovyAttribute(o));
      const hasKremPair = tierOptions.some((o) => isKremAttribute(o) || isKremBezLaktozyAttribute(o));
      // Prepínače Bezlepku / Bez laktózy pre toto poschodie
      if (hasKorpusPair) {
        customAttributesWithPrices.push({ name: `P${i + 1} Bezlepku`, value: toggles.glutenFree ? 'Áno' : 'Nie', price: 0 });
      }
      if (hasKremPair) {
        customAttributesWithPrices.push({ name: `P${i + 1} Bez laktózy`, value: toggles.lactoseFree ? 'Áno' : 'Nie', price: 0 });
      }
      getDisplayedTierOptions(i).forEach((opt) => {
        const val = t[opt.id];
        if (!val) return;
        const parsed = parseAttributeWithPrice(val);
        const price = opt.optionPrices[val] ?? 0;
        customAttributesWithPrices.push({ name: `P${i + 1} ${opt.name}`, value: parsed.name, price });
      });
    });
    if (surcharge > 0) customAttributesWithPrices.push({ name: 'Príplatok poschodie', value: surchargeLabel, price: surcharge });

    const product = {
      id: `cake-config-${Date.now()}`,
      name: 'Torta na mieru (konfigurátor)',
      description: buildDescription(),
      price: priceWithoutVat,
      priceWithVat,
      vatRate,
      image: customCakeProduct?.image ?? '/placeholder-product.jpg',
      category: 'Torty na mieru',
      inStock: true,
      minOrderQuantity,
      customAttributesWithPrices,
    };

    onAddToCart(product, minOrderQuantity);
    onCartOpen();
    toast({
      title: 'Torta pridaná do košíka',
      description: 'Vaša nakonfigurovaná torta bola pridaná do košíka.',
    });
  };

  const goNext = () => {
    if (step === 0 && !canProceedFromStep0) return;
    if (isTierStep && !canProceedFromTierStep) return;
    if (step === effectiveTierCount && !canGoToSummary) return; // posledný tier krok pred súhrnom
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  };

  const goPrev = () => setStep((s) => Math.max(0, s - 1));

  // --- Render ---

  if (productLoading || websiteItemLoading) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center min-h-[320px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Konfigurátor torty | Torta na mieru 2 | Marsela Bakery"
        description="Vytvorte si tortu na mieru krok za krokom: tvar, počet poschodí, korpus, krém, doplnok, veľkosť. Cena sa počíta podľa výberu."
        keywords="konfigurátor torty, torta na mieru, poschodová torta, korpus, krém, priemer, Marsela Bakery"
        canonical="/torta-na-mieru-2"
      />
      <div className="min-h-screen bg-background py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Cake className="h-8 w-8 text-primary" />
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">Konfigurátor torty</h1>
            </div>
            <p className="text-muted-foreground">
              Zložte si tortu podľa vlastných preferencií. Cena sa prepočítava podľa výberu.
            </p>
          </div>

          {/* Kroky (progress) */}
          <div className="flex items-center justify-center gap-1 mb-8 overflow-x-auto">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm ${
                    i < step ? 'border-primary bg-primary text-primary-foreground' : i === step ? 'border-primary bg-background' : 'border-muted text-muted-foreground'
                  }`}
                >
                  {i < step ? <CheckCircle className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                </div>
                {i < totalSteps - 1 && <div className="w-4 md:w-8 h-0.5 bg-muted" />}
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {step === 0 && 'Základný výber'}
                {isTierStep && `Poschodie ${tierIndex + 1}`}
                {isSummaryStep && 'Súhrn a objednávka'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Krok 0: Tvar torty (z ERPNext) + počet poschodí */}
              {step === 0 && (
                <>
                  <div className="space-y-3">
                    <Label className="text-base font-medium">
                      {tvarOption ? tvarOption.name : 'Tvar torty'}
                    </Label>
                    <Select
                      value={tvarValue}
                      onValueChange={setTvarValue}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Vyberte ${tvarOption?.name?.toLowerCase() ?? 'tvar torty'}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {(tvarOption?.options ?? []).map((value) => {
                          const parsed = parseAttributeWithPrice(value);
                          const price = tvarOption?.optionPrices[value] ?? 0;
                          return (
                            <SelectItem key={value} value={value}>
                              {parsed.name}{price > 0 ? ` (+${formatPrice(price)})` : ''}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base font-medium">
                      {zapichOption ? zapichOption.name : 'Zápich'}
                    </Label>
                    <Select value={zapichValue} onValueChange={setZapichValue}>
                      <SelectTrigger>
                        <SelectValue placeholder={`Vyberte ${zapichOption?.name?.toLowerCase() ?? 'zápich'}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {(zapichOption?.options ?? []).map((value) => {
                          const parsed = parseAttributeWithPrice(value);
                          const price = zapichOption?.optionPrices[value] ?? 0;
                          return (
                            <SelectItem key={value} value={value}>
                              {parsed.name}{price > 0 ? ` (+${formatPrice(price)})` : ''}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      {pocetPoschodiOption ? pocetPoschodiOption.name : 'Počet poschodí'}
                    </Label>
                    {pocetPoschodiOption ? (
                      <Select
                        value={pocetPoschodiValue}
                        onValueChange={(v) => {
                          setPocetPoschodiValue(v);
                          const n = parseTierCountFromValue(v);
                          setTierConfigs((p) => {
                            if (p.length <= n) return p;
                            return p.slice(0, n);
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Vyberte ${pocetPoschodiOption.name.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {pocetPoschodiOption.options.map((value) => {
                            const parsed = parseAttributeWithPrice(value);
                            const price = pocetPoschodiOption.optionPrices[value] ?? 0;
                            return (
                              <SelectItem key={value} value={value}>
                                {parsed.name}{price > 0 ? ` (+${formatPrice(price)})` : ''}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select
                        value={String(tierCount)}
                        onValueChange={(v) => {
                          setTierCount(Number(v));
                          setTierConfigs((p) => {
                            const n = Number(v);
                            if (p.length <= n) return p;
                            return p.slice(0, n);
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Počet poschodí" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIER_COUNTS.map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n} {n === 1 ? 'poschodie' : n >= 2 && n <= 4 ? 'poschodia' : 'poschodí'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </>
              )}

              {/* Krok 1..N: Konfigurácia poschodia – atribúty z ERPNext (bez počet poschodí) */}
              {isTierStep && tierIndex >= 0 && (
                <TierForm
                  tierIndex={tierIndex}
                  config={safeTierConfigs[tierIndex]!}
                  onChange={(c) => updateTierConfig(tierIndex, c)}
                  configurationOptions={getDisplayedTierOptions(tierIndex)}
                  tierToggles={getTierToggles(tierIndex)}
                  onTogglesChange={(patch) => updateTierToggles(tierIndex, patch)}
                  hasKorpusPair={tierOptions.some((o) => isKorpusAttribute(o) || isKorpusBezlepkovyAttribute(o))}
                  hasKremPair={tierOptions.some((o) => isKremAttribute(o) || isKremBezLaktozyAttribute(o))}
                />
              )}

              {/* Súhrn */}
              {isSummaryStep && (
                <div className="space-y-6">
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <h4 className="font-semibold">Zvolená torta</h4>
                    {/* Atribúty z kroku 0 – Tvar, Počet poschodí, Zápich */}
                    {tvarOption && (
                      <p><span className="font-medium">{tvarOption.name}:</span> {tvarValue ? parseAttributeWithPrice(tvarValue).name : '—'}</p>
                    )}
                    {pocetPoschodiOption && (
                      <p><span className="font-medium">{pocetPoschodiOption.name}:</span> {pocetPoschodiValue ? parseAttributeWithPrice(pocetPoschodiValue).name : '—'}</p>
                    )}
                    {zapichOption && zapichValue && (
                      <p><span className="font-medium">{zapichOption.name}:</span> {parseAttributeWithPrice(zapichValue).name}</p>
                    )}
                    {safeTierConfigs.map((t, i) => {
                      const toggles = getTierToggles(i);
                      const hasKorpusPair = tierOptions.some((o) => isKorpusAttribute(o) || isKorpusBezlepkovyAttribute(o));
                      const hasKremPair = tierOptions.some((o) => isKremAttribute(o) || isKremBezLaktozyAttribute(o));
                      return (
                      <div key={i} className="border-t pt-3">
                        <div className="font-medium">Poschodie {i + 1}</div>
                        {/* Prepínače Bezlepku / Bez laktózy pre toto poschodie */}
                        {(hasKorpusPair || hasKremPair) && (
                          <ul className="text-sm text-muted-foreground list-disc list-inside mb-2">
                            {hasKorpusPair && (
                              <li>Bezlepku: {toggles.glutenFree ? 'Áno' : 'Nie'}</li>
                            )}
                            {hasKremPair && (
                              <li>Bez laktózy: {toggles.lactoseFree ? 'Áno' : 'Nie'}</li>
                            )}
                          </ul>
                        )}
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                          {getDisplayedTierOptions(i).map((opt) => {
                            const val = t[opt.id];
                            if (!val) return null;
                            const parsed = parseAttributeWithPrice(val);
                            return <li key={opt.id}>{opt.name}: {parsed.name}</li>;
                          })}
                        </ul>
                        <div className="text-sm font-medium mt-1">{tierBreakdown[i]?.amount ?? 0} €</div>
                      </div>
                    );})}
                    {surcharge > 0 && (
                      <div className="border-t pt-3 text-muted-foreground">
                        {surchargeLabel}: {formatPrice(surcharge)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t pt-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Celkom bez DPH: {formatPrice(priceWithoutVat)}</div>
                      <div className="text-2xl font-bold text-primary">Celkom s DPH: {formatPrice(priceWithVat)}</div>
                    </div>
                    <Button onClick={handleAddToCart} size="lg">
                      Pridať do košíka
                    </Button>
                  </div>
                </div>
              )}

              {/* Navigácia (okrem súhrnu) */}
              {!isSummaryStep && (
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={goPrev} disabled={step === 0}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Späť
                  </Button>
                  <Button
                    onClick={goNext}
                    disabled={
                      (step === 0 && !canProceedFromStep0) ||
                      (isTierStep && !canProceedFromTierStep)
                    }
                  >
                    {step === totalSteps - 2 ? 'Súhrn' : 'Ďalej'}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bokový blok – zobrazenie ceny pri prechode cez kroky (voliteľné, na mobile pod kartou) */}
          <Card className="mt-6 md:mt-8">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Odhadovaná cena s DPH</span>
                <span className="text-xl font-bold text-primary">
                  {tvarValue ? formatPrice(priceWithVat) : '—'}
                </span>
              </div>
              {minOrderQuantity > 1 && (
                <p className="text-sm text-muted-foreground mt-2">Min. objednávka: {minOrderQuantity} kusov</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

// --- TierForm: dynamické atribúty z ERPNext pre dané poschodie ---

function TierForm({
  tierIndex,
  config,
  onChange,
  configurationOptions,
  tierToggles,
  onTogglesChange,
  hasKorpusPair,
  hasKremPair,
}: {
  tierIndex: number;
  config: TierConfig;
  onChange: (c: Partial<TierConfig>) => void;
  configurationOptions: SpecificationOption[];
  tierToggles: TierToggles;
  onTogglesChange: (patch: Partial<TierToggles>) => void;
  hasKorpusPair: boolean;
  hasKremPair: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Prepínače Bezlepku / Bez laktózy – pod názvom poschodia (CardTitle už zobrazuje „Poschodie X“) */}
      {(hasKorpusPair || hasKremPair) && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-wrap gap-6">
            {hasKorpusPair && (
              <div className="flex items-center gap-3">
                <Switch
                  id={`gluten-free-${tierIndex}`}
                  checked={tierToggles.glutenFree}
                  onCheckedChange={(checked) => onTogglesChange({ glutenFree: checked })}
                />
                <Label htmlFor={`gluten-free-${tierIndex}`} className="cursor-pointer">
                  Bezlepku
                </Label>
              </div>
            )}
            {hasKremPair && (
              <div className="flex items-center gap-3">
                <Switch
                  id={`lactose-free-${tierIndex}`}
                  checked={tierToggles.lactoseFree}
                  onCheckedChange={(checked) => onTogglesChange({ lactoseFree: checked })}
                />
                <Label htmlFor={`lactose-free-${tierIndex}`} className="cursor-pointer">
                  Bez laktózy
                </Label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Atribúty – Korpus alebo Korpus bezlepkový, Krém alebo Krém bez laktózy */}
      <div className="grid gap-4 sm:grid-cols-2">
      {configurationOptions.map((opt) => (
        <div key={opt.id} className="space-y-2">
          <Label>{opt.name}</Label>
          <Select
            value={config[opt.id] ?? ''}
            onValueChange={(v) => onChange({ [opt.id]: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Vyberte ${opt.name.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {opt.options.map((value) => {
                const parsed = parseAttributeWithPrice(value);
                const price = opt.optionPrices[value] ?? 0;
                return (
                  <SelectItem key={value} value={value}>
                    {parsed.name}{price > 0 ? ` (+${formatPrice(price)})` : ''}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      ))}

      </div>
    </div>
  );
}
