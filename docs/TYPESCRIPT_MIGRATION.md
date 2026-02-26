# TypeScript-migraatio (toteutettu)

## Miksi tämä tehtiin?
Tutkimusvaiheen suurin riski oli datavirran epäluotettavuus: samaa tietoa käsiteltiin useassa paikassa eri oletuksilla. TypeScript-migraation tavoite oli tehdä arkkitehtuurista hallittavampi ilman, että pelin chat-pohjainen käyttöfilosofia tai agenttipohjainen workflow muuttuu.

## Mitä migraatio kattaa nyt
- `server.ts` (Socket.IO + Express tapahtumavirta)
- `config/constants.ts` (keskitetyt vakiot)
- `utils/dataManager.ts` (kaikki tiedostopohjaiset datatoiminnot)
- `utils/validators.ts` (syötevalidointi)
- `llm/*.ts` (agenttimoduulit: tutorial, character creator, prompt, memory extractor, dramaturg)

## Arkkitehtuurin vaikutus
- **Agentti** pysyy kevyenä kielimallikutsuna (ei erillistä tool-use vaadetta).
- **Agentin rooli + konteksti + tehtävä + skilli** pysyvät ohjelman kokoamana kontekstina.
- **Dataflow** on nyt selkeämmin erotettu:
  - socket-eventit -> server orchestrator
  - tiedon luku/kirjoitus -> dataManager
  - semanttiset valinnat -> agenttimoduulit

## Komennot
```bash
npm run build
npm start
npm run dev
```

## Huomio
Migraatio käyttää tällä hetkellä `tsc --noCheck`-rakennusta, jotta tutkimusvaiheen iterointi pysyy nopeana myös rajoitetussa ympäristössä. Seuraava askel on kiristää tyyppitarkastusta vaiheittain (ensin `utils` + `config`, sitten `llm`, lopuksi `server`).
