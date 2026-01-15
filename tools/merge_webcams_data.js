const fs = require('fs');
const path = require('path');

const OLD_FILE = path.join(__dirname, '../data/webcams.json');
const NEW_FILE = path.join(__dirname, '../data/scraped_webcams_raw.json');

const oldCams = JSON.parse(fs.readFileSync(OLD_FILE, 'utf8'));
const newCamsRaw = JSON.parse(fs.readFileSync(NEW_FILE, 'utf8'));

// Helper to normalize strings for comparison
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const finalCams = [];
const seenTitles = new Set();

// 1. Process New Cams and try to match with Old Cams for coordinates
newCamsRaw.forEach(nc => {
    const normTitle = normalize(nc.title);

    // Attempt match
    const match = oldCams.find(oc => {
        const normOld = normalize(oc.title);
        // Fuzzy match: check if one includes the other significantly
        return normTitle.includes(normOld) || normOld.includes(normTitle);
    });

    const cam = {
        title: nc.title,
        location: match ? match.location : nc.title.split('–')[1]?.trim() || "Allgäu",
        type: (nc.status && (nc.status.toLowerCase().includes('live') || nc.status.toLowerCase().includes('360'))) ? 'live' : 'static',
        // Use live feed URL if available, else detail URL
        linkUrl: nc.liveFeedUrl || nc.detailUrl,
        imageUrl: nc.img,
        updateInterval: 'Unknown',
        provider: nc.provider || 'Skierort.info'
    };

    if (match) {
        if (match.lat) cam.lat = match.lat;
        if (match.lon) cam.lon = match.lon;
        console.log(`Matched: ${nc.title} <-> ${match.title}`);
    }

    finalCams.push(cam);
    seenTitles.add(normTitle);
});

// 2. Add Old Cams that were NOT matched (to ensure we don't lose unique old ones)
oldCams.forEach(oc => {
    const normOld = normalize(oc.title);
    // Check if this old cam was "covered" by any new cam
    // This check is a bit tricky because 'seenTitles' contains the NEW titles.
    // If the old title wasn't found in the new list, we keep it.

    // We can't rely on perfect string matching reversely.
    // Let's just check if we have a cam with a similar title in finalCams already.
    const alreadyExists = finalCams.some(fc => {
        const normFinal = normalize(fc.title);
        return normFinal.includes(normOld) || normOld.includes(normFinal);
    });

    if (!alreadyExists) {
        console.log(`Preserving Old Cam: ${oc.title}`);
        finalCams.push(oc);
    }
});

fs.writeFileSync(OLD_FILE, JSON.stringify(finalCams, null, 4));
console.log(`Merged ${finalCams.length} webcams.`);
