// GPX Library JavaScript
import { APP_CONFIG, ASPECT_COLORS, GPXUtils } from '../js/gpx-utils.js';

let allRoutes = [];
let filteredRoutes = [];
let currentSort = { column: 'name', direction: 'asc' };

// Use imported constant instead of local definition
const aspectColors = ASPECT_COLORS;

const WORKER_URL = APP_CONFIG.WORKER_URL;

// Load routes metadata
async function loadRoutes() {
    try {
        // Try fetching from Worker first (Production behavior)
        const response = await fetch(`${WORKER_URL}/gpx/list`);
        if (response.ok) {
            const data = await response.json();
            allRoutes = data.routes || [];
        } else {
            throw new Error('Worker list endpoint not active');
        }
    } catch (workerError) {
        console.error('Failed to load routes from Cloud:', workerError);
        allRoutes = [];
    }

    filteredRoutes = [...allRoutes];
    renderTable();
}



// Render table
// Render table
function renderTable() {
    const tableElement = document.querySelector('.routes-table');
    const noResults = document.getElementById('no-results');

    if (filteredRoutes.length === 0) {
        document.getElementById('routes-tbody').innerHTML = '';
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';

    // Determine active columns based on filter toggles
    const showDistance = document.getElementById('toggle-distance').checked;
    const showAscent = document.getElementById('toggle-ascent').checked;
    const showDescent = document.getElementById('toggle-descent').checked;
    const showSlope = document.getElementById('toggle-slope').checked;
    const showAspect = document.getElementById('toggle-aspect').checked;
    const showBreakdown = document.getElementById('toggle-breakdown').checked;

    // Build Header
    let headerHTML = `<thead><tr>
        <th data-sort="name">Route Name <span class="sort-icon">↕</span></th>
        <th data-sort="region">Region <span class="sort-icon">↕</span></th>`;

    if (showDistance) headerHTML += `<th data-sort="distance">Distance <span class="sort-icon">↕</span></th>`;
    if (showAscent) headerHTML += `<th data-sort="ascent">Ascent <span class="sort-icon">↕</span></th>`;
    if (showDescent) headerHTML += `<th data-sort="descent">Descent <span class="sort-icon">↕</span></th>`;
    if (showSlope) headerHTML += `<th data-sort="maxSlope">Max Slope <span class="sort-icon">↕</span></th>`;
    if (showAspect) headerHTML += `<th data-sort="primaryAspect">Primary Aspect <span class="sort-icon">↕</span></th>`;
    if (showBreakdown) {
        headerHTML += `<th>
            Aspect Breakdown
            <div style="display:flex; gap:2px; margin-top:4px; flex-wrap:wrap; justify-content:center;">
                <span class="aspect-badge N" style="font-size:0.6rem; padding:1px 4px;">N</span>
                <span class="aspect-badge NE" style="font-size:0.6rem; padding:1px 4px;">NE</span>
                <span class="aspect-badge E" style="font-size:0.6rem; padding:1px 4px;">E</span>
                <span class="aspect-badge SE" style="font-size:0.6rem; padding:1px 4px;">SE</span>
                <span class="aspect-badge S" style="font-size:0.6rem; padding:1px 4px;">S</span>
                <span class="aspect-badge SW" style="font-size:0.6rem; padding:1px 4px;">SW</span>
                <span class="aspect-badge W" style="font-size:0.6rem; padding:1px 4px;">W</span>
                <span class="aspect-badge NW" style="font-size:0.6rem; padding:1px 4px;">NW</span>
            </div>
        </th>`;
    }

    headerHTML += `<th>Actions</th>
    </tr></thead>`;

    // Build Body
    const rowsHTML = filteredRoutes.map(route => {
        let row = `<tr>
            <td><div class="route-name">${route.name}</div></td>
            <td><div class="route-region">${route.region}</div></td>`;

        if (showDistance) row += `<td>${route.distance} km</td>`;
        if (showAscent) row += `<td>${route.ascent} m</td>`;
        if (showDescent) row += `<td>${route.descent ?? 0} m</td>`;
        if (showSlope) row += `<td>${route.maxSlope ?? 0}°</td>`;

        if (showAspect) row += `<td><span class="aspect-badge ${route.primaryAspect}">${route.primaryAspect}</span></td>`;
        if (showBreakdown) row += `<td>${renderAspectBreakdown(route.aspectBreakdown)}</td>`;

        row += `<td>
                <div class="action-buttons">
                    <button class="btn-load" onclick="window.loadInPlanner('${route.id}')">Load</button>
                    <button class="btn-view" onclick="window.downloadRoute('${route.id}')" title="Download GPX" style="display:flex; align-items:center; gap:4px;">GPX <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
                    <button class="btn-remove" onclick="window.requestDelete('${route.id}', '${route.name}')">✕</button>
                </div>
            </td>
        </tr>`;
        return row;
    }).join('');

    tableElement.innerHTML = headerHTML + `<tbody id="routes-tbody">${rowsHTML}</tbody>`;

    // Re-attach sort listeners since we destroyed the headers
    document.querySelectorAll('.routes-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.getAttribute('data-sort');
            sortRoutes(column);
        });
    });

    updateSortIndicators(); // Restore sort UI state
}

