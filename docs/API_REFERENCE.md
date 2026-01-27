# API Reference - Socket.IO Events

> Complete reference for Socket.IO events used in the Elopeli-LGM LARP Engine

## Table of Contents

1. [Player Events](#player-events)
2. [Game Master Events](#game-master-events)
3. [Shared Events](#shared-events)
4. [REST API Endpoints](#rest-api-endpoints)

---

## Player Events

### Client → Server Events

#### `join_game`
Player joins the game (enters tutorial mode).

**Payload:**
```javascript
{
  playerName: string,  // Player's chosen name (required)
  language: string     // Language code: 'fi', 'en', 'sv', 'de', 'fr' (optional, default: 'fi')
}
```

**Response:** 
- Success: Player enters tutorial phase
- Error: `error` event with message

**Example:**
```javascript
socket.emit('join_game', {
  playerName: 'Jesse',
  language: 'fi'
});
```

---

#### `player_tutorial`
Send message during tutorial conversation (before character creation).

**Payload:**
```javascript
{
  playerName: string,              // Player's name
  message: string,                 // Player's message to tutorial agent
  language: string,                // Language code
  conversationHistory: Array<{     // Previous conversation (optional)
    role: string,                  // 'player' or 'assistant'
    content: string                // Message content
  }>
}
```

**Response:**
- `tutorial_response` event with agent's response
- May trigger character creation if agent decides player is ready

**Example:**
```javascript
socket.emit('player_tutorial', {
  playerName: 'Jesse',
  message: 'Haluaisin pelata nuorta poliisia',
  language: 'fi',
  conversationHistory: [
    { role: 'assistant', content: 'Tervetuloa peliin!' },
    { role: 'player', content: 'Kiitos!' }
  ]
});
```

---

#### `create_character`
Create character after tutorial phase completes.

**Payload:**
```javascript
{
  playerName: string,              // Player's name (will be character name)
  language: string,                // Preferred language
  tutorialHistory: Array<{         // Tutorial conversation history
    role: string,
    content: string
  }>
}
```

**Response:**
- `character_created` event with full character data
- `character_joined` broadcast to all clients
- `story_update` broadcast with join entry

**Example:**
```javascript
socket.emit('create_character', {
  playerName: 'Jesse',
  language: 'fi',
  tutorialHistory: [/* ... */]
});
```

---

#### `trigger_scene`
Request next action prompt for character.

**Payload:**
```javascript
{
  charId: string  // Character ID (lowercase name with underscores)
}
```

**Response:**
- `story_update` broadcast with new instruction
- May trigger memory extraction (background)

**Example:**
```javascript
socket.emit('trigger_scene', {
  charId: 'jesse'
});
```

---

#### `player_action`
Submit what happened after following an instruction.

**Payload:**
```javascript
{
  charId: string,  // Character ID
  action: string   // Description of what happened
}
```

**Response:**
- `action_received` confirmation
- `story_update` broadcast
- **Always** triggers memory extraction

**Example:**
```javascript
socket.emit('player_action', {
  charId: 'jesse',
  action: 'Menin kirjastoon ja keskustelin Jeen kanssa. Hän paljasti että...'
});
```

---

### Server → Client Events

#### `tutorial_response`
Tutorial agent's response during character creation.

**Payload:**
```javascript
{
  response: string,        // Agent's message to player
  createCharacter: boolean // If true, player should proceed to character creation
}
```

**Example:**
```javascript
socket.on('tutorial_response', (data) => {
  console.log('Agent says:', data.response);
  if (data.createCharacter) {
    // Trigger character creation
  }
});
```

---

#### `character_created`
Character successfully created.

**Payload:**
```javascript
{
  character: {
    name: string,
    id: string,
    description: string,
    personality: Array<string>,
    goals: Array<string>,
    status: 'active',
    memory: {
      key_moments: Array,
      relationships: Object
    },
    playerMeta: {
      language: string,
      sessionCount: number,
      joinedAt: string
    }
  }
}
```

---

#### `story_update`
New story entry added (prompt generated or player action submitted).

**Payload:**
```javascript
{
  id: number,              // Entry ID (timestamp)
  timestamp: string,       // Local time string
  targetChar: string,      // Character name
  targetId: string,        // Character ID
  instruction: string,     // The instruction text
  playerJoined: boolean,   // True if this is a join entry
  playerSubmitted: boolean // True if player submitted action
}
```

**Example:**
```javascript
socket.on('story_update', (entry) => {
  console.log(`${entry.targetChar}: ${entry.instruction}`);
});
```

---

#### `character_updated`
Character data updated (usually after memory extraction).

**Payload:**
```javascript
{
  charId: string,     // Character ID
  character: Object   // Full updated character data
}
```

---

#### `error`
Error occurred.

**Payload:**
```javascript
{
  message: string  // Error message
}
```

---

## Game Master Events

### Client → Server Events

#### `gm_initialize`
Initialize a new game session.

**Payload:**
```javascript
{
  setting: string,           // Game setting description (optional if templateId provided)
  templateId: string,        // Game template ID from game_library (optional)
  timedMode: boolean,        // Enable timed game mode (optional, default: false)
  totalMinutes: number,      // Total game duration if timed (optional)
  autoPhaseCheck: boolean,   // Enable automatic phase analysis (optional, default: false)
  clearWorld: boolean        // Clear previous game data (optional, default: true)
}
```

**Response:**
- `sync_state` event with initial game state
- Clears all characters and story if clearWorld is true

**Example:**
```javascript
socket.emit('gm_initialize', {
  templateId: 'murhapeli',
  timedMode: false,
  autoPhaseCheck: false,
  clearWorld: true
});
```

---

#### `update_setting`
Update game setting description during gameplay.

**Payload:**
```javascript
{
  setting: string  // New setting description
}
```

**Response:**
- `game_config_updated` broadcast to all clients

---

#### `update_game_phase`
Update current game phase.

**Payload:**
```javascript
{
  phase: string,        // Phase name (e.g., 'Setup', 'Conflict', 'Resolution')
  description: string   // Phase description (optional)
}
```

**Response:**
- `game_config_updated` broadcast to all clients

---

#### `analyze_game_state`
Request dramaturgical analysis of current game state.

**Payload:** (none)

**Response:**
- `game_analysis_result` event with analysis

**Example:**
```javascript
socket.emit('analyze_game_state');
```

---

### Server → Client Events

#### `sync_state`
Full game state synchronization (sent after GM initialization).

**Payload:**
```javascript
{
  gameConfig: {
    setting: string,
    currentPhase: Object,
    availableRelationships: Array<string>,
    themes: Array<string>,
    // ... more config
  },
  story: {
    maxSize: number,
    entries: Array
  },
  characters: Array<Object>
}
```

---

#### `game_config_updated`
Game configuration updated.

**Payload:**
```javascript
{
  // Full updated game config object
}
```

---

#### `game_analysis_result`
Dramaturgical analysis result.

**Payload:**
```javascript
{
  analysis: string,      // Full analysis text
  timestamp: string      // ISO timestamp
}
```

---

#### `character_joined`
New character joined the game.

**Payload:**
```javascript
{
  // Full character object
}
```

---

## Shared Events

These events are broadcast to all connected clients.

#### `story_update`
See Player Events section.

#### `character_updated`
See Player Events section.

#### `game_config_updated`
See Game Master Events section.

---

## REST API Endpoints

### GET `/api/debug-prompts`
Get debug log of all LLM prompts and responses.

**Response:**
```javascript
[
  {
    timestamp: string,
    promptType: string,
    characterName: string,
    prompt: string,
    response: string,
    metadata: {
      model: string,
      provider: string,
      // ... more metadata
    }
  }
]
```

---

### GET `/api/game-templates`
List all available game templates.

**Response:**
```javascript
[
  {
    id: string,        // Template ID (filename without .md)
    name: string,      // Template display name
    format: 'markdown'
  }
]
```

---

### GET `/api/game-templates/:id`
Get specific game template content.

**Response:**
```javascript
{
  id: string,       // Template ID
  content: string   // Full markdown content
}
```

---

### GET `/api/characters`
Get all characters in current game.

**Response:**
```javascript
[
  {
    name: string,
    id: string,
    description: string,
    // ... full character data
  }
]
```

---

### GET `/api/characters/:id`
Get specific character data.

**Response:**
```javascript
{
  name: string,
  id: string,
  description: string,
  memory: {
    key_moments: Array,
    relationships: Object
  },
  // ... full character data
}
```

---

## Data Structures

### Character Object
```javascript
{
  name: string,               // Character display name
  id: string,                 // Character ID (lowercase_with_underscores)
  description: string,        // Character description
  personality: Array<string>, // Personality traits
  goals: Array<string>,       // Character goals
  status: 'active',           // Character status
  memory: {
    key_moments: [
      {
        timestamp: string,         // ISO timestamp
        content: string,           // Moment description (in character's language)
        emotionalWeight: number,   // 1-5 scale
        participants: Array<string> // Character IDs involved
      }
    ],
    relationships: {
      [charId]: {
        value: string,    // Relationship type (trust, suspect, romantic, etc.)
        intensity: number, // 1-5 scale
        notes: string     // Relationship notes (in character's language)
      }
    }
  },
  playerMeta: {
    language: string,      // Player's chosen language
    sessionCount: number,  // Number of sessions played
    joinedAt: string      // ISO timestamp of when character was created
  }
}
```

### Story Entry Object
```javascript
{
  id: number,              // Entry ID (timestamp)
  timestamp: string,       // Local time string (HH:MM:SS)
  targetChar: string,      // Character name
  targetId: string,        // Character ID
  instruction: string,     // The instruction/action text
  playerJoined: boolean,   // True if this is a join event
  playerSubmitted: boolean // True if player submitted this
}
```

### Game Config Object
```javascript
{
  setting: string,                    // Game world description
  currentPhase: {
    name: string,                     // Phase name
    description: string,              // Phase description
    lastUpdate: string               // ISO timestamp (optional)
  },
  availableRelationships: Array<string>, // Allowed relationship types
  physicalPropsGuidance: string,      // Props usage guidance
  themes: Array<string>,              // Game themes
  gameTimer: {
    mode: 'infinite' | 'timed',
    totalMinutes: number | null,
    startTime: string | null,
    endTime: string | null
  },
  autoPhaseCheck: {
    enabled: boolean,
    intervalMinutes: number,
    lastCheck: string | null
  }
}
```

---

## Error Handling

All socket events may emit an `error` event on failure:

```javascript
socket.on('error', (data) => {
  console.error('Error:', data.message);
});
```

Common error messages:
- `"Player name is required"`
- `"Character not found"`
- `"Character already exists"`
- `"Game not initialized. Game Master must start the game first."`
- `"Failed to generate prompt"`
- `"Tutorial failed"`
- `"Character creation failed"`

---

## Best Practices

1. **Always listen for errors:**
```javascript
socket.on('error', handleError);
```

2. **Validate input before emitting:**
```javascript
if (playerName && playerName.length > 0) {
  socket.emit('join_game', { playerName, language: 'fi' });
}
```

3. **Handle disconnections:**
```javascript
socket.on('disconnect', () => {
  console.log('Disconnected from server');
  // Attempt reconnection or show error to user
});
```

4. **Use proper character IDs:**
```javascript
const charId = playerName.toLowerCase().replace(/\s+/g, '_');
```

5. **Sanitize user input:**
```javascript
const sanitized = userInput.trim().substring(0, 5000);
```

---

## Example Workflows

### Player Joins and Plays

```javascript
// 1. Join game
socket.emit('join_game', {
  playerName: 'Jesse',
  language: 'fi'
});

// 2. Tutorial conversation
socket.on('tutorial_response', (data) => {
  if (data.createCharacter) {
    // 3. Create character
    socket.emit('create_character', {
      playerName: 'Jesse',
      language: 'fi',
      tutorialHistory: conversationHistory
    });
  }
});

// 4. Character created
socket.on('character_created', (data) => {
  const character = data.character;
  
  // 5. Request first prompt
  socket.emit('trigger_scene', {
    charId: character.id
  });
});

// 6. Receive prompt
socket.on('story_update', (entry) => {
  if (entry.targetId === myCharId) {
    console.log('Your instruction:', entry.instruction);
  }
});

// 7. Submit action
socket.emit('player_action', {
  charId: myCharId,
  action: 'What happened when I followed the instruction...'
});
```

### GM Starts Game

```javascript
// 1. Initialize game
socket.emit('gm_initialize', {
  templateId: 'murhapeli',
  clearWorld: true
});

// 2. Receive initial state
socket.on('sync_state', (state) => {
  console.log('Game initialized:', state.gameConfig.setting);
});

// 3. Monitor players
socket.on('character_joined', (character) => {
  console.log('New player:', character.name);
});

// 4. Analyze game state
socket.emit('analyze_game_state');

socket.on('game_analysis_result', (result) => {
  console.log('Dramaturgical analysis:', result.analysis);
});
```
