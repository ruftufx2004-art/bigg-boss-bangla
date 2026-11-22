# Bigg Boss Bangla — OTT Live Watch Page

A premium, OTT-style watch page for Bigg Boss Bangla live streaming, inspired by modern streaming apps. Everything (HTML, CSS, JavaScript) lives in one self-contained block inside `index.html`, so you can paste it straight into a Blogger post or any static HTML page.

## Features
- Glassmorphic header with pulsing **LIVE NOW** badge, quality pills and a live viewer counter
- 16:9 player with server switcher (Server 1/2/3), reload, fullscreen and open-in-new-tab
- Live Fan Chat with auto-scrolling bilingual messages and a working Send box (messages stay on the visitor's own screen)
- Bilingual show details and a horizontal highlights row whose cards load clips into the player

## Tech
Plain HTML5, CSS3 and vanilla JavaScript. Google Fonts (Poppins and Hind Siliguri). All classes use the `bbb-ott-` prefix. Hosted on Netlify as a static site with no build step.

## Adding your stream links
1. Open `index.html` and find the `PASTE YOUR MAIN LIVE STREAM EMBED LINK` comment.
2. Paste your embed URL into the iframe `src`, or into Server 1's `data-src`.
3. Fill in `data-src` for Server 2 and Server 3 and for each highlight card.

Buttons with no link show a friendly "link not added yet" message.

## Using on Blogger
Copy everything between `COPY FROM HERE` and `COPY TO HERE` in `index.html`. Paste it into a post in **HTML view**.

## Run locally
Open `index.html` in a browser, or run `netlify dev --port 8889`.
