# SOP - Návod pre zákazníkov
## Marsela Bakery - Online objednávkový systém

**Verzia:** 1.0  
**Dátum:** 2025  
**Aplikácia:** SweetDelight / Marsela Bakery

---

## 1. Úvod

Tento dokument popisuje štandardný postup práce (SOP) pre zákazníkov pri používaní online objednávkového systému Marsela Bakery. Systém umožňuje prehliadanie produktov, objednávanie zákuskov a tort, správu objednávok a platby online.

---

## 2. Prístup k systému

### 2.1 Webová adresa
- Hlavná stránka: `https://[vaša-doména]`
- Systém je dostupný 24/7 cez webový prehliadač

### 2.2 Požiadavky
- Moderný webový prehliadač (Chrome, Firefox, Safari, Edge)
- Aktívne internetové pripojenie
- JavaScript musí byť povolený

---

## 3. Registrácia a prihlásenie

### 3.1 Registrácia nového účtu

**Postup:**
1. Kliknite na tlačidlo **"Prihlásiť sa"** v hlavičke stránky
2. Vyberte možnosť **"Registrácia"** alebo prejdite na `/registracia`
3. Vyplňte formulár:
   - **Meno** (povinné)
   - **Priezvisko** (povinné)
   - **Email** (povinné) - použije sa ako prihlasovacie meno
   - **Telefón** (voliteľné)
   - **Súhlas s obchodnými podmienkami** (povinné)
4. Kliknite na **"Registrovať sa"**
5. Po úspešnej registrácii budete presmerovaní na prihlasovaciu stránku

**Poznámka:** Po registrácii musíte nastaviť heslo cez ERPNext systém alebo kontaktovať podporu.

### 3.2 Prihlásenie do systému

**Postup:**
1. Kliknite na **"Prihlásiť sa"** v hlavičke
2. Zadajte:
   - **Email** (vaša emailová adresa)
   - **Heslo**
3. Kliknite na **"Prihlásiť sa"**
4. Po úspešnom prihlásení budete presmerovaní na domovskú stránku

### 3.3 Zabudnuté heslo

**Postup:**
1. Na prihlasovacej stránke kliknite na **"Zabudli ste heslo?"**
2. Zadajte svoj email
3. Postupujte podľa inštrukcií v emaili na obnovenie hesla

---

## 4. Prehliadanie produktov

### 4.1 Domovská stránka

**Funkcie:**
- Zobrazenie obľúbených produktov
- Hero sekcia s hlavnými informáciami
- Rýchly prístup k obchodu

**Navigácia:**
- Kliknutím na produkt sa zobrazí detail produktu
- Tlačidlo **"Pridať do košíka"** pridá produkt do košíka

### 4.2 Obchod (`/obchod`)

**Funkcie:**
- Zobrazenie všetkých dostupných produktov
- Filtrovanie a vyhľadávanie produktov
- Zobrazenie cien s DPH a bez DPH

**Použitie:**
1. Prejdite na stránku **"Obchod"** z hlavného menu
2. Prehliadajte produkty
3. Kliknite na produkt pre zobrazenie detailov

### 4.3 Detail produktu (`/produkt/:id`)

**Informácie:**
- Názov produktu
- Popis
- Cena (bez DPH a s DPH)
- Obrázok produktu
- Dostupné množstvo
- Minimálne objednávkové množstvo

**Akcie:**
- Výber množstva
- Pridanie do košíka
- Pridanie špeciálnych poznámok (ak je to možné)

---

## 5. Torta na mieru

### 5.1 Vytvorenie objednávky na tortu na mieru

**Postup:**
1. Prejdite na stránku **"Torta na mieru"** (`/torta-na-mieru`)
2. Vyplňte formulár:
   - **Veľkosť torty**
   - **Typ torty**
   - **Dátum potreby**
   - **Špeciálne požiadavky/poznámky**
   - **Dekorácia**
   - **Počet porcií**
3. Kliknite na **"Pridať do košíka"**
4. Produkt sa pridá do košíka s vašimi špecifikáciami

**Poznámka:** Pre torty na mieru sa môže požadovať záloha pri objednávke.

---

## 6. Košík

### 6.1 Zobrazenie košíka

**Postup:**
1. Kliknite na ikonu košíka v hlavičke stránky
2. Zobrazí sa bočný panel s obsahom košíka

