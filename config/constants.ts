/**
 * Configuration Constants
 */
import path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data');

export const PATHS = {
    GAME_CONFIG: path.join(DATA_DIR, 'game_config.json'),
    STORY_RECENT: path.join(DATA_DIR, 'story_recent.json'),
    CHARACTERS_DIR: path.join(DATA_DIR, 'characters'),
    PROMPT_DEBUG: path.join(DATA_DIR, 'debug_prompts.json'),
    GAME_LIBRARY: path.join(DATA_DIR, 'game_library')
};

export const GAME = {
    STORY_RECENT_MAX_SIZE: 20,
    EXTRACTION_INTERVAL: parseInt(process.env.EXTRACTION_INTERVAL || '5', 10),
    EXTRACTION_ON_PLAYER_INPUT: process.env.EXTRACTION_ON_PLAYER_INPUT !== 'false',
    DEBUG_LOG_MAX_ENTRIES: 100,
    DEFAULT_RELATIONSHIPS: ['trust', 'suspect', 'romantic', 'alliance', 'rivalry', 'fear'],
    DEFAULT_LANGUAGE: 'fi'
};

export const VALIDATION_LIMITS = {
    PLAYER_NAME_MAX_LENGTH: 50,
    CHARACTER_ID_MAX_LENGTH: 50,
    TEXT_SHORT_MAX_LENGTH: 2000,
    TEXT_MEDIUM_MAX_LENGTH: 5000,
    TEXT_LONG_MAX_LENGTH: 10000,
    GAME_SETTING_MIN_LENGTH: 10
};

export const LANGUAGES: Record<string, string> = {
    fi: 'Finnish (suomeksi)',
    en: 'English',
    sv: 'Swedish (på svenska)',
    de: 'German (auf Deutsch)',
    fr: 'French (en français)'
};

export const SERVER = {
    PORT: process.env.PORT || 3000,
    DEFAULT_HOST: 'localhost'
};

export const ERROR_MESSAGES = {
    CHARACTER_NOT_FOUND: 'Character not found',
    CHARACTER_ALREADY_EXISTS: 'Character already exists',
    GAME_NOT_INITIALIZED: 'Game not initialized. Game Master must start the game first.',
    GAME_INITIALIZATION_FAILED: 'Game initialization failed',
    PLAYER_NAME_REQUIRED: 'Player name is required',
    FAILED_TO_GENERATE_PROMPT: 'Failed to generate prompt',
    FAILED_TO_JOIN_GAME: 'Failed to join game',
    TUTORIAL_FAILED: 'Tutorial failed',
    CHARACTER_CREATION_FAILED: 'Character creation failed',
    FAILED_TO_SUBMIT_ACTION: 'Failed to submit action',
    ANALYSIS_FAILED: 'Analysis failed',
    TEMPLATE_NOT_FOUND: 'Template not found',
    ERROR_LOADING_TEMPLATES: 'Error loading templates',
    ERROR_LOADING_TEMPLATE: 'Error loading template',
    ERROR_LOADING_CHARACTERS: 'Error loading characters',
    ERROR_LOADING_CHARACTER: 'Error loading character',
    ERROR_LOADING_DEBUG_DATA: 'Error loading debug data'
};
