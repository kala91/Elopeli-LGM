# Contributing to Elopeli-LGM

Thank you for your interest in contributing to the Elopeli-LGM digital LARP engine! 🎭

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Making Changes](#making-changes)
5. [Coding Standards](#coding-standards)
6. [Testing](#testing)
7. [Submitting Changes](#submitting-changes)

---

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Basic understanding of JavaScript/Node.js
- (Optional) LLM provider account (OpenRouter or local Ollama)

### First Steps

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/Elopeli-LGM.git`
3. Install dependencies: `npm install`
4. Copy `.env.example` to `.env` and configure
5. Start development server: `npm run dev`

---

## Development Setup

### Environment Configuration

Create a `.env` file:

```bash
# For cloud LLM (recommended for development)
API_PROVIDER=openrouter
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free

# For local LLM (optional)
# API_PROVIDER=ollama
# OLLAMA_MODEL=gemma2
```

### Development Mode

Use the dev script for auto-reload:

```bash
npm run dev
```

This uses Node.js `--watch` flag to automatically restart on file changes.

---

## Project Structure

```
Elopeli-LGM/
├── server.js                 # Main server (Socket.IO + Express)
├── config/
│   └── constants.js         # Centralized configuration
├── utils/
│   ├── dataManager.js       # File I/O operations
│   └── validators.js        # Input validation
├── llm/
│   ├── apiClient.js         # LLM provider interface
│   ├── promptAgent.js       # Action prompt generation
│   ├── memoryExtractor.js   # Memory extraction
│   ├── characterCreator.js  # Character generation
│   ├── tutorialAgent.js     # Tutorial conversations
│   └── dramaturgAgent.js    # Dramaturgical analysis
├── public/                  # Client-side HTML/JS
│   ├── index.html
│   ├── playerclient.html
│   ├── gamemaster.html
│   └── debug.html
├── data/
│   ├── game_library/        # Game templates
│   └── characters/          # Character data (runtime)
└── docs/
    ├── API_REFERENCE.md     # API documentation
    └── taxonomy.md          # Dramaturgical tools
```

---

## Making Changes

### Types of Contributions

1. **Bug Fixes** - Fix issues in existing functionality
2. **New Features** - Add new capabilities to the engine
3. **LLM Agents** - Improve or add new AI agents
4. **Game Templates** - Create new scenario templates
5. **Documentation** - Improve guides and references
6. **UI/UX** - Enhance client interfaces

### Before You Start

1. Check existing issues and PRs
2. Open an issue to discuss major changes
3. Keep changes focused and minimal
4. Follow the existing code style

---

## Coding Standards

### JavaScript Style

```javascript
// ✅ Good: Clear, documented functions
/**
 * Load character data from file
 * @param {string} charId - Character identifier
 * @returns {Object|null} Character data or null
 */
function loadCharacter(charId) {
    const charFile = path.join(CHARACTERS_DIR, `${charId}.json`);
    return readJSONFile(charFile, null);
}

// ❌ Bad: Undocumented, unclear
function load(id) {
    return JSON.parse(fs.readFileSync(`data/characters/${id}.json`));
}
```

### Code Organization

1. **Use existing utilities:**
   - `utils/dataManager.js` for file operations
   - `utils/validators.js` for input validation
   - `config/constants.js` for configuration

2. **Error handling:**
```javascript
// ✅ Good: Proper error handling
try {
    const data = readJSONFile(filePath, defaultValue);
    return processData(data);
} catch (error) {
    console.error('❌ Error processing data:', error.message);
    return defaultValue;
}

// ❌ Bad: No error handling
const data = JSON.parse(fs.readFileSync(filePath));
```

3. **Consistent logging:**
```javascript
console.log('🎮 Game initialized');      // GM actions
console.log('👋 Player joined');         // Player events
console.log('🎭 Generating prompt');     // Prompt generation
console.log('🧠 Memory extraction');     // Memory updates
console.log('❌ Error occurred');        // Errors
console.log('✅ Success');               // Success
console.log('ℹ️ Information');           // Info
console.log('⚠️ Warning');               // Warnings
```

### LLM Agent Development

When creating or modifying LLM agents:

1. **Keep agents stateless (oneshot):**
```javascript
// ✅ Good: Stateless function
async function generatePrompt(character, gameConfig, askLLM) {
    const prompt = buildPrompt(character, gameConfig);
    return await askLLM(prompt);
}

// ❌ Bad: Stateful class
class PromptAgent {
    constructor() {
        this.state = {};
    }
}
```

2. **Use structured prompts:**
```javascript
const prompt = `
## ROLE
You are...

## CONTEXT
${context}

## TASK
Generate...

## FORMAT
Return JSON: {...}
`;
```

3. **Handle JSON parsing robustly:**
```javascript
const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) 
    || response.match(/{[\s\S]*}/);
if (!jsonMatch) {
    console.warn('⚠️ No JSON found in response');
    return defaultValue;
}
```

### File Operations

Always use the data manager:

```javascript
// ✅ Good: Use dataManager
const { loadCharacter, saveCharacter } = require('./utils/dataManager');

const character = loadCharacter(charId);
if (character) {
    saveCharacter(charId, updatedData);
}

// ❌ Bad: Direct file operations
const data = JSON.parse(fs.readFileSync(`data/characters/${charId}.json`));
fs.writeFileSync(`data/characters/${charId}.json`, JSON.stringify(data));
```

### Input Validation

Always validate user input:

```javascript
// ✅ Good: Validate input
const { validatePlayerName } = require('./utils/validators');

const validation = validatePlayerName(playerName);
if (!validation.valid) {
    return socket.emit('error', { message: validation.error });
}

// ❌ Bad: No validation
const charId = playerName.toLowerCase();
```

---

## Testing

### Manual Testing

1. **Start clean:**
```bash
rm -rf data/characters/*.json
rm data/story_recent.json
rm data/game_config.json
npm start
```

2. **Test player flow:**
   - Join game → Tutorial → Character creation → Get prompt → Submit action
   
3. **Test GM flow:**
   - Initialize game → Monitor players → Analyze drama

4. **Test edge cases:**
   - Special characters in names
   - Very long inputs
   - Multiple players joining simultaneously
   - Network disconnections

### Automated Testing

Currently, there are no automated tests. Contributions to add test infrastructure are welcome!

**Future testing ideas:**
- Unit tests for validators
- Integration tests for LLM agents
- E2E tests for player/GM workflows

---

## Submitting Changes

### Pull Request Process

1. **Create a feature branch:**
```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes:**
   - Keep commits focused
   - Write clear commit messages
   - Test thoroughly

3. **Commit with clear messages:**
```bash
git commit -m "Add validation for character names

- Add validatePlayerName function
- Check for special characters
- Limit length to 50 characters
- Add unit tests"
```

4. **Push to your fork:**
```bash
git push origin feature/your-feature-name
```

5. **Open a Pull Request:**
   - Describe what you changed and why
   - Reference related issues
   - Include screenshots for UI changes
   - List testing performed

### PR Checklist

- [ ] Code follows project style
- [ ] Changes are minimal and focused
- [ ] No unnecessary dependencies added
- [ ] Error handling added
- [ ] Input validation included
- [ ] Documentation updated if needed
- [ ] Tested manually
- [ ] No console errors
- [ ] Committed files don't include runtime data

---

## Specific Contribution Areas

### Adding New LLM Agents

1. Create file in `llm/` directory
2. Export single stateless function
3. Accept `askLLM` as parameter
4. Document inputs and outputs
5. Handle errors gracefully
6. Use `config/constants.js` for configuration

### Creating Game Templates

1. Add `.md` file to `data/game_library/`
2. Follow template structure (see `data/game_library/README.md`)
3. Test with 2-3 players
4. Document player count and duration
5. Consider different tones (mystery, comedy, drama)

### Improving Documentation

1. Keep language clear and concise
2. Add examples for complex topics
3. Update table of contents
4. Include code snippets
5. Add troubleshooting sections

### UI/UX Improvements

1. Keep mobile-responsive design
2. Maintain accessibility
3. Test on different screen sizes
4. Follow existing visual style
5. Add loading states for async operations

---

## Code Review Process

All contributions go through code review:

1. **Automated checks** (if set up):
   - Linting
   - Tests
   
2. **Manual review**:
   - Code quality
   - Architecture fit
   - Security considerations
   - Performance impact

3. **Feedback iteration**:
   - Address reviewer comments
   - Make requested changes
   - Re-request review

---

## Questions or Issues?

- **Bug reports:** Open an issue with reproduction steps
- **Feature requests:** Open an issue with use case description
- **Questions:** Check existing documentation first, then open a discussion
- **Security issues:** Email maintainers privately (see README)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Thank You! 🙏

Every contribution helps make Elopeli-LGM better for everyone. Whether it's code, documentation, bug reports, or ideas - we appreciate your help!
