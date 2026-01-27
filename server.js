/**
 * DIGITAL LARP ENGINE - Server
 * 
 * Cognitive memory architecture with oneshot LLM agents
 * Game modules define semantic frameworks
 * Autonomous operation without hardcoded mechanics
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// LLM Agents (Oneshot agents for specific tasks)
const { askLLM, API_PROVIDER, MODEL } = require('./llm/apiClient');
const promptAgent = require('./llm/promptAgent');
const memoryExtractor = require('./llm/memoryExtractor');
const dramaturgAgent = require('./llm/dramaturgAgent');
const characterCreator = require('./llm/characterCreator');
const tutorialAgent = require('./llm/tutorialAgent');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ============================================================================
// CONFIGURATION
// ============================================================================

const GAME_CONFIG_FILE = path.join(__dirname, 'data', 'game_config.json');
const STORY_RECENT_FILE = path.join(__dirname, 'data', 'story_recent.json');
const CHARACTERS_DIR = path.join(__dirname, 'data', 'characters');
const PROMPT_DEBUG_FILE = path.join(__dirname, 'data', 'debug_prompts.json');
const GAME_LIBRARY_DIR = path.join(__dirname, 'data', 'game_library');

// ENV: Extraction interval (default: every 5th prompt)
const EXTRACTION_INTERVAL = parseInt(process.env.EXTRACTION_INTERVAL) || 5;
const EXTRACTION_ON_PLAYER_INPUT = process.env.EXTRACTION_ON_PLAYER_INPUT !== 'false'; // default true

// Counter for extraction trigger
let storyEntryCount = 0;

app.use(express.static('public'));
app.use(express.json());

// ============================================================================
// DATA MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Load character data from characters/{charId}.json
 */
function loadCharacter(charId) {
    const charFile = path.join(CHARACTERS_DIR, `${charId}.json`);
    if (!fs.existsSync(charFile)) {
        return null;
    }
    return JSON.parse(fs.readFileSync(charFile, 'utf8'));
}

/**
 * Save character data to characters/{charId}.json
 */
function saveCharacter(charId, data) {
    if (!fs.existsSync(CHARACTERS_DIR)) {
        fs.mkdirSync(CHARACTERS_DIR, { recursive: true });
    }
    const charFile = path.join(CHARACTERS_DIR, `${charId}.json`);
    fs.writeFileSync(charFile, JSON.stringify(data, null, 2));
}

/**
 * Load game config from game_config.json
 */
function loadGameConfig() {
    if (!fs.existsSync(GAME_CONFIG_FILE)) {
        // Return default empty config
        return {
            setting: '',
            currentPhase: { name: 'Alku', description: '' },
            availableRelationships: ['trust', 'suspect', 'romantic', 'alliance', 'rivalry', 'fear'],
            physicalPropsGuidance: '',
            themes: [],
            gameTimer: { mode: 'infinite', totalMinutes: null, startTime: null, endTime: null },
            autoPhaseCheck: { enabled: false, intervalMinutes: 15, lastCheck: null }
        };
    }
    return JSON.parse(fs.readFileSync(GAME_CONFIG_FILE, 'utf8'));
}

/**
 * Save game config to game_config.json
 */
