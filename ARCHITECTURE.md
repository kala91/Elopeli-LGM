# Digital LARP Engine - Arkkitehtuuri

**Mitä rakennetaan:** Alusta erilaisille sosiaalisille improvisaatioroolipeleille. Ei prefabbeja vaan semanttisia raameja - kielimalli generoi pelattavaa dynamiikkaa.

## 🎯 Ydinperiaate: Kognitiivinen muisti-arkkitehtuuri

Hahmot muistavat dramaturgisesti merkittävät hetket, eivät jokaista sanaa. Kuten ihmiset: tärkeintä on ydinkokemusten kulkeminen mukana.

```
Pelaaja pyytää promptin → Prompt Agent generoi toiminnon
    ↓
Dialogi tapahtuu → Tallennetaan story_recent.json
    ↓
Extraction trigger (joka 5. tai player_input) → Memory Extractor Agent
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
- Prompt Agent: Viimeiset 3 key_moments + kaikki relationships → konteksti promptin rakentamiseen
- Memory Extractor Agent: Lisää uusia key_moments ja päivittää relationships
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
    "fear",
    "business"
  ]
}
```

**Käyttö:**
- Tutorial Agent: Setting → hahmojen luonti skenaarion mukaan
- Prompt Agent: Setting + availableRelationships → semanttisesti pätevät promptit (sisältää inline dramaturgi-promptin)
- Memory Extractor: availableRelationships → strukturoidaan suhteet oikein

### 3. **data/story_recent.json** - Circular buffer

**Rooli:** Lähihistoria - mitä on tapahtunut viimeksi (max 20 entries)

**Schema:**
```json
{
  "entries": [
    {
      "timestamp": "2026-01-23T14:23:12.000Z",
      "character": "jesse",
      "type": "action",
      "instruction": "Walk to the library, pick up the mysterious letter on the desk",
      "playerSubmitted": true
    },
    {
      "timestamp": "2026-01-23T14:23:25.000Z",
      "character": "jee",
      "type": "action",
      "instruction": "Approach Jesse in the library, ask about the letter",
      "playerSubmitted": false
    }
  ]
}
```

**Circular buffer logic:**
- Max 20 entries (config: `STORY_RECENT_MAX_ENTRIES`)
- Kun täyttyy → poistetaan vanhimmat
- Ennen poistoa → Memory Extractor Agent ekstraktoi dramaturgisesti merkittävät hetket hahmojen muistiin

**Käyttö:**
- Prompt Agent: Viimeiset 5-10 entry → konteksti uuden promptin rakentamiseen
- Tutorial Agent: Näyttää recent history kun pelaaja liittyy peliin
- Memory Extractor: Käy läpi recent entries → ekstraktoi key_moments

### 4. **data/game_library/** - Pelitemplaatit

**Rooli:** Markdown-tiedostot jotka määrittävät pelin settingin, genre, relationshipit

**Esimerkki (murhapeli.md):**
```markdown
# Kartanomurha

## Setting
1920-luvun kartano, myrsky, vieras murhattu...

## Available Relationships
- trust
- suspect
- romantic
- fear
- business

## System Prompt
(Dramaturgi-prompti tähän)

## Taxonomy
(Dramaturgiset työkalut tähän)
```

**Käyttö:**
- Game Master valitsee templaten
- Moottori parsii Markdown → rakentaa game_config.json
- Kaikki agentit käyttävät game_config:ia kontekstina

## 🤖 LLM-agentit (Oneshot)

Jokainen agentti on oneshot-funktio - kutsutaan kerran, palauttaa vastauksen, ei pidä tilaa.

### 1. **Tutorial Agent** (`llm/tutorialAgent.js`)

**Rooli:** Opastaa uutta pelaajaa keskustelun avulla ennen hahmonluontia

**Input:**
```javascript
{
  gameConfig: {...},
  conversationHistory: [{role: "assistant", content: "..."}, {role: "user", content: "..."}],
  language: "fi"
}
```

**Output:**
```javascript
{
  message: "Tervetuloa peliin! Millaisen hahmon haluaisit pelata?",
  shouldCreateCharacter: false
}
// TAI
{
  message: "Loistavaa! Luon sinulle hahmon joka...",
  shouldCreateCharacter: true,
  characterWishes: "Nuori poliisi, joka tutkii murhaa ensimmäistä kertaa..."
}
```

