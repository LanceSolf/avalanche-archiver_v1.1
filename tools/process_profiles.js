const https = require('https');
const fs = require('fs');
const path = require('path');

const INCIDENTS_FILE = path.join(__dirname, '../data/incidents.json');
const RECENT_PROFILES_FILE = path.join(__dirname, '../data/recent_profiles.json');
const PROFILE_API_URL = 'https://lawis.at/lawis_api/v2_3/profile/';

// Configuration
const MATCH_DIST_KM = 0.5; // 500m
const MATCH_TIME_DAYS = 7;
const RECENT_WINDOW_DAYS = 7;

// Helper to fetch JSON
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'AvalancheArchiver/1.0' } }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.error('JSON Parse error', data.substring(0, 100));
                    resolve([]);
                }
            });
        }).on('error', reject);
    });
}

// Haversine Distance
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

(async () => {
    console.log('--- Processing Snow Profiles ---');

    // 1. Load Incidents
    let incidents = [];
    if (fs.existsSync(INCIDENTS_FILE)) {
        incidents = JSON.parse(fs.readFileSync(INCIDENTS_FILE, 'utf8'));
    }
    console.log(`Loaded ${incidents.length} incidents.`);

    // 2. Fetch Profiles (Historical Pass logic: fetch from 2018?)
    // In production, we might want to be smarter, but for now, let's fetch broad.
    // However, fetching 6 years of profiles might be heavy. 
    // Optimization: If we have many incidents, we definitely want matching.
    // Let's simpler: Fetch ALL from 2018-01-01. Lawis API is usually fast enough for a few thousand items.

    // Calculate start date: Earliest incident date - 7 days, OR default to 2018.
    // For now, let's hardcode a reasonable historical start for the "one-time" pass.
    // User requested "one-time historical pass".
    const startDate = '2018-09-01';
    console.log(`Fetching profiles since ${startDate}...`);

    const profiles = await fetchJson(`${PROFILE_API_URL}?startDate=${startDate}`);
    console.log(`Fetched ${profiles.length} profiles.`);

    // 3. Match Profiles to Incidents
    let mtachedCount = 0;

    // We should enable "Germany" and "Allgau" filtering for recent profiles.
    // Simple Bounding Box/Region Check for "Recent" list (Allgau + Bayern)
    // Approximate box for Bavarian Alps + Allgau:
    // Lat: 47.2 - 47.8, Lon: 9.9 - 13.5
    function isRelevantRegion(p) {
        // ID check if we knew IDs. 
        // 82 = Vorarlberg/Allgau?
        // Let's use Lat/Lon filter for simplicity and robustness
        const lat = p.latitude;
        const lon = p.longitude;
        if (!lat || !lon) return false;

        // Broad box for Northern Alps (Allgau, Tyrol, Bavaria)
        return (lat >= 47.0 && lat <= 48.0 && lon >= 9.5 && lon <= 13.5);
    }

    const now = new Date();
    const recentProfiles = [];

    // Helper to parse date "YYYY-MM-DD HH:mm:ss"
    function parseDate(dStr) {
        return new Date(dStr.replace(' ', 'T'));
    }

    profiles.forEach(p => {
        const pDate = parseDate(p.datum); // Assuming "datum" field

        // A. Recent Profiles Logic
        const diffDays = (now - pDate) / (1000 * 60 * 60 * 24);
        if (diffDays <= RECENT_WINDOW_DAYS && diffDays >= 0) {
            // Check region
            if (isRelevantRegion(p)) {
                recentProfiles.push(p);
            }
        }
    });

    // B. Incident Matching Logic
    incidents.forEach(inc => {
        const iDate = parseDate(inc.date);

        // Initialize or clear matches
        inc.linked_profiles = [];

        profiles.forEach(p => {
            if (!p.latitude || !p.longitude) return;

            // 1. Time Check
            const pDate = parseDate(p.datum);
            const timeDiff = Math.abs((iDate - pDate) / (1000 * 60 * 60 * 24));

            if (timeDiff <= MATCH_TIME_DAYS) {
                // 2. Distance Check
                const dist = getDistance(inc.lat, inc.lon, p.latitude, p.longitude);
                if (dist <= MATCH_DIST_KM) {
                    // Match!
                    inc.linked_profiles.push({
                        id: p.profil_id,
                        date: p.datum,
                        dist_km: dist.toFixed(3),
                        elevation: p.seehoehe,
                        aspect: p.exposition, // or expo? need to verify field
                        url: `https://lawis.at/lawis_api/v2_3/files/profiles/snowprofile_${p.profil_id}.png?v=${p.revision || 1}`
                    });
                }
            }
        });

        if (inc.linked_profiles.length > 0) {
            mtachedCount++;
            // Sort by distance
            inc.linked_profiles.sort((a, b) => parseFloat(a.dist_km) - parseFloat(b.dist_km));
        }
    });

    console.log(`Matched profiles to ${mtachedCount} incidents.`);
    console.log(`Found ${recentProfiles.length} recent profiles in region.`);

    // 4. Save
    fs.writeFileSync(INCIDENTS_FILE, JSON.stringify(incidents, null, 2));

    // Sort recent by date desc
    recentProfiles.sort((a, b) => parseDate(b.datum) - parseDate(a.datum));
    fs.writeFileSync(RECENT_PROFILES_FILE, JSON.stringify(recentProfiles, null, 2));

    console.log('Saved updates.');

})();
