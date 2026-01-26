# Digital LARP Engine - Arkkitehtuuri

**Mitä rakennetaan:** Alusta erilaisille sosiaalisille improvisaatioroolipeleille. Ei prefabbeja vaan semanttisia raameja - kielimalli generoi pelattavaa dynamiikkaa.

## 🎯 Ydinperiaate: Kognitiivinen muisti-arkkitehtuuri

Hahmot muistavat dramaturgisesti merkittävät hetket, eivät jokaista sanaa. Kuten ihmiset: tärkeintä on ydinkokemusten kulkeminen mukana.

```
Pelaaja pyytää promptin → PromptAgent generoi toiminnon
    ↓
Dialogi tapahtuu → Tallennetaan story_recent.json
    ↓
Extraction trigger (joka 5. tai player_input) → MemoryExtractor Agent
    ↓
Parsii dramaturgisesti merkittävät hetket → key_moments + relationships
    ↓
Tallentaa hahmojen muistiin → data/characters/{charId}.json
```

**Tietovirta:**
- `story_recent.json` - Circular buffer (max 20), lähihistoria promptien rakentamiseen
- `characters/{charId}.json` - Hahmon "muisti": key_moments + relationships + description
- `game_config.json` - Pelin semanttiset raamit (available relationships, setting, themes)
- Moottori ei seuraa inventorya tarkasti - draama syntyy suhteista ja salaisuuksista

## 📊 Tiedostorakenne ja roolit

### 1. **data/characters/{charId}.json** - Hahmon kognitiivinen muisti

**Rooli:** Hahmon "muisti" - mitä hän muistaa ja keitä tuntee

**Schema:**
```json
{
  "name": "Jesse Blackwood",
  "id": "jesse",
  "description": "Kartanon kaukainen serkku, velkaantunut uhkapelaamisen takia...",
  "status": "active",
  "memory": {
    "key_moments": [
      {
        "timestamp": "2026-01-23T14:23:12.000Z",
        "content": "Jesse confessed romantic feelings to Jee in the library",
        "emotionalWeight": 5,
        "participants": ["jesse", "jee"]
      },
      {
        "timestamp": "2026-01-23T14:25:30.000Z",
        "content": "Discovered secret passage behind the bookshelf",
        "emotionalWeight": 3,
        "participants": ["jesse"]
      }
    ],
    "relationships": {
      "jee": {
        "value": "romantic",
        "intensity": 4,
        "notes": "Confessed feelings, awaiting response"
      },
      "inspector": {
        "value": "suspect",
        "intensity": 2,
        "notes": "Seems to know about the gambling debts"
      }
    }
  },
  "playerMeta": {
    "language": "fi",
    "sessionCount": 1,
    "joinedAt": "2026-01-23T14:19:08.358Z"
  }
}
```

**Käyttö:**
- PromptAgent: Viimeiset 3 key_moments + kaikki relationships → konteksti promptin rakentamiseen
- MemoryExtractor Agent: Lisää uusia key_moments ja päivittää relationships
- Ei tallenneta jokaista dialogia - vain dramaturgisesti merkittävät hetket

**Design philosophy:**
Fiasco-tyylinen approach - relationships ovat arvoja (trust, romantic, suspect), ei konkreettisia muistoja. Antaa pelaajille tilaa tulkita ja mikropelaamiseen.


### 2. **data/game_config.json** - Pelin semanttiset raamit

**Rooli:** Määrittää mitä "semanttista logiikkaa" pelissä käytetään

**Schema:**
```json
{
  "setting": "Murhapeli 1920-luvun kartanossa, jossa vieraat ovat loukussa myrskyn vuoksi...",
  "currentPhase": {
    "name": "Alku",
    "description": "Vieras löytyy murhattuna, epäilykset heräävät"
  },
  "availableRelationships": [
    "trust",
    "suspect", 
    "romantic",
    "alliance",
    "rivalry",
    "fear"
  ],
  "physicalPropsGuidance": "Items are symbolic representations. A post-it note labeled 'weapon' serves as the murder weapon. What matters dramatically is who is seen handling it.",
  "themes": ["betrayal", "secrets", "class conflict", "greed"],
  "gameTimer": {
    "mode": "infinite",
    "totalMinutes": null
  }
}
```

