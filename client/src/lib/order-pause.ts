/**
 * Dočasné pozastavenie prijímania nových objednávok.
 *
 * Výroba nestíha kapacitne – kým to platí, na eshope aj v konfigurátore torty
 * je skryté tlačidlo "Pridať do košíka" a zobrazuje sa informačný banner.
 *
 * NÁVRAT DO PÔVODNÉHO STAVU: prepnúť ORDERS_PAUSED na false (a nasadiť).
 * Nič iné netreba meniť – košík, checkout ani platby sa nedotýkame.
 */
export const ORDERS_PAUSED = true;

/** Krátky text na tlačidle namiesto "Pridať do košíka". */
export const PAUSE_BUTTON_LABEL = 'Objednávky dočasne pozastavené';

/** Nadpis banneru. */
export const PAUSE_BANNER_TITLE = 'Dočasne neprijímame nové objednávky';

/** Text banneru. Pri zmene termínu obnovenia upravte dátum tu. */
export const PAUSE_BANNER_TEXT =
  'Z dôvodu naplnenej výrobnej kapacity momentálne neprijímame nové objednávky. ' +
  'Objednávky spúšťame od 5. 10. 2026 – ďakujeme za pochopenie.';
