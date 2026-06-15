# Stanislav Kaidash — Portfolio

Personal portfolio website. Pure HTML/CSS/JS, no build step required.

## Deploy to Netlify

### Option 1 — Drag & Drop (fastest, 1 minute)

1. Go to [netlify.com](https://netlify.com) and sign in
2. On the dashboard click **"Add new site" → "Deploy manually"**
3. Drag the entire **`резюме сайт`** folder into the upload area
4. Done — Netlify gives you a URL like `https://random-name.netlify.app`
5. To set a custom name: **Site configuration → Change site name**

### Option 2 — Via GitHub (auto-deploys on every push)

1. Push this folder to a GitHub repository
2. On Netlify: **"Add new site" → "Import an existing project" → GitHub**
3. Select the repository
4. Build settings:
   - **Build command:** *(leave empty)*
   - **Publish directory:** `.`
5. Click **Deploy** — every future `git push` will redeploy automatically

## Resume

Open `resume.html` in the browser and press **"Print / Save as PDF"** to export.  
Make sure to enable **"Background graphics"** in the print dialog to keep the dark theme.

## Project structure

```
├── index.html        # Main portfolio page
├── resume.html       # Printable resume
├── netlify.toml      # Netlify config
├── css/
│   └── styles.css
├── js/
│   ├── main.js       # GSAP animations + Lenis scroll
│   └── particles.js  # Three.js particle sphere
└── assets/           # Images / fonts (if any)
```
