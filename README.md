# Elopeli-LGM

> Tutkiva digitaalisen improvisaatioteatterin/LARPin alusta.

Elopeli-LGM on **Niilo Helanderin säätiön apurahalla toteutettu tutkimusprojekti**, jossa testataan voiko kielimallien avulla rakentaa reaaliaikaisesti käsikirjoitusta tuottavan alustan: tekoäly "käsikirjoittaa" elettävää peliä (railroadattu larp / improvisaatioteatterimetodi).

## Projektin nykytila

Tämä repo on aktiivisessa tutkimusvaiheessa. Tavoite ei ole lukita yhtä oikeaa toteutusta, vaan kokeilla vaihtoehtoisia arkkitehtuureita, kuten:

- onko sisältö etukäteen käsikirjoitettua vai syntyykö se reaaliaikaisesti
- kuvataanko maailma valmiina tarinoina, lokaatioina, hahmoina vai esineinä
- säilytetäänkö tieto JSON-rakenteena vai vapaana tekstinä, jota jäsennetään semanttisesti kielimallilla
- tehdäänkö dramaturgista hahmodynamiikan analyysiä jokaisen promptin yhteydessä
- kuinka paljon kontekstia/peliohjetta pelaajalle kannattaa antaa (liian vähän vs. liikaa)

Yksi projektin kiinnostava metataso: kielimalliagenttia promptataan koodaamaan alustaa, johon rakennetaan kielimalliagentteja kirjoittamaan toimintaohjeita ihmisagenteille. Kaikilla tasoilla pätee sama semanttisen koodaamisen kysymys: **mikä on riittävä määrä kontekstia**.

## 🚀 Pika-aloitus

### 1) Asenna riippuvuudet

```bash
npm install
```

### 2) Määritä kielimallipalvelu

Luo `.env`-tiedosto (tai kopioi `.env.example`) ja lisää oma API-avain:

```bash
# OpenRouter (pilvi)
API_PROVIDER=openrouter
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=google/gemma-3-27b-it:free

# TAI Ollama (paikallinen)
API_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma2
```

> ⚠️ Turvallisuus: älä koskaan commitoi `.env`-tiedostoa tai oikeita API-avaimia. Jos avain on päätynyt julkiseen repoon, peruuta (revoke) se välittömästi palveluntarjoajalta ja luo uusi avain.


### MockFile testisimulaattori (MVP-flow testaukseen)

Voit valita Game Master UI:ssa provideriksi **MockFile (testisimulaattori)**.

- Engine kirjoittaa viimeisimmän promptin tiedostoon: `data/mock_llm_last_prompt.txt`
- Engine lukee vastauksen tiedostosta: `data/mock_llm_responses.json`
- Prompt type -kohtaisia vastauksia voi antaa myös listana (array), jolloin vastaukset kuluvat järjestyksessä per prompt type.
- Human-in-the-loop UI: `http://localhost:3000/mockllm.html`

Esimerkkiformaatti:

```json
{
  "default": "{\"message\":\"fallback\",\"continueToCharacterCreation\":false,\"playerWishes\":\"\"}",
  "byPromptType": {
    "tutorial": "{\"message\":\"Luodaan hahmo.\",\"continueToCharacterCreation\":true,\"playerWishes\":\"Rooli: mekaanikko\"}",
    "character_generation": "{\"description\":\"...\",\"personality\":[],\"goals\":[],\"relationships\":[]}"
  }
}
```

Tämä mahdollistaa semanttisen datavirran testauksen ilman ulkoista LLM-palvelua.

### 3) Käynnistä palvelin

```bash
npm run dev
# tai tuotantoajo
npm start
```

Palvelin käynnistyy portissa 3000:

- Etusivu: http://localhost:3000/
- Pelaajat: http://localhost:3000/playerclient.html
- Game Master: http://localhost:3000/gamemaster.html
- Debug: http://localhost:3000/debug.html

## 📚 Dokumentaatio

- [ARCHITECTURE.md](ARCHITECTURE.md) – arkkitehtuuri ja tietovirta
- [docs/QUICKSTART.md](docs/QUICKSTART.md) – käyttöohje pelaajalle ja GM:lle
- [docs/API_REFERENCE.md](docs/API_REFERENCE.md) – Socket.IO + HTTP API
- [docs/taxonomy.md](docs/taxonomy.md) – dramaturgiset työvälineet
- [docs/TYPESCRIPT_MIGRATION.md](docs/TYPESCRIPT_MIGRATION.md) – TypeScript-siirtymän tausta
- [CONTRIBUTING.md](CONTRIBUTING.md) – työskentelyohjeet (ensisijaisesti AI-agenteille)

## 📁 Projektirakenne

```text
.
├── server.ts
├── config/
├── llm/
├── utils/
├── public/
├── data/
└── docs/
```

## 📝 Lisenssi

MIT
