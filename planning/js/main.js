// Initialize map centered on Allgäu Alps
const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {
            'opentopo': {
                type: 'raster',
                tiles: [
                    'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
                    'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
                    'https://c.tile.opentopomap.org/{z}/{x}/{y}.png'
                ],
                tileSize: 256,
                attribution: 'Map data: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: © <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
            }
        },
        layers: [
            {
                id: 'opentopo',
                type: 'raster',
                source: 'opentopo',
                minzoom: 0,
                maxzoom: 22
            }
        ]
    },
    center: [10.2, 47.4], // Allgäu Alps region
    zoom: 10,
    pitch: 0,
    bearing: 0,
    // Mobile Gestures
    dragPan: true,        // One finger to move
    touchZoomRotate: true, // Two fingers to zoom/rotate
    touchPitch: true      // Two fingers to tilt
});

// Add standard scale control
map.addControl(new maplibregl.ScaleControl(), 'bottom-left');



// Initialize overlay layers when map loads
map.on('load', () => {
    // Add Satellite layer (Sentinel-2)
    map.addSource('satellite', {
        type: 'raster',
        tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    map.addLayer({
        id: 'satellite-layer',
        type: 'raster',
        source: 'satellite',
        layout: { visibility: 'none' },
        paint: { 'raster-opacity': 1.0 }
    });

    // Add Slope Layer instance
    const slopeLayer = new SlopeLayer();
    slopeLayer.onAdd(map); // Manually trigger add - it manages its own source/layer now

    window.slopeLayerInstance = slopeLayer; // Global access for controls


    // Add terrain source for 3D
    map.addSource('terrarium', {
        type: 'raster-dem',
        tiles: [
            'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
        ],
        encoding: 'terrarium',
        tileSize: 256,
        attribution: 'Terrain tiles by <a href="https://github.com/tilezen/joerd">Mapzen Joerd</a>'
    });

    // Add source for GPX routes
    map.addSource('gpx-route', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });

    map.addLayer({
        id: 'gpx-route-layer',
        type: 'line',
        source: 'gpx-route',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': '#dc2626',
            'line-width': 4,
            'line-opacity': 0.8
        }
    });

    // Initialize File Input listeners
    initGPXUpload();
});

// Create ShadeMap instance
const shadeMap = new ShadeMap(map);

// UI References
const shademapToggle = document.getElementById('shademap-toggle');
const shademapBottomContainer = document.getElementById('bottom-slider-container');
const shademapTimeSlider = document.getElementById('shademap-time');
const shademapTimeValue = document.getElementById('shademap-time-value');
const shademapLinkContainer = document.getElementById('shademap-link-container');
const shademapLink = document.getElementById('shademap-link');

// Initialize Time Display
const now = new Date();
const initialMinutes = now.getHours() * 60 + now.getMinutes();
shademapTimeSlider.value = initialMinutes;
updateTimeDisplay(initialMinutes);
shadeMap.setMinutes(initialMinutes);

function updateShademapLink() {
    const center = map.getCenter();
    const zoom = map.getZoom();
    // ShadeMap format: @lat,lng,zoomz,timestampt
    const date = shadeMap.currentTime || new Date();
    const timestamp = date.getTime();

    const url = `https://shademap.app/@${center.lat.toFixed(5)},${center.lng.toFixed(5)},${zoom.toFixed(2)}z,${timestamp}t`;
    shademapLink.href = url;
}

function updateSatelliteLink() {
    const link = document.getElementById('satellite-link');
    if (!link) return;
    const center = map.getCenter();
    const zoom = Math.round(map.getZoom());
    link.href = `https://eos.com/landviewer/?lat=${center.lat.toFixed(5)}&lng=${center.lng.toFixed(5)}&z=${zoom}&b=Red,Green,Blue&anti=true&processing=L2A`;
}

shademapToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        // Show bottom slider
        shademapBottomContainer.style.display = 'flex';
        // Show external link
        shademapLinkContainer.style.display = 'block';
        updateShademapLink();
        map.on('move', updateShademapLink);

        shadeMap.toggle(true);
    } else {
        // Hide bottom slider
        shademapBottomContainer.style.display = 'none';
        // Hide external link
        shademapLinkContainer.style.display = 'none';
        map.off('move', updateShademapLink);

        shadeMap.toggle(false);
    }
});