// Render aspect breakdown bar
function renderAspectBreakdown(breakdown) {
    const segments = Object.entries(breakdown)
        .filter(([_, percent]) => percent > 0)
        .map(([direction, percent]) => {
            return `<div class="aspect-segment" 
                         style="width: ${percent}%; background: ${aspectColors[direction]};"
                         data-tooltip="${direction}: ${percent}%"></div>`;
        })
        .join('');

    return `<div class="aspect-breakdown">${segments || '<span style="color: #94a3b8;">No data</span>'}</div>`;
}

// Sorting
function sortRoutes(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }

    filteredRoutes.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];

        // Handle string comparisons
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return currentSort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    updateSortIndicators();
    renderTable();
}

// Update sort indicators
function updateSortIndicators() {
    document.querySelectorAll('.routes-table th').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        const sortColumn = th.getAttribute('data-sort');
        if (sortColumn === currentSort.column) {
            th.classList.add(`sorted-${currentSort.direction}`);
        }
    });
}

// Filtering
function applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();

    const selectedAspects = Array.from(
        document.querySelectorAll('.aspect-checkboxes input:checked')
    ).map(cb => cb.value);

    filteredRoutes = allRoutes.filter(route => {
        // Search filter
        if (searchTerm && !route.name.toLowerCase().includes(searchTerm)) {
            return false;
        }

        // Distance filter (min and max) - Only if toggled ON
        if (document.getElementById('toggle-distance').checked) {
            const minDistance = parseFloat(document.getElementById('distance-filter-min').value);
            const maxDistance = parseFloat(document.getElementById('distance-filter-max').value);

            if (route.distance < minDistance) return false;
            // If top of range (40), treat as 40+ (infinite max)
            if (maxDistance < 40 && route.distance > maxDistance) return false;
        }

        // Ascent filter (min and max) - Only if toggled ON
        if (document.getElementById('toggle-ascent').checked) {
            const minAscent = parseFloat(document.getElementById('ascent-filter-min').value);
            const maxAscent = parseFloat(document.getElementById('ascent-filter-max').value);

            if (route.ascent < minAscent) return false;
            if (maxAscent < 2000 && route.ascent > maxAscent) return false;
        }

        // Descent filter (min and max) - Only if toggled ON
        if (document.getElementById('toggle-descent').checked) {
            const minDescent = parseFloat(document.getElementById('descent-filter-min').value);
            const maxDescent = parseFloat(document.getElementById('descent-filter-max').value);

            // Fallback for older metadata without descent
            const routeDescent = route.descent !== undefined ? route.descent : route.ascent;

            if (routeDescent < minDescent) return false;
            if (maxDescent < 2000 && routeDescent > maxDescent) return false;
        }

        // Max Slope filter (min and max) - Only if toggled ON
        if (document.getElementById('toggle-slope').checked) {
            const minSlope = parseFloat(document.getElementById('slope-filter-min').value);
            const maxSlope = parseFloat(document.getElementById('slope-filter-max').value);

            // Fallback: if maxSlope is missing, assume 0 (or skip filtering?)
            const routeMaxSlope = route.maxSlope || 0;

            if (routeMaxSlope < minSlope) return false;
            if (maxSlope < 45 && routeMaxSlope > maxSlope) return false;
        }

        // Aspect filter - Only if toggled ON
        if (document.getElementById('toggle-aspect').checked) {
            if (!selectedAspects.includes(route.primaryAspect)) {
                return false;
            }
        }

        return true;
    });

    renderTable();
}

// Load route in planning tool
// Make it globally available for onclick
window.loadInPlanner = function (routeId) {
    const route = allRoutes.find(r => r.id === routeId);
    if (route) {
        // Pass filename and name directly to avoid fetching list in Planner
        const params = new URLSearchParams();
        params.set('filename', route.filename);
        params.set('name', route.name);
        window.location.href = `../planning/index.html?${params.toString()}`;
    }
}

