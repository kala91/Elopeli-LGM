/**
 * Input Validation Utilities
 * 
 * Centralized validation functions to ensure data integrity
 * and prevent security issues.
 */

const { LANGUAGES, VALIDATION_LIMITS, ERROR_MESSAGES } = require('../config/constants');

/**
 * Validate player name
 * @param {string} name - Player name to validate
 * @returns {{valid: boolean, error: string|null}}
 */
function validatePlayerName(name) {
    if (!name || typeof name !== 'string') {
        return { valid: false, error: ERROR_MESSAGES.PLAYER_NAME_REQUIRED };
    }
    
    const trimmed = name.trim();
    
    if (trimmed.length === 0) {
        return { valid: false, error: ERROR_MESSAGES.PLAYER_NAME_REQUIRED };
    }
    
    if (trimmed.length > VALIDATION_LIMITS.PLAYER_NAME_MAX_LENGTH) {
        return { valid: false, error: `Player name too long (max ${VALIDATION_LIMITS.PLAYER_NAME_MAX_LENGTH} characters)` };
    }
    
    // Allow letters, numbers, spaces, and common special characters
    if (!/^[\p{L}\p{N}\s._-]+$/u.test(trimmed)) {
        return { valid: false, error: 'Player name contains invalid characters' };
    }
    
    return { valid: true, error: null };
}

/**
 * Validate language code
 * @param {string} lang - Language code
 * @returns {{valid: boolean, error: string|null}}
 */
function validateLanguage(lang) {
    if (!lang || typeof lang !== 'string') {
        return { valid: false, error: 'Language code is required' };
    }
    
    if (!LANGUAGES[lang]) {
        return { valid: false, error: `Unsupported language: ${lang}` };
    }
    
    return { valid: true, error: null };
}

/**
 * Validate character ID format
 * @param {string} charId - Character ID
 * @returns {{valid: boolean, error: string|null}}
 */
function validateCharacterId(charId) {
    if (!charId || typeof charId !== 'string') {
        return { valid: false, error: 'Character ID is required' };
    }
    
    // Character IDs should be lowercase alphanumeric with underscores
    if (!/^[a-z0-9_]+$/.test(charId)) {
        return { valid: false, error: 'Invalid character ID format' };
    }
    
    if (charId.length > VALIDATION_LIMITS.CHARACTER_ID_MAX_LENGTH) {
        return { valid: false, error: `Character ID too long (max ${VALIDATION_LIMITS.CHARACTER_ID_MAX_LENGTH} characters)` };
    }
    
    return { valid: true, error: null };
}

/**
 * Sanitize user input text
 * @param {string} text - Input text
 * @param {number} maxLength - Maximum allowed length (defaults to MEDIUM length)
 * @returns {string} Sanitized text
 */
function sanitizeText(text, maxLength = VALIDATION_LIMITS.TEXT_MEDIUM_MAX_LENGTH) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    // Trim whitespace
    let sanitized = text.trim();
    
    // Limit length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
}

/**
 * Validate game setting text
 * @param {string} setting - Game setting description
 * @returns {{valid: boolean, error: string|null}}
 */
function validateGameSetting(setting) {
    if (!setting || typeof setting !== 'string') {
        return { valid: false, error: 'Game setting is required' };
    }
    
    const trimmed = setting.trim();
    
    if (trimmed.length < VALIDATION_LIMITS.GAME_SETTING_MIN_LENGTH) {
        return { valid: false, error: `Game setting too short (minimum ${VALIDATION_LIMITS.GAME_SETTING_MIN_LENGTH} characters)` };
    }
    
    if (trimmed.length > VALIDATION_LIMITS.TEXT_LONG_MAX_LENGTH) {
        return { valid: false, error: `Game setting too long (maximum ${VALIDATION_LIMITS.TEXT_LONG_MAX_LENGTH} characters)` };
    }
    
    return { valid: true, error: null };
}

/**
 * Validate and sanitize conversation history
 * @param {Array} history - Conversation history array
 * @returns {Array} Validated and sanitized history
 */
function validateConversationHistory(history) {
    if (!Array.isArray(history)) {
        return [];
    }
    
    return history
        .filter(msg => msg && typeof msg === 'object' && msg.role && msg.content)
        .map(msg => ({
            role: msg.role === 'player' || msg.role === 'user' ? 'player' : 'assistant',
            content: sanitizeText(msg.content, VALIDATION_LIMITS.TEXT_SHORT_MAX_LENGTH)
        }))
        .slice(-20); // Keep only last 20 messages
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    validatePlayerName,
    validateLanguage,
    validateCharacterId,
    validateGameSetting,
    sanitizeText,
    validateConversationHistory
};
