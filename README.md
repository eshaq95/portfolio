# Portfolio

The personal website of Eshaq Rahmani: mechanical engineer and software developer, studying for an MSc in Robotics at the University of Bristol.

**Live site:** https://eshaq95.github.io/portfolio

## What is here

| File | What it does |
| --- | --- |
| `index.html` | All the content, one section per part of the CV |
| `styles.css` | Layout, type and colours, including the dark theme |
| `script.js` | Builds the email link and keeps the footer year current |
| `projects.js` | Draws the interactive project figures (SVG and canvas, no libraries) |
| `projects-data.js` | The data behind those figures, generated from my project repos |
| `assets/` | Favicon, social preview image and the self-hosted font |
| `assets/projects/` | Figures and screenshots taken from my project repos |
| `tools/build_project_assets.py` | Rebuilds `assets/projects/` and `projects-data.js` from the repos |

No frameworks and no tracking. The site needs no build step; the Python tool only matters if the project figures change.

## Run it locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Update the content

Edit the text in `index.html`. Each section starts with a comment such as `<!-- Projects -->`. To add a project, copy an `<article class="entry project">` block and change the text.

## Project figures

Every image in `assets/projects/` and every number in `projects-data.js` comes from one of my GitHub repos: a notebook output, a report or poster, a screenshot or the raw data. The student number is removed from the poster image. To rebuild them, clone the repos listed at the top of `tools/build_project_assets.py` into one folder, then run:

```bash
python3 tools/build_project_assets.py path/to/that/folder
```

It needs Python 3 with Pillow, and poppler-utils for `pdfimages`, `pdftoppm` and `pdftotext`.

The interactive figures are built by `projects.js` when they come into view:

- **Computer vision agent:** the agent's HSV colour filter, run live on a frame it captured, with sliders for each range.
- **Turbine blade:** the blade design method from the MATLAB code, ported to JavaScript, with sliders for rotor speed, wind speed and number of blades.
- **Trading rules:** test-period returns and White's Reality Check p-values from the dissertation.
- **Text classification:** F1 score for each newsgroup, for each of the four models.
- **Ambulance calls:** weekly calls with the TBATS forecast, and calls by hour and by day.
- **Car insurance:** interest in car insurance by customer group, and the three models' scores.

Without JavaScript, the figures that need it are hidden and the images still show.

## Design

- **Layout:** minimal, with plenty of white space and section titles in a left-hand column.
- **Type:** Schibsted Grotesk, a clean sans-serif, self-hosted with the site.
- **Colour:** off-white with a deep red accent; in dark mode, deep blue with a soft green accent. The theme follows the visitor's system setting.
- **Drawing:** the introduction shows a simulated odometry estimate drifting away from a planned circle-and-reverse path.
- **Figures:** the project charts use the same colours as the page, so they follow the light and dark themes.
- **Accessibility:** semantic HTML, visible keyboard focus and support for reduced motion.

## Publishing

GitHub Pages serves the site from the root of the `main` branch (Settings, Pages, Deploy from a branch). Every push to `main` updates it within a minute or two.

## Licence

Code: MIT (see `LICENSE`). Font: SIL Open Font Licence (see `assets/fonts/OFL.txt`). Text and personal details © Eshaq Rahmani.
