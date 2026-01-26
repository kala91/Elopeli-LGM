/**
 * Data Management Utilities
 * 
 * Centralized functions for loading and saving game data.
 * Includes error handling and validation.
 */

const fs = require('fs');
const path = require('path');
const { PATHS, GAME } = require('../config/constants');

// ============================================================================
// FILE I/O HELPERS
// ============================================================================

/**
 * Safely read and parse JSON file
 * @param {string} filePath - Path to JSON file
 * @param {*} defaultValue - Default value if file doesn't exist
 * @returns {*} Parsed JSON or default value
 */
function readJSONFile(filePath, defaultValue = null) {
    try {
        if (!fs.existsSync(filePath)) {
            return defaultValue;
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(\`❌ Error reading JSON file \${filePath}:\`, error.message);
        return defaultValue;
    }
}

/**
 * Safely write JSON to file
 * @param {string} filePath - Path to JSON file
 * @param {*} data - Data to write
 * @returns {boolean} Success status
 */
function writeJSONFile(filePath, data) {
    try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(\`❌ Error writing JSON file \${filePath}:\`, error.message);
        return false;
    }
}

// ============================================================================
// CHARACTER DATA MANAGEMENT
// ============================================================================

/**
 * Load character data from characters/{charId}.json
 * @param {string} charId - Character ID
 * @returns {Object|null} Character data or null if not found
 */
function loadCharacter(charId) {
    const charFile = path.join(PATHS.CHARACTERS_DIR, \`\${charId}.json\`);
    return readJSONFile(charFile, null);
}

/**
 * Save character data to characters/{charId}.json
 * @param {string} charId - Character ID
 * @param {Object} data - Character data
 * @returns {boolean} Success status
 */
function saveCharacter(charId, data) {
    const charFile = path.join(PATHS.CHARACTERS_DIR, \`\${charId}.json\`);
    return writeJSONFile(charFile, data);
}

/**
 * Get all character IDs
 * @returns {Array<string>} Array of character IDs
 */
function getAllCharacterIds() {
    try {
        if (!fs.existsSync(PATHS.CHARACTERS_DIR)) {
            return [];
        }
        return fs.readdirSync(PATHS.CHARACTERS_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => f.replace('.json', ''));
    } catch (error) {
        console.error('❌ Error reading characters directory:', error.message);
        return [];
    }
}

/**
 * Get all characters
 * @returns {Array<Object>} Array of character objects
 */
function getAllCharacters() {
    const charIds = getAllCharacterIds();
    return charIds
        .map(id => loadCharacter(id))
        .filter(c => c !== null);
}

// ============================================================================
// GAME CONFIG MANAGEMENT
// ============================================================================

/**
 * Load game config from game_config.json
 * @returns {Object} Game configuration
 */
function loadGameConfig() {
    const defaultConfig = {
        setting: '',
        currentPhase: { name: 'Alku', description: '' },
        availableRelationships: GAME.DEFAULT_RELATIONSHIPS,
        physicalPropsGuidance: '',
        themes: [],
        gameTimer: { 
            mode: 'infinite', 
            totalMinutes: null, 
            startTime: null, 
            endTime: null 
        },
        autoPhaseCheck: { 
            enabled: false, 
            intervalMinutes: 15, 
            lastCheck: null 
        }
    };
    
    return readJSONFile(PATHS.GAME_CONFIG, defaultConfig);
}

/**
 * Save game config to game_config.json
 * @param {Object} config - Game configuration
 * @returns {boolean} Success status
 */
function saveGameConfig(config) {
    return writeJSONFile(PATHS.GAME_CONFIG, config);
}

// ============================================================================
// STORY MANAGEMENT
// ============================================================================

/**
 * Load recent story from story_recent.json (circular buffer)
 * @returns {Object} Story object with maxSize and entries
 */
function loadRecentStory() {
    const defaultStory = { 
        maxSize: GAME.STORY_RECENT_MAX_SIZE, 
        entries: [] 
    };
    
    return readJSONFile(PATHS.STORY_RECENT, defaultStory);
}

/**
 * Append entry to story_recent.json (circular buffer - removes oldest if > maxSize)
 * @param {Object} entry - Story entry to add
 * @returns {Object} Updated story object
 */
function appendToRecentStory(entry) {
    const story = loadRecentStory();
    story.entries.push(entry);
    
    // Circular buffer: remove oldest if exceeded maxSize
    while (story.entries.length > story.maxSize) {
        story.entries.shift();
    }
    
    writeJSONFile(PATHS.STORY_RECENT, story);
    return story;
}

/**
 * Initialize story file with empty entries
 * @returns {boolean} Success status
 */
function initializeStory() {
    const story = { 
        maxSize: GAME.STORY_RECENT_MAX_SIZE, 
        entries: [] 
    };
    return writeJSONFile(PATHS.STORY_RECENT, story);
}

// ============================================================================
// DEBUG LOGGING
// ============================================================================

/**
 * Load debug prompts log
 * @returns {Array} Array of debug entries
 */
function loadDebugPrompts() {
    return readJSONFile(PATHS.PROMPT_DEBUG, []);
}

/**
 * Save debug prompts log
 * @param {Array} debugLog - Debug log entries
 * @returns {boolean} Success status
 */
function saveDebugPrompts(debugLog) {
    return writeJSONFile(PATHS.PROMPT_DEBUG, debugLog);
}

/**
 * Initialize debug prompts log
 * @returns {boolean} Success status
 */
function initializeDebugLog() {
    return writeJSONFile(PATHS.PROMPT_DEBUG, []);
}

// ============================================================================
// CLEANUP UTILITIES
// ============================================================================

/**
 * Clear all character files
 * @returns {boolean} Success status
 */
function clearAllCharacters() {
    try {
        if (fs.existsSync(PATHS.CHARACTERS_DIR)) {
            const files = fs.readdirSync(PATHS.CHARACTERS_DIR);
            files.forEach(f => {
                fs.unlinkSync(path.join(PATHS.CHARACTERS_DIR, f));
            });
        } else {
            fs.mkdirSync(PATHS.CHARACTERS_DIR, { recursive: true });
        }
        return true;
    } catch (error) {
        console.error('❌ Error clearing characters:', error.message);
        return false;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    // File I/O
    readJSONFile,
    writeJSONFile,
    
    // Character management
    loadCharacter,
    saveCharacter,
    getAllCharacterIds,
    getAllCharacters,
    
    // Game config
    loadGameConfig,
    saveGameConfig,
    
    // Story management
    loadRecentStory,
    appendToRecentStory,
    initializeStory,
    
    // Debug logging
    loadDebugPrompts,
    saveDebugPrompts,
    initializeDebugLog,
    
    // Cleanup
    clearAllCharacters
};