// Debounce slider input
let sliderTimeout;
shademapTimeSlider.addEventListener('input', (e) => {
    const minutes = parseInt(e.target.value);
    updateTimeDisplay(minutes);

    // Debounce the calculation
    clearTimeout(sliderTimeout);
    sliderTimeout = setTimeout(() => {
        shadeMap.setMinutes(minutes);
        updateShademapLink(); // Update link with new time
    }, 100); // 100ms debounce
});

function updateTimeDisplay(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    shademapTimeValue.textContent = timeStr;
}

// Layer Controls
const layers = [
    { id: 'slope', toggle: 'slope-toggle', opacity: 'slope-opacity', opacityValue: 'slope-opacity-value', container: 'slope-opacity-container' },
    { id: 'satellite', toggle: 'satellite-toggle', opacity: 'satellite-opacity', opacityValue: 'satellite-opacity-value', container: 'satellite-opacity-container' }
];

layers.forEach(layer => {
    const toggle = document.getElementById(layer.toggle);
    const opacitySlider = document.getElementById(layer.opacity);
    const opacityValue = document.getElementById(layer.opacityValue);
    const opacityContainer = document.getElementById(layer.container);

    toggle.addEventListener('change', (e) => {
        // Special handling for Slope
        if (layer.id === 'slope') {
            if (window.slopeLayerInstance) {
                window.slopeLayerInstance.visible = e.target.checked;
                map.triggerRepaint();
                // Show/Hide Legend
                document.getElementById('slope-legend').style.display = e.target.checked ? 'block' : 'none';
            }
        } else if (layer.id === 'satellite') {
            const visibility = e.target.checked ? 'visible' : 'none';
            map.setLayoutProperty(`${layer.id}-layer`, 'visibility', visibility);

            // Handle EOS Link
            const linkContainer = document.getElementById('satellite-link-container');

            if (e.target.checked) {
                linkContainer.style.display = 'block';
                updateSatelliteLink();
                map.on('move', updateSatelliteLink);
            } else {
                linkContainer.style.display = 'none';
                map.off('move', updateSatelliteLink);
            }
        } else {
            const visibility = e.target.checked ? 'visible' : 'none';
            map.setLayoutProperty(`${layer.id}-layer`, 'visibility', visibility);
        }
        opacityContainer.style.display = e.target.checked ? 'block' : 'none';
    });

    opacitySlider.addEventListener('input', (e) => {
        const opacity = e.target.value / 100;
        if (layer.id === 'slope' && window.slopeLayerInstance) {
            window.slopeLayerInstance.setOpacity(opacity);
            opacityValue.textContent = e.target.value;
        } else {
            map.setPaintProperty(`${layer.id}-layer`, 'raster-opacity', opacity);
            opacityValue.textContent = e.target.value;
        }
    });
});

// 3D Terrain Controls
const terrainToggle = document.getElementById('terrain-toggle');

terrainToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        map.setTerrain({ source: 'terrarium', exaggeration: 1.5 });
        map.easeTo({ pitch: 60, duration: 1000 });
    } else {
        map.setTerrain(null);
        map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
    }
});

// Custom Controls Logic
const controls3dGroup = document.getElementById('controls-3d-group');
const compassIcon = document.getElementById('compass-icon');

// Buttons
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnResetNorth = document.getElementById('btn-reset-north');
const ctrlTiltUp = document.getElementById('ctrl-tilt-up');
const ctrlTiltDown = document.getElementById('ctrl-tilt-down');
const ctrlRotateLeft = document.getElementById('ctrl-rotate-left');
const ctrlRotateRight = document.getElementById('ctrl-rotate-right');

function update3DControlsVisibility() {
    if (terrainToggle.checked) {
        controls3dGroup.classList.add('visible');
    } else {
        controls3dGroup.classList.remove('visible');
    }
}

// Keep Compass pointer updated
map.on('rotate', () => {
    const bearing = map.getBearing();
    compassIcon.style.transform = `rotate(${-bearing}deg)`;
});

