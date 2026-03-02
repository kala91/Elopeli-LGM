# CONTRIBUTING / Työskentelyohje

Tämä ei ole avoin "community contributions welcome" -projekti perinteisessä mielessä.

Elopeli-LGM on tällä hetkellä yhden tekijän (Niilo Helanderin säätiön apurahalla tehtävä) tutkimusprojekti, ja tämä dokumentti on ensisijaisesti kirjoitettu **kielimalliagenteille** (kuten Codex/ChatGPT-tyyppiset agentit), jotka auttavat ylläpidossa ja kokeiluissa.

## 1) Tavoite tässä vaiheessa

Tee pieniä, perusteltuja ja helposti peruttavia muutoksia, jotka tukevat tutkimuskysymyksiä:

- miten paljon rakennetta vs. vapautta LLM tarvitsee
- missä muodossa maailma kannattaa kuvata (JSON vs. vapaa teksti)
- miten dramaturginen analyysi kannattaa ajoittaa
- miten pelaajalle annettu informaation määrä vaikuttaa pelattavuuteen

## 2) Käytännön periaatteet agenteille

1. **Älä tee massiivista refaktorointia ilman erillistä pyyntöä.**
2. **Pidä muutokset paikallisina ja jäljitettävinä.**
3. **Säilytä kokeellisuus:** älä oleta, että nykyinen arkkitehtuuri on lopullinen.
4. **Dokumentoi miksi muutos tehtiin**, ei vain mitä muutettiin.
5. **Vältä turhaa monimutkaisuutta** (erityisesti ennen kuin tutkimussuunta on lukittu).

## 3) Kehitysympäristö

### Esivaatimukset

- Node.js >= 18
- npm >= 8

### Asennus ja ajo

```bash
npm install
npm run dev
```

Tai tuotantoajo:

```bash
npm start
```

## 4) Arkkitehtuurin nykyinen runko

- `server.ts`: Express + Socket.IO -palvelin
- `llm/`: kielimalliagentit (promptit, tutor, dramaturgi, muisti, hahmoluonti)
- `utils/`: validointi ja datan luku/kirjoitus
- `data/game_library/`: skenaariopohjat
- `public/`: pelaaja- ja GM-käyttöliittymät

## 5) Muutostyypit, joita saa tehdä turvallisesti

- dokumentaation päivitykset
- pienten bugien korjaukset
- validointi- ja virheenkäsittelyparannukset
- yksittäisten agenttipromptien selkeytys
- datarakenteiden pienet, taaksepäin yhteensopivat tarkennukset

## 6) Testaus ennen commitia

Aja vähintään:

```bash
npm run build
```

Tarvittaessa lisäksi:

```bash
npm run dev
```

ja tee nopea manuaalitarkistus:

- `http://localhost:3000/playerclient.html`
- `http://localhost:3000/gamemaster.html`

## 7) Commit-käytäntö

- Yksi looginen muutoskokonaisuus per commit.
- Viesti selkeästi: mitä ja miksi.
- Jos muutat dokumentaatiota, varmista että termit vastaavat projektin nykyistä tutkimusvaihetta.

## 8) Pull Request -muoto (agentin tuottama)

PR-kuvauksessa kerro lyhyesti:

1. mikä tutkimus- tai käytännön ongelma korjattiin
2. mitä tiedostoja muutettiin
3. miten muutos testattiin
4. mitä jäi avoimeksi seuraaville kokeiluille

## 9) Mitä EI pidä olettaa

- että projekti hakee aktiivisesti ulkopuolisia kontribuutioita
- että nykyinen toteutus on "valmis tuote"
- että yhden kokeilun ratkaisu yleistyy suoraan seuraavaan iteraatioon

Projektin luonne on iteratiivinen tutkimus: arkkitehtuuria, tiedon rakennetta ja prompttien semanttista rajapintaa muutetaan tarkoituksella oppimisen vuoksi.