**Prompt-rakenne:**
```
YOUR ROLE: You guide new players...
GAME INFO: Setting, relationships...
CONVERSATION: Previous messages...
YOUR TASK: If player ready → <TOOL_CALL>{"tool":"createCharacter","playerWishes":"..."}</TOOL_CALL>
```

**Tool call detection:**
```javascript
if (response.includes('<TOOL_CALL>')) {
  const toolCall = JSON.parse(/* extract JSON */);
  return {
    shouldCreateCharacter: true,
    characterWishes: toolCall.playerWishes,
    message: response.split('<TOOL_CALL>')[0]
  };
}
```

### 2. **Character Creator Agent** (`llm/characterCreatorAgent.js`)

**Rooli:** Luo hahmon pelaajan toiveiden mukaan

**Input:**
```javascript
{
  gameConfig: {...},
  characterWishes: "Nuori poliisi joka tutkii murhaa ensimmäistä kertaa",
  existingCharacters: [{name: "Jesse", relationships: {...}}],
  language: "fi"
}
```

**Output:**
```javascript
{
  description: "Nuori, kunnianhimoinen poliisi...",
  personality: ["utelias", "empaattinen", "jännittynyt"],
  goals: ["Selvitä murha", "Todista olevansa pätevä"],
  relationships: [
    {targetCharName: "Jesse", value: "suspect", intensity: 2, reason: "Jesse näyttää peittelevän jotain"}
  ]
}
```

**Prompt-rakenne:**
```
CREATE CHARACTER
Game Setting: ...
Player Wishes: ...
Existing Characters: Jesse, Jee, Inspector

Output JSON format:
{
  "description": "...",
  "personality": ["trait1", "trait2"],
  "goals": ["goal1", "goal2"],
  "relationships": [{"targetCharName": "Jesse", "value": "suspect", ...}]
}
```

### 3. **Prompt Agent** (`llm/promptAgent.js`)

**Rooli:** Generoi pelaajalle seuraava toimintaohje

**Input:**
```javascript
{
  gameConfig: {...},
  character: {name, description, memory: {key_moments, relationships}},
  recentStory: [{character: "jesse", instruction: "..."}],
  language: "fi"
}
```

**Output:**
```javascript
{
  instruction: "Mene kirjastoon ja keskustele Jeen kanssa kirjeestä"
}
```

**Prompt-rakenne:**
```
YOU ARE DRAMATIC INSTRUCTOR
Setting: ...
Character: Jesse (kartanon serkku, velkaantunut...)
Recent Story: Jee kysyi Jesse:ltä kirjeestä...
Character's Memory: [key_moments + relationships]

Generate next instruction for Jesse.
```

**Solo play detection:**
```javascript
const otherChars = Object.keys(character.memory.relationships);
if (otherChars.length === 0) {
  prompt += "\n⚠️ NO OTHER CHARACTERS IN GAME YET\n";
  prompt += "Use internal reflection, environment exploration.";
}
```

### 4. **Memory Extractor Agent** (`llm/memoryExtractorAgent.js`)

**Rooli:** Tunnistaa dramaturgisesti merkittävät hetket recent storysta

**Input:**
```javascript
{
  gameConfig: {...},
  recentStory: [{character: "jesse", instruction: "..."}],
  characters: {jesse: {...}, jee: {...}},
  participantLanguages: {jesse: "fi", jee: "sv"}
}
```

**Output:**
```javascript
{
  "jesse": {
    "key_moments": [
      {
        "content": "Jesse löysi salaisen käytävän kirjaston takaa",
        "emotionalWeight": 4,
        "participants": ["jesse"]
      }
    ],
    "relationshipChanges": {
      "jee": {
        "value": "romantic",
        "intensity": 5,
        "notes": "Tunnusti tunteensa Jeelle"
      }
    }
  },
  "jee": {
    "key_moments": [
      {
        "content": "Jesse bekände sina känslor för Jee i biblioteket",
        "emotionalWeight": 5,
        "participants": ["jesse", "jee"]
      }
    ],
    "relationshipChanges": {
      "jesse": {
        "value": "romantic",
        "intensity": 3,
        "notes": "Jesse erkände sina känslor"
      }
    }
  }
}
```

