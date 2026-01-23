/**
 * GPX Route Analyzer
 * 
 * Analyzes GPX files to extract route metadata including:
 * - Distance, ascent, descent
 * - Aspect breakdown for slopes >20°
 * - Primary descent aspect on slopes >30°
 * 
 * Outputs to: gpx/routes-metadata.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { DOMParser } = require('@xmldom/xmldom');

// Haversine distance calculation
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

    return R * c; // Distance in meters
}

// Fetch elevation tile from Terrarium
function fetchTerrariumTile(z, x, y) {
    return new Promise((resolve, reject) => {
        const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
        https.get(url, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(Buffer.concat(chunks));
                } else {
                    reject(new Error(`Failed to fetch tile: ${res.statusCode}`));
                }
            });
        }).on('error', reject);
    });
}

// Convert lat/lon to tile coordinates
function latLonToTile(lat, lon, zoom) {
    const n = Math.pow(2, zoom);
    const x = Math.floor((lon + 180) / 360 * n);
    const latRad = lat * Math.PI / 180;
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x, y };
}

// Parse GPX file
function parseGPX(filePath) {
    const gpxContent = fs.readFileSync(filePath, 'utf-8');
    const parser = new DOMParser();
    const gpxDoc = parser.parseFromString(gpxContent, 'text/xml');

    const metadata = {
        name: gpxDoc.getElementsByTagName('name')[0]?.textContent || path.basename(filePath, '.gpx'),
        description: gpxDoc.getElementsByTagName('desc')[0]?.textContent || ''
    };

    const trackPoints = [];
    const trkpts = gpxDoc.getElementsByTagName('trkpt');

    for (let i = 0; i < trkpts.length; i++) {
        const trkpt = trkpts[i];
        const lat = parseFloat(trkpt.getAttribute('lat'));
        const lon = parseFloat(trkpt.getAttribute('lon'));
        const eleNode = trkpt.getElementsByTagName('ele')[0];
        const ele = eleNode ? parseFloat(eleNode.textContent) : 0;

        trackPoints.push({ lat, lon, ele });
    }

    return { metadata, trackPoints, gpxDoc, trkpts };
}

// Calculate slope and aspect between two points
function calculateSlopeAndAspect(p1, p2, distance) {
    const elevationChange = p2.ele - p1.ele;
    const slopeRad = Math.atan(elevationChange / distance);
    const slopeDeg = slopeRad * 180 / Math.PI;

    // Calculate bearing (aspect) from p1 to p2
    const lat1 = p1.lat * Math.PI / 180;
    const lat2 = p2.lat * Math.PI / 180;
    const Δλ = (p2.lon - p1.lon) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(Δλ);
    let bearing = Math.atan2(y, x) * 180 / Math.PI;

    // Normalize to 0-360
    bearing = (bearing + 360) % 360;

    return { slope: Math.abs(slopeDeg), aspect: bearing };
}

// Categorize aspect into 8 directions
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

// Analyze a single route
async function analyzeRoute(filePath) {
    console.log(`Analyzing: ${path.basename(filePath)}`);

    const { metadata, trackPoints, gpxDoc, trkpts } = parseGPX(filePath);

    // Check if we need to backfill elevation
    let hasElevation = false;
    let lastEle = trackPoints[0].ele;
    for (const p of trackPoints) {
        if (p.ele !== 0 && p.ele !== lastEle) {
            hasElevation = true;
            break;
        }
    }

    if (!hasElevation) {
        console.log('  ⚠ No elevation data found. Attempting to fetch from open-elevation.com...');
        try {
            await enrichElevation(trackPoints, trkpts, gpxDoc);
            console.log('  ✓ Elevation fetched successfully.');
        } catch (err) {
            console.warn('  ✘ Failed to fetch elevation:', err.message);
        }
    }

    let totalDistance = 0;
    // ... rest of function ...

    // Helper function to fetch elevation using OpenTopoData (EUDEM 25m - Europe Only)
    async function enrichElevation(trackPoints, trkpts, gpxDoc) {
        console.log(`    Requesting elevation backfill from OpenTopoData (EUDEM 25m) for ${trackPoints.length} points...`);

        // OpenTopoData limit: 100 locations per request. 1 request per second.
        const CHUNK_SIZE = 50;
        const DELAY_MS = 1200; // Be nice to the API
        let successCount = 0;
        let modified = false;

        for (let i = 0; i < trackPoints.length; i += CHUNK_SIZE) {
            const chunk = trackPoints.slice(i, i + CHUNK_SIZE);
            // Format: lat,lon|lat,lon
            const locationsParam = chunk.map(p => `${p.lat},${p.lon}`).join('|');

            try {
                const url = `https://api.opentopodata.org/v1/eudem25m?locations=${locationsParam}`;

                const results = await new Promise((resolve, reject) => {
                    const req = https.get(url, (res) => {
                        const chunks = [];
                        res.on('data', d => chunks.push(d));
                        res.on('end', () => {
                            if (res.statusCode !== 200) {
                                reject(new Error(`API Error ${res.statusCode}`));
                                return;
                            }
                            try {
                                const buffer = Buffer.concat(chunks);
                                const json = JSON.parse(buffer.toString());
                                resolve(json.results);
                            } catch (e) {
                                reject(e);
                            }
                        });
                    });
                    req.on('error', reject);
                });

                if (results) {
                    results.forEach((result, idx) => {
                        if (result && typeof result.elevation === 'number') {
                            // Update JS object
                            chunk[idx].ele = result.elevation;
                            successCount++;
                            modified = true;

                            // Update XML Node
                            if (trkpts && trkpts[i + idx]) {
                                const trkpt = trkpts[i + idx];
                                let eleNode = trkpt.getElementsByTagName('ele')[0];
                                if (!eleNode) {
                                    eleNode = gpxDoc.createElement('ele');
                                    trkpt.appendChild(eleNode);
                                }
                                eleNode.textContent = result.elevation.toFixed(1);
                            }
                        }
                    });
                }

                process.stdout.write('.'); // progress dot
                await new Promise(r => setTimeout(r, DELAY_MS));

            } catch (e) {
                console.warn(`\n    ⚠ Failed fetch chunk ${i}: ${e.message}`);
            }
        }

        console.log('\n'); // Newline after dots
        if (successCount > 0) {
            console.log(`    ✓ Successfully filled elevation for ${successCount}/${trackPoints.length} points.`);

            // Persist to disk
            if (modified && gpxDoc) {
                console.log(`    💾 Persisting updated elevation to ${path.basename(filePath)}...`);
                // Use XMLSerializer equivalent (xmldom has toString())
                const serializer = new (require('@xmldom/xmldom').XMLSerializer)();
                const newContent = serializer.serializeToString(gpxDoc);
                fs.writeFileSync(filePath, newContent, 'utf-8');
                console.log('    ✓ File updated.');
            }

        } else {
            console.warn('    ⚠ Failed to backfill elevation. Data may be outside EUDEM coverage (Europe).');
        }
    }
    let totalAscent = 0;
    let totalDescent = 0;
    let elevationMin = Infinity;
    let elevationMax = -Infinity;
    let maxSlope = 0;
    let totalSlopeDistance = 0; // Weighted slope calculation

    // Aspect breakdown for slopes >15°
    const aspectDistances = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
    let totalDistanceAboveThreshold = 0;

    // Gentle Aspect Breakdown (Slopes > 3°) - Ultimate Fallback
    const gentleAspectDistances = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };

    // Aspect tracking for descent for slopes > 15°
    const descentAspectDistances = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
    let totalDescentDistanceAboveThreshold = 0;

    // Analyze each segment
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

        // Track max slope
        maxSlope = Math.max(maxSlope, slope);
        totalSlopeDistance += slope * distance;

        // 1. General Aspect Breakdown (Slopes > 15°)
        if (slope >= 15) {
            const aspectCategory = categorizeAspect(aspect);
            aspectDistances[aspectCategory] += distance;
            totalDistanceAboveThreshold += distance;
        }

        // 1b. Gentle Aspect Breakdown (Slopes > 3°)
        if (slope >= 3) {
            const aspectCategory = categorizeAspect(aspect);
            gentleAspectDistances[aspectCategory] += distance;
        }

        // 2. Primary Aspect Calculation (Descent Only)
        // We look at ALL descent segments > 15 degrees
        if (elevChange < 0 && slope >= 15) {
            const aspectCategory = categorizeAspect(aspect);
            descentAspectDistances[aspectCategory] += distance;
            totalDescentDistanceAboveThreshold += distance;
        }
    }

    // Calculate aspect percentages
    const aspectBreakdown = {};
    for (const dir in aspectDistances) {
        aspectBreakdown[dir] = totalDistanceAboveThreshold > 0
            ? parseFloat((aspectDistances[dir] / totalDistanceAboveThreshold * 100).toFixed(1))
            : 0;
    }

    // Calculate average slope
    const avgSlope = totalDistance > 0 ? (totalSlopeDistance / totalDistance) : 0;

    // Determine primary aspect
    // Priority:
    // 1. Descent Aspect (IF significant descent exists)
    // 2. General Aspect (Fall back if mostly ascent or flat)

    let primaryAspect = 'N';
    let maxDescentDistance = 0;

    // Only consider Descent Aspect as priority if:
    // A) The route has > 150m descent
    // B) OR the route is at least 30% descent (to catch smaller but valid downhill runs)
    const isSignificantDescent = totalDescent > 150 || (totalDescent > totalAscent * 0.3);

    if (isSignificantDescent) {
        for (const dir in descentAspectDistances) {
            if (descentAspectDistances[dir] > maxDescentDistance) {
                maxDescentDistance = descentAspectDistances[dir];
                primaryAspect = dir;
            }
        }
    }

    // Fallback 1: If no significant descent found (>15°), try general breakdown (>15°)
    if (maxDescentDistance === 0) {
        let maxAspectDist = 0;
        for (const dir in aspectDistances) {
            if (aspectDistances[dir] > maxAspectDist) {
                maxAspectDist = aspectDistances[dir];
                primaryAspect = dir;
            }
        }

        // Fallback 2: If STILL 0 (all terrain < 15°), use gentle aspect breakdown (>3°)
        // This stops flat tours from defaulting to N
        if (maxAspectDist === 0) {
            let maxGentleDist = 0;
            for (const dir in gentleAspectDistances) {
                if (gentleAspectDistances[dir] > maxGentleDist) {
                    maxGentleDist = gentleAspectDistances[dir];
                    primaryAspect = dir;
                }
            }
        }
    }

    // Determine region from route name or location
    let region = 'Allgäu Alps';
    // Use filename as the Name if possible (node script doesn't know "original filename" unless user renamed it on disk)
    // path.basename(filePath) IS the filename on disk.
    // The user wants filename to take priority over internal metadata.
    const displayName = path.basename(filePath, '.gpx'); // use filename as display name

    if (displayName.toLowerCase().includes('kleinwalsertal') || displayName.toLowerCase().includes('fellhorn')) {
        region = 'Allgäu Alps West';
    } else if (displayName.toLowerCase().includes('oberstdorf') || displayName.toLowerCase().includes('nebelhorn')) {
        region = 'Allgäu Alps Central';
    }

    return {
        id: path.basename(filePath, '.gpx'),
        name: displayName, // Priority: Filename
        filename: path.basename(filePath),
        region,
        distance: parseFloat((totalDistance / 1000).toFixed(2)), // km
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

// Main execution
async function main() {
    const gpxDir = path.join(__dirname, '../gpx');
    const outputFile = path.join(gpxDir, 'routes-metadata.json');

    const files = fs.readdirSync(gpxDir).filter(f => f.endsWith('.gpx'));

    console.log(`Found ${files.length} GPX files\n`);

    const routes = [];

    for (const file of files) {
        const filePath = path.join(gpxDir, file);
        const routeData = await analyzeRoute(filePath);
        if (routeData) {
            routes.push(routeData);
        }
    }

    const output = { routes };

    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`\n✓ Generated: ${outputFile}`);
    console.log(`✓ Analyzed ${routes.length} routes`);
}

main().catch(console.error);
