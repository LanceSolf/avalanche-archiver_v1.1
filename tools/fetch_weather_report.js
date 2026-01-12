const fs = require('fs');
const https = require('https');
const path = require('path');
// const cheerio = require('cheerio'); // Not installed, using Regex fallback 
// Assuming cheerio is not available, I'll use regex for simple extraction or basic string parsing.
// Actually, `cheerio` might not be installed. I'll stick to regex/string manipulation for this simple HTML.

const OUTPUT_FILE = path.join(__dirname, '../data/weather_archive.json');

// Helper to fetch HTML
const fetchHtml = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
};

const main = async () => {
    console.log('Fetching LWD Bayern Weather Report...');
    try {
        const html = await fetchHtml('https://lawinenwarndienst.bayern.de/');

        // Extract the weather report panel
        // Looking for <div class="panel-body weather-report lwdb-p"> ... </div>
        // Use a non-greedy regex to capture content
        const wReportMatch = html.match(/<div class="panel-body weather-report lwdb-p">([\s\S]*?)<\/div>/);

        if (!wReportMatch) {
            console.log('No weather report found on page.');
            return;
        }

        const htmlContent = wReportMatch[0]; // Include the div wrapper

        // Parse Title and Date
        // <span class="lwdb-p-small-weather" ...>German Weather Service ... issued</span>
        // <span class="lwdb-p-black lwdb-p-black-weather" ...>on Sunday, 11.01.2026, at 2.30 p.m.</span>

        // Simple extraction of the "issued" text
        const issuedMatch = htmlContent.match(/on [A-Za-z]+, (\d{2}\.\d{2}\.\d{4}), at (\d{1,2}\.\d{2}) (a\.m\.|p\.m\.)/);

        if (!issuedMatch) {
            console.log('Could not parse issued date/time.');
            // Fallback: Use today's date? Or skip?
            // Let's log and skip to be safe.
            return;
        }

        // dateStr: 11.01.2026
        // timeStr: 2.30
        // ampm: p.m.
        const [_, datePart, timePart, ampm] = issuedMatch;
        const [day, month, year] = datePart.split('.');
        const [hourStr, minuteStr] = timePart.split('.');
        let hour = parseInt(hourStr);
        if (ampm === 'p.m.' && hour !== 12) hour += 12;
        if (ampm === 'a.m.' && hour === 12) hour = 0;

        const issuedDate = new Date(`${year}-${month}-${day}T${hour.toString().padStart(2, '0')}:${minuteStr}:00`);

        console.log(`Report Issued: ${issuedDate.toLocaleString()}`);

        // Logic: If issued >= 14:00 (2 PM), it predicts the NEXT day.
        // If issued < 14:00 (e.g. 7 AM update), it predicts TODAY.
        let targetDate = new Date(issuedDate);
        if (hour >= 14) {
            targetDate.setDate(targetDate.getDate() + 1);
        }

        const targetDateStr = targetDate.toISOString().split('T')[0];
        console.log(`Target Date for Archive: ${targetDateStr}`);

        // Load Archive
        let archive = [];
        if (fs.existsSync(OUTPUT_FILE)) {
            archive = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
        }

        // Check if entry exists for this Target Date
        // We only want ONE report per target date (the latest valid one).
        // Or should we support versions? User wants "added to the date card", so 1:1 map is best.
        const existingIndex = archive.findIndex(a => a.date === targetDateStr);

        const newEntry = {
            date: targetDateStr,
            title: `Mountain Weather Report (${datePart} ${timePart} ${ampm})`,
            issued: `Issued: ${datePart} at ${timePart} ${ampm}`,
            html_content: htmlContent,
            fetched_at: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            // Update existing
            console.log(`Updating existing entry for ${targetDateStr}`);
            archive[existingIndex] = newEntry;
        } else {
            // Append
            console.log(`Creating new entry for ${targetDateStr}`);
            archive.push(newEntry);
            // Sort by date desc
            archive.sort((a, b) => b.date.localeCompare(a.date));
        }

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(archive, null, 2));
        console.log(`Weather archive updated.`);

    } catch (e) {
        console.error('Error fetching weather:', e);
    }
};

main();
