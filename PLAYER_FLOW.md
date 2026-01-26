# Pelaajan Flow - Uusi Arkkitehtuuri

## Flow-kaavio

```
┌─────────────────┐
│  Login Screen   │
│  - Nimi         │
│  - Kieli        │
└────────┬────────┘
         │ "JATKA"
         ↓
┌─────────────────┐
│ Character       │
│ Selection       │
│ - Valitse       │
│   vanha hahmo   │
│ - Luo uusi      │
└────┬─────┬──────┘
     │     │
     │     └────────────┐
     │                  │
     │ (Valitse vanha)  │ (Luo uusi)
     ↓                  ↓
┌─────────┐      ┌──────────────┐
│  PELI   │      │   Tutorial   │
│ (lataa  │      │   Chat       │
│ hahmo)  │      │   - Kysy     │
└─────────┘      │   - Kerro    │
                 │   toiveet    │
                 └──────┬───────┘
                        │ "LUO HAHMO"
                        ↓
                 ┌──────────────┐
                 │ Character    │
                 │ Generation   │
                 │ (käyttää     │
                 │ toiveita)    │
                 └──────┬───────┘
                        ↓
                 ┌──────────────┐
                 │    PELI      │
                 └──────────────┘
```

## Tekninen Implementointi

### 1. Login Screen
- **HTML**: `#login-screen` (visible by default)
- **Input**: `#username`, `#language-select`
- **Button**: `#join-btn`
- **Event**: `socket.emit('join_game', { playerName, language })`

### 2. Character Selection Screen
- **HTML**: `#character-selection-screen` (display: none initially)
- **Trigger**: `socket.on('join_success', data)` jossa `data.character === undefined`
- **Function**: `showCharacterSelection(existingCharacters)`
- **Options**:
  - Valitse vanha: `selectExistingCharacter(charId)` → `socket.emit('select_character', { charId })`
  - Luo uusi: `startTutorial()` → näyttää tutorial screenin

### 3. Tutorial Screen
- **HTML**: `#tutorial-screen` (display: none initially)
- **Chat UI**: `#tutorial-messages` (message container)
- **Input**: `#tutorial-input` + `#tutorial-send-btn`
- **Event**: `socket.emit('player_tutorial', { playerName, language, message, conversationHistory })`
- **Response**: `socket.on('tutorial_response', data)` → `addTutorialMessage('system', data.response)`
- **Finalize**: `#finalize-tutorial-btn` → `finalizeTutorial()`

### 4. Character Generation
- **Trigger**: `finalizeTutorial()` kerää pelaajan viestit `characterWishes`-muuttujaan
- **Event**: `socket.emit('create_character', { playerName, language, characterWishes })`
- **Response**: `socket.on('character_created', data)` → lataa hahmotiedot ja siirtyy peliin
- **Loading**: `startLoader('LUODAAN HAHMOA...')` näkyy character creationin aikana

### 5. Game Screen
- **HTML**: `#game-screen` (display: none initially)
- **Show**: Kun hahmo on valittu tai luotu
- **Normal game flow**: `andThen()`, `trigger_scene`, jne.

## Server-puolen Handlerit

### `socket.on('join_game', { playerName, language })`
**Toiminta:**
1. Lataa `game_config.json`
2. Hae kaikki olemassa olevat hahmot characters/-kansiosta
3. Vastaa: `socket.emit('join_success', { playerName, language, existingCharacters, gameConfig })`
4. **EI luo hahmoa automaattisesti**

### `socket.on('select_character', { charId })`
**Toiminta:**
1. Lataa hahmo `loadCharacter(charId)`
2. Päivitä `sessionCount++` ja `lastJoined`
3. Vastaa: `socket.emit('join_success', { character })`

### `socket.on('player_tutorial', { playerName, language, message, conversationHistory })`
**Toiminta:**
1. Käytä `tutorialAgent.handleTutorial()` vastaamaan kysymykseen
2. Context: `gameConfig`, `existingCharacters`, `recentStory`
3. Vastaa: `socket.emit('tutorial_response', { response })`

### `socket.on('create_character', { playerName, language, characterWishes })`
**Toiminta:**
1. Luo charId: `playerName.toLowerCase().replace(/\s+/g, '_')`
2. Käytä `characterCreator.createCharacter()` generoimaan kuvaus
3. **TODO**: Lähetä `characterWishes` characterCreatorille kontekstina
4. Tallenna `characters/{charId}.json`
5. Lisää join entry `story_recent.json`-tiedostoon
6. Broadcast: `io.emit('story_update', joinEntry)` ja `io.emit('character_joined', character)`
7. Vastaa: `socket.emit('character_created', { character })`

