# GPX Library Context
> **Path**: `gpx-library/`

The **GPX Library** is a dedicated module for archiving, visualizing, and analyzing ski touring routes. It operates as a Single Page Application (SPA) with a hybrid architecture (Cloud + Local Fallback).

## Structure
*   **`index.html`**: The main entry point. Contains the UI structure, filter panels, and route table.
*   **`js/gpx-utils.js`**: Shared utility library for GPX analysis and configuration (used by both Library and Planner).
*   **`library.js`**: Core logic. Handles fetching data, filtering, sorting, and UI interactions.
*   **`library.css`**: Module-specific styling.

## Hybrid Architecture
The library is designed to work both online (Cloudflare Worker) and offline (Local JSON).

### 1. Cloud Mode (Priority)
*   **Backend**: `workers/upload-worker.js` (Endpoints: `/gpx/list`, `/gpx/upload`, `/gpx/delete`).
*   **Storage**: Cloudflare KV.
    *   `gpx:index`: Lightweight JSON array of route metadata.
    *   `gpx:file:<id>`: The actual GPX XML content.
*   **Flow**: `library.js` first attempts to fetch the index from the Worker. If successful, it displays the cloud data.

### 2. Local Mode (Fallback)
*   **Source**: `gpx/routes-metadata.json`.
*   **Generation**: The `tools/gpx-analyzer.js` script scans the local `gpx/` folder and generates this JSON file.
*   **Automatic Sync**: The `npm run build` command is configured to run the analyzer automatically, ensuring the local index is always fresh.
*   **Flow**: If the Worker is unreachable, `library.js` falls back to fetching `routes-metadata.json`.

## Key Features
*   **Client-Side Analysis**: The `analyzeGPXContent` function in `library.js` parses GPX files immediately upon selection, calculating distance, ascent, descent, max slope, and aspect breakdown directly in the browser.
*   **Smart Filtering**:
    *   **Dual Range Sliders**: For Distance, Ascent, Descent, and Max Slope (0-45°+).
    *   **Toggle Switches**: Filters are only applied when their specific toggle is enabled.
    *   **Aspect Filtering**: Filter by primary aspect (N, NE, E, etc.).
*   **Deep Linking**: Routes can be loaded directly into the **Planning Tool** (`planning/index.html`) via query parameters (`?gpx=<id>`).

## Interactions
*   **Upload**: User selects file -> Browser evaluates stats -> User confirms -> POST to Worker.
*   **Delete**: User clicks delete -> POST to Worker (removes from Index and KV).
*   **View**: Opens the raw GPX file in a new tab.
*   **Load in Planner**: Redirects to the Planning tool with the route pre-loaded.
