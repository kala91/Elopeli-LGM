# Digitaalinen LARP-moottori

> AI-ohjattu improvisaatioroolipeli-alusta

Digitaalinen alusta joka orkestroi osallistujille dramaturgisesti koherenttia improvisaatio-LARPpia.

## 🎯 Konsepti

Tämä moottori yhdistää:
- **LARP:in** (Live Action Role Playing) fyysisen läsnäolon
- **Improvisaatioteatterin** spontaanin vuorovaikutuksen  
- **AI-ohjaajan** joka tukee ja rikastaa pelikokemusta

Pelaajat eivät tarvitse esitietoja larppivasta - kaikki on "pelinä" jossa on selkeät tehtävät.

## 🚀 Pika-aloitus

### 1. Asenna riippuvuudet

```bash
npm install
```

### 2. Määritä kielimallipalvelu

Luo `.env`-tiedosto:

```bash
# OpenRouter (pilvi, suositeltu)
API_PROVIDER=openrouter
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=google/gemma-3-27b-it:free

# TAI Ollama (paikallinen)
API_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma2
```

### 3. Käynnistä palvelin

```bash
npm start
```

Palvelin käynnistyy portissa 3000:

- **Etusivu**: http://localhost:3000/
- **Pelaajat**: http://localhost:3000/playerclient.html
- **Game Master**: http://localhost:3000/gamemaster.html
- **Debug**: http://localhost:3000/debug.html

## 🎮 Käyttö

### Pelaajana

1. Avaa pelaajan linkki
2. Syötä nimesi ja valitse kieli
3. Keskustele tutorial agentin kanssa - kerro millaisen hahmon haluat
4. Agentin luoma hahmo ilmestyy peliin
5. Saat toimintaohjeita - toimi niiden mukaan fyysisessä tilassa
6. Voit raportoida mitä tapahtui tai pyytää uuden ohjeen
7. Peli jatkuu - muistisi ja suhteet päivittyvät automaattisesti

### Game Masterina

1. Avaa GM-näkymä
2. Valitse pelitemplaatti (data/game_library/)
3. Käynnistä peli
4. Seuraa pelaajia ja heidän promptejaan
5. Analysoi draaman kulkua

## 📚 Dokumentaatio

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Arkkitehtuuri ja tietovirta
- **[docs/taxonomy.md](docs/taxonomy.md)** - Dramaturgiset työvälineet (analyyttinen muistikirja)

## 🔧 Pelitemplaatit

Pelit määritellään Markdown-tiedostoissa:

Katso esimerkit [data/game_library/](data/game_library/):
- **murhapeli.md** - Klassinen mysteeri


## 🏗️ Ydinperiaate

**Kognitiivinen muisti-arkkitehtuuri:**
- Hahmot muistavat dramaturgisesti merkittävät hetket, eivät jokaista sanaa
- `story_recent.json` - Circular buffer (max 20), lähihistoria
- `characters/{charId}.json` - Hahmon muisti: key_moments + relationships
- `game_config.json` - Pelin semanttiset raamit

**Oneshot LLM-agentit:**
- **Tutorial Agent** - Opastaa uusia pelaajia, luo hahmot toiveiden mukaan
- **Character Creator** - Generoi hahmot JSON-rakenteena
- **Prompt Agent** - Luo pelaajien toimintaohjeet
- **Memory Extractor** - Tunnistaa dramaturgisesti merkittävät hetket
- **Dramaturg Agent** - Analysoi draaman kulun

Lue lisää: [ARCHITECTURE.md](ARCHITECTURE.md)

## 📁 Rakenne

```
.
├── server.js                   # Pelimoottori (Socket.io + Express)
├── package.json
├── .env                        # Kielimalli-konfiguraatio
│
├── data/
│   ├── story_recent.json       # Circular buffer (max 20 entries)
│   ├── game_config.json        # Pelin semanttiset raamit
│   ├── systemprompt.md         # Dramaturgi-prompti
│   ├── taxonomy.md             # Dramaturgiset työkalut
│   ├── characters/             # Hahmojen muisti (JSON)
│   └── game_library/           # Pelitemplaatit (Markdown)
│
├── llm/                        # Oneshot LLM-agentit
│   ├── tutorialAgent.js        # Opastus + hahmonluonti
│   ├── characterCreator.js     # Hahmon generointi
│   ├── promptAgent.js          # Toimintaohjeet
│   ├── memoryExtractor.js      # Muistin päivitys
│   └── dramaturgAgent.js       # Draaman analyysi
│
└── public/                     # Käyttöliittymät
    ├── index.html              # Etusivu
    ├── playerclient.html       # Pelaajan näkymä
    ├── gamemaster.html         # GM-näkymä
    └── debug.html              # Debug-näkymä
```

## 🎨 Käyttötapaukset

- **Koulut** - Historian elävöitys, sosiaalisten taitojen harjoittelu
- **Museot** - Paikkasidonnaiset elämykset
- **Nuorisotyö** - Matalan kynnyksen roolipelit
- **Työhyvinvointi** - Ryhmäytyminen, vuorovaikutus
- **Tapahtumat** - Jatkuvat elämysasemat

## 📝 Lisenssi

MIT License
