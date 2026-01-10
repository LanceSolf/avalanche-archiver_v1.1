const https = require('https');
const fs = require('fs');
const path = require('path');
const { processBulletinForPdfs } = require('./pdf_fetcher');

const dataDir = path.join(__dirname, '../data');

// Helper to get YYYY-MM-DD
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Determine target date
// Default: Tomorrow (Date.now() + 24h)
// Override: CLI argument (YYYY-MM-DD)
let targetDate = new Date();
if (process.argv[2]) {
    targetDate = new Date(process.argv[2]);
} else {
    targetDate.setDate(targetDate.getDate() + 1);
}

const dateStr = formatDate(targetDate);
const url = `https://static.lawinen-warnung.eu/bulletins/${dateStr}/DE-BY.json`;
const dest = path.join(dataDir, `DE-BY_${dateStr}.json`);

console.log(`Target Date: ${dateStr}`);
console.log(`Fetching: ${url}`);

const file = fs.createWriteStream(dest);

https.get(url, (response) => {
    if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
            file.close(async () => {
                console.log(`Successfully downloaded to ${dest}`);
                // Post-process for PDFs
                try {
                    const content = JSON.parse(fs.readFileSync(dest, 'utf-8'));
                    const bulletins = Array.isArray(content) ? content : content.bulletins;
                    if (bulletins) {
                        for (const bulletin of bulletins) {
                            await processBulletinForPdfs(bulletin, dateStr);
                        }
                    }
                } catch (e) {
                    console.error('Error processing PDFs:', e);
                }
            });
        });
    } else {
        console.error(`Failed to fetch JSON. Status Code: ${response.statusCode}`);
        file.close();
        fs.unlink(dest, () => { }); // Clean up incomplete file
    }
}).on('error', (err) => {
    console.error(`Network Error: ${err.message}`);
    fs.unlink(dest, () => { });
    process.exit(1);
});
