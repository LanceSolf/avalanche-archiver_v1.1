const fs = require('fs');
const path = require('path');

const WEBCAMS_FILE = path.join(__dirname, '../data/webcams.json');
const RAW_SCRAPE_FILE = path.join(__dirname, '../data/scraped_webcams_raw.json');

const webcams = JSON.parse(fs.readFileSync(WEBCAMS_FILE, 'utf8'));
const rawScrapes = fs.existsSync(RAW_SCRAPE_FILE) ? JSON.parse(fs.readFileSync(RAW_SCRAPE_FILE, 'utf8')) : [];

let revertedCount = 0;

webcams.forEach(cam => {
    // Check if it's a broken WebTV link
    if (cam.linkUrl && cam.linkUrl.includes('webtv.feratel.com')) {

        // Find the source entry in the raw scrape
        // Helper to normalize strings for comparison (reuse from merge script logic roughly)
        const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normTitle = normalize(cam.title);

        const match = rawScrapes.find(r => normalize(r.title) === normTitle);

        if (match && match.detailUrl) {
            console.log(`Reverting ${cam.title}:`);
            console.log(`   FROM: ${cam.linkUrl}`);
            console.log(`   TO:   ${match.detailUrl}`);

            cam.linkUrl = match.detailUrl;
            // Optionally we could reset provider, but keeping "Feratel" is likely accurate for the *content*, just the link was bad.
            // But verify if we should change type? Use the original logic?
            // "status": "Live stream" -> type: "live"
            // The type seems fine to remain as is (it is a live cam, just the direct link is broken).

            revertedCount++;
        } else {
            console.warn(`Could not find backup detail URL for ${cam.title} (${cam.linkUrl})`);
        }
    }
});

fs.writeFileSync(WEBCAMS_FILE, JSON.stringify(webcams, null, 4));
console.log(`Reverted ${revertedCount} WebTV links.`);
