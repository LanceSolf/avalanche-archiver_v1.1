
// Configuration Constants
export const APP_CONFIG = {
    WORKER_URL: 'https://avalanche-archiver-uploads.bigdoggybollock.workers.dev',
    // Add other global constants here
};

// Aspect colors matching the slope-aspect layer
export const ASPECT_COLORS = {
    N: '#3b82f6',
    NE: '#22d3ee',
    E: '#22c55e',
    SE: '#a3e635',
    S: '#ef4444',
    SW: '#fb923c',
    W: '#facc15',
    NW: '#a855f7'
};

// GPX Analysis Utilities
export const GPXUtils = {
    haversineDistance(lat1, lon1, lat2, lon2) {
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
    },

    calculateSlopeAndAspect(p1, p2, distance) {
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
    },

    categorizeAspect(bearing) {
        if (bearing >= 337.5 || bearing < 22.5) return 'N';
        if (bearing >= 22.5 && bearing < 67.5) return 'NE';
        if (bearing >= 67.5 && bearing < 112.5) return 'E';
        if (bearing >= 112.5 && bearing < 157.5) return 'SE';
        if (bearing >= 157.5 && bearing < 202.5) return 'S';
        if (bearing >= 202.5 && bearing < 247.5) return 'SW';
        if (bearing >= 247.5 && bearing < 292.5) return 'W';
        return 'NW';
    },

    analyzeGPXContent(gpxDoc, filename) {
        console.log('Analyzing GPX via Utils:', filename);
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

            const distance = this.haversineDistance(p1.lat, p1.lon, p2.lat, p2.lon);
            totalDistance += distance;

            const elevChange = p2.ele - p1.ele;
            if (elevChange > 0) totalAscent += elevChange;
            if (elevChange < 0) totalDescent += Math.abs(elevChange);

            elevationMin = Math.min(elevationMin, p1.ele, p2.ele);
            elevationMax = Math.max(elevationMax, p1.ele, p2.ele);

            // Calculate slope and aspect
            let { slope, aspect } = this.calculateSlopeAndAspect(p1, p2, distance);

            // Correction: If gaining elevation (skinning up), the aspect of the slope is opposite to direction of travel
            // e.g. Traveling North up a slope means the slope faces South.
            if (elevChange > 0) {
                aspect = (aspect + 180) % 360;
            }

            maxSlope = Math.max(maxSlope, slope);
            totalSlopeDistance += slope * distance;

            // 1. General Aspect Breakdown (Slopes > 15°)
            if (slope >= 15) {
                const aspectCategory = this.categorizeAspect(aspect);
                aspectDistances[aspectCategory] += distance;
                totalDistanceAboveThreshold += distance;
            }

            // 2. Primary Aspect Calculation (Descent Only)
            // We look at ALL descent segments > 15 degrees
            if (elevChange < 0 && slope >= 15) {
                const aspectCategory = this.categorizeAspect(aspect);
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
    },
    processGPXTextToMap(map, gpxText) {
        try {
            const parser = new DOMParser();
            const gpxDoc = parser.parseFromString(gpxText, 'text/xml');
            // Assuming toGeoJSON is available globally as in the original code
            const geojson = toGeoJSON.gpx(gpxDoc);
            map.getSource('gpx-route').setData(geojson);
            this.fitMapToGeoJSON(map, geojson);
        } catch (err) {
            console.error('Error parsing GPX:', err);
            alert('Invalid GPX file.');
        }
    },

    fitMapToGeoJSON(map, geojson) {
        const bounds = new maplibregl.LngLatBounds();
        let hasFeatures = false;

        geojson.features.forEach(feature => {
            if (feature.geometry && feature.geometry.coordinates) {
                if (feature.geometry.type === 'LineString') {
                    hasFeatures = true;
                    feature.geometry.coordinates.forEach(coord => bounds.extend(coord));
                } else if (feature.geometry.type === 'MultiLineString') {
                    hasFeatures = true;
                    feature.geometry.coordinates.forEach(line => {
                        line.forEach(coord => bounds.extend(coord));
                    });
                }
            }
        });

        if (hasFeatures) {
            const is3D = map.getPitch() > 0; // Simple check, or pass element id
            // We can also check the DOM element state if needed, but passing map is cleaner
            // For now, let's assume standard behavior or pass options
            const isMobile = window.innerWidth <= 768;
            let padding = 50;

            // To maintain the exact behavior, we might need to check the UI state
            // But for a utility, it's better to be stateless or accept config.
            // Let's rely on standard padding for now, or improve later if strict 3D padding is needed.

            // Re-implementing the specific logic from main.js requires access to DOM elements
            // which might not be ideal in a pure utility.
            // However, since this is specific to this app, we can check the DOM elements.
            const terrainToggle = document.getElementById('terrain-toggle');
            if (terrainToggle && terrainToggle.checked) {
                const h = map.getCanvas().height;
                padding = {
                    top: h * 0.65,
                    bottom: 20,
                    left: 50,
                    right: isMobile ? 20 : 350
                };
            } else {
                padding = isMobile ? 20 : 50;
            }

            map.fitBounds(bounds, { padding: padding, maxZoom: 12.5 });
        }
    }
};