// Download GPX file
// Make it globally available for onclick
window.downloadRoute = async function (routeId) {
    const route = allRoutes.find(r => r.id === routeId);
    if (!route) return;

    try {
        // Use the correct API endpoint
        const response = await fetch(`${WORKER_URL}/gpx/get?id=${routeId}`);

        if (!response.ok) throw new Error(`Download failed: ${response.status}`);

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = route.filename; // Force filename
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error(err);
        alert('Failed to download GPX. Please check connection.');
    }
}
// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadRoutes();

    // Sort headers
    document.querySelectorAll('.routes-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.getAttribute('data-sort');
            sortRoutes(column);
        });
    });

    // Search input
    document.getElementById('search-input').addEventListener('input', applyFilters);

    // Helper for simple toggles (like Aspect)
    function setupSimpleToggle(type) {
        const toggle = document.getElementById(`toggle-${type}`);
        const container = document.getElementById(`container-${type}`);

        toggle.addEventListener('change', () => {
            if (toggle.checked) {
                container.classList.remove('collapsed');
            } else {
                container.classList.add('collapsed');
            }
            applyFilters();
        });
    }

    setupSimpleToggle('aspect');
    setupSimpleToggle('breakdown');

    // Setup helper for dual range sliders
    function setupDualRange(type, unit, maxValLimit) {
        const toggle = document.getElementById(`toggle-${type}`);
        const container = document.getElementById(`container-${type}`);
        const minInput = document.getElementById(`${type}-filter-min`);
        const maxInput = document.getElementById(`${type}-filter-max`);
        const valueDisplay = document.getElementById(`${type}-value`);

        // Toggle logic
        toggle.addEventListener('change', () => {
            if (toggle.checked) {
                container.classList.remove('collapsed');
            } else {
                container.classList.add('collapsed');
            }
            applyFilters();
        });

        // Slider logic
        function updateDisplay(e) {
            let min = parseFloat(minInput.value);
            let max = parseFloat(maxInput.value);

            // Ensure min <= max
            if (min > max) {
                if (e.target === minInput) {
                    minInput.value = max;
                    min = max;
                } else {
                    maxInput.value = min;
                    max = min;
                }
            }

            const maxDisplay = (max >= maxValLimit) ? `${max}+` : max;
            valueDisplay.textContent = `${min} - ${maxDisplay} ${unit}`;
            applyFilters();
        }

        minInput.addEventListener('input', updateDisplay);
        maxInput.addEventListener('input', updateDisplay);
    }

    // Initialize the dual range filters
    setupDualRange('distance', 'km', 40);
    setupDualRange('ascent', 'm', 2000);
    setupDualRange('descent', 'm', 2000);
    setupDualRange('slope', '°', 45);

    // Aspect checkboxes
    document.querySelectorAll('.aspect-checkboxes input').forEach(cb => {
        cb.addEventListener('change', applyFilters);
    });

    // GPX Upload handling
    initGPXUpload();
});

// Delete Modal Functions
let deleteRouteId = null;
let deleteRouteName = null;

// Make globally available for onclick
window.requestDelete = function (routeId, routeName) {
    deleteRouteId = routeId;
    deleteRouteName = routeName;
    document.getElementById('deleteModal').style.display = 'flex';
    document.getElementById('confirmAuth').checked = false;
    toggleDeleteBtn();
}

window.closeModal = function () {
    document.getElementById('deleteModal').style.display = 'none';
    deleteRouteId = null;
    deleteRouteName = null;
}

window.toggleDeleteBtn = function () {
    const btn = document.getElementById('btnDelete');
    if (document.getElementById('confirmAuth').checked) {
        btn.disabled = false;
    } else {
        btn.disabled = true;
    }
}

window.showFinalWarning = function () {
    document.getElementById('deleteModal').style.display = 'none';
    document.getElementById('finalWarningModal').style.display = 'flex';
}

window.closeFinalWarning = function () {
    document.getElementById('finalWarningModal').style.display = 'none';
    deleteRouteId = null;
    deleteRouteName = null;
}