**Informácie v košíku:**
- Zoznam produktov s obrázkami
- Množstvo každého produktu
- Cena za jednotku
- Celková cena (bez DPH a s DPH)
- Celková suma DPH

### 6.2 Úprava košíka

**Zmena množstva:**
1. Použite tlačidlá **"+"** a **"-"** pri produkte
2. Alebo zadajte množstvo priamo do poľa
3. Množstvo sa automaticky aktualizuje

**Odstránenie produktu:**
1. Kliknite na ikonu **"X"** pri produkte
2. Produkt sa odstráni z košíka

**Poznámka:** Košík sa automaticky ukladá do lokálneho úložiska prehliadača.

### 6.3 Pokračovanie na pokladňu

**Postup:**
1. Skontrolujte obsah košíka
2. Kliknite na tlačidlo **"Pokračovať na pokladňu"**
3. Budete presmerovaní na stránku pokladne

---

## 7. Pokladňa a objednávka

### 7.1 Stránka pokladne (`/checkout`)

**Povinné informácie:**
- **Dátum doručenia/vyzdvihnutia** (povinné)
- **Čas doručenia/vyzdvihnutia** (povinné)
- **Kontaktné údaje:**
  - Meno a priezvisko
  - Email
  - Telefón
  - Adresa (ak je potrebná)

**Voliteľné informácie:**
- Špeciálne poznámky k objednávke
- Poznámky k jednotlivým produktom
- Kód kupónu (ak je dostupný)

### 7.2 Výber spôsobu platby

**Dostupné spôsoby platby:**
1. **QR kód prevod** (odporúčané)
   - Zobrazí sa QR kód pre platbu
   - Možnosť platby cez bankovú aplikáciu
2. **Bankový prevod**
   - Získate bankové údaje pre prevod

### 7.3 Výber sumy platby

**Možnosti:**
- **Plná platba** - zaplatíte celú sumu objednávky
- **Záloha** - zaplatíte len zálohu (pre torty na mieru a veľké objednávky)

**Poznámka:** 
- Pre torty na mieru sa zvyčajne požaduje záloha
- Záloha sa vypočíta automaticky podľa typu produktov v košíku

### 7.4 Odoslanie objednávky

**Postup:**
1. Skontrolujte všetky zadané údaje
2. Skontrolujte celkovú sumu
3. Kliknite na tlačidlo **"Odoslať objednávku"**
4. Po úspešnom odoslaní budete presmerovaní na stránku platby

**Validácia:**
- Systém skontroluje, či sú vyplnené všetky povinné polia
- V prípade chýb sa zobrazí upozornenie

---

## 8. Platba

### 8.1 Stránka platby (`/platba`)

**Informácie:**
- Číslo objednávky
- Suma na úhradu
- QR kód pre platbu (ak je vybraná QR platba)
- Bankové údaje (ak je vybraný bankový prevod)
- Termín platby

### 8.2 Platba cez QR kód

**Postup:**
1. Otvorte bankovú aplikáciu vo vašom telefóne
2. Naskenujte QR kód zobrazovaný na stránke
3. Skontrolujte sumu a údaje
4. Potvrďte platbu v bankovej aplikácii
5. Po úspešnej platbe sa automaticky aktualizuje stav objednávky

### 8.3 Platba bankovým prevodom

**Postup:**
1. Skopírujte bankové údaje zobrazované na stránke
2. Vykonajte prevod z vašej banky
3. Do poznámky prevodu uveďte číslo objednávky
4. Po prijatí platby sa stav objednávky aktualizuje

### 8.4 Platba existujúcej objednávky

**Postup:**
1. Prejdite do sekcie **"Môj účet"** → **"Objednávky"**
2. Vyberte objednávku, ktorá čaká na platbu
3. Kliknite na **"Zaplatiť"**
4. Postupujte podľa inštrukcií na stránke platby

---

## 9. Môj účet

### 9.1 Prístup k účtu

**Postup:**
1. Prihláste sa do systému
2. Kliknite na vaše meno v hlavičke
3. Vyberte **"Môj účet"** alebo prejdite na `/moj-ucet`

### 9.2 Sekcie účtu

#### 9.2.1 Môj profil
- Zobrazenie a úprava osobných údajov
- Email
- Meno a priezvisko
- Telefón
- Adresa

**Úprava profilu:**
1. Prejdite do sekcie **"Môj profil"**
2. Kliknite na tlačidlo **"Upraviť"**
3. Zmeňte požadované údaje
4. Kliknite na **"Uložiť"**

