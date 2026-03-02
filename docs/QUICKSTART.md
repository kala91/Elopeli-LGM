# Quick Start Guide

> Pikaopas Elopeli-LGM:n tutkimusvaiheessa olevaan digitaaliseen improvisaatioteatteri/LARP-alustaan

## 📋 Sisällysluettelo

1. [Pelaajan näkökulma](#pelaajan-näkökulma)
2. [Game Masterin näkökulma](#game-masterin-näkökulma)
3. [Tekninen setup](#tekninen-setup)
4. [Testaus](#testaus)
5. [Ongelmien ratkaisu](#ongelmien-ratkaisu)

---

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

Paina "Start Game" - pelitemplaatti ladataan ja peli käynnistyy.

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
cd Elopeli-LGM

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

### ❌ Palvelin ei käynnisty

**Ongelma:** `Error: listen EADDRINUSE: address already in use :::3000`

**Ratkaisu:**
```bash
# Tarkista mikä prosessi käyttää porttia 3000
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Tapa prosessi tai käytä eri porttia
PORT=3001 npm start
```

### ❌ Kielimalli ei vastaa

**Ongelma:** "Tekoäly vaikeni (Virhe yhteydessä...)"

**Ratkaisut:**

1. **OpenRouter:**
```bash
# Tarkista että .env sisältää oikean API-avaimen
cat .env | grep OPENROUTER_API_KEY

# Testaa API-avainta
curl -H "Authorization: Bearer YOUR_KEY_HERE" \
  https://openrouter.ai/api/v1/models
```

2. **Ollama:**
```bash
# Tarkista että Ollama on käynnissä
curl http://localhost:11434/api/tags

# Jos ei vastaa, käynnistä Ollama
ollama serve

# Lataa malli jos puuttuu
ollama pull gemma2
```

### ❌ Pelaaja ei saa promptia

**Ratkaisuvaiheet:**

1. **Varmista että peli on alustettu:**
   - GM:n pitää painaa "Start Game" ennen kuin pelaajat voivat liittyä

2. **Tarkista että hahmo on luotu:**
```bash
ls -la data/characters/
# Pitäisi näkyä pelaajan_nimi.json
```

3. **Tarkista konsoli-virheet:**
   - Avaa selaimen Developer Tools (F12)
   - Katso Console-välilehteä

4. **Tarkista story_recent:**
```bash
cat data/story_recent.json
# Pitäisi sisältää entries-taulukon
```

### ❌ Memory Extractor ei päivitä muisteja

**Syy:** Ekstraktointi tapahtuu vain:
- Joka 5. promptin jälkeen TAI
- Kun pelaaja raportoi toiminnon (playerSubmitted: true)

**Tarkista:**
```bash
# Katso onko story_recent.json päivittynyt
cat data/story_recent.json | grep playerSubmitted

# Katso onko character-tiedostot päivittyneet
cat data/characters/pelaaja.json | grep key_moments
```

### ❌ Hahmonluonti ei onnistu

**Ratkaisut:**

1. **Tarkista että nimi on kelvollinen:**
   - Max 50 merkkiä
   - Ei erikoismerkkejä (paitsi -, _, .)

2. **Tarkista että data/characters/ -kansio on olemassa:**
```bash
mkdir -p data/characters
```

3. **Tarkista että ei ole jo samalla nimellä olevaa hahmoa:**
```bash
ls -la data/characters/
# Jos löytyy, poista tai käytä eri nimeä
```

### 🔧 Debug-näkymän käyttö

Avaa http://localhost:3000/debug.html nähdäksesi:
- Kaikki LLM-promptit ja vastaukset
- Viimeisimmät 100 API-kutsua
- Aikaleimoineen ja metatiedot

Hyödyllinen kun haluat:
- Ymmärtää mitä LLM sai promptina
- Debugata miksi tietty prompti ei toiminut
- Optimoida prompteja

### 📊 Tiedostorakenne ongelmatilanteiden selvitykseen

```
data/
├── game_config.json      # Jos peli ei käynnisty, tarkista tämä
├── story_recent.json     # Jos promptit eivät näy, tarkista tämä
├── debug_prompts.json    # Jos LLM ei vastaa, katso tämä
└── characters/           # Jos hahmot eivät päivity, tarkista nämä
    ├── pelaaja1.json
    └── pelaaja2.json
```

### 💡 Yleiset vinkit

1. **Käynnistä peli uudelleen puhtaalta pöydältä:**
```bash
# Poista vanhat tiedostot
rm -rf data/characters/*.json
rm data/story_recent.json
rm data/game_config.json

# Käynnistä palvelin uudelleen
npm start
```

2. **Käytä kehitystilaa automaattiseen uudelleenkäynnistykseen:**
```bash
npm run dev  # Käyttää Node.js --watch flagia
```

3. **Tarkista lokitiedot:**
   - Palvelimen konsoli näyttää kaikki tapahtumat
   - Etsi emoji-ikoneja helpottaaksesi lukemista:
     - 🎮 = Game Master -toiminnot
     - 👋 = Pelaajat liittyvät
     - 🎭 = Promptien generointi
     - 🧠 = Muistin ekstraktointi
     - ❌ = Virheet

---

## Seuraavat askeleet

- Lue [ARCHITECTURE.md](ARCHITECTURE.md) ymmärtääksesi järjestelmän rakenteen
- Katso [data/game_library/](data/game_library/) luodaksesi oman pelin
- Lue [data/systemprompt.md](data/systemprompt.md) ymmärtääksesi dramaturgia-promptit


## MockFile kehittäjätestaus (ilman ulkoista LLM:ää)

Kun haluat testata flowta nopeasti tai agenttina ilman oikeaa LLM-kutsua:

1. Valitse GM UI:ssa provideriksi `MockFile (testisimulaattori)`.
2. Avaa `http://localhost:3000/mockllm.html`.
3. Lisää `byPromptType`-vastaukset JSON:na (`tutorial`, `character_generation`, `scene_generation`).
4. Aja pelaajaflow normaalisti playerclientillä.
5. Tarkista promptikontekstit `data/debug_prompts.json`-tiedostosta.

Tämä on suositeltu tapa varmistaa arkkitehtuurin toiminta ennen prompt engineering -nyanssien säätöä.

