# AGENTS.md

## Architecture
Static single-page site with no build step. `index.html` is the whole product. `netlify.toml` publishes the repo root.

## Key conventions
- The embeddable widget is everything between the `COPY FROM HERE` / `COPY TO HERE` comments in `index.html`. Its `<style>` and `<script>` live **inside** the `.bbb-ott-root` div so one paste carries everything. Keep it that way.
- Every class, id and keyframe is prefixed `bbb-ott-` / `bbbOtt` so it can't clash with Blogger themes. Do not add global selectors such as `body` or `*` inside the widget. Scope everything under `.bbb-ott-root`.
- JS is an IIFE that queries only inside the root and guards against double init (`data-bbb-init`).
- Stream URLs come from the `data-src` attributes on `.bbb-ott-srv` and `.bbb-ott-card` buttons, plus the iframe `src`. Empty or invalid URLs show the overlay instead of loading a broken iframe.
- Chat is client-side only and uses `textContent` for user input. Never switch to `innerHTML`.
- No external assets other than Google Fonts. Thumbnails are CSS gradients and emoji.