window.confirmDelete = async function () {
    if (!deleteRouteId) return;

    const route = allRoutes.find(r => r.id === deleteRouteId);
    if (!route) return;

    try {
        const response = await fetch(`${WORKER_URL}/gpx/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: deleteRouteId })
        });

        if (response.ok) {
            // Success
            allRoutes = allRoutes.filter(r => r.id !== deleteRouteId);
            filteredRoutes = filteredRoutes.filter(r => r.id !== deleteRouteId);
            alert(`Route "${deleteRouteName}" has been permanently removed from the Cloud.`);
            closeFinalWarning();
            renderTable();
        } else {
            throw new Error('Worker delete failed');
        }

    } catch (error) {
        console.warn('Worker delete failed:', error);
        alert(`Error deleting from cloud. Please check connection.`);
        closeFinalWarning();
    }
}

// GPX Upload Functions
let uploadedGPXFile = null;

function initGPXUpload() {
    const fileInput = document.getElementById('gpx-upload-input');
    const uploadLabel = document.querySelector('.upload-btn-compact');
    const uploadStatus = document.getElementById('upload-status');
    // const filenameSpan = document.getElementById('upload-filename'); // Removed
    const nameInput = document.getElementById('upload-name-input');
    const processBtn = document.getElementById('btn-process');
    const cancelBtn = document.getElementById('btn-cancel-upload');

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        uploadedGPXFile = file;

        // Pre-fill name using analysis logic
        const reader = new FileReader();
        reader.onload = (event) => {
            const gpxText = event.target.result;
            const parser = new DOMParser();
            const gpxDoc = parser.parseFromString(gpxText, 'text/xml');

            // USE UTILS FOR ANALYSIS
            const metadata = GPXUtils.analyzeGPXContent(gpxDoc, file.name);

            if (metadata && metadata.name) {
                nameInput.value = metadata.name;
            } else {
                nameInput.value = file.name.replace(/\.gpx$/i, '');
            }
        };
        reader.readAsText(file);

        uploadLabel.style.display = 'none';
        uploadStatus.style.display = 'flex';
    });

    processBtn.addEventListener('click', processGPXFile);

    cancelBtn.addEventListener('click', () => {
        uploadedGPXFile = null;
        fileInput.value = '';
        uploadStatus.style.display = 'none';
        uploadLabel.style.display = 'inline-flex';
        nameInput.value = '';
    });
}

async function processGPXFile() {
    if (!uploadedGPXFile) return;

    const processBtn = document.getElementById('btn-process');
    processBtn.disabled = true;
    processBtn.textContent = 'Analysing...';

    try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const gpxText = event.target.result;

            // Parse GPX
            const parser = new DOMParser();
            const gpxDoc = parser.parseFromString(gpxText, 'text/xml');

            // Analyze via UTILS
            const metadata = GPXUtils.analyzeGPXContent(gpxDoc, uploadedGPXFile.name);

            // Override Name from Input
            const nameInput = document.getElementById('upload-name-input');
            if (nameInput && nameInput.value.trim() !== '') {
                metadata.name = nameInput.value.trim();
            }

            if (!metadata) {
                alert('Analysis failed. Could not extract track points.');
                processBtn.disabled = false;
                processBtn.textContent = 'Analyse & Add';
                return;
            }

            // Generate a safe filename ID
            const safeId = metadata.id; // already unique-ified
            metadata.filename = `${safeId}.gpx`; // Enforce consistent naming

            processBtn.textContent = 'Uploading...';

            // Try Worker Upload
            try {
                const response = await fetch(`${WORKER_URL}/gpx/upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        gpxContent: gpxText,
                        metadata: metadata
                    })
                });

                if (response.ok) {
                    alert(`Route "${metadata.name}" added successfully!`);
                    loadRoutes();
                    resetUploadUI();
                } else {
                    const errText = await response.text();
                    throw new Error(`Worker returned error: ${errText}`);
                }
            } catch (workerError) {
                console.error('Cloud upload failed:', workerError);
                alert('Cloud upload failed. Please check your connection.');
                processBtn.disabled = false;
                processBtn.textContent = 'Add to Library';
            }


        };

        reader.readAsText(uploadedGPXFile);

    } catch (error) {
        console.error('Error processing GPX:', error);
        alert('Failed to process GPX file.');
        processBtn.disabled = false;
        processBtn.textContent = 'Analyse & Add';
    }
}

function resetUploadUI() {
    uploadedGPXFile = null;
    document.getElementById('gpx-upload-input').value = '';
    document.getElementById('upload-status').style.display = 'none';
    document.querySelector('.upload-btn-compact').style.display = 'inline-flex';
    const processBtn = document.getElementById('btn-process');
    processBtn.disabled = false;
    processBtn.textContent = 'Analyse & Add';
}


