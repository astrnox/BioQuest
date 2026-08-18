# BioQuest — Biology Learning Platform for High School Students

<div align="center">

![BioQuest homepage screenshot](screenshots/home-final.png)

**From biology-league prep to Gaokao mock exams — practice biology with one website.**

[🇨🇳 中文版](./README.md) · [🌐 Live Demo](https://astrnox.github.io/BioQuest/) · [📝 Start Practicing](https://astrnox.github.io/BioQuest/#/practice) · [💬 Report an Issue](https://github.com/astrnox/BioQuest/issues)

[![Platform](https://img.shields.io/badge/platform-Web-blue?style=flat-square)]()
[![License](https://img.shields.io/badge/license-CC%20BY--NC--SA%204.0-green?style=flat-square)](./LICENSE)
[![Status](https://img.shields.io/badge/status-Active-success?style=flat-square)]()
[![PWA](https://img.shields.io/badge/PWA-Supported-purple?style=flat-square)]()
[![GitHub Stars](https://img.shields.io/github/stars/astrnox/BioQuest?style=flat-square)]()

</div>

---

## What is this?

BioQuest is a biology learning website built specifically for high school students. Whether you are preparing for the National High School Biology League, grinding Gaokao mock exams, or reinforcing what you learned in class, you can use it.

---

## Quick Start

### 👉 Just want to use it (students / teachers)

Open the online version directly: **[https://astrnox.github.io/BioQuest/](https://astrnox.github.io/BioQuest/)**

- You can practice without registering; registering lets you sync your wrong-answer book and learning progress.
- Features like the AI tutor and photo-based question search require you to configure your own API Key (they all use the free tiers of various providers — no cost, tutorial included).
- Supports offline use — add it to your phone's home screen and use it like an app.

### 👨‍💻 Want to deploy / modify the code yourself

This is a pure static site with no backend — deployment is simple:

```bash
# 1. Clone the repo
git clone https://github.com/astrnox/BioQuest.git
cd bioquest

# 2. Preview locally (pick one)
python -m http.server 8000   # Python
npx serve .                  # Node.js

# 3. Open http://localhost:8000 in your browser
```

**Deploy online:** just drop the whole folder onto any free hosting platform (GitHub Pages, Vercel, Netlify, Cloudflare Pages). No build step, no server needed.

**Things you may want to configure:**
- Database: create a free project at [Supabase](https://supabase.com), run the SQL files in `sql/`, then fill the URL and key into `js/supabase-client.js` (optional — without it, it automatically falls back to browser local storage).
- AI features: users enter their own API Key in "Profile → Settings"; developers don't need to manage it.

---

## Feature Highlights

| Feature | What it does |
|---------|--------------|
|  **Practice & Mock Exams** | League past papers, Gaokao mocks, and module-based drills — auto-grading with explanations after you finish |
|  **Smart Wrong-Answer Book** | Wrong answers are auto-collected, and you can add questions by photo (supports print and handwriting OCR) |
|  **Knowledge Cards** | Anki-style flashcard reviews automatically scheduled by your forgetting curve |
|  **Skill Diagnosis** | A radar chart after each session shows which topics you're weak in |
|  **AI Tutor** | Ask anything anytime — supports drawing, explaining, and generating similar questions |
|  **Virtual Labs** | Plasmolysis, chromatography, DNA extraction and more — simulate experiments right in the browser |
|  **Molecule Visualization** | Enter SMILES to view 2D structures, load PDB for 3D molecules, plus a genome browser |
|  **Learning Analytics** | See how long you study each day and which questions you miss most |
|  **Community Discussion** | Discuss questions with other students |

---

## Core Algorithms (for the technically inclined)

<details>
<summary><b>Click to expand: the algorithms that make it "smart"</b></summary>

### 1. Memory / review algorithm (FSRS)
Replaces the traditional Anki SM-2 algorithm. It automatically computes the optimal next review time based on how hard a card is for you, using three memory metrics: stability, difficulty, and retrievability.

```js
const scheduler = tsFsrs.fsrs({ request_retention: 0.9, maximum_interval: 36500, enable_fuzz: true });
const result = scheduler.next(card, now, Rating.Good);
```

### 2. Ability estimation (IRT)
Instead of a simple "how many did you get right," it uses item response theory (3PL model) on your answer history to estimate your true ability level, taking into account how hard and how discriminative each question is. It also uses Bayesian Knowledge Tracing (BKT) to estimate the probability you've mastered each knowledge point.

### 3. OCR photo-based question search
Two-layer recognition: if the user has configured a multimodal LLM key, AI recognition is used first (higher accuracy, handles italics and formulas); otherwise Tesseract.js runs locally in the browser — upscaling, grayscale, contrast stretch, and binarization before recognition, then a few regexes to fix common recognition errors.

```js
// Image preprocessing
const stretched = gray.map(v => ((v - min) / (max - min)) * 255);
const bin = stretched.map(v => v > 140 ? 255 : 0);
```

### 4. Streaming rendering
While the AI answers, it first streams plain text character by character (fast), then re-renders the full response as Markdown once complete, auto-drawing any inline SVG diagrams.

```js
chunkEl.textContent += delta;  // streaming: plain text append
finalEl.innerHTML = DOMPurify.sanitize(marked.parse(text));  // render after completion
```

</details>

---

## Tech Stack

Pure frontend architecture — no backend server to run:

- **Frontend**: vanilla JavaScript (SPA) + CSS3 + PWA (offline support)
- **Data**: Supabase (free tier) + IndexedDB (browser-side local database)
- **AI**: directly connects to 6 LLM providers from the frontend (DeepSeek, Zhipu, Qwen, Kimi, NVIDIA, SiliconFlow) with streaming output
- **Visualization**: Chart.js, Cytoscape.js (knowledge graph), Mermaid (diagrams), 3Dmol.js (3D molecules), igv.js (genome)
- **OCR**: Tesseract.js (local) + multimodal LLM (cloud)
- **Font**: LXGW WenKai (loaded locally, no network wait)

---

## Open-Source Dependencies

This project bundles 24 open-source third-party libraries, all under permissive licenses (MIT/Apache/BSD) compatible with CC BY-NC-SA. Full license statements are in [`js/vendor/THIRD_PARTY_LICENSES.txt`](./js/vendor/THIRD_PARTY_LICENSES.txt).

Some notable ones:
- [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) — spaced repetition algorithm (MIT)
- [KaTeX](https://katex.org/) — math rendering (MIT)
- [Dexie.js](https://dexie.org/) — browser local database (Apache-2.0)
- [Chart.js](https://www.chartjs.org/) — charts (MIT)
- [3Dmol.js](https://3dmol.org/) — 3D molecule visualization (BSD-3)
- [RDKit.js](https://www.rdkitjs.com/) — SMILES to 2D molecule (BSD-3)
- [DOMPurify](https://github.com/cure53/DOMPurify) — XSS protection (MPL-2.0/Apache-2.0)
- [Excalidraw](https://excalidraw.com/) — hand-drawn whiteboard (MIT)
- [PhET](https://phet.colorado.edu) — interactive simulations (CC BY 4.0)
- [LXGW WenKai](https://github.com/lxgw/LxgwWenKai) — Chinese font (OFL-1.1)

---

## License

This project is licensed under [CC BY-NC-SA 4.0](./LICENSE).

### About the "non-commercial" clause

In short: **as long as you're not selling the software itself, educational use is fine**:

✅ Students using it for their own study or tinkering  
✅ Schools and tutoring centers using it for teaching (even if you charge tuition — you're selling a teaching *service*, not the software)  
✅ Non-profit education projects and education-aid initiatives  
✅ Self-hosting for classmates or internal school use  
❌ Repackaging BioQuest as a paid SaaS to make money  
❌ Making changes without open-sourcing, removing the copyright, or claiming you wrote it

If you genuinely have a commercial use case (e.g. corporate training), contact the author — education-related licensing is generally granted free.

---

## Roadmap

Planned work:

- [ ] More Gaokao past papers and mock exams (currently more league questions; Gaokao questions coming incrementally)
- [ ] Better wrong-answer book export (print, export PDF)
- [ ] Multi-device sync improvements
- [ ] Auto-grading for biology drawing questions
- [ ] More virtual labs
- [ ] More animations
- [ ] Class/teacher management improvements
- [ ] Mobile app packaging (TWA/PWA already supported; native shell considered later)

Feel free to open an Issue for features you'd like!

---

## Contributing

Contributions are welcome! Whether you:
- Know biology: expand the question bank, fix question errors, write explanations
- Can code: fix bugs, add features
- Can design: improve the UI
- Or none of the above: open an Issue if something's wrong or you have an idea

### How to contribute code

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/xxx`)
3. Commit your changes (`git commit -m 'add some feature'`)
4. Push to your branch (`git push origin feature/xxx`)
5. Open a Pull Request

Question-bank data lives in the `data/` folder — just edit the JSON to add questions.

---

## Acknowledgements

- Thanks to **Congqianguo** for contributions and support
- Thanks to the Open Spaced Repetition community for the FSRS algorithm
- Thanks to all the open-source library authors
- Thanks to [PhET Interactive Simulations](https://phet.colorado.edu) (University of Colorado Boulder) for high-quality interactive simulations
- Thanks to every student using BioQuest to study biology — best of luck on your exams!

---
*Note: I'm a high school student myself, so it may take a while to respond to issues 😅*

<div align="center">
Use BioQuest, and never get lost in biology 🌱
</div>