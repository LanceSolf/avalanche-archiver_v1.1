# Avalanche Archiver - Architectural Digest

## 🗺️ High-Level Map

| Directory | Purpose | ⚠️ Rules for AI |
| :--- | :--- | :--- |
| **`tools/`** | **SOURCE CODE**. Contains all logic, scripts, and **templates**. | **EDIT HERE**. If you want to change the HTML structure, CSS classes, or logic, you MUST edit files in `tools/`. |
| **`workers/`** | **SERVERLESS**. Cloudflare Worker scripts. | **DEPLOY**. Changes here interact with `wrangler deploy`. |
| **`archive/`** | **BUILD OUTPUT**. Generated static HTML files for the website. | **READ-ONLY**. Do NOT edit these files directly. Your changes will be overwritten by the build script. |
| **`data/`** | **RAW DATA**. JSON files (including `webcams.json`), cache, and raw incident images. | **READ-ONLY**. Generally managed by fetch scripts. |
| **`snow-depth/`**| **Module**. Specific component for snow depth visualization. | Contains its own `index.html` source which is copied to `archive/` during build. |

## 🏗️ The Build Pipeline
The site is static, generated from raw data.
1.  **Fetch**: Scripts download data into `data/`.
    *   **`tools/fetch_lawis_incidents.js`**: Main incident data.
    *   **`tools/fetch_weather_report.js`**: Daily weather text.
    *   **`tools/process_profiles.js`**: Snow profile data.
    *   **`tools/fetch_uploads.js`**: User-submitted reports (from Cloudflare KV).
    *   **`tools/fetch_daily.js`**: Orchestrates daily updates.
2.  **Process**: Data is cleaned and structured.
3.  **Build**: `node tools/build.js` is the master conductor.
    *   It reads `data/`.
    *   It loads templates from **`tools/lib/templates.js`**.
    *   It **generates** HTML files (incidents, profiles, **ground conditions**, **webcams**) and writes them to `archive/`.

## ☁️ Cloud & Dynamic Features
*   **User Uploads**:
    *   **Frontend**: `archive/ground-conditions/upload.html` (generated via `templates.js`) submits to Cloudflare.
    *   **Backend**: `workers/upload-worker.js` handles POST requests and stores data in **Cloudflare KV**.
    *   **Sync**: `tools/fetch_uploads.js` retrieves data from KV to `data/uploads.json` so it can be baked into the static site.

## 🔑 Key Files "Cheatsheet"

*   **`tools/lib/templates.js`**: **THE UI SOURCE**. All HTML for incidents, weather, profiles, **webcams**, and **ground conditions** is generated here. **If the user asks for a UI change, check this file first.**
*   **`tools/build.js`**: The main build orchestrator.
*   **`tools/lib/builders/buildGroundConditions.js`**: Builds the combined Ground Conditions & Webcam pages.
*   **`workers/upload-worker.js`**: The API logic for handling skier uploads.
*   **`tools/fetch_uploads.js`**: Sync script for user uploads.
*   **`tools/lib/builders/*.js`**: Specific logic for building different sections.
*   **`styles.css`**: Global styles.

## 🛑 Common Pitfalls (Don't do these!)
*   ❌ **Don't edit `archive/incidents/2026-01-15.html`**. It will be deleted/overwritten next time we build.
*   ❌ **Don't ask "Where is the HTML source?"** for an incident page. It doesn't exist. It's constructed dynamically in `templates.js`.
