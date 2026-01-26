# Quick Start Guide

## Pelaajan näkökulma

### 1. Liity peliin

Avaa pelaajan linkki puhelimella/tabletilla:
```
http://localhost:3000/playerclient.html
```

### 2. Kirjaudu sisään

- Syötä nimesi
- Valitse kieli (suomi, ruotsi, englanti)

### 3. Tutorial-keskustelu

Keskustele AI-ohjaajan kanssa:
- Kerro millaisen hahmon haluaisit pelata
- Ohjaaja kysyy tarkentavia kysymyksiä
- Kun olet valmis, ohjaaja luo hahmon puolestasi

**Esimerkki:**
```
Ohjaaja: Tervetuloa peliin! Millaisen hahmon haluaisit pelata?
Sinä: Haluaisin pelata nuorta poliisia joka tutkii murhaa ensimmäistä kertaa
Ohjaaja: Loistavaa! Onko hänellä jotain erityisiä persoonallisuuden piirteitä?
Sinä: Hän on utelias mutta myös hieman jännittynyt
Ohjaaja: Täydellinen! Luon sinulle hahmon...
```

### 4. Pelaa

- **Lue hahmosi kuvaus** - saat persoonallisuuden, tavoitteet ja suhteet muihin
- **Paina "Seuraava toiminto"** - saat toimintaohjeen
- **Toimi fyysisessä tilassa** - tee mitä ohje sanoo
- **Raportoi tai pyydä uusi** - joko kerrot mitä tapahtui tai pyydät uuden ohjeen

### 5. Peli jatkuu

- Muistisi päivittyy automaattisesti
- Suhteet muihin hahmoihin kehittyvät
- Draama etenee

## Game Masterin näkökulma

### 1. Avaa GM-näkymä

```
http://localhost:3000/gamemaster.html
```

### 2. Valitse pelitemplaatti

- Murhapeli (klassinen mysteeri)
- Hemulin alushousut (kevyt komedia)
- Scifi avaruusasema (tieteisfiktion trilleri)

### 3. Käynnistä peli

Paina "Start Game" - pelillemplaatti ladataan ja peli käynnistyy.

### 4. Seuraa pelaajia

- Näet kaikki pelaajat ja heidän hahmot
- Näet heidän viimeisimmät toimintaohjeet
- Voit tarkastella hahmojen muisteja

### 5. Analysoi draama

Paina "Analyze Drama" - saat:
- Draaman kaaren tilan (rising/falling)
- Suosituksia jännitteiden lisäämiseen
- Yleiskatsauksen pelin kulusta

## Tekninen setup

### Esivaatimukset

```bash
node >= 18.0.0
npm >= 8.0.0
```

### Asennus

```bash
# 1. Kloonaa repo
git clone [repo-url]
cd LLM-ohjattu

# 2. Asenna riippuvuudet
npm install

# 3. Luo .env-tiedosto
cat > .env << EOF
API_PROVIDER=openrouter
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=google/gemma-3-27b-it:free
EOF

# 4. Käynnistä palvelin
npm start
```

### Portti ja URL:t

Palvelin käynnistyy portissa **3000**:

- **Etusivu**: http://localhost:3000/
- **Pelaajat**: http://localhost:3000/playerclient.html
- **GM**: http://localhost:3000/gamemaster.html
- **Debug**: http://localhost:3000/debug.html

### Ollama (paikallinen)

Jos haluat käyttää paikallista kielimallia:

```bash
# 1. Asenna Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 2. Lataa malli
ollama pull gemma2

# 3. Muuta .env
API_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma2
```

## Testaus

### 1. Käynnistä palvelin

```bash
npm start
```

### 2. Avaa kaksi pelaaja-ikkunaa

- Pelaaja 1: http://localhost:3000/playerclient.html
- Pelaaja 2: http://localhost:3000/playerclient.html

### 3. Liity peliin molemmilla

- Pelaaja 1: "Frank" (suomi)
- Pelaaja 2: "Jessika" (ruotsi)

### 4. Luo hahmot

- Frank: "Haluaisin pelata vanhan kartanon omistajaa"
- Jessika: "Jag vill spela en detektiv som undersöker mordet"

### 5. Pelaa

- Molemmat pyytävät toimintaohjeita
- Toimi fyysisessä tilassa (tai kuvittele)
- Raportoi tai pyydä uusi

### 6. Tarkista muisti

Avaa Debug-näkymä ja katso:
```
data/characters/frank.json
data/characters/jessika.json
```

Pitäisi näkyä:
- key_moments (dramaturgisesti merkittävät hetket)
- relationships (suhteet muihin hahmoihin)

## Ongelmien ratkaisu

### Palvelin ei käynnisty

```bash
# Tarkista portti
lsof -i :3000

# Tapa prosessi
kill -9 [PID]
```

### Kielimalli ei vastaa

```bash
# Tarkista .env
cat .env

# Testaa API-avain (OpenRouter)
curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  https://openrouter.ai/api/v1/models

# Testaa Ollama
curl http://localhost:11434/api/tags
```

### Pelaaja ei saa promptia

1. Avaa Debug-näkymä
2. Tarkista konsoli-virheet
3. Katso onko hahmo luotu (`data/characters/`)
4. Katso onko story_recent päivittynyt (`data/story_recent.json`)

### Memory Extractor ei toimi

```bash
# Tarkista story_recent.json
cat data/story_recent.json

# Pitäisi olla vähintään 5 entrya TAI yksi playerSubmitted: true
```

## Seuraavat askeleet

- Lue [ARCHITECTURE.md](ARCHITECTURE.md) ymmärtääksesi järjestelmän rakenteen
- Katso [data/game_library/](data/game_library/) luodaksesi oman pelin
- Lue [data/systemprompt.md](data/systemprompt.md) ymmärtääksesi dramaturgia-promptit