#### 9.2.2 Objednávky
- Zoznam všetkých vašich objednávok
- Stav objednávok
- Detaily objednávok
- Možnosť platby nezaplatených objednávok

**Informácie o objednávke:**
- Číslo objednávky
- Dátum objednávky
- Stav (Čaká na platbu, Zaplatená, Spracováva sa, Pripravená, Dokončená)
- Zoznam produktov
- Celková suma
- Dátum doručenia

**Akcie:**
- Zobrazenie detailov objednávky
- Platba nezaplatených objednávok
- Stiahnutie faktúry (ak je dostupná)

#### 9.2.3 Faktúry
- Zoznam všetkých faktúr
- Stiahnutie faktúr v PDF formáte
- Zobrazenie stavu platby faktúr

**Informácie o faktúre:**
- Číslo faktúry
- Dátum vystavenia
- Suma
- Stav platby
- Dátum splatnosti

---

## 10. Ďalšie funkcie

### 10.1 Fotogaléria (`/fotogaleria`)

**Funkcie:**
- Prehliadanie fotografií produktov
- Fotografie z cukrárne
- Galéria tort a zákuskov

**Použitie:**
1. Prejdite na **"Fotogaléria"** z hlavného menu
2. Prehliadajte fotografie
3. Kliknite na fotografiu pre zobrazenie vo väčšom formáte

### 10.2 O nás (`/o-nas`)

**Informácie:**
- História cukrárne
- Otváracie hodiny
- Kontaktné údaje
- Adresa a mapa

**Otváracie hodiny:**
- Pondelok: Zatvorené
- Utorok - Štvrtok: 14:00 - 20:00
- Piatok - Nedeľa: 14:00 - 20:30

### 10.3 Kontakt (`/kontakt`)

**Kontaktné údaje:**
- **Adresa:** Dvorníky 364, Dvorníky, Slovakia
- **Telefón:** +421 917 795 731
- **Email:** marcelabakery@gmail.com

**Kontaktný formulár:**
1. Vyplňte formulár s vašou správou
2. Kliknite na **"Odoslať"**
3. Odpoveď dostanete na váš email

---

## 11. Riešenie problémov

### 11.1 Problémy s prihlásením

**Problém:** Nemôžem sa prihlásiť
**Riešenie:**
1. Skontrolujte, či máte správny email a heslo
2. Skúste obnoviť heslo cez "Zabudli ste heslo?"
3. Kontaktujte podporu na marcelabakery@gmail.com

### 11.2 Problémy s košíkom

**Problém:** Produkty zmizli z košíka
**Riešenie:**
- Košík sa ukladá lokálne v prehliadači
- Ak vymazete cookies alebo použijete iný prehliadač, košík sa stratí
- Odporúčame dokončiť objednávku v jednom sedení

**Problém:** Nemôžem pridať produkt do košíka
**Riešenie:**
1. Skontrolujte, či je produkt dostupný
2. Skontrolujte minimálne objednávkové množstvo
3. Obnovte stránku (F5)
4. Kontaktujte podporu

### 11.3 Problémy s platbou

**Problém:** QR kód nefunguje
**Riešenie:**
1. Skontrolujte, či máte aktívnu bankovú aplikáciu
2. Skontrolujte, či máte povolený prístup k fotoaparátu
3. Skúste znovu načítať stránku
4. Použite bankový prevod namiesto QR kódu

**Problém:** Neviem, či bola platba prijatá
**Riešenie:**
1. Skontrolujte stav objednávky v sekcii "Môj účet" → "Objednávky"
2. Kontaktujte podporu s číslom objednávky

### 11.4 Problémy s objednávkou

**Problém:** Objednávka sa neodoslala
**Riešenie:**
1. Skontrolujte, či sú vyplnené všetky povinné polia
2. Skontrolujte internetové pripojenie
3. Skúste znovu odoslať objednávku
4. Kontaktujte podporu

**Problém:** Chcem zmeniť alebo zrušiť objednávku
**Riešenie:**
- Kontaktujte podporu čo najskôr
- Uveďte číslo objednávky
- Zmeny sú možné len pred začatím prípravy objednávky

---

## 12. Bezpečnosť a súkromie

### 12.1 Ochrana osobných údajov

