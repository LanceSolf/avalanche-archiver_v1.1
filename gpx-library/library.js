// GPX Library JavaScript

let allRoutes = [];
let filteredRoutes = [];
let currentSort = { column: 'name', direction: 'asc' };

// Aspect colors matching the slope-aspect layer
const aspectColors = {
    N: '#3b82f6',
    NE: '#22d3ee',
    E: '#22c55e',
    SE: '#a3e635',
    S: '#ef4444',
    SW: '#fb923c',
    W: '#facc15',
    NW: '#a855f7'
};

// Load routes metadata
async function loadRoutes() {
    // Detect Localhost
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // If Localhost, skip Worker and use local file immediately (to ensure we see fresh non-cached local builds)
    if (isLocalhost) {
        console.log('Localhost detected: Using local routes-metadata.json');
        try {
            const response = await fetch(`../gpx/routes-metadata.json?t=${Date.now()}`); // Cache-bust
            const data = await response.json();
            allRoutes = data.routes;
        } catch (localError) {
            console.error('Failed to load local routes:', localError);
            allRoutes = [];
        }
        filteredRoutes = [...allRoutes];
        renderTable();
        return;
    }

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
        // Fallback to local files
        console.log('Fetching local routes (Worker unavailable)');
        try {
            const response = await fetch(`../gpx/routes-metadata.json?t=${Date.now()}`);
            const data = await response.json();
            allRoutes = data.routes;
        } catch (localError) {
            console.error('Failed to load routes:', localError);
            allRoutes = [];
        }
    }

    filteredRoutes = [...allRoutes];
    renderTable();
}



