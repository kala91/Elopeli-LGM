# Digitaalinen Elopelimoottori

> AI-ohjattu LARP-pelimoottori - Luo improvisaatioteatteria teknologian avulla

Digitaalinen peli-alusta joka orkestroi osallistujille dramaturgisesti koherenttia improvisaatio-peliä ja vuorovaikutusta.

## 🎯 Konsepti

Tämä moottori yhdistää:
- **Elopelin** (live-roolipeli) fyysisen läsnäolon
- **Improvisaatioteatterin** spontaanin vuorovaikutuksen
- **AI-ohjaajan** joka tukee ja rikastaa pelikokemusta

Pelaajat eivät tarvitse esitietoja larppivasta tai teatterista - kaikki on "pelinä" jossa on selkeät tehtävät.

## 🚀 Pika-aloitus

### 1. Asenna riippuvuudet

```bash
npm install
```

### 2. Määritä kielimallipalvelu

Luo `.env`-tiedosto:

```bash
# Ollama (paikallinen)
API_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma2

# TAI OpenRouter (pilvi)
API_PROVIDER=openrouter
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=google/gemma-3-27b-it:free
```

### 3. Käynnistä palvelin

```bash
npm start
```

Palvelin käynnistyy portissa 3000:

- **Pelaajat**: http://localhost:3000/
- **Game Master**: http://localhost:3000/gamemaster.html
- **Debug**: http://localhost:3000/debug.html

## 📚 Dokumentaatio

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Arkkitehtuuri, tietovirta, suunnittelu
- **[llm/README.md](llm/README.md)** - LLM-moduulien API-referenssi
- **[data/systemprompt.md](data/systemprompt.md)** - Kielimallin ohjeet

## 🎮 Käyttö

### Pelaajana

1. Avaa pelaajien linkki puhelimella/tabletilla
2. Syötä nimesi - hahmo generoidaan automaattisesti
3. Lue hahmokuvauksesi
4. Paina "Ja sitten" kun olet valmis toimimaan
5. Saat toimintapromtin - toimi sen mukaan fyysisessä tilassa
6. (Valinnainen) Raportoi mitä tapahtui
7. Toista - peli jatkuu niin kauan kuin haluat

### Game Masterina

1. Avaa GM-näkymä
2. Valitse pelitemplaatti tai luo oma
3. Käynnistä peli
4. Seuraa pelaajia ja heidän promptejaan
5. Aktivoi DramaturgBuilder analysoimaan pelin kulkua
6. Säädä draaman kaarta tarvittaessa

### Kehittäjänä

1. Avaa debug-näkymä
2. Näet kaikki LLM:lle lähetetyt promptit
3. Analysoi miten kielimalli vastaa
4. Kehitä pelitemplaatteja ja ohjeita

## �� Pelitemplaatit

Pelit määritellään yksinkertaisina Markdown-tiedostoissa:

```markdown
# Avaruusasema Kepler-7

## Setting
Vuosi 2247. Avaruusasema Kepler-7 kiertää aurinkokuntaa...

## Character Prompt Template
Luo avaruusaseman miehistön jäsen...

## Scene Prompt Template
Anna pelaajalle toimintaohje...
```

Katso esimerkit [data/game_library/](data/game_library/):
- **murhapeli.md** - Klassinen mysteeri
- **hemulin_alushousut.md** - Kevyt komedia
- **scifi_avaruusasema.md** - Sci-fi trilleri

## 🏗️ Ydinperiaate

**Log-keskinen arkkitehtuuri:**
- `logs.json` = Single source of truth (mitä on tapahtunut)
- `world.json` = Dynaaminen tila (mitä on olemassa nyt)
- Clientit = Näkymät dataan
- LLM-moduulit = Työkaluja datan generointiin

**Modulaariset LLM-roolit:**
- **PromptBuilder** - Luo pelaajien toimintaohjeet
- **WorldBuilder** - Tunnistaa uudet paikat, NPCt, esineet
- **DramaturgBuilder** - Analysoi draaman kulun
- **CharacterBuilder** - Päivittää hahmojen tietoja (tulossa)
- **EngineRunner** - Päättää milloin aktivoidaan mikäkin