## Client-puolen Funktiot

```javascript
// Flow functions
joinGame()                        // Login → Character Selection
showCharacterSelection(chars)     // Näytä olemassa olevat hahmot
selectExistingCharacter(charId)   // Valitse vanha hahmo → Peli
startTutorial()                   // Aloita tutorial chat
sendTutorialMessage()             // Lähetä kysymys tutorialissa
addTutorialMessage(type, content) // Lisää viesti tutorial chattiin
finalizeTutorial()                // Luo hahmo tutorial-keskustelun jälkeen
```

## Socket Events

### Client → Server
- `join_game` - Liity peliin (nimi + kieli)
- `select_character` - Valitse olemassa oleva hahmo
- `player_tutorial` - Lähetä kysymys tutorialissa
- `create_character` - Luo uusi hahmo (tutorialin jälkeen)

### Server → Client
- `join_success` - Vastaus join_game tai select_character eventeihin
- `tutorial_response` - Vastaus tutorial kysymykseen
- `character_created` - Uusi hahmo luotu
- `character_updated` - Hahmon muisti päivitetty (memory extraction)
- `story_update` - Uusi story entry
- `error` - Virheviesti

## UI State Management

### Screen Visibility
```javascript
// Initially
login-screen:              display: block (visible class)
character-selection-screen: display: none
tutorial-screen:           display: none
game-screen:               display: none

// After login
login-screen:              display: none
character-selection-screen: display: block

// If "Luo uusi"
character-selection-screen: display: none
tutorial-screen:           display: block

// After tutorial finalized OR character selected
tutorial-screen:           display: none
game-screen:               display: block + visible class
```

### Loading States
- **Login → Character Selection**: `startLoader('LADATAAN...')` → `stopLoader()` kun `join_success` saapuu
- **Character Selection → Game**: `startLoader('LADATAAN HAHMOA...')` kun valitaan vanha hahmo
- **Tutorial → Character Creation**: `startLoader('LUODAAN HAHMOA...')` kun painetaan "LUO HAHMO"
- **Tutorial Question**: Näytetään "⏳ Ajattelen..." viesti kun kysymys lähetetty

## Tutorial Agent Context

`tutorialAgent.handleTutorial()` saa kontekstin:
- `playerName` - Pelaajan nimi
- `language` - Pelaajan kieli
- `message` - Nykyinen kysymys
- `conversationHistory` - Aiemmat viestit (array of {role, content})
- `gameConfig` - Pelin asetukset (setting, themes, etc.)
- `existingCharacters` - Lista olemassa olevista hahmoista
- `recentStory` - Viimeaikaiset tapahtumat pelissä

## Tulevat Parannukset

### TODO
1. **Character Wishes Integration**: Vie `characterWishes` characterCreatorille
   - Tällä hetkellä tutorialin toiveet kerätään mutta ei käytetä
   - Tulisi lisätä parametriksi `characterCreator.createCharacter()`
   
2. **Tutorial History**: Tallenna tutorial-keskustelut jotta pelaaja voi palata niihin
   
3. **Character Preview**: Ennen hahmon luontia näytä "esikatselu" toiveista
   
4. **Multilingual Tutorial**: Tutorialin ensimmäinen viesti pelaajan kielellä
   
5. **Tutorial Suggestions**: Ehdota kysymyksiä jos pelaaja on hiljaa

## Testing Checklist

- [ ] Login screen näkyy oikein
- [ ] Kielen valinta toimii
- [ ] Character selection näytetään kun ei hahmoja
- [ ] Character selection näytetään kun hahmoja on
- [ ] Vanhan hahmon valinta lataa oikean hahmon
- [ ] Tutorial screen aukeaa kun painetaan "ALOITA UUSI HAHMO"
- [ ] Tutorial chat toimii (kysymykset ja vastaukset)
- [ ] Tutorial "LUO HAHMO" luo hahmon
- [ ] Character creation käyttää tutorial-toiveita (TODO)
- [ ] Game screen aukeaa kun hahmo valittu/luotu
- [ ] Loading animaatiot näkyvät oikeissa kohdissa
