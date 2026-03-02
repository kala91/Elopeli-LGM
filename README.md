# Digitaalinen LARP-moottori

> AI-ohjattu improvisaatioroolipeli-alusta

Digitaalinen alusta, joka orkestroi osallistujille dramaturgisesti koherenttia improvisaatio-LARPpia.

## 🚀 Pika-aloitus

### 1) Asenna riippuvuudet

```bash
npm install
```

### 2) Määritä kielimallipalvelu

Luo `.env`-tiedosto:

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

## 📦 package-tiedostot (pidetään Gitissä)

Kyllä: `package.json` ja `package-lock.json` kuuluvat repositorioon.

- `package.json` määrittää sovelluksen riippuvuudet ja skriptit.
- `package-lock.json` lukitsee tarkat versiot, jotta asennukset ovat toistettavia kaikilla kehittäjillä ja CI:ssä.

Älä lisää näitä `.gitignore`:en. Sen sijaan `node_modules/` pidetään ignoroituna.

## 📚 Dokumentaatio

- [ARCHITECTURE.md](ARCHITECTURE.md) – arkkitehtuuri ja tietovirta
- [docs/QUICKSTART.md](docs/QUICKSTART.md) – käyttöohje pelaajalle ja GM:lle
- [docs/API_REFERENCE.md](docs/API_REFERENCE.md) – Socket.IO + HTTP API
- [docs/taxonomy.md](docs/taxonomy.md) – dramaturgiset työvälineet
- [docs/TYPESCRIPT_MIGRATION.md](docs/TYPESCRIPT_MIGRATION.md) – TypeScript-siirtymän tausta
- [CONTRIBUTING.md](CONTRIBUTING.md) – kontribuointiohjeet

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
