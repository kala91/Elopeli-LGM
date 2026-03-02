# Game Library - LARP Scenario Templates

This directory contains game scenario templates that define the semantic frameworks for different LARP experiences.

## Available Templates

### 🔪 murhapeli.md
**Genre:** Murder Mystery  
**Setting:** 1920s mansion during a storm  
**Tone:** Classic detective mystery with betrayal and secrets  
**Players:** 4-8  
**Duration:** 1-3 hours

### 🚀 scifi_asema.md
**Genre:** Sci-Fi Thriller  
**Setting:** Space station orbiting Jupiter in 2157  
**Tone:** Tense, paranoid survival drama  
**Players:** 4-8  
**Duration:** 1-2 hours

### 💼 toimistokomedia.md
**Genre:** Workplace Comedy  
**Setting:** Modern IT office in Helsinki  
**Tone:** Light, comedic, everyday chaos  
**Players:** 4-10  
**Duration:** 1-2 hours

---

## Creating Your Own Template

Templates are written in Markdown and follow a specific structure that the game engine parses.

### Template Structure

```markdown
# Your Game Title

## Setting

Detailed description of the game world, situation, and initial conditions.
Include:
- Time period and location
- Current situation/crisis
- Physical elements available in the game space
- Atmosphere and tone

Example:
"Year 2050. Underground bunker. Nuclear winter outside. 
Limited resources. Trust is breaking down..."

## Available Relationships

Comma-separated list of relationship types that characters can have.

Common types:
- trust, suspect, romantic, alliance, rivalry, fear
- friendship, mentorship, dependency, professional_respect
- family_bond, old_grudge, secret_alliance

Example:
trust, suspect, romantic, alliance, rivalry, fear

## Physical Props Guidance

How physical props and space should be used in this scenario.
Remember: props are symbolic, not literal.

Example:
"Items are symbolic. Focus on who handles what and when.
Physical space can represent different rooms/areas."

## Themes

Comma-separated list of thematic elements that should guide the drama.

Common themes:
- betrayal, secrets, survival, isolation, ambition
- family_ties, class_conflict, technology, paranoia
- comedy, everyday_chaos, workplace_dynamics

Example:
survival, isolation, technology, paranoia, sacrifice
```

### Complete Example

```markdown
# Haunted Hotel

## Setting

1890s Grand Hotel in the Swiss Alps. A famous author has been found dead in their room. All guests and staff are snowed in for 3 days. Strange occurrences happen at night. Everyone has a secret reason for being at the hotel. The dead author's latest manuscript is missing.

**Physical elements:**
- Hotel areas: Lobby, Dining Room, Library, Guest Rooms, Basement
- The missing manuscript
- Strange noises and lights
- Snowstorm outside

**Atmosphere:**
- Gothic mystery
- Supernatural undertones
- Class tensions (guests vs. staff)
- Growing paranoia

## Available Relationships
trust, suspect, fear, alliance, rivalry, old_connection, grudge

## Physical Props Guidance
The physical space should evoke Victorian-era hotel ambiance. Props can be minimal but symbolic - a book for the manuscript, dimmed lights for mood. Focus on character interactions in different "rooms" (areas of play space).

## Themes
mystery, supernatural, class_conflict, secrets, paranoia, gothic_horror
```

---

## Guidelines for Creating Scenarios

### 1. **Setting: Be Specific but Flexible**
- Provide clear context (time, place, situation)
- Leave room for player creativity
- Include physical elements players can reference
- Define the initial crisis or situation

### 2. **Relationships: Match Your Theme**
- 4-8 relationship types work best
- Consider your genre (mystery, comedy, drama)
- Include both positive and negative dynamics
- Think about power dynamics

### 3. **Props: Symbolic, Not Literal**
- Props represent dramatic focal points
- Don't require specific physical items
- Focus on interaction, not inventory
- Simple is better

### 4. **Themes: Guide the Drama**
- 3-6 themes provide focus
- Mix internal and external conflicts
- Consider emotional range
- Match your desired tone

---

## Testing Your Template

1. **Save as `yourtemplate.md`** in this directory
2. **Restart the server** (templates are loaded at startup)
3. **Open Game Master view** at http://localhost:3000/gamemaster.html
4. **Select your template** from the dropdown
5. **Start game** and test with 2-3 players

### What to Check:
- [ ] Setting is clear and evocative
- [ ] Relationships make sense for the scenario
- [ ] Themes guide the AI well
- [ ] Players understand what to do
- [ ] Drama emerges naturally

---

## Template Best Practices

### ✅ DO:
- Create clear, evocative settings
- Define realistic time periods and locations
- Include physical space descriptions
- Specify relationship types relevant to your story
- Keep themes focused and coherent
- Consider different player counts
- Think about emotional range (comedy, drama, thriller)

### ❌ DON'T:
- Write rigid plotlines (let players create the story)
- Require specific props or costumes
- Make too many relationship types (max 8)
- Mix incompatible tones (e.g., horror + slapstick)
- Assume players know the genre conventions
- Create scenarios that need a GM to run

---

## Scenario Ideas

### Mystery/Thriller
- Archaeological dig - ancient curse awakens
- Luxury cruise - theft of priceless artifact
- Research station - experiment goes wrong
- Medieval castle - political intrigue

### Drama
- Family reunion - old secrets resurface
- Theater company - opening night disasters
- Hospital - ethical dilemmas during crisis
- School - social dynamics and competition

### Comedy
- Wedding planning gone wrong
- Reality TV show production
- Corporate retreat chaos
- Moving day disasters

### Sci-Fi/Fantasy
- Generation ship - arrival at destination
- Magic school - tournament day
- Time travelers - paradox problems
- Robot uprising - peaceful resolution attempts

---

## Advanced: Phase-Based Scenarios

For longer games, you can suggest phases:

```markdown
## Suggested Phases

### Phase 1: Discovery (30 min)
Characters meet, initial situation revealed, relationships form

### Phase 2: Investigation (45 min)
Mystery deepens, alliances form, tensions rise

### Phase 3: Confrontation (30 min)
Truth emerges, conflicts peak, choices must be made

### Phase 4: Resolution (15 min)
Consequences play out, relationships settle
```

The Game Master can update phases manually during play.

---

## Template Workflow (Project Internal)

This repository is currently maintained as a one-person research project.
Template work is mainly for the author and AI coding agents supporting the project.

When adding or editing a template:
1. Test it with players (or a dry-run simulation)
2. Document player count and duration assumptions
3. Include setup notes if needed
4. Record what dramaturgical hypothesis the template is testing

---

## Questions?

See [ARCHITECTURE.md](../../ARCHITECTURE.md) for how templates are parsed and used by the engine.

See [README.md](../../README.md) for overall game system documentation.
