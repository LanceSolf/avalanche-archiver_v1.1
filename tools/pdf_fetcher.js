const https = require('https');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');

// Configuration for which regions need PDFs
// Map RegionID -> Slug because we save to data/pdfs/{slug}/
const REGION_PDF_MAP = {
    'DE-BY-11': 'allgau-prealps',
    'DE-BY-12': 'allgau-alps-central',
    'DE-BY-13': 'allgau-alps-west',
    'DE-BY-14': 'allgau-alps-east'
};

async function downloadPdf(url, destPath) {
    return new Promise((resolve, reject) => {
        // Ensure directory exists
        fs.mkdirSync(path.dirname(destPath), { recursive: true });

        const file = fs.createWriteStream(destPath);
        const request = https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close(() => resolve(true));
                });
            } else {
                file.close();
                fs.unlink(destPath, () => { });
                reject(new Error(`Status ${response.statusCode}`));
            }
        });

        request.on('error', (err) => {
            fs.unlink(destPath, () => { });
            reject(err);
        });

        request.setTimeout(30000, () => {
            request.destroy();
            fs.unlink(destPath, () => { });
            reject(new Error('Request timed out'));
        });
    });
}

async function processBulletinForPdfs(bulletin, dateStr) {
    if (!bulletin.regions) return;

    // Check if this bulletin contains any of our target regions
    const regions = bulletin.regions.map(r => r.regionID);

    const matchedSlugs = [];
    for (const rid of regions) {
        if (REGION_PDF_MAP[rid]) {
            matchedSlugs.push(REGION_PDF_MAP[rid]);
        }
    }

    if (matchedSlugs.length > 0 && bulletin.bulletinID) {
        const uuid = bulletin.bulletinID;
        const url = `https://admin.lawinen-warnung.eu/albina/api/bulletins/${uuid}/pdf?region=DE-BY&lang=en&grayscale=false`;

        console.log(`Found relevant bulletin ${uuid} for regions: ${matchedSlugs.join(', ')}`);

        for (const slug of matchedSlugs) {
            const dest = path.join(dataDir, 'pdfs', slug, `${dateStr}.pdf`);
            if (fs.existsSync(dest)) {
                console.log(`  Skipping (exists): ${slug}/${dateStr}.pdf`);
                continue;
            }

            try {
                console.log(`  Downloading to: ${slug}/${dateStr}.pdf`);
                await downloadPdf(url, dest);
            } catch (e) {
                console.error(`  Failed to download PDF: ${e.message}`);
            }
        }
    }
}

module.exports = { processBulletinForPdfs };
