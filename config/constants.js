/**
 * Configuration Constants
 * 
 * Centralized configuration values to improve maintainability
 * and reduce magic numbers throughout the codebase.
 */

const path = require('path');

// ============================================================================
// FILE PATHS
// ============================================================================

const DATA_DIR = path.join(__dirname, '..', 'data');

const PATHS = {
    GAME_CONFIG: path.join(DATA_DIR, 'game_config.json'),
    STORY_RECENT: path.join(DATA_DIR, 'story_recent.json'),
    CHARACTERS_DIR: path.join(DATA_DIR, 'characters'),
    PROMPT_DEBUG: path.join(DATA_DIR, 'debug_prompts.json'),
    GAME_LIBRARY: path.join(DATA_DIR, 'game_library')
};

// ============================================================================
// GAME CONFIGURATION
// ============================================================================

const GAME = {
    // Story buffer configuration
    STORY_RECENT_MAX_SIZE: 20,
    
    // Memory extraction triggers
    EXTRACTION_INTERVAL: parseInt(process.env.EXTRACTION_INTERVAL) || 5,
    EXTRACTION_ON_PLAYER_INPUT: process.env.EXTRACTION_ON_PLAYER_INPUT !== 'false',
    
    // Debug log retention
    DEBUG_LOG_MAX_ENTRIES: 100,
    
    // Default relationships
    DEFAULT_RELATIONSHIPS: ['trust', 'suspect', 'romantic', 'alliance', 'rivalry', 'fear'],
    
    // Default language
    DEFAULT_LANGUAGE: 'fi'
};

// ============================================================================
// SUPPORTED LANGUAGES
// ============================================================================

const LANGUAGES = {
    'fi': 'Finnish (suomeksi)',
    'en': 'English',
    'sv': 'Swedish (på svenska)',
    'de': 'German (auf Deutsch)',
    'fr': 'French (en français)'
};

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================

const SERVER = {
    PORT: process.env.PORT || 3000,
    DEFAULT_HOST: 'localhost'
};

// ============================================================================
// ERROR MESSAGES
// ============================================================================

const ERROR_MESSAGES = {
    // Character errors
    CHARACTER_NOT_FOUND: 'Character not found',
    CHARACTER_ALREADY_EXISTS: 'Character already exists',
    
    // Game errors
    GAME_NOT_INITIALIZED: 'Game not initialized. Game Master must start the game first.',
    GAME_INITIALIZATION_FAILED: 'Game initialization failed',
    
    // Player errors
    PLAYER_NAME_REQUIRED: 'Player name is required',
    
    // API errors
    FAILED_TO_GENERATE_PROMPT: 'Failed to generate prompt',
    FAILED_TO_JOIN_GAME: 'Failed to join game',
    TUTORIAL_FAILED: 'Tutorial failed',
    CHARACTER_CREATION_FAILED: 'Character creation failed',
    FAILED_TO_SUBMIT_ACTION: 'Failed to submit action',
    ANALYSIS_FAILED: 'Analysis failed',
    
    // Template errors
    TEMPLATE_NOT_FOUND: 'Template not found',
    ERROR_LOADING_TEMPLATES: 'Error loading templates',
    ERROR_LOADING_TEMPLATE: 'Error loading template',
    
    // Data errors
    ERROR_LOADING_CHARACTERS: 'Error loading characters',
    ERROR_LOADING_CHARACTER: 'Error loading character',
    ERROR_LOADING_DEBUG_DATA: 'Error loading debug data'
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    PATHS,
    GAME,
    LANGUAGES,
    SERVER,
    ERROR_MESSAGES
};
