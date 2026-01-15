const fs = require('fs');
const path = require('path');

const SKI_RESORT_URL_BASE = 'https://www.skiresort.info';

const WEBCAMS_FILE = path.join(__dirname, '../data/webcams.json');
const FERATEL_FIX_FILE = path.join(__dirname, '../data/webcams_to_fix.json');
const SCRAPED_LINKS_FILE = path.join(__dirname, '../data/scraped_deeplinks.json');

const webcams = JSON.parse(fs.readFileSync(WEBCAMS_FILE, 'utf8'));
const feratelFixes = fs.existsSync(FERATEL_FIX_FILE) ? JSON.parse(fs.readFileSync(FERATEL_FIX_FILE, 'utf8')) : [];
const scrapedLinks = fs.existsSync(SCRAPED_LINKS_FILE) ? JSON.parse(fs.readFileSync(SCRAPED_LINKS_FILE, 'utf8')) : [];

let updatedCount = 0;

// Apply Feratel Regex Fixes
feratelFixes.forEach(fix => {
    const cam = webcams.find(c => c.title === fix.title); // Match by title strictly
    if (cam) {
        cam.linkUrl = fix.newLink;
        cam.type = 'live'; // Feratel is usually live
        cam.provider = 'Feratel';
        updatedCount++;
    }
});

// Apply Scraped Links
scrapedLinks.forEach(item => {
    if (!item.deepLink) return;

    // Use linkUrl to match, but match strictly on the skiresort link
    const cam = webcams.find(c => c.linkUrl === item.originalUrl);
    if (cam) {
        cam.linkUrl = item.deepLink;
        // Logic: Panomax/Roundshot are "live" (360 interactive)
        if (item.deepLink.includes('panomax') || item.deepLink.includes('roundshot')) {
            cam.type = 'live';
            if (item.deepLink.includes('panomax')) cam.provider = 'Panomax';
            if (item.deepLink.includes('roundshot')) cam.provider = 'Roundshot';
        }
        updatedCount++;
    }
});

fs.writeFileSync(WEBCAMS_FILE, JSON.stringify(webcams, null, 4));
console.log(`Updated ${updatedCount} webcam links with direct provider feeds.`);