// Link visibility to terrain toggle
terrainToggle.addEventListener('change', update3DControlsVisibility);

// Control Actions
btnZoomIn.addEventListener('click', () => map.zoomIn());
btnZoomOut.addEventListener('click', () => map.zoomOut());

btnResetNorth.addEventListener('click', () => {
    map.easeTo({ bearing: 0, pitch: 0, duration: 1000 });
    // Also reset 3D active state visuals if needed, though we keep 3D terrain on
});

ctrlTiltUp.addEventListener('click', () => {
    map.easeTo({ pitch: Math.min(map.getPitch() + 15, 85), duration: 300 });
});
ctrlTiltDown.addEventListener('click', () => {
    map.easeTo({ pitch: Math.max(map.getPitch() - 15, 0), duration: 300 });
});
ctrlRotateLeft.addEventListener('click', () => {
    map.easeTo({ bearing: map.getBearing() - 22.5, duration: 300 });
});
ctrlRotateRight.addEventListener('click', () => {
    map.easeTo({ bearing: map.getBearing() + 22.5, duration: 300 });
});

// GPX Upload Logic
function initGPXUpload() {
    const fileInput = document.getElementById('gpx-file-input');
    const clearBtn = document.getElementById('btn-clear-gpx');
    const statusDiv = document.getElementById('gpx-status');
    const filenameSpan = document.getElementById('gpx-filename');
    const uploadLabel = document.querySelector('.upload-btn');

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        filenameSpan.textContent = file.name;
        uploadLabel.style.display = 'none';
        statusDiv.style.display = 'flex';

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const gpxText = event.target.result;
                const parser = new DOMParser();
                const gpxDoc = parser.parseFromString(gpxText, 'text/xml');
                const geojson = toGeoJSON.gpx(gpxDoc);

                // Update map data
                map.getSource('gpx-route').setData(geojson);

                // Fit bounds
                const bounds = new maplibregl.LngLatBounds();
                let hasFeatures = false;

                geojson.features.forEach(feature => {
                    if (feature.geometry && feature.geometry.coordinates) {
                        // LineString
                        if (feature.geometry.type === 'LineString') {
                            hasFeatures = true;
                            feature.geometry.coordinates.forEach(coord => bounds.extend(coord));
                        }
                        // MultiLineString
                        else if (feature.geometry.type === 'MultiLineString') {
                            hasFeatures = true;
                            feature.geometry.coordinates.forEach(line => {
                                line.forEach(coord => bounds.extend(coord));
                            });
                        }
                    }
                });

                if (hasFeatures) {
                    const is3D = terrainToggle.checked;
                    const isMobile = window.innerWidth <= 768;

                    // Adjust padding based on device and mode
                    let padding = 50;
                    if (is3D) {
                        padding = isMobile ? 100 : 200;
                    } else {
                        padding = isMobile ? 20 : 50;
                    }

                    map.fitBounds(bounds, {
                        padding: padding,
                        maxZoom: is3D ? 12.5 : 15
                    });
                }

            } catch (err) {
                console.error('Error parsing GPX:', err);
                alert('Invalid GPX file.');
            }
        };
        reader.readAsText(file);
    });

    clearBtn.addEventListener('click', () => {
        // Clear map source
        map.getSource('gpx-route').setData({
            type: 'FeatureCollection',
            features: []
        });

        // Reset UI
        fileInput.value = ''; // allow re-uploading same file
        statusDiv.style.display = 'none';
        uploadLabel.style.display = 'inline-block';
    });
}

// Drawer Controls logic
const controlPanel = document.getElementById('control-panel');
const sidebarHandle = document.getElementById('sidebar-handle');
const bottomDrawerContainer = document.getElementById('bottom-slider-container');
const bottomDrawerToggle = document.getElementById('bottom-drawer-toggle');

// Sidebar Toggle
sidebarHandle.addEventListener('click', () => {
    controlPanel.classList.toggle('minimized');
});

// Bottom Slider Toggle
if (bottomDrawerToggle && bottomDrawerContainer) {
    bottomDrawerToggle.addEventListener('click', () => {
        bottomDrawerContainer.classList.toggle('minimized');
    });
}