**Multi-language support:**
```javascript
const langInstruction = Object.entries(participantLanguages)
  .map(([charId, lang]) => `${charId} (${languages[lang]})`)
  .join(", ");
// "jesse (Finnish), jee (Swedish)"
// Prompt: Write each character's content in THEIR OWN language
```

**Trigger logic:**
```javascript
// server.js
let entriesCount = storyRecent.entries.length;
if (entriesCount % 5 === 0 || anyPlayerSubmitted) {
  await memoryExtractorAgent({...});
}
```

### 5. **Dramaturg Agent** (`llm/dramaturgAgent.js`)

**Rooli:** Analysoi pelin draaman kulun Game Masterille

**Input:**
```javascript
{
  gameConfig: {...},
  recentStory: [...],
  characters: {jesse: {...}, jee: {...}}
}
```

**Output:**
```javascript
{
  analysis: "Draama on kärjistymässä - Jesse ja Jee ovat romanttisessa jännitteessä...",
  suggestions: [
    "Lisää ulkoinen uhka joka pakottaa heidät yhteistyöhön",
    "Tuo uusi hahmo joka haastaa heidän suhteensa"
  ],
  dramaticArc: "rising"
}
```

## 🔄 Pelikulun logiikka

### Uusi pelaaja liittyy

```javascript
socket.on('join_game', async ({playerName, language}) => {
  // 1. Luo socket-yhteys
  players[socket.id] = {name: playerName, language, character: null};
  
  // 2. Lähetä tutorial agentin tervehdys
  const tutorialResponse = await tutorialAgent({
    gameConfig,
    conversationHistory: [],
    language
  });
  socket.emit('tutorial_response', tutorialResponse);
});
```

### Tutorial-keskustelu

```javascript
socket.on('player_tutorial', async ({message, history}) => {
  // 1. Lähetä pelaajan viesti agentille
  const tutorialResponse = await tutorialAgent({
    gameConfig,
    conversationHistory: [...history, {role: 'user', content: message}],
    language: player.language
  });
  
  // 2. Jos agentti päätti luoda hahmon → Character Creator
  if (tutorialResponse.shouldCreateCharacter) {
    const characterData = await characterCreatorAgent({
      gameConfig,
      characterWishes: tutorialResponse.characterWishes,
      existingCharacters: getAllCharacters(),
      language: player.language
    });
    
    // 3. Tallenna hahmo + lähetä clientille
    saveCharacter(characterData);
    socket.emit('character_created', characterData);
  } else {
    socket.emit('tutorial_response', tutorialResponse);
  }
});
```

### Pelaaja pyytää promptin

```javascript
socket.on('trigger_scene', async ({playerId, playerSubmit}) => {
  // 1. Hae pelaajan hahmo
  const character = getCharacter(playerId);
  
  // 2. Hae recent story
  const recentStory = getRecentStory(10);
  
  // 3. Generoi prompti
  const instruction = await promptAgent({
    gameConfig,
    character,
    recentStory,
    language: character.playerMeta.language
  });
  
  // 4. Tallenna story_recent.json
  addStoryEntry({
    character: character.id,
    instruction,
    playerSubmitted: playerSubmit
  });
  
  // 5. Tarkista extraction trigger
  if (shouldExtract()) {
    await memoryExtractorAgent({
      gameConfig,
      recentStory,
      characters: getAllCharacters(),
      participantLanguages: getParticipantLanguages()
    });
  }
  
  // 6. Lähetä prompti clientille
  socket.emit('scene_update', {instruction});
});
```

### Memory extraction trigger

```javascript
function shouldExtract() {
  const entriesCount = storyRecent.entries.length;
  const anyPlayerSubmitted = storyRecent.entries.some(e => e.playerSubmitted);
  
  return (entriesCount % 5 === 0) || anyPlayerSubmitted;
}
```

## 🌍 Monikielisyys

### Periaate

Jokainen hahmo pelaa omalla kielellään - muistit kirjoitetaan hahmon kielellä.

