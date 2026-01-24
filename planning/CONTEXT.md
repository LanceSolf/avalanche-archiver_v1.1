# Planning Tool Context
> **Path**: `planning/`

The **Planning Tool** is a web-based module for visualizing maps, terrain overlays, and 3D data. It integrates directly with the GPX library.

## Structure
*   **`index.html`**: The main entry point.
*   **`js/main.js`**: Core MapLibreGL logic and UI event handling.
*   **`js/overlays/`**: Custom shader layers (Slope, Aspect, Shade).
*   **`planning.css`**: Styling.

## Key Integration
*   **Shared Utils**: Leverages `js/gpx-utils.js` for:
    *   GPX Parsing & Analysis.
    *   Map fitting logic.
    *   Shared configuration constants.