Lue lisää: [ARCHITECTURE.md](ARCHITECTURE.md)

## 📁 Rakenne

```
.
├── ARCHITECTURE.md             # Arkkitehtuuri-dokumentaatio
├── server.js                   # Pelimoottori (Socket.io + Express)
├── package.json
├── .env                        # Kielimalli-konfiguraatio
│
├── data/                       # Data-tiedostot
│   ├── logs.json               # Pelin historia (single source of truth)
│   ├── world.json              # Dynaaminen maailma
│   ├── systemprompt.md         # LLM:n perusohjeistus
│   └── game_library/           # Pelitemplaatit (Markdown)
│
├── llm/                        # Modulaariset LLM-työkalut
│   ├── promptBuilder.js        # Luo toimintapromptit
│   ├── worldBuilder.js         # Tunnista uudet elementit
│   ├── dramaturgBuilder.js     # Analysoi draama
│   ├── engineRunner.js         # Päätä aktivoinnit
│   └── README.md               # API-referenssi
│
└── public/                     # Käyttöliittymät
    ├── index.html              # Pelaajan näkymä
    ├── gamemaster.html         # GameMasterClient
    └── debug.html              # Kehittäjän näkymä
```

## 🔧 Konfiguraatio

### API Provider

Moottori tukee useita kielimallipalveluita:

```bash
# Ollama (paikallinen)
API_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma2

# OpenRouter (pilvi)
API_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=google/gemma-3-27b-it:free
WORLD_ANALYZER_MODEL=google/gemma-3-27b-it:free

# FunctionGemma (päätöksenteko)
ENABLE_FUNCTIONGEMMA=true
FUNCTION_MODEL=functiongemma:latest
```

### Mallin valinta

- **Laatukriittinen** - PromptBuilder, DramaturgBuilder (luova ajattelu)
- **Kevyt** - WorldBuilder, CharacterBuilder (rakenteinen tunnistus)

## 🎨 Käyttötapaukset

- **Koulut** - Historian elävöitys, sosiaalisten taitojen harjoittelu
- **Museot ja kirjastot** - Paikkasidonnaiset elämykset
- **Nuorisotyö** - Matalan kynnyksen roolipelit
- **Työhyvinvointi** - Ryhmäytyminen, vuorovaikutus
- **Tapahtumat** - Jatkuvat elämysasemat

## 🚧 Kehitystilanne

**Prioriteetti 1 (Ydin toimii):**
- ✅ Log-keskinen arkkitehtuuri
- ✅ Modulaariset LLM-roolit
- ✅ World Builder + context awareness
- ✅ FunctionGemma decision making
- ✅ Kielimalli yhtymäkohta
- ⏳ Character Builder (tulossa)

**Prioriteetti 2 (Optimointi):**
- Relationship-based log filtering
- Spatial filtering (saman paikan hahmot)
- Temporal filtering (vain viimeinen 30 min)
- Prompt caching

**Prioriteetti 3 (Laajennukset):**
- Loppu purku -pelitila (reflektointi)
- Multi-kielituki (UI + LLM)
- AR/QR-koodit fyysisiin paikkoihin
- Analytiikka-dashboard GM:lle

## 📖 Lisenssi

(Määrittelemättä - lisää tähän projektisi lisenssi)

## 👥 Yhteystiedot

Projekti: Digitaalinen Elopelimoottori  
Tekijä: Aleksi Höylä  
Versio: 2.0 (Log-keskinen, Modulaarinen)

---

**Lue lisää:**
- [ARCHITECTURE.md](ARCHITECTURE.md) - Syvällinen arkkitehtuuri-dokumentaatio
- [llm/README.md](llm/README.md) - LLM-moduulien API-referenssi
- [data/game_library/](data/game_library/) - Pelitemplaat esimerkit