### Toteutus

```javascript
// Character file
{
  "playerMeta": {
    "language": "fi"  // player's chosen language
  }
}

// Memory Extractor
const participantLanguages = {
  jesse: "fi",
  jee: "sv",
  frank: "en"
};

// Prompt to LLM
"Participants: jesse (Finnish), jee (Swedish), frank (English)"
"Write each character's content and reason fields in THEIR OWN language."
```

### Tulos

```javascript
{
  "jesse": {
    "key_moments": [
      {"content": "Jesse löysi salaisen käytävän", ...}  // Finnish
    ]
  },
  "jee": {
    "key_moments": [
      {"content": "Jesse hittade en hemlig passage", ...}  // Swedish
    ]
  }
}
```

## 📊 Data flow kaavio

```
┌──────────────┐
│  Pelaaja     │
└──────┬───────┘
       │ join_game
       ↓
┌──────────────────┐
│ Tutorial Agent   │ (conversational)
└──────┬───────────┘
       │ <TOOL_CALL>createCharacter
       ↓
┌──────────────────┐
│Character Creator │ → characters/{id}.json
└──────────────────┘
       │
       ↓
┌──────────────────┐
│  Peliin          │
└──────┬───────────┘
       │ trigger_scene
       ↓
┌──────────────────┐
│  Prompt Agent    │ (reads character memory + recent story)
└──────┬───────────┘
       │
       ↓ instruction
┌──────────────────┐
│story_recent.json │ (circular buffer, max 20)
└──────┬───────────┘
       │ extraction trigger (every 5th OR player_submit)
       ↓
┌──────────────────┐
│Memory Extractor  │ (extracts key_moments + relationships)
└──────┬───────────┘
       │
       ↓
┌──────────────────┐
│characters/{id}.  │ (key_moments + relationships updated)
│     json         │
└──────────────────┘
```

## 🎯 Design Principles

### 1. Kognitiivinen muisti

**Ei** tallenneta kaikkea:
```javascript
// ❌ Väärin
story_full.json: [
  "Jesse sanoi hei",
  "Jee vastasi hei",
  "Jesse kysyi mitä kuuluu",
  "Jee vastasi hyvin"
]
```

**Kyllä** tallennetaan merkittävät hetket:
```javascript
// ✅ Oikein
characters/jesse.json: {
  key_moments: [
    {content: "Jesse tunnusti tunteensa Jeelle", emotionalWeight: 5}
  ]
}
```

### 2. Semanttiset raamit, ei kovakoodattuja sääntöjä

**Ei** game logiikkaa:
```javascript
// ❌ Väärin
if (player.hasKey && player.location === "door") {
  door.unlock();
}
```

**Kyllä** LLM-tulkinta:
```javascript
// ✅ Oikein
const instruction = await promptAgent({
  character: {memory: {key_moments: ["Found mysterious key"]}},
  recentStory: ["Approached the locked door"]
});
// → "Try using the key you found on the locked door"
```

### 3. Oneshot agentit, ei monologeja

Jokainen agentti on funktio - ei luokkia, ei tilaa, ei monimutkaista koordinointia.

```javascript
// ✅ Yksinkertainen
const instruction = await promptAgent({gameConfig, character, recentStory});

// ❌ Monimutkainen
const agent = new PromptAgent(gameConfig);
await agent.initialize();
const instruction = await agent.generate(character);
await agent.cleanup();
```

## 🚀 Tulevat kehityskohteet

- [ ] Draaman kaaren seuranta (rising/falling action)
- [ ] Relationship-based log filtering (näytä vain relevantit hetket)
- [ ] NPC-hahmot (GM-ohjatut)
- [ ] Voice interface (puhe → teksti → LLM → teksti → puhe)
- [ ] Spatial positioning (GPS/Beacon-based location tracking)

## 📝 Liitteet

- [llm/promptAgent.js](llm/promptAgent.js) - Sisältää inline dramaturgi-promptin
- [docs/taxonomy.md](docs/taxonomy.md) - Dramaturgiset työvälineet (analyyttinen muistikirja)
- [data/game_library/murhapeli.md](data/game_library/murhapeli.md) - Esimerkki pelitemplaatista