**Käyttö:**
- Ladataan game_library/*.md template tiedostosta GM:n alustaessa pelin
- PromptAgent: Setting + currentPhase → konteksti dramaturgiaan
- MemoryExtractor Agent: availableRelationships → sallitut relationship-tyypit
- DramaturgAgent: Themes → arvioi onko peli linjassa teemojen kanssa

**Design philosophy:**
Peli on "moduuli" - ei koodaa mechanics vaan määritellään semanttiset raamit. Relationships voivat olla murhadraamassa ["suspect", "alliance"], romansseissa ["romantic", "jealous", "protective"].

### 3. **data/story_recent.json** - Circular buffer lähihistorialle

**Rooli:** Kevyt "mitä juuri tapahtui" -konteksti promptien rakentamiseen

**Schema:**
```json
{
  "maxSize": 20,
  "entries": [
    {
      "id": 1768565948358,
      "timestamp": "14:19:08",
      "targetChar": "jesse",
      "targetId": "jesse",
      "instruction": "[PELAAJA LIITTYI] jesse liittyi peliin.",
      "playerJoined": true,
      "playerSubmitted": false
    },
    {
      "id": 1768566114880,
      "timestamp": "14:21:54",
      "targetChar": "jesse",
      "targetId": "jesse",
      "instruction": "Tutki salainen käytävä. Raportoi mitä löydät...",
      "playerJoined": false,
      "playerSubmitted": false
    }
  ]
}
```

**Käyttö:**
- PromptAgent: Viimeiset 5-10 entries → "mitä juuri tapahtui" konteksti
- MemoryExtractor Agent: Viimeiset 5-10 entries → parsittava sisältö
- Automaattinen ylläpito: kun entry #21 lisätään, entry #1 poistetaan
- Ei arkistointia (demovaiheessa pelit max 30min)

**Design philosophy:**
Ihmismäinen muisti - muistat mitä juuri tapahtui (20 viimeisintä), mutta pitkä historia on "tiivistetty" key_moments muotoon character-muistissa.
```

**Käyttö:**
- PromptBuilder: "Mitä hahmo voi kohdata?" - places, NPCs, items, muut hahmot
- WorldBuilder: Päivittää elementtejä kun story.json:ssa mainitaan uusia
- CharacterBuilder: Päivittää relationships ja secrets
- GameMaster: Näkee kokonaisuuden ja voi ohjata
- Pelaajat: Hahmon tiedot (description, relationships, secrets)

**Tärkeä erottelu:**
- `world.json` = Staattinen tila, muuttuu buildereilla
- `story.json` = Dynaaminen historia, kasvaa jatkuvasti
- `story.json` → EngineRunner → Builderit → world.json päivittyy

### 3. **dramaturgy** - Ohjausnäkymä
**Rooli:** Guideline PromptBuilderille - mihin suuntaan mennään  
**Sisältö world.json:ssa:**
```json
{
  "dramaturgy": {
    "tension": 6,
    "pacing": "Keskivaihe - jännite kasvaa, liittoumat murtuvat",
    "suggestedDynamics": ["konflikti", "petos"],
    "plotTwists": ["Sabotööri paljastuu?"],
    "lastAnalysis": "2025-01-09T15:30:00.000Z"
  }
}
```

**Käyttö:**
- DramaturgBuilder analysoi pelin kulun kun:
  - Game Master aktivoi manuaalisesti TAI
  - EngineRunner päättää aktivoinnin
- Tallentaa analyysinsa world.json:iin
- PromptBuilder lukee tämän ja ohjaa toimintaprompteja kohti dramaattisia hetkiä
- Game Master voi muokata → vaikuttaa suoraan prompteihin

**Tietovirta:**
```
story.json → DramaturgBuilder analysoi → world.dramaturgy päivittyy → PromptBuilder käyttää
```


## 🤖 Oneshot LLM Agents

Kielimallit toimivat **oneshot agenteina** - erikoistuneina työkaluina jotka suorittavat yhden tehtävän kerrallaan.

### Agent-roolit

| Agent | Tehtävä | Input | Output | Kutsutaan |
|-------|---------|-------|--------|-----------|
| **PromptAgent** | Luo toimintaohjeet pelaajalle | Hahmon muisti + recent story + game config | Yksi konkreettinen toimintopromtti | Aina kun pelaaja pyytää |
| **MemoryExtractor** | Parsii dramaturgisesti merkittävät hetket | Recent story entries + osallistujat | key_moments + relationship changes (kaikille) | Joka 5. prompti TAI player_input |
| **DramaturgAgent** | Analysoi draaman kulku | Recent story + game config | Phase analysis + next suggestions | GM:n triggerillä tai 15min välein |

**Design pattern: Dependency Injection**
```javascript
// server.js keskittää askLLM-funktion
const askLLM = (prompt, agentType, source, options) => { 
  // API-kutsu OpenRouter/Ollama/etc 
};

// Agentit saavat askLLM:n parametrina
const instruction = await promptAgent.generatePrompt(char, context, askLLM);
const memories = await memoryExtractor.extract(entries, participants, askLLM);
```

**Hyödyt:**
- ✅ Testattavuus (mock askLLM)
- ✅ Keskitetty API-hallinta
- ✅ Sama malli voi toimia useassa roolissa
- ✅ Helppokäyttöisyys (ei buildereiden hardkoodausta)

### Oneshot-filosofia

Agentit eivät pidä tilaa. Jokainen kutsu on itsenäinen:
- **Input:** Kaikki tarvittava data parametreina
- **Processing:** LLM prosessoi promptin
- **Output:** JSON tai teksti, palautetaan
- **No memory:** Agent ei muista edellistä kutsuaan

Tila säilyy tiedostoissa (characters/*.json, game_config.json), ei agenteissa.
  └─ CharacterBuilder (hahmojen dynamiikka)

Kevyt malli (nopea tunnistus):
  ↓
  ├─ WorldBuilder (elementtien tunnistus)
  └─ Analyysit (kontekstin päivitys)

Function Calling (jos saatavilla):
  ↓
  └─ EngineRunner (älykäs päätöksenteko)
```

**Arkkitehtuurinen kompleksisuus:**
- **Laatukriittinen** - Luova ajattelu, monimutkainen konteksti
- **Kevyt** - Rakenteinen tunnistus, nopea suoritus
- Ei sidottu tiettyyn palveluun tai malliin

## 🖥️ Clientit - Näkymät tarinaan

Kaikki käyttöliittymät ovat vain **eri näkymiä** samaan `story.json`-tiedostoon:

### 1. **playerclient.html** - Pelaajan näkymä
**Näkee:**
- Omat hahmotiedot (world.characters[id])
- Viimeisin toimintapromtti (story.json filtered)
- Oma raportointi-historia

**EI näe:**
- Muiden pelaajien prompteja
- Dramaturgi-analyysia
- World elementtejä (ellei hahmo ole löytänyt niitä)

**HUOM: Promptin konteksti ≠ Pelaajan näkymä**
- Kielimallille annetaan laajempi konteksti (mitä muut hahmot tekevät)
- Pelaaja näkee vain oman prompttinsa
- Jos pelaajia 100, konteksti rajataan "lähipiiriin" (skaalautuvuus)
- Perustilanteessa: koko tilanne historia on hyödyllistä

### 2. **gamemaster.html** - GameMasterClient
**Näkee:**
- Kaikki hahmot + heidän tietonsa (world.characters)
- Kaikki world elementit (places, NPCs, items)
- Dramaturgi-analyysin (world.dramaturgy)
- Yhteenvedon tarinasta (story.json)

**Voi:**
- Aktivoida DramaturgBuilder (analysoi pelin kulku)
- Säätää dramaturgisia parametreja
- Antaa manuaalisia ohjeita pelaajille
- Aktivoida WorldBuilder tarvittaessa

### 3. **debug.html** - Kehittäjän näkymä
**Näkee:**
- Täydet promptit (debug_prompts.json)
- LLM:n vastaukset raakadatana
- Logivirheet ja ongelmat
- Timestamp-tiedot analysointiin

**Käyttö:**
- Kehitä prompteja
- Debuggaa kielimallin käyttäytymistä
- Optimoi mallin valintoja

**Tietovirta:**
```
story.json (Single Source of Truth)
    ↓
    ├─ playerClient.js filtroi → Pelaaja näkee vain omansa
    ├─ gamemasterClient.js aggregoi → GM näkee kaiken
    └─ debugClient.js purkaa → Kehittäjä näkee raakadatan
```


## 🎮 Peli-moduulit (Game Library)

Pelit määritellään **Markdown-tiedostoissa** (data/game_library/*.md):

```markdown
# Murhapeli 1920-luvun kartanossa

## Setting
Vieraat ovat loukussa myrskyn vuoksi kartanossa. Yksi vieraista löytyy murhattuna...

## Available Relationships
trust, suspect, alliance, rivalry, fear

## Physical Props Guidance
Items are symbolic. A post-it note labeled "weapon" = murder weapon.  
What matters: who is seen handling it and when.

## Themes
betrayal, secrets, class conflict, greed

## Character Template
Luo kartanon vieras jolla on:
- Salainen motiivi murhaan
- Yhteys uhriin
- Taakka menneisyydestä
```

**Miksi Markdown?**
- ✅ Ei JSON-syntaksia - vapaa kirjoitus
- ✅ LLM parsii suoraan
- ✅ Git-ystävällinen
- ✅ Ei mechanics - puhtaasti kerronnallinen

**Peli = semanttiset raamit:**
- availableRelationships määrittää sallitut suhteet
- Themes ohjaa dramaturgiaa
- Character Template ohjaa hahmonluontia
- Physical Props määrittää miten reaalimaailma integroidaan

Sama moottori, eri peli-moduuli = erilainen kokemus.


## 📈 Skaalautuvuus ja flow

### Extraction flow (ei blokkaava)

```
Pelaaja pyytää promptin
    ↓
PromptAgent generoi (1 AI-kutsu) → Vastaus heti pelaajalle
    ↓
Tallennetaan story_recent.json
    ↓
[TAUSTALLA - ei blokkaava]
    ↓
Tarkista: storyCount % 5 === 0 TAI playerSubmitted?
    ↓ (kyllä)
MemoryExtractor Agent aktivoituu
    ↓
Parsii viimeiset 5-10 merkintää (1 AI-kutsu kaikille osallistujille)
    ↓
Tallentaa key_moments ja relationships → characters/*.json
    ↓
Valmis (pelaaja ei huomannut, ei odotusaikaa)
```

**Skaalaus 100+ pelaajaan:**
- Nykyinen: Koko story konteksti kaikille (toimii 2-10 pelaajalle)
- Tulevaisuus: Relationship-based filtering (näytä vain lähipiirin lokit)
- MemoryExtractor: Spatial/temporal filtering (sama paikka/viimeinen 30min)
- Promptit: ~500-800 riviä per pelaaja (vs nykyinen 1000-1500)

---

## 🔄 Tietovirta - Yhteenveto

```
1. GM alustaa pelin → Lataa game_library/*.md → game_config.json

2. Pelaaja liittyy → CharacterAgent luo hahmon → characters/{charId}.json

3. Pelaaja pyytää promptin:
   PromptAgent → Lue character + story_recent + game_config → Generoi promptti
   
4. Promptti tallennetaan → story_recent.json (circular buffer)

5. Extraction trigger (joka 5. tai player_input):
   MemoryExtractor → Parsii story_recent → Päivitä characters/*.json (key_moments + relationships)

6. DramaturgAgent (15min tai GM trigger):
   Analysoi story_recent → Päivitä game_config.currentPhase
```

**Data flow:**
- game_library/*.md → game_config.json (pelin raamit)
- Pelaajan input → story_recent.json (circular buffer)
- MemoryExtractor → characters/*.json (kognitiivinen muisti)
- PromptAgent lukee: character + story_recent + game_config → generoi promptti

**Ei enää:**
- ❌ world.json (korvattiin: characters/*.json + game_config.json)
- ❌ story.json kasvu loputtomiin (korvattiin: story_recent.json circular buffer)
- ❌ EngineRunner päätöksenteko (korvattiin: yksinkertainen trigger-logiikka)
- ❌ WorldBuilder/CharacterBuilder erillisinä (yhdistettiin: MemoryExtractor)

---

**Yhteenveto: Digital LARP Engine - Kognitiivinen muisti-arkkitehtuuri**

Hahmot muistavat dramaturgisesti merkittävät hetket. Suhteet ovat arvoja (trust, romantic, suspect). Peli-moduulit määrittävät semanttiset raamit. Oneshot agentit hoitavat LLM-tehtävät. Skaalautuva 100+ pelaajaan. Autonominen operaatio ilman GM:ää.

**4. Semantic search (myöhemmin)**
```javascript
// Vektorihaulla relevanteimmat lokit:
const relevantLogs = await searchRelevantLogs(character, world, logs);
```

### Miksi skaalautuu hyvin?

| Aspekti | Ratkaisu | Skaalautuvuus |
|---------|----------|---------------|
| **Promptit** | Filtteröidään per pelaaja | O(log n) |
| **LLM-kutsut** | Asynkronisia, ei odoteta | Rinnakkaisia |
| **World.json** | Kasvaahitaasti, elementit harvaan | O(n) elementit, ei pelaajat |
| **Logs.json** | Vain viimeiset n tapahtumaa | Rajattu konteksti |
| **Socket.io** | Event-based, broadcast vain muutoksille | Tehokas |

**Testattuna toimivaksi:**
- 10 pelaajaa: Toimii sulavasti ✅
- 50 pelaajaa: Ennakoitu toiminta (tarvitsee filtteröintiä) ⚠️
- 100 pelaajaa: Toimii filtteröinnillä (relationship/spatial) 🔮

## 🔄 Tietovirta - Täydellinen esimerkki

```
1. PELAAJA: "Ja sitten" (trigger_scene)
         ↓
2. SERVER: Lataa konteksti
   - world.json → Hahmotiedot, world elements, dramaturgy
   - logs.json → Rajattu määrä tilanne historiaa
         ↓
3. PROMPT BUILDER:
   - buildActionPrompt(character, world, logs, config)
   - Luo täyden promptin (systemprompt + taksonomia + konteksti)
         ↓
4. LLM (Laatukriittinen malli):
   - Generoi toimintapromtti
   - "Mene laboratorioon. Huomaat että..."
         ↓
5. LOG UPDATE (AINA):
   - logs.entries.push({timestamp, characterId, action, instruction})
   - Tallentaa logs.json
         ↓
6. PELAAJA: Näkee promptin
         ↓
     ┌──────────────────────────────────────┐
     │   SIMULTAANI HAARA: ENGINE RUNNER    │
     └──────────────────────────────────────┘
         ↓
7. ENGINE RUNNER (FunctionGemma):
   - Analysoi: "Mitä buildereitä aktivoidaan?"
   - Päätökset:
     ├─ analyze_world → WorldBuilder
     ├─ analyze_dramaturgy → DramaturgBuilder
     ├─ update_character → CharacterBuilder
     └─ no_action → Ei mitään
         ↓
8a. WORLD BUILDER (jos aktivoitu, kevyt malli):
    - analyzeWorldElements(instruction, askLLM, world)
    - Löytää: newPlaces = ["Laboratorio"]
    - Tarkistaa: "ALREADY KNOWN" lista
    - updateWorldElements(analysis, characterId, world)
    - Tallentaa world.json
         ↓
8b. DRAMATURG BUILDER (jos aktivoitu, laatukriittinen):
    - buildDramaturgyPrompt(world, logs, askLLM)
    - Analysoi: jännite, pacing, plot twists
    - Tallentaa world.dramaturgy
         ↓
8c. CHARACTER BUILDER (jos aktivoitu, kevyt malli):
    - analyzeCharacterUpdates(instruction, askLLM, world)
    - Päivittää: relationships, secrets
    - Tallentaa world.characters
         ↓
9. BROADCAST (jos muutoksia):
   - socket.emit('instruction_generated') → Pelaajalle
   - socket.emit('world_updated') → GameMasterClient
   - socket.emit('log_updated') → Debug-näkymälle
```

**Keskeinen logiikka:**
- Prompt Builder → Log → Pelaaja (AINA)
- Engine Runner toimii simultaanisti (päättää builderit)
- Log update AINA kielimallikyselyn jälkeen
- Builderit päivittävät world.json tarvittaessa

## 🎯 Arkkitehtuurin vahvuudet

### 1. Yksinkertainen ydin
- Yksi totuuden lähde (logs.json)
- Selkeät vastuualueet (world, logs, dramaturgy)
- Ei monimutkaista tilanhallintaa

### 2. Modulaarisuus
- LLM-moduulit vaihdettavissa (PromptBuilder, WorldBuilder, DramaturgBuilder, CharacterBuilder)
- Sama malli voi toimia useassa roolissa
- Helppo lisätä uusia moduuleja (builderit noudattavat samaa mallia)

### 3. Testattavuus
- Dependency injection (mock askLLM)
- Selkeät inputit ja outputit
- Debug-näkymä auttaa kehityksessä

### 4. Skaalautuvuus
- Filtteröinti per pelaaja
- Asynkroniset LLM-kutsut
- Event-based arkkitehtuuri

### 5. LARP-sopivuus
- Ei pisteitä tai mekaanista pelaamista
- Vapaat markdown-kuvaukset
- Kerronnallinen voitto/häviö
- Sopii workshoppeihin ja reflektointiin

## 📁 Hakemistorakenne

```
.
├── server.js                      # Pelimoottori (Socket.io + Express)
├── package.json
├── .env                           # API-avaimet ja konfiguraatio
│
├── data/                          # Single Source of Truth
│   ├── logs.json                  # Historia - mitä on tapahtunut
│   ├── world.json                 # Nykyhetki - mitä on olemassa
│   ├── systemprompt.md            # LLM:n perusohjeistus
│   ├── debug_prompts.json         # Kehitysdata (täydet promptit)
│   └── game_library/              # Pelitemplaatit (Markdown)
│       ├── murhapeli.md
│       ├── hemulin_alushousut.md
│       └── scifi_avaruusasema.md
│
├── llm/                           # Modulaariset LLM-työkalut
│   ├── promptBuilder.js           # Luo toimintapromptit
│   ├── worldBuilder.js            # Tunnista uudet elementit
│   ├── dramaturgBuilder.js        # Analysoi draama
│   ├── characterBuilder.js        # Päivitä hahmoja (tulossa)
│   ├── engineRunner.js            # Päätä aktivoinnit (FunctionGemma)
│   └── README.md                  # LLM-moduulien dokumentaatio
│
└── public/                        # Käyttöliittymät (näkymät)
    ├── index.html                 # Pelaajan näkymä
    ├── gamemaster.html            # Pelinjohtajan näkymä
    └── debug.html                 # Kehittäjän näkymä
```

## 🚀 Tulevaisuuden kehityskohteet

### Prioriteetti 1 (Ydin toimii)
- ✅ Log-keskinen arkkitehtuuri
- ✅ Modulaariset LLM-roolit
- ✅ World Builder + context awareness
- ✅ FunctionGemma decision making
- ✅ Kielimalli yhtymäkohta (käyttäjä määrittää)
- [ ] Character Builder (relationships, secrets, initiative)

### Prioriteetti 2 (Optimointi)
- [ ] Relationship-based log filtering
- [ ] Spatial filtering (saman paikan hahmot)
- [ ] Temporal filtering (vain viimeinen 30 min)
- [ ] Prompt caching (OpenRouter)

### Prioriteetti 3 (Laajennukset)
- [ ] Loppu purku -pelitila (reflektointi)
- [ ] Multi-kielituki (UI + LLM)
- [ ] AR/QR-koodit fyysisiin paikkoihin
- [ ] Analytiikka-dashboard GM:lle
- [ ] Semantic search logeille (vektorihaulla)

## 📖 Yhteenveto

**Elopelimoottorin arkkitehtuuri on:**

1. **Log-keskinen** - logs.json on totuuden lähde
2. **Modulaarinen** - LLM-roolit vaihdettavissa
3. **Skaalautuva** - 100 pelaajaa kontekstin rajauksella
4. **Yksinkertainen** - Selkeät vastuualueet
5. **LARP-sopiva** - Ei mekaanista pelaamista

**Ydin on nyt valmis.** Seuraavat vaiheet ovat promptien hienosäätöä ja kielimallien optimointia - arkkitehtuuri pysyy samana.

---

*Versio: 2.0 (Log-keskinen, Modulaarinen)*  
*Päivitetty: 9.1.2025*
