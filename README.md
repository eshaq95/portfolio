# Portfolio

The personal website of Eshaq Rahmani: mechanical engineer and software developer, studying for an MSc in Robotics at the University of Bristol.

**Live site:** https://eshaq95.github.io/portfolio

## What is here

| File | What it does |
| --- | --- |
| `index.html` | All the content, one section per part of the CV |
| `styles.css` | Layout, type and colours, including the dark theme |
| `script.js` | Builds the email link and keeps the footer year current |
| `assets/` | Favicon, social preview image and the self-hosted font |

No frameworks, no build step and no tracking.

## Run it locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Update the content

Edit the text in `index.html`. Each section starts with a comment such as `<!-- Projects -->`. To add a project, copy an `<article class="entry project">` block and change the text.

## Design

- **Layout:** minimal, with plenty of white space and section titles in a left-hand column.
- **Type:** Schibsted Grotesk, a clean sans-serif, self-hosted with the site.
- **Colour:** off-white with a deep red accent; in dark mode, deep blue with a soft green accent. The theme follows the visitor's system setting.
- **Drawing:** the introduction shows a simulated odometry estimate drifting away from a planned circle-and-reverse path.
- **Accessibility:** semantic HTML, visible keyboard focus and support for reduced motion.

## Publishing

GitHub Pages serves the site from the root of the `main` branch (Settings, Pages, Deploy from a branch). Every push to `main` updates it within a minute or two.

## Licence

Code: MIT (see `LICENSE`). Font: SIL Open Font Licence (see `assets/fonts/OFL.txt`). Text and personal details © Eshaq Rahmani.
