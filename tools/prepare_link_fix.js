const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../data/webcams.json');
const cams = JSON.parse(fs.readFileSync(FILE, 'utf8'));

const toScrape = [];
const canFixLocally = [];

cams.forEach(cam => {
    // If it's already a direct link (not skiresort.info), skip
    if (!cam.linkUrl.includes('skiresort.info')) return;

    // RULE 1: Feratel - usually has 'livestream_37_ID.jpg' or similar in imageUrl
    // or provider is explicitly 'Feratel'
    const isFeratel = cam.provider === 'Feratel' || cam.imageUrl.includes('feratel');

    if (isFeratel) {
        // Try to extract ID from image URL
        // Example: .../livestream_37_986.jpg -> ID 986
        const match = cam.imageUrl.match(/_(\d+)\.jpg/);
        if (match) {
            cam.newLink = `https://webtv.feratel.com/webtv/?design=v3&cam=${match[1]}`;
            canFixLocally.push(cam);
            return;
        }
    }

    // RULE 2: Panomax / Roundshot / Foto-webcam / Others
    // We need to scrape the detail page to find the real link.
    // Also include Feratel ones where we couldn't extract ID.
    toScrape.push({
        title: cam.title,
        url: cam.linkUrl
    });
});

fs.writeFileSync(path.join(__dirname, '../data/webcams_to_fix.json'), JSON.stringify(canFixLocally, null, 2));
fs.writeFileSync(path.join(__dirname, '../data/webcams_to_scrape.json'), JSON.stringify(toScrape, null, 2));

console.log(`Locally fixable (Feratel): ${canFixLocally.length}`);
console.log(`Need scraping: ${toScrape.length}`);