// Render table
function renderTable() {
    const tbody = document.getElementById('routes-tbody');
    const noResults = document.getElementById('no-results');

    if (filteredRoutes.length === 0) {
        tbody.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';

    tbody.innerHTML = filteredRoutes.map(route => `
        <tr>
            <td>
                <div class="route-name">${route.name}</div>
            </td>
            <td>
                <div class="route-region">${route.region}</div>
            </td>
            <td>${route.distance} km</td>
            <td>${route.ascent} m</td>
            <td>
                <span class="aspect-badge ${route.primaryAspect}">${route.primaryAspect}</span>
            </td>
            <td>
                ${renderAspectBreakdown(route.aspectBreakdown)}
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-load" onclick="loadInPlanner('${route.id}')">Load in Planner</button>
                    <button class="btn-view" onclick="viewRoute('${route.id}')">View GPX</button>
                    <button class="btn-remove" onclick="requestDelete('${route.id}', '${route.name}')">Remove</button>
                </div>
            </td>
        </tr>
    `).join('');
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
    const regionFilter = document.getElementById('region-filter').value;

    const selectedAspects = Array.from(
        document.querySelectorAll('.aspect-checkboxes input:checked')
    ).map(cb => cb.value);

    filteredRoutes = allRoutes.filter(route => {
        // Search filter
        if (searchTerm && !route.name.toLowerCase().includes(searchTerm)) {
            return false;
        }

        // Region filter
        if (regionFilter && route.region !== regionFilter) {
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
function loadInPlanner(routeId) {
    window.location.href = `../planning/index.html?gpx=${routeId}`;
}

// View GPX file
function viewRoute(routeId) {
    const route = allRoutes.find(r => r.id === routeId);
    if (route) {
        window.open(`../gpx/${route.filename}`, '_blank');
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

    // Region filter
    document.getElementById('region-filter').addEventListener('change', applyFilters);

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

function requestDelete(routeId, routeName) {
    deleteRouteId = routeId;
    deleteRouteName = routeName;
    document.getElementById('deleteModal').style.display = 'flex';
    document.getElementById('confirmAuth').checked = false;
    toggleDeleteBtn();
}

function closeModal() {
    document.getElementById('deleteModal').style.display = 'none';
    deleteRouteId = null;
    deleteRouteName = null;
}

function toggleDeleteBtn() {
    const btn = document.getElementById('btnDelete');
    if (document.getElementById('confirmAuth').checked) {
        btn.disabled = false;
    } else {
        btn.disabled = true;
    }
}

function showFinalWarning() {
    document.getElementById('deleteModal').style.display = 'none';
    document.getElementById('finalWarningModal').style.display = 'flex';
}

function closeFinalWarning() {
    document.getElementById('finalWarningModal').style.display = 'none';
    deleteRouteId = null;
    deleteRouteName = null;
}

async function confirmDelete() {
    if (!deleteRouteId) return;

    const route = allRoutes.find(r => r.id === deleteRouteId);
    if (!route) return;

    try {
        // Try deletion via Worker
        const response = await fetch(`${WORKER_URL}/gpx/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: deleteRouteId })
        });

        if (response.ok) {
            // Success
            allRoutes = allRoutes.filter(r => r.id !== deleteRouteId);
            filteredRoutes = filteredRoutes.filter(r => r.id !== deleteRouteId);
            alert(`Route "${deleteRouteName}" has been permanently removed.`);
            closeFinalWarning();
            renderTable();
        } else {
            throw new Error('Worker delete failed');
        }

    } catch (error) {
        console.warn('Worker delete failed, using local fallback message:', error);

        // Manual fallback for static site
        alert(`(Backend unavailable)\n\nTo permanently remove "${deleteRouteName}", you need to:\n1. Delete the GPX file: gpx/${route.filename}\n2. Re-run the analyzer: node tools/gpx-analyzer.js`);

        closeFinalWarning();
    }
}

// GPX Upload Functions
// Worker API Configuration
const WORKER_URL = 'https://avalanche-archiver-uploads.bigdoggybollock.workers.dev';

// GPX Analysis Helpers (Ported from gpx-analyzer.js)
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function calculateSlopeAndAspect(p1, p2, distance) {
    const elevationChange = p2.ele - p1.ele;
    const slopeRad = Math.atan(elevationChange / distance);
    const slopeDeg = slopeRad * 180 / Math.PI;

    const lat1 = p1.lat * Math.PI / 180;
    const lat2 = p2.lat * Math.PI / 180;
    const Δλ = (p2.lon - p1.lon) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(Δλ);
    let bearing = Math.atan2(y, x) * 180 / Math.PI;

    bearing = (bearing + 360) % 360;

    return { slope: Math.abs(slopeDeg), aspect: bearing };
}

function categorizeAspect(bearing) {
    if (bearing >= 337.5 || bearing < 22.5) return 'N';
    if (bearing >= 22.5 && bearing < 67.5) return 'NE';
    if (bearing >= 67.5 && bearing < 112.5) return 'E';
    if (bearing >= 112.5 && bearing < 157.5) return 'SE';
    if (bearing >= 157.5 && bearing < 202.5) return 'S';
    if (bearing >= 202.5 && bearing < 247.5) return 'SW';
    if (bearing >= 247.5 && bearing < 292.5) return 'W';
    return 'NW';
}

function analyzeGPXContent(gpxDoc, filename) {
    console.log('Analyzing GPX:', filename);
    const trkpts = gpxDoc.getElementsByTagName('trkpt');
    const trackPoints = [];

    for (let i = 0; i < trkpts.length; i++) {
        const trkpt = trkpts[i];
        const lat = parseFloat(trkpt.getAttribute('lat'));
        const lon = parseFloat(trkpt.getAttribute('lon'));
        const eleNode = trkpt.getElementsByTagName('ele')[0];
        const ele = eleNode ? parseFloat(eleNode.textContent) : 0;
        trackPoints.push({ lat, lon, ele });
    }

    if (trackPoints.length < 2) return null;

    let totalDistance = 0;
    let totalAscent = 0;
    let totalDescent = 0;
    let elevationMin = Infinity;
    let elevationMax = -Infinity;
    let maxSlope = 0;
    let totalSlopeDistance = 0;

    const aspectDistances = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
    let totalDistanceAboveThreshold = 0;

    const descentAspectDistances = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
    let totalDescentDistanceAboveThreshold = 0;

    for (let i = 0; i < trackPoints.length - 1; i++) {
        const p1 = trackPoints[i];
        const p2 = trackPoints[i + 1];

        const distance = haversineDistance(p1.lat, p1.lon, p2.lat, p2.lon);
        totalDistance += distance;

        const elevChange = p2.ele - p1.ele;
        if (elevChange > 0) totalAscent += elevChange;
        if (elevChange < 0) totalDescent += Math.abs(elevChange);

        elevationMin = Math.min(elevationMin, p1.ele, p2.ele);
        elevationMax = Math.max(elevationMax, p1.ele, p2.ele);

        // Calculate slope and aspect
        let { slope, aspect } = calculateSlopeAndAspect(p1, p2, distance);

        // Correction: If gaining elevation (skinning up), the aspect of the slope is opposite to direction of travel
        // e.g. Traveling North up a slope means the slope faces South.
        if (elevChange > 0) {
            aspect = (aspect + 180) % 360;
        }

        maxSlope = Math.max(maxSlope, slope);
        totalSlopeDistance += slope * distance;

        // 1. General Aspect Breakdown (Slopes > 15°)
        if (slope >= 15) {
            const aspectCategory = categorizeAspect(aspect);
            aspectDistances[aspectCategory] += distance;
            totalDistanceAboveThreshold += distance;
        }

        // 2. Primary Aspect Calculation (Descent Only)
        // We look at ALL descent segments > 15 degrees
        if (elevChange < 0 && slope >= 15) {
            const aspectCategory = categorizeAspect(aspect);
            descentAspectDistances[aspectCategory] += distance;
            totalDescentDistanceAboveThreshold += distance;
        }
    }

    const aspectBreakdown = {};
    for (const dir in aspectDistances) {
        aspectBreakdown[dir] = totalDistanceAboveThreshold > 0
            ? parseFloat((aspectDistances[dir] / totalDistanceAboveThreshold * 100).toFixed(1))
            : 0;
    }

    const avgSlope = totalDistance > 0 ? (totalSlopeDistance / totalDistance) : 0;

    let primaryAspect = 'N';
    let maxDescentDistance = 0;
    for (const dir in descentAspectDistances) {
        if (descentAspectDistances[dir] > maxDescentDistance) {
            maxDescentDistance = descentAspectDistances[dir];
            primaryAspect = dir;
        }
    }

    // Fallback: If no significant descent found (>15°), try general breakdown
    if (maxDescentDistance === 0) {
        let maxAspectDist = 0;
        for (const dir in aspectDistances) {
            if (aspectDistances[dir] > maxAspectDist) {
                maxAspectDist = aspectDistances[dir];
                primaryAspect = dir;
            }
        }
    }

    // Name Logic: Prioritize Filename
    let displayName = filename.replace(/\.gpx$/i, '');

    // Region Logic
    let region = 'Allgäu Alps';
    const lowerName = displayName.toLowerCase();

    if (lowerName.includes('kleinwalsertal') || lowerName.includes('fellhorn')) {
        region = 'Allgäu Alps West';
    } else if (lowerName.includes('oberstdorf') || lowerName.includes('nebelhorn')) {
        region = 'Allgäu Alps Central';
    }

    console.log('Analysis Result:', { displayName, primaryAspect, aspectBreakdown });

    return {
        id: filename.replace('.gpx', '').replace(/\s+/g, '-').toLowerCase() + '-' + Date.now().toString().slice(-4), // Unique ID
        name: displayName,
        filename: filename,
        region,
        distance: parseFloat((totalDistance / 1000).toFixed(2)),
        ascent: Math.round(totalAscent),
        descent: Math.round(totalDescent),
        elevationMin: Math.round(elevationMin),
        elevationMax: Math.round(elevationMax),
        maxSlope: Math.round(maxSlope),
        avgSlope: parseFloat(avgSlope.toFixed(1)),
        primaryAspect,
        aspectBreakdown
    };
}

// GPX Upload Functions
let uploadedGPXFile = null;

function initGPXUpload() {
    const fileInput = document.getElementById('gpx-upload-input');
    const uploadLabel = document.querySelector('.upload-btn-compact');
    const uploadStatus = document.getElementById('upload-status');
    const filenameSpan = document.getElementById('upload-filename');
    const processBtn = document.getElementById('btn-process');
    const cancelBtn = document.getElementById('btn-cancel-upload');

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        uploadedGPXFile = file;
        filenameSpan.textContent = file.name;
        uploadLabel.style.display = 'none';
        uploadStatus.style.display = 'flex';
    });

    processBtn.addEventListener('click', processGPXFile);

    cancelBtn.addEventListener('click', () => {
        uploadedGPXFile = null;
        fileInput.value = '';
        uploadStatus.style.display = 'none';
        uploadLabel.style.display = 'inline-flex';
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

            // Analyze
            const metadata = analyzeGPXContent(gpxDoc, uploadedGPXFile.name);

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
                    // Refresh
                    loadRoutes(); // This will try fetching list from worker if implemented, or we might need to update loadRoutes to handle worker list

                    // Reset UI
                    resetUploadUI();
                } else {
                    throw new Error('Worker returned error');
                }
            } catch (workerError) {
                console.warn('Worker upload failed/skipped:', workerError);

                // LOCALHOST / FALLBACK BEHAVIOR:
                // 1. Add to local memory so it appears in the table immediately
                allRoutes.push(metadata);
                filteredRoutes = [...allRoutes];
                renderTable();

                // 2. Alert user with instructions
                alert(`Analysis Success!\n\nName: ${metadata.name}\nAspect: ${metadata.primaryAspect}\n\nSince you are on Localhost (or Worker is down):\n1. The file "${metadata.filename}" has been downloaded.\n2. Move it to your local 'gpx/' folder.\n3. Run 'npm run build' to update the index permanently.`);

                // 3. Trigger download of the renamed GPX file
                const blob = new Blob([gpxText], { type: 'application/gpx+xml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = metadata.filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                resetUploadUI();
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