function saveGameConfig(config) {
    fs.writeFileSync(GAME_CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Load recent story from story_recent.json (circular buffer)
 */
function loadRecentStory() {
    if (!fs.existsSync(STORY_RECENT_FILE)) {
        return { maxSize: 20, entries: [] };
    }
    return JSON.parse(fs.readFileSync(STORY_RECENT_FILE, 'utf8'));
}

/**
 * Append entry to story_recent.json (circular buffer - removes oldest if > maxSize)
 */
function appendToRecentStory(entry) {
    const story = loadRecentStory();
    story.entries.push(entry);
    
    // Circular buffer: remove oldest if exceeded maxSize
    if (story.entries.length > story.maxSize) {
        story.entries.shift();
    }
    
    fs.writeFileSync(STORY_RECENT_FILE, JSON.stringify(story, null, 2));
    return story;
}

/**
 * Get all character IDs
 */
function getAllCharacterIds() {
    if (!fs.existsSync(CHARACTERS_DIR)) {
        return [];
    }
    return fs.readdirSync(CHARACTERS_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
}

// ============================================================================
// MEMORY EXTRACTION FLOW (Background, non-blocking)
// ============================================================================

/**
 * Process new story entry - trigger memory extraction if needed
 * This runs in BACKGROUND (non-blocking for player)
 */
async function processMemoryExtraction(entry) {
    try {
        // Trigger conditions:
        // 1. Every Nth entry (EXTRACTION_INTERVAL)
        // 2. Player input (playerSubmitted === true)
        const shouldExtract = 
            (storyEntryCount % EXTRACTION_INTERVAL === 0) ||
            (EXTRACTION_ON_PLAYER_INPUT && entry.playerSubmitted);

        if (!shouldExtract) {
            return;
        }

        console.log(`🧠 Memory Extraction triggered (entry #${storyEntryCount})`);

        const gameConfig = loadGameConfig();
        const recentStory = loadRecentStory();
        
        // Get recent entries (last 15 to ensure full context)
        // Story buffer is max 20, so analyzing 15 gives us good coverage without overwhelming LLM
        const entriesToAnalyze = recentStory.entries.slice(-15);
        
        // Get all participant character IDs from recent entries
        const participantIds = [...new Set(
            entriesToAnalyze
                .filter(e => e.targetId && !e.playerJoined)
                .map(e => e.targetId)
        )];

        if (participantIds.length === 0) {
            console.log('ℹ️ No participants to extract memories for');
            return;
        }

        // Build participant languages object {charId: 'fi', ...}
        const participantLanguages = {};
        for (const charId of participantIds) {
            const char = loadCharacter(charId);
            participantLanguages[charId] = char?.playerMeta?.language || 'fi';
        }

        // Extract memories (one LLM call for all participants, each in their own language)
        const memories = await memoryExtractor.extractMemories(
            entriesToAnalyze,
            participantIds,
            gameConfig.availableRelationships,
            askLLM,
            participantLanguages
        );

        // Save memories to each character file
        for (const [charId, charMemories] of Object.entries(memories)) {
            const character = loadCharacter(charId);
            if (!character) continue;

            // Append key_moments
            if (charMemories.key_moments && charMemories.key_moments.length > 0) {
                if (!character.memory) character.memory = {};
                if (!character.memory.key_moments) character.memory.key_moments = [];
                character.memory.key_moments.push(...charMemories.key_moments);
            }

            // Update relationships
            if (charMemories.relationshipChanges && charMemories.relationshipChanges.length > 0) {
                if (!character.memory) character.memory = {};
                if (!character.memory.relationships) character.memory.relationships = {};
                
                for (const relChange of charMemories.relationshipChanges) {
                    character.memory.relationships[relChange.targetCharId] = {
                        value: relChange.value,
                        intensity: relChange.intensity,
                        notes: relChange.reason
                    };
                }
            }

            saveCharacter(charId, character);
            
            console.log(`✅ Memory updated for ${charId}: +${charMemories.key_moments?.length || 0} moments, +${charMemories.relationshipChanges?.length || 0} relationships`);
            
            // Emit character_updated event with full character data
            io.emit('character_updated', { 
                charId,
                character: character // Send full updated character data
            });
        }

    } catch (error) {
        console.error('❌ Memory extraction error:', error.message);
    }
}

// ============================================================================
// REST API ENDPOINTS
// ============================================================================

// Get debug prompts
app.get('/api/debug-prompts', (req, res) => {
    try {
        if (!fs.existsSync(PROMPT_DEBUG_FILE)) {
            return res.json([]);
        }
        const debugData = JSON.parse(fs.readFileSync(PROMPT_DEBUG_FILE, 'utf8'));
        res.json(debugData);
    } catch (error) {
        console.error('Error reading debug prompts:', error);
        res.status(500).json({ error: 'Error loading debug data' });
    }
});

// List all game templates
app.get('/api/game-templates', (req, res) => {
    try {
        if (!fs.existsSync(GAME_LIBRARY_DIR)) {
            fs.mkdirSync(GAME_LIBRARY_DIR, { recursive: true });
        }
        
        const files = fs.readdirSync(GAME_LIBRARY_DIR)
            .filter(file => file.endsWith('.md') && file !== 'README.md');
        
        const templates = files.map(file => {
            const filePath = path.join(GAME_LIBRARY_DIR, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            const nameLine = lines.find(l => l.startsWith('# '));
            
            return {
                id: file.replace('.md', ''),
                name: nameLine ? nameLine.replace('# ', '').trim() : file.replace('.md', ''),
                format: 'markdown'
            };
        });
        
        res.json(templates);
    } catch (error) {
        console.error('Error loading game templates:', error);
        res.status(500).json({ error: 'Error loading templates' });
    }
});

// Get single game template
app.get('/api/game-templates/:id', (req, res) => {
    try {
        const templateId = req.params.id;
        const filePath = path.join(GAME_LIBRARY_DIR, `${templateId}.md`);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Template not found' });
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        res.json({ id: templateId, content });
    } catch (error) {
        console.error('Error loading game template:', error);
        res.status(500).json({ error: 'Error loading template' });
    }
});

// Get all characters (for GM view)
app.get('/api/characters', (req, res) => {
    try {
        const charIds = getAllCharacterIds();
        const characters = charIds.map(id => loadCharacter(id)).filter(c => c !== null);
        res.json(characters);
    } catch (error) {
        console.error('Error loading characters:', error);
        res.status(500).json({ error: 'Error loading characters' });
    }
});

// Get single character (for player view)
app.get('/api/characters/:id', (req, res) => {
    try {
        const charId = req.params.id;
        const character = loadCharacter(charId);
        
        if (!character) {
            return res.status(404).json({ error: 'Character not found' });
        }
        
        res.json(character);
    } catch (error) {
        console.error('Error loading character:', error);
        res.status(500).json({ error: 'Error loading character' });
    }
});

// ============================================================================
// SOCKET.IO EVENT HANDLERS
// ============================================================================

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // === GM INITIALIZATION ===
    socket.on('gm_initialize', async (config) => {
        try {
            console.log('🎮 GM initializing game');

            // Load template from game_library if templateId provided
            let setting = config.setting || '';
            let availableRelationships = ['trust', 'suspect', 'romantic', 'alliance', 'rivalry', 'fear'];
            let themes = [];
            let physicalPropsGuidance = '';

            // Try to detect template from setting text or use default
            const templateFiles = fs.existsSync(GAME_LIBRARY_DIR) 
                ? fs.readdirSync(GAME_LIBRARY_DIR).filter(f => f.endsWith('.md') && f !== 'README.md')
                : [];
            
            // Load template if provided OR if setting is empty/undefined
            const shouldLoadTemplate = !config.setting || config.setting.trim() === '' || config.templateId;
            const templateToLoad = config.templateId || (templateFiles.length > 0 ? templateFiles[0] : null);
            
            if (templateToLoad && shouldLoadTemplate) {
                // Load template
                const templateFileName = templateToLoad.endsWith('.md') ? templateToLoad : `${templateToLoad}.md`;
                const templateFile = path.join(GAME_LIBRARY_DIR, templateFileName);
                
                console.log(`📋 Loading template: ${templateFileName}`);
                
                const templateContent = fs.readFileSync(templateFile, 'utf8');
                
                // Parse template content
                const settingMatch = templateContent.match(/## Setting\s+([^#]+)/);
                if (settingMatch) setting = settingMatch[1].trim();

                const relMatch = templateContent.match(/## Available Relationships\s+([^\n#]+)/);
                if (relMatch) {
                    availableRelationships = relMatch[1].split(',').map(r => r.trim());
                }

                const themesMatch = templateContent.match(/## Themes\s+([^\n#]+)/);
                if (themesMatch) {
                    themes = themesMatch[1].split(',').map(t => t.trim());
                }

                const propsMatch = templateContent.match(/## Physical Props Guidance\s+([^#]+)/);
                if (propsMatch) physicalPropsGuidance = propsMatch[1].trim();
            }

            // Initialize game_config.json
            const gameConfig = {
                setting: setting || config.setting || '',
                currentPhase: {
                    name: 'Alku',
                    description: 'Peli alkaa'
                },
                availableRelationships,
                physicalPropsGuidance,
                themes,
                gameTimer: {
                    mode: config.timedMode ? 'timed' : 'infinite',
                    totalMinutes: config.totalMinutes || null,
                    startTime: config.timedMode ? new Date().toISOString() : null,
                    endTime: config.timedMode && config.totalMinutes
                        ? new Date(Date.now() + config.totalMinutes * 60000).toISOString()
                        : null
                },
                autoPhaseCheck: {
                    enabled: config.autoPhaseCheck || false,
                    intervalMinutes: 15,
                    lastCheck: null
                }
            };
            
            console.log(`✅ Game config created:`, {
                setting: gameConfig.setting.substring(0, 50) + '...',
                themes: gameConfig.themes,
                relationships: gameConfig.availableRelationships.length
            });

            saveGameConfig(gameConfig);

            // Initialize story_recent.json
            fs.writeFileSync(STORY_RECENT_FILE, JSON.stringify({ maxSize: 20, entries: [] }, null, 2));
            
            // Clear debug prompts log
            if (config.clearWorld || config.clearWorld === undefined) {
                fs.writeFileSync(PROMPT_DEBUG_FILE, JSON.stringify([], null, 2));
            }

            // Clear characters directory
            if (fs.existsSync(CHARACTERS_DIR)) {
                const files = fs.readdirSync(CHARACTERS_DIR);
                files.forEach(f => fs.unlinkSync(path.join(CHARACTERS_DIR, f)));
            } else {
                fs.mkdirSync(CHARACTERS_DIR, { recursive: true });
            }

            // Reset entry counter
            storyEntryCount = 0;

            io.emit('sync_state', {
                gameConfig,
                story: { maxSize: 20, entries: [] },
                characters: []
            });

            console.log('✅ Game initialized');

        } catch (error) {
            console.error('❌ GM initialization error:', error);
            socket.emit('error', { message: 'Game initialization failed' });
        }
    });

    // === PLAYER JOIN (just enters tutorial, no character yet) ===
    socket.on('join_game', async (data) => {
        try {
            const playerName = data.playerName || data.name;
            const language = data.language || 'fi';
            
            if (!playerName) {
                return socket.emit('error', { message: 'Player name is required' });
            }
            
            console.log(`👋 Player entered: ${playerName}`);
            
            const gameConfig = loadGameConfig();
            
            // Check if game has been initialized
            if (!gameConfig.setting || gameConfig.setting === '') {
                return socket.emit('error', { 
                    message: 'Game not initialized. Game Master must start the game first.' 
                });
            }
            
            // Player joins successfully - tutorial mode will start on client side
            console.log(`✅ ${playerName} ready for tutorial`);

        } catch (error) {
            console.error('❌ Join game error:', error);
            socket.emit('error', { message: 'Failed to join game' });
        }
    });

    // === PLAYER REQUESTS PROMPT ===
    socket.on('trigger_scene', async (data) => {
        try {
            const { charId } = data;
            
            console.log(`🎭 ${charId} requests prompt`);

            const character = loadCharacter(charId);
            if (!character) {
                return socket.emit('error', { message: 'Character not found' });
            }

            const gameConfig = loadGameConfig();
            const recentStory = loadRecentStory();
            
            // Load all characters for context (so agent knows other players)
            const allCharacterIds = getAllCharacterIds();
            const allCharacters = allCharacterIds.map(id => loadCharacter(id)).filter(c => c !== null);

            // Generate prompt using PromptAgent
            const instruction = await promptAgent.buildActionPrompt(
                character,
                allCharacters,
                gameConfig,
                recentStory.entries,
                askLLM
            );

            // Save to story
            const newEntry = {
                id: Date.now(),
                timestamp: new Date().toLocaleTimeString('fi-FI'),
                targetChar: character.name,
                targetId: character.id,
                instruction,
                playerJoined: false,
                playerSubmitted: false
            };

            appendToRecentStory(newEntry);
            storyEntryCount++;

            // Broadcast story update
            io.emit('story_update', newEntry);

            // Trigger memory extraction (background, non-blocking)
            setImmediate(() => processMemoryExtraction(newEntry));

            console.log(`✅ Prompt generated for ${charId}`);

        } catch (error) {
            console.error('❌ Trigger scene error:', error);
            socket.emit('error', { message: 'Failed to generate prompt' });
        }
    });

    // === PLAYER TUTORIAL (before character creation) ===
    socket.on('player_tutorial', async (data) => {
        try {
            const { playerName, message, language, conversationHistory } = data;
            
            console.log(`💬 Tutorial request from ${playerName}: ${message.substring(0, 50)}...`);
            
            const gameConfig = loadGameConfig();
            
            // Get all existing characters for context
            const allCharacterIds = getAllCharacterIds();
            const existingCharacters = allCharacterIds.map(id => loadCharacter(id)).filter(c => c !== null);
            
            // Get recent story for context
            const recentStory = loadRecentStory();
            
            // Get tutorial response (returns {response, toolCall})
            const result = await tutorialAgent.handleTutorial(
                playerName,
                message,
                gameConfig,
                existingCharacters,
                recentStory.entries || [], // Pass recent story so new players can see what's happening
                language || 'fi',
                conversationHistory || [],
                askLLM
            );
            
            // Send response to client
            const responseData = {
                response: result.response,
                createCharacter: result.toolCall?.tool === 'createCharacter'
            };
            
            console.log(`📤 Sending to client - createCharacter: ${responseData.createCharacter}, toolCall:`, result.toolCall);
            
            socket.emit('tutorial_response', responseData);
            
            console.log(`✅ Tutorial response sent. Tool call: ${result.toolCall ? 'YES' : 'NO'}`);
            
        } catch (error) {
            console.error('❌ Tutorial error:', error);
            socket.emit('error', { message: 'Tutorial failed' });
        }
    });
    
    // === CREATE CHARACTER ===
    socket.on('create_character', async (data) => {
        try {
            console.log(`📥 Received create_character event:`, data);
            
            const { playerName, language, tutorialHistory } = data;
            const charId = playerName.toLowerCase().replace(/\s+/g, '_');
            
            console.log(`🎨 Creating character for ${playerName}`);
            
            // Check if character already exists
            if (loadCharacter(charId)) {
                return socket.emit('error', { message: 'Character already exists' });
            }
            
            const gameConfig = loadGameConfig();
            
            // Get existing characters for context
            const allCharacterIds = getAllCharacterIds();
            const existingCharacters = allCharacterIds.map(id => loadCharacter(id)).filter(c => c !== null);
            
            // Extract player wishes from tutorial history
            let characterWishes = '';
            if (tutorialHistory && tutorialHistory.length > 0) {
                characterWishes = tutorialHistory
                    .filter(msg => msg.role === 'player')
                    .map(msg => msg.content)
                    .join(' | ');
            }
            
            console.log(`📝 Character wishes: ${characterWishes.substring(0, 100)}...`);
            
            // Generate character data WITH tutorial context (returns JSON object)
            const characterData = await characterCreator.createCharacter(
                playerName,
                existingCharacters,
                gameConfig,
                language || 'fi',
                askLLM,
                characterWishes
            );
            
            // Build relationships object from characterData.relationships array
            const relationshipsObj = {};
            if (characterData.relationships && characterData.relationships.length > 0) {
                for (const rel of characterData.relationships) {
                    // Find target character by name
                    const targetChar = existingCharacters.find(c => c.name.toLowerCase() === rel.targetCharName.toLowerCase());
                    if (targetChar) {
                        relationshipsObj[targetChar.id] = {
                            value: rel.value,
                            intensity: rel.intensity || 3,
                            reason: rel.reason || 'Connection from character creation'
                        };
                    } else {
                        console.warn(`⚠️ Character ${rel.targetCharName} not found for relationship`);
                    }
                }
            }
            
            const character = {
                name: playerName,
                id: charId,
                description: characterData.description || `A character in ${gameConfig.setting}`,
                personality: characterData.personality || [],
                goals: characterData.goals || [],
                status: 'active',
                memory: {
                    key_moments: [],
                    relationships: relationshipsObj
                },
                playerMeta: {
                    language: language || 'fi',
                    sessionCount: 1,
                    joinedAt: new Date().toISOString()
                }
            };
            
            saveCharacter(charId, character);
            
            // Add join entry to story
            const joinEntry = {
                id: Date.now(),
                timestamp: new Date().toLocaleTimeString('fi-FI'),
                targetChar: character.name,
                targetId: character.id,
                instruction: `[PELAAJA LIITTYI] ${character.name} liittyi peliin.`,
                playerJoined: true,
                playerSubmitted: false
            };
            
            appendToRecentStory(joinEntry);
            storyEntryCount++;
            
            // Broadcast
            io.emit('story_update', joinEntry);
            io.emit('character_joined', character);
            
            socket.emit('character_created', { character });
            
            console.log(`✅ Character created: ${playerName}`);
            
        } catch (error) {
            console.error('❌ Character creation error:', error);
            socket.emit('error', { message: 'Character creation failed' });
        }
    });

    // === PLAYER SUBMITS ACTION ===
    socket.on('player_action', async (data) => {
        try {
            const { charId, action } = data;

            console.log(`📝 ${charId} submitted action: ${action.substring(0, 50)}...`);

            const character = loadCharacter(charId);
            if (!character) {
                return socket.emit('error', { message: 'Character not found' });
            }

            // Save player input to story
            const newEntry = {
                id: Date.now(),
                timestamp: new Date().toLocaleTimeString('fi-FI'),
                targetChar: character.name,
                targetId: character.id,
                instruction: `[PELAAJAN TOIMINTA] ${action}`,
                playerJoined: false,
                playerSubmitted: true // IMPORTANT: triggers extraction
            };

            appendToRecentStory(newEntry);
            storyEntryCount++;

            // Broadcast
            io.emit('story_update', newEntry);

            // Trigger memory extraction (background, non-blocking)
            // This will ALWAYS run because playerSubmitted === true
            setImmediate(() => processMemoryExtraction(newEntry));

            socket.emit('action_received', { success: true });

        } catch (error) {
            console.error('❌ Player action error:', error);
            socket.emit('error', { message: 'Failed to submit action' });
        }
    });

    // === GM UPDATES GAME STATE ===
    socket.on('update_setting', (data) => {
        try {
            const gameConfig = loadGameConfig();
            gameConfig.setting = data.setting;
            saveGameConfig(gameConfig);
            io.emit('game_config_updated', gameConfig);
        } catch (error) {
            console.error('Update setting error:', error);
        }
    });

    socket.on('update_game_phase', (data) => {
        try {
            const gameConfig = loadGameConfig();
            gameConfig.currentPhase = {
                name: data.phase,
                description: data.description || ''
            };
            gameConfig.currentPhase.lastUpdate = new Date().toISOString();
            saveGameConfig(gameConfig);
            io.emit('game_config_updated', gameConfig);
        } catch (error) {
            console.error('Update phase error:', error);
        }
    });

    // === DRAMATURGY ANALYSIS ===
    socket.on('analyze_game_state', async () => {
        try {
            console.log('🎬 Dramaturg analysis requested by GM');

            const gameConfig = loadGameConfig();
            const recentStory = loadRecentStory();

            const analysis = await dramaturgAgent.buildDramaturgyPrompt(
                gameConfig,
                recentStory.entries,
                askLLM
            );

            gameConfig.currentPhase.description = analysis.substring(0, 500); // Store brief analysis
            gameConfig.currentPhase.lastUpdate = new Date().toISOString();
            saveGameConfig(gameConfig);

            io.emit('game_analysis_result', {
                analysis,
                timestamp: new Date().toISOString()
            });

            console.log('✅ Dramaturgy analysis complete');

        } catch (error) {
            console.error('❌ Analyze game state error:', error);
            socket.emit('error', { message: 'Analysis failed' });
        }
    });

    // === GM NOTES ===
    socket.on('gm_notes', (data) => {
        try {
            const { notes, timestamp } = data;
            
            // Validate input
            if (!notes || typeof notes !== 'string') {
                return socket.emit('error', { message: 'Invalid GM notes' });
            }
            
            // Sanitize and limit length
            const sanitizedNotes = notes.trim().substring(0, 1000); // Max 1000 chars
            
            if (sanitizedNotes.length === 0) {
                return socket.emit('error', { message: 'GM notes cannot be empty' });
            }
            
            console.log('📝 GM Notes received:', sanitizedNotes.substring(0, 50) + '...');

            const gameConfig = loadGameConfig();
            
            // Initialize gmNotes array if it doesn't exist
            if (!gameConfig.gmNotes) {
                gameConfig.gmNotes = [];
            }
            
            // Add new note
            gameConfig.gmNotes.push({
                content: sanitizedNotes,
                timestamp: timestamp || new Date().toISOString()
            });
            
            // Keep only last 10 notes
            if (gameConfig.gmNotes.length > 10) {
                gameConfig.gmNotes = gameConfig.gmNotes.slice(-10);
            }
            
            saveGameConfig(gameConfig);
            
            console.log('✅ GM Notes saved to dramaturgia context');
            
        } catch (error) {
            console.error('❌ GM Notes error:', error);
            socket.emit('error', { message: 'Failed to save GM notes' });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Digital LARP Engine running on port ${PORT}`);
    console.log(`📊 API Provider: ${API_PROVIDER}`);
    console.log(`🤖 Model: ${MODEL}`);
    console.log(`🧠 Memory Extraction: Every ${EXTRACTION_INTERVAL} prompts + player inputs`);
});