- Všetky osobné údaje sú chránené podľa GDPR
- Údaje sa používajú len na účely spracovania objednávok
- Viac informácií: `/ochrana-osobnych-udajov`

### 12.2 Bezpečnosť platby

- Všetky platby prechádzajú cez zabezpečené spojenie (HTTPS)
- Bankové údaje nie sú ukladané v systéme
- QR kódy obsahujú len potrebné informácie pre platbu

### 12.3 Heslá

- Používajte silné heslo (min. 8 znakov, veľké a malé písmená, čísla)
- Nepoužívajte rovnaké heslo ako na iných stránkach
- Pravidelne menite heslo

---

## 13. Často kladené otázky (FAQ)

### Q: Môžem objednať bez registrácie?
**A:** Áno, môžete vytvoriť objednávku bez registrácie, ale odporúčame registráciu pre lepšie sledovanie objednávok.

### Q: Ako dlho trvá spracovanie objednávky?
**A:** Spracovanie objednávky závisí od typu produktov a dátumu doručenia. Kontaktujte nás pre presné informácie.

### Q: Môžem zmeniť dátum doručenia po odoslaní objednávky?
**A:** Kontaktujte podporu čo najskôr. Zmeny sú možné len ak objednávka ešte nie je v príprave.

### Q: Aké sú minimálne objednávkové množstvá?
**A:** Minimálne množstvo sa líši podľa produktu. Informácie nájdete na detailnej stránke produktu.

### Q: Môžem si objednávku vyzdvihnúť osobne?
**A:** Áno, pri objednávke môžete zvoliť "Osobné vyzdvihnutie" a zadáte dátum a čas vyzdvihnutia.

### Q: Ako funguje záloha?
**A:** Pre torty na mieru a veľké objednávky sa požaduje záloha. Zvyšok sumy sa platí pri vyzdvihnutí alebo doručení.

### Q: Dostanem potvrdenie objednávky?
**A:** Áno, po odoslaní objednávky dostanete email s potvrdením a číslom objednávky.

---

## 14. Kontakt a podpora

### 14.1 Kontaktné údaje

**Email:** marcelabakery@gmail.com  
**Telefón:** +421 917 795 731  
**Adresa:** Dvorníky 364, Dvorníky, Slovakia

### 14.2 Otváracie hodiny podpory

- **Utorok - Štvrtok:** 14:00 - 20:00
- **Piatok - Nedeľa:** 14:00 - 20:30
- **Pondelok:** Zatvorené

### 14.3 Čo uviesť pri kontakte

Pri kontakte s podporou uveďte:
- Vaše meno a email
- Číslo objednávky (ak sa týka objednávky)
- Popis problému
- Snímky obrazovky (ak je to možné)

---

## 15. Zmeny a aktualizácie

Tento dokument môže byť aktualizovaný. Aktuálna verzia je vždy dostupná na webovej stránke.

**Posledná aktualizácia:** 2025

---

## 16. Prílohy

### 16.1 Štruktúra objednávky

```
Objednávka
├── Kontaktné údaje
├── Dátum a čas doručenia
├── Produkty
│   ├── Názov produktu
│   ├── Množstvo
│   ├── Cena
│   └── Poznámky
├── Súhrn cien
│   ├── Celková suma bez DPH
│   ├── DPH
│   └── Celková suma s DPH
└── Spôsob platby
```

### 16.2 Stavy objednávky

- **Čaká na platbu** - Objednávka bola vytvorená, čaká sa na platbu
- **Zaplatená** - Platba bola prijatá
- **Spracováva sa** - Objednávka sa pripravuje
- **Pripravená** - Objednávka je pripravená na vyzdvihnutie/doručenie
- **Dokončená** - Objednávka bola dokončená

### 16.3 Mapovanie URL adries

- `/` - Domovská stránka
- `/obchod` - Obchod s produktmi
- `/produkt/:id` - Detail produktu
- `/torta-na-mieru` - Objednávka torty na mieru
- `/checkout` - Pokladňa
- `/platba` - Stránka platby
- `/prihlasenie` - Prihlásenie
- `/registracia` - Registrácia
- `/moj-ucet` - Môj účet
- `/o-nas` - O nás
- `/kontakt` - Kontakt
- `/fotogaleria` - Fotogaléria
- `/obchodne-podmienky` - Obchodné podmienky
- `/ochrana-osobnych-udajov` - Ochrana osobných údajov

---

**Koniec dokumentu**

