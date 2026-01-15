const { translateAspect } = require('./utils');

// --- HTML TEMPLATES ---

/**
 * Generate Main or Month Index Page
 * @param {string} title - Page title
 * @param {string} relativePath - Path to root (e.g., "../../")
 * @param {Array} links - Array of { text, href }
 * @param {boolean} isIncident - Is this an incident page?
 * @param {string} backLink - Optional back link URL
 * @returns {string} HTML Content
 */
function generateIndexPage(title, relativePath, links, isIncident = false, backLink = '') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="${relativePath}styles.css">
    <style>
        .archive-list { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); 
            gap: 1.5rem; 
            margin: 0; 
            padding: 0; 
        }
        .archive-item { 
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background-color: #ffffff;
            padding: 1.5rem;
            text-align: center;
            text-decoration: none;
            color: #1e293b;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            font-weight: 600;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        .archive-item:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-color: #3b82f6;
            color: #3b82f6;
        }
        .archive-item h2 { margin: 0; font-size: 1rem; font-weight: 600; }
        .badge-update { 
            display: inline-block; 
            font-size: 0.7rem; 
            background: #fef3c7; 
            color: #92400e; 
            padding: 0.2rem 0.5rem; 
            border-radius: 4px; 
            margin-top: 0.5rem;
            font-weight: 500;
        }
        .weather-icon { font-size: 1.2rem; margin-top: 0.25rem; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="header-content">
                <a href="${relativePath}index.html" class="logo">Avalanche Archive</a>
                <div class="date-nav"><span>${title}</span></div>
            </div>
        </header>

        <h1>${title}</h1>

        ${backLink ? `<div style="margin-bottom:1rem;"><a href="${backLink}">&larr; Back</a></div>` : ''}

        <div class="archive-list">
            ${links.map(link => {
        let inner;
        if (link.date && link.title) {
            const profileIcon = link.hasProfiles ? `<span style="background:#0284c7; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow:0 1px 2px rgba(0,0,0,0.3); display:inline-block; flex-shrink:0;" title="Has Snow Profile"></span>` : '';
            const imagesIcon = link.hasImages ? `<span style="font-size:1.1rem; flex-shrink:0;" title="Has Images">📷</span>` : '';

            // Only render icon row if needed
            const iconsRow = (profileIcon || imagesIcon) ?
                `<div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-top:2px;">
                    ${profileIcon}
                    ${imagesIcon}
                </div>` : '';

            inner = `<div style="display:flex; flex-direction:column; gap:0.25rem;">
                               <span style="font-size:0.85rem; color:#64748b; font-weight:500;">${link.date}</span>
                               <span style="font-size:1.1rem; color:#1e293b;">${link.title}</span>
                               ${iconsRow}
                             </div>`;
        } else {
            inner = `<h2>${link.text}</h2>`;
        }
        return `<a href="${link.href}" class="archive-item ${isIncident ? 'incident-item' : ''}">${inner}</a>`;
    }).join('')}
        </div>
    </div>
</body>
</html>`;
}

/**
 * Generate Profile Detail Page HTML
 */
function generateProfileDetailPage(p, profileImageBaseName, relativePath, backLink = null) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profile: ${p.ort}</title>
    <link rel="stylesheet" href="${relativePath}styles.css">
    <style>
        .profile-image-container { margin-top: 2rem; text-align: center; }
        .profile-image img { max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .back-link { margin-bottom: 1rem; display: block; color: var(--primary-blue); text-decoration: none; }
        .back-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <header><div class="header-content"><a href="${relativePath}index.html" class="logo">Avalanche Archive</a><div class="date-nav"><span>Snow Profiles</span></div></div></header>
        
        ${backLink ? `<a href="${backLink}" id="dynamic-back-link" class="back-link">&larr; Back</a>` : ''}

        <h1>Snow Profile: ${p.ort}</h1>
        <div class="profile-image-container">
            <div class="profile-image">
                <a href="${profileImageBaseName}" target="_blank">
                    <img src="${profileImageBaseName}" alt="Snow Profile Image">
                </a>
            </div>
            <a href="https://lawis.at" target="_blank" class="lawis-link">View on LAWIS.at</a>
        </div>
    </div>
    <script>
        const urlParams = new URLSearchParams(window.location.search);
        const backUrl = urlParams.get('back');
        if (backUrl) {
            const link = document.getElementById('dynamic-back-link');
            if (link) {
                link.href = backUrl;
                if (backUrl.includes('map.html')) {
                    link.innerHTML = '&larr; Back to Map';
                    
                    // Check for incident context in the map URL
                    try {
                        const mapQuery = backUrl.split('?')[1];
                        if (mapQuery) {
                            const mapParams = new URLSearchParams(mapQuery);
                            const incFilename = mapParams.get('incFilename');
                            if (incFilename) {
                                // Create secondary link back to incident
                                const incUrl = '../incidents/' + incFilename;
                                const incLink = document.createElement('a');
                                incLink.href = incUrl;
                                incLink.className = 'back-link';
                                incLink.innerHTML = '&larr; Back to Incident';
                                incLink.style.marginTop = '0'; // Reduce gap slightly if needed, but default margin is fine
                                
                                // Insert after the Map link
                                link.parentNode.insertBefore(incLink, link.nextSibling);
                            }
                        }
                    } catch (e) {
                        console.error('Error parsing back URL params', e);
                    }

                } else if (backUrl.includes('incidents')) {
                    link.innerHTML = '&larr; Back to Incident';
                } else {
                    link.innerHTML = '&larr; Back';
                }
            }
        }
    </script>
</body>
</html>`;
}

/**
 * Generate Weather Report HTML
 */
function generateWeatherPage(w, content) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mountain Weather - ${w.date}</title>
    <link rel="stylesheet" href="../../styles.css">
    <style>
        .weather-content { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .original-text { margin-top: 2rem; border-top: 1px solid #eee; padding-top: 1rem; color: #555; }
        .original-text summary { cursor: pointer; color: var(--primary-blue); font-weight: 500; }
    </style>
</head>
<body>
    <div class="container">
        <header><div class="header-content"><a href="../../index.html" class="logo">Avalanche Archive</a><div class="date-nav"><span>Mountain Weather</span></div></div></header>
        <div style="margin-bottom:1rem;"><a href="#" onclick="history.back(); return false;">&larr; Back</a></div>
        <h1>Mountain Weather Report</h1>
        <h2 style="color: #666; font-weight: 400;">${w.date} (Issued: ${w.issued})</h2>
        <div class="weather-content">
            ${content}
        </div>
    </div>
</body>
</html>`;
}

/**
 * Generate Incident Weather Context Page (Chart + Text)
 */
function generateIncidentWeatherPage(inc, weatherHtml, historicText, dailyWeatherLink) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weather Context: ${inc.location}</title>
    <link rel="stylesheet" href="../../styles.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        .chart-container { position: relative; height: 400px; width: 100%; margin-bottom: 2rem; }
        .weather-text { background: #f9f9f9; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; }
        .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .meta-item { background: white; padding: 1rem; border-radius: 4px; border: 1px solid #eee; }
        .meta-label { font-size: 0.85rem; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
        .meta-value { font-size: 1.1rem; font-weight: 600; color: #333; margin-top: 0.25rem; }
    </style>
</head>
<body>
    <div class="container">
        <header><div class="header-content"><a href="../../index.html" class="logo">Avalanche Archive</a><div class="date-nav"><span>Weather Context</span></div></div></header>
        <div style="margin-bottom:1rem;"><a href="index.html">&larr; Back to Incidents</a></div>
        
        <h1>Weather Context</h1>
        <h2 style="color: #666;">${inc.location} - ${inc.date}</h2>

        <div class="weather-text">
            <h3>Weather Report (${inc.date})</h3>
            ${historicText ? `<p style="white-space: pre-line;">${historicText}</p>` : '<p>No text report available for this specific location/date in historic records.</p>'}
            ${dailyWeatherLink ? `<div style="margin-top:1rem; padding-top:1rem; border-top:1px solid #e5e7eb;">
                <a href="${dailyWeatherLink}" style="color:#0284c7; font-weight:bold; text-decoration:none;">&rarr; View Full Mountain Weather Forecast</a>
            </div>` : ''}
        </div>

        <h3>Station Data: ${inc.closestStation.name} (${inc.closestStation.dist}km away)</h3>
        <p style="color: #666; font-size: 0.9rem; margin-bottom: 1rem;">Data from previous 48hrs leading up to incident.</p>
        
        <div class="chart-container">
            <canvas id="weatherChart"></canvas>
        </div>

        <script>
            const ctx = document.getElementById('weatherChart').getContext('2d');
            const data = ${JSON.stringify(inc.weatherData)};
            
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map(d => new Date(d.TS).toLocaleString('de-DE', { day: '2-digit', hour: '2-digit', minute: '2-digit' })),
                    datasets: [
                        {
                            label: 'Snow Height (cm)',
                            data: data.map(d => d.HS),
                            borderColor: '#3498db',
                            yAxisID: 'y',
                        },
                        {
                            label: 'Air Temp (°C)',
                            data: data.map(d => d.TL),
                            borderColor: '#e74c3c',
                            yAxisID: 'y1',
                        },
                        {
                            label: 'Wind Speed (km/h)',
                            data: data.map(d => d.ff ? d.ff * 3.6 : null), // m/s to km/h
                            borderColor: '#2ecc71',
                            yAxisID: 'y',
                            hidden: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    interaction: { mode: 'index', intersect: false },
                    scales: {
                        y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Snow (cm) / Wind (km/h)' } },
                        y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Temperature (°C)' } }
                    }
                }
            });
        </script>
    </div>
</body>
</html>`;
}

/**
 * Generate Incident Detail Page HTML (matches original format)
 */
function generateIncidentPage(inc, imagesHtml, weatherLink, profilesHtml, relativePath) {
    // Handle missing fields gracefully
    const elevation = inc.elevation || inc.details?.location?.elevation?.value || 'N/A';
    const incline = inc.incline || inc.details?.location?.incline?.value || 'N/A';
    const aspect = inc.aspect || inc.details?.location?.aspect?.text || 'N/A';
    const lat = inc.lat || inc.details?.location?.latitude;
    const lon = inc.lon || inc.details?.location?.longitude;
    const dateTime = inc.datetime || inc.date || '';
    const location = inc.location || inc.details?.location?.text || 'Unknown Location';
    const description_en = inc.comments_en || inc.details?.comments_en || '';
    const description_de = inc.comments || inc.details?.comments || '';

    // Build coordinates link if available (includes incId for map back-link)
    // If we have a closest profile, include it so we show BOTH pins.
    // context=coords parameter tells map to use specific popup text.
    let coordsUrl = `../profiles/map.html?incLat=${lat}&incLon=${lon}&incId=${inc.id}&incFilename=${inc.filename || ''}&context=coords`;

    if (inc.closestProfile) {
        coordsUrl += `&lat=${inc.closestProfile.latitude}&lon=${inc.closestProfile.longitude}&profileId=${inc.closestProfile.id}`;
    }

    const coordsHtml = (lat && lon) ? `
        <div class="meta-item"><strong>Coordinates:</strong> 
            <a href="${coordsUrl}" style="color:#0284c7; text-decoration:none;">
                ${lat}, ${lon}
            </a>
        </div>` : '';

    // Build forecast link if available (path is relative to incidents folder)
    const forecastHtml = inc.pdf_path ? `
        <div class="meta-item"><strong>Forecast:</strong> <a href="${inc.pdf_path}" target="_blank" style="color:#0284c7; text-decoration:none;">Archived Bulletin</a></div>` : '';

    // Build weather link if available
    const weatherHtml = weatherLink ? `
        <div class="meta-item"><strong>Weather:</strong> ${weatherLink}</div>` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Incident: ${location}</title>
    <link rel="stylesheet" href="../../styles.css">
</head>
<body>
    <div class="container">
        <header>
             <div class="header-content">
                <a href="../../index.html" class="logo">Avalanche Archive</a>
                <div class="date-nav"><span>Avalanche Incidents</span></div>
             </div>
        </header>

        <h1>Incident Report</h1>
        <h2 style="color: #d32f2f;">${location}</h2>
        <h4 style="color: #666;">${dateTime}</h4>

        <div class="incident-detail-container">
            
        <div class="incident-meta-grid">
            <div class="meta-item"><strong>Date:</strong> ${dateTime}</div>
            <div class="meta-item"><strong>Location:</strong> ${location}</div>
            <div class="meta-item"><strong>Elevation:</strong> ${elevation}${elevation !== 'N/A' ? 'm' : ''}</div>
            <div class="meta-item"><strong>Incline:</strong> ${incline}${incline !== 'N/A' ? '°' : ''}</div>
            <div class="meta-item"><strong>Aspect:</strong> ${aspect}</div>
            ${coordsHtml}
            ${forecastHtml}
            ${weatherHtml}
        </div>
    
            ${profilesHtml ? `
        <div class="incident-profiles" style="margin-top:2rem; padding-top:1rem; border-top:1px solid #eee;">
            <h3>Nearby Snow Profiles</h3>
            <p style="color:#666; font-size:0.9rem;">Snow pits within 1km & 48hrs.</p>
            <div style="display:grid; gap:1rem; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); margin-top:1rem;">
                ${profilesHtml}
            </div>
        </div>
` : ''}
            
            ${description_en ? `
            <div class="incident-description">
                <h3>Description</h3>
                <p>${description_en}</p>
                ${description_de ? `
                <details style="margin-top:1rem; color:#666;">
                    <summary style="cursor:pointer; font-size:0.9rem;">Show Original (German)</summary>
                    <p style="margin-top:0.5rem; font-style:italic;">${description_de}</p>
                </details>` : ''}
            </div>
` : ''}

            ${imagesHtml ? `
        <div class="incident-gallery">
            <h3>Images</h3>
            <div class="gallery-grid">
                ${imagesHtml}
            </div>
        </div>
` : ''}
            
            <div class="incident-links" style="text-align:center;">
                <a href="https://lawis.at" target="_blank" class="lawis-link">View on LAWIS.at</a>
            </div>
        </div>

        <div style="margin-top:2rem"><a href="index.html">&larr; Back to Incidents</a></div>
    </div>
</body>
</html>`;
}

/**
 * Generate Ground Conditions Index Page
 */
function generateGroundConditionsPage(data) {
    const { uploads, webcamCount } = data;
    const uploadCards = uploads.map(u => {
        const dateStr = new Date(u.date).toLocaleDateString();
        return `
        <a href="uploads/${u.id || new Date(u.date).getTime()}.html" class="archive-item">
            <div style="display:flex; flex-direction:column; gap:0.25rem;">
                <span style="font-size:0.85rem; color:#64748b; font-weight:500;">${dateStr}</span>
                 ${u.image ? '<span style="font-size:1.1rem; flex-shrink:0;" title="Has Image">📷</span>' : ''}
                <span style="font-size:1rem; color:#1e293b;">Uploaded by ${u.user}</span>
                <span style="font-size:0.85rem; color:#64748b; font-style:italic;">"${u.comment.substring(0, 30)}${u.comment.length > 30 ? '...' : ''}"</span>
            </div>
        </a>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ground Conditions</title>
    <link rel="stylesheet" href="../../styles.css">
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
    <style>
        /* Updated Tagline Style: White background, standard font, no border */
        .tagline-container { text-align: center; margin-bottom: 3rem; padding: 2rem 1rem; background: white; }
        .tagline-main { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 1.75rem; color: #0f172a; margin-bottom: 0.5rem; letter-spacing: -0.02em; }
        .tagline-sub { font-size: 1rem; color: #64748b; font-weight: 400; max-width: 600px; margin: 0 auto; line-height: 1.5; }
        
        .action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 3rem; }
        .action-card { padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; text-decoration: none; color: inherit; transition: transform 0.2s; border: 2px solid transparent; }
        .action-card:hover { transform: translateY(-4px); border-color: #0284c7; }
        .action-icon { font-size: 3rem; margin-bottom: 1rem; display: block; }
        .action-title { font-size: 1.25rem; font-weight: 700; color: #0f172a; display: block; }
        .map-container { height: 400px; width: 100%; border-radius: 12px; overflow: hidden; margin-bottom: 2rem; border: 1px solid #e2e8f0; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="header-content">
                <a href="../../index.html" class="logo">Avalanche Archive</a>
                <div class="date-nav"><span>Ground Conditions</span></div>
            </div>
        </header>

        <div class="tagline-container">
            <h2 class="tagline-main">If you find good snow let your fellow skiers know! ❄️</h2>
            <div class="tagline-sub">...and if it's not good, definitely share it so we can mark and avoid! 🏔️</div>
        </div>

        <div class="action-grid">
            <a href="../webcams/index.html" class="action-card">
                <span class="action-icon">📹</span>
                <span class="action-title">Allgäu Webcams</span>
                <span style="display:block; margin-top:0.5rem; color:#64748b;">${webcamCount} Live Views & Cams</span>
            </a>
            <a href="upload.html" class="action-card" style="background:#fefce8; border-color:#fef08a;">
                <span class="action-icon">⛷️</span>
                <span class="action-title">Skier Upload</span>
                <span style="display:block; margin-top:0.5rem; color:#854d0e;">Submit Report</span>
            </a>
        </div>

        <h2>Report Map</h2>
        <div id="map" class="map-container"></div>

        <h2>Recent Reports</h2>
        ${uploads.length > 0 ? `<div class="archive-list">${uploadCards}</div>` : '<p style="text-align:center; color:#64748b; padding:2rem;">No reports in the last 7 days. Be the first!</p>'}

        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
        <script>
            const uploads = ${JSON.stringify(uploads)};
            const map = L.map('map').setView([47.45, 10.3], 9); // Center on Allgau
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            uploads.forEach(u => {
                if (u.lat && u.lon) {
                    const marker = L.marker([u.lat, u.lon]).addTo(map);
                    const link = 'uploads/' + (u.id || new Date(u.date).getTime()) + '.html';
                    marker.bindPopup(\`<b>\${u.user}</b><br>\${u.date}<br><a href="\${link}">View Report</a>\`);
                }
            });
        </script>
    </div>
</body>
</html>`;
}

/**
 * Generate Upload Form Page
 */
function generateUploadPage() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Skier Upload</title>
    <link rel="stylesheet" href="../../styles.css">
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
    <style>
        .upload-form { max-width: 600px; margin: 0 auto; background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .form-group { margin-bottom: 1.5rem; }
        label { display: block; font-weight: 600; margin-bottom: 0.5rem; color: #1e293b; }
        input[type="text"], textarea, select { width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1rem; }
        input[type="file"] { width: 100%; padding: 0.5rem; border: 1px dashed #cbd5e1; border-radius: 6px; }
        button { background: #0284c7; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; width: 100%; transition: background 0.2s; }
        button:hover { background: #0369a1; }
        .map-picker { height: 300px; width: 100%; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 0.5rem; }
        .status-msg { margin-top: 1rem; padding: 1rem; border-radius: 6px; display: none; }
        .success { background: #dcfce7; color: #166534; }
        .error { background: #fee2e2; color: #991b1b; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="header-content">
                <a href="../../index.html" class="logo">Avalanche Archive</a>
                <div class="date-nav"><span>Submit Report</span></div>
            </div>
        </header>
        <div style="margin-bottom:1rem;"><a href="index.html">&larr; Back to Ground Conditions</a></div>

        <div class="upload-form">
            <h1>❄️ Skier Upload</h1>
            <p style="margin-bottom:2rem; color:#64748b;">Share your observations. Photos will be scanned for location data.</p>
            
            <form id="uploadForm">
                <div class="form-group">
                    <label>Your Name</label>
                    <input type="text" id="name" required placeholder="e.g. Barry Buddon">
                </div>

                <div class="form-group">
                    <label>Date</label>
                    <select id="dateSelect"></select>
                </div>

                <div class="form-group">
                    <label>Photos (Optional)</label>
                    <input type="file" id="photo" accept="image/*" multiple>
                    <div style="font-size:0.85rem; color:#64748b; margin-top:0.25rem;">You can select multiple images.</div>
                    <div id="locationStatus" style="font-size:0.85rem; color:#64748b; margin-top:0.5rem;"></div>
                </div>

                <div class="form-group">
                    <label>Location</label>
                    <div style="margin-bottom:0.5rem;">
                        <button type="button" id="useLocationBtn" style="background:#f1f5f9; color:#0f172a; border:1px solid #cbd5e1; width:auto; padding:0.5rem 1rem;">📍 Use Current Location</button>
                    </div>
                    <p style="font-size:0.85rem; color:#64748b; margin:0 0 0.5rem 0;">Tap the map or use the button above to drop a pin. <strong>You can drag the pin to adjust.</strong></p>
                    <div id="pickerMap" class="map-picker"></div>
                    <input type="hidden" id="lat">
                    <input type="hidden" id="lon">
                </div>

                <div class="form-group">
                    <label>Comments</label>
                    <textarea id="comment" rows="4" placeholder="How was the snow? Any hazards?"></textarea>
                </div>

                <button type="submit">Submit Report</button>
                <div id="status" class="status-msg"></div>
            </form>
        </div>

        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
        <!-- EXIF JS for reading geo tags -->
        <script src="https://cdn.jsdelivr.net/npm/exif-js"></script> 
        <script>
            // 1. Date Dropdown (Today + 4 days back)
            const dateSelect = document.getElementById('dateSelect');
            const today = new Date();
            for(let i=0; i<5; i++) {
                const d = new Date();
                d.setDate(today.getDate() - i);
                const opt = document.createElement('option');
                opt.value = d.toISOString();
                opt.text = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString();
                dateSelect.add(opt);
            }

            // 2. Map Picker
            const map = L.map('pickerMap').setView([47.45, 10.3], 9);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OSM' }).addTo(map);
            
            let marker;
            function setLocation(lat, lng) {
                if(marker) map.removeLayer(marker);
                marker = L.marker([lat, lng], { draggable: true }).addTo(map);
                
                document.getElementById('lat').value = lat;
                document.getElementById('lon').value = lng;
                
                marker.on('dragend', function(event) {
                    const position = marker.getLatLng();
                    document.getElementById('lat').value = position.lat;
                    document.getElementById('lon').value = position.lng;
                });
            }

            map.on('click', function(e) {
                setLocation(e.latlng.lat, e.latlng.lng);
            });
            
            document.getElementById('useLocationBtn').addEventListener('click', function() {
                if(navigator.geolocation) {
                     const btn = this;
                     const originalText = btn.innerText;
                     btn.innerText = 'Locating...';
                     navigator.geolocation.getCurrentPosition(pos => {
                         setLocation(pos.coords.latitude, pos.coords.longitude);
                         map.setView([pos.coords.latitude, pos.coords.longitude], 13);
                         btn.innerText = originalText;
                     }, err => {
                         alert('Could not get location. Please check browser permissions.');
                         btn.innerText = originalText;
                     });
                 } else {
                     alert('Geolocation is not supported by your browser');
                 }
            });

            // 3. EXIF Extraction
            document.getElementById('photo').addEventListener('change', function(e) {
                const file = e.target.files[0];
                if(file) {
                    EXIF.getData(file, function() {
                        const lat = EXIF.getTag(this, "GPSLatitude");
                        const lon = EXIF.getTag(this, "GPSLongitude");
                        
                        // Convert DMS to DD
                        if(lat && lon && lat.length === 3 && lon.length === 3) {
                             const toDecimal = (n) => n[0] + n[1]/60 + n[2]/3600;
                             const latDec = toDecimal(lat);
                             const lonDec = toDecimal(lon);
                             
                             // Check ref (N/S, E/W) - Simplified assumption for Alps (N, E)
                             
                             setLocation(latDec, lonDec);
                             map.setView([latDec, lonDec], 14);
                             document.getElementById('locationStatus').innerText = "✅ Location found in photo!";
                        } else {
                            document.getElementById('locationStatus').innerText = "⚠️ No location in photo. Please tap the map.";
                             // Try Geolocation API
                             if(navigator.geolocation) {
                                 navigator.geolocation.getCurrentPosition(pos => {
                                     setLocation(pos.coords.latitude, pos.coords.longitude);
                                      map.setView([pos.coords.latitude, pos.coords.longitude], 12);
                                 });
                             }
                        }
                    });
                }
            });

            // 4. Submit
            document.getElementById('uploadForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const btn = e.target.querySelector('button');
                btn.disabled = true;
                btn.innerText = 'Uploading...';

                const data = {
                    user: document.getElementById('name').value,
                    date: dateSelect.value,
                    comment: document.getElementById('comment').value,
                    lat: document.getElementById('lat').value,
                    lon: document.getElementById('lon').value,
                    images: []
                };

                // Read Images as Base64
                const fileInput = document.getElementById('photo');
                if (fileInput.files.length > 0) {
                     const promises = Array.from(fileInput.files).map(file => {
                         return new Promise((resolve) => {
                             const reader = new FileReader();
                             reader.onload = (e) => resolve(e.target.result);
                             reader.readAsDataURL(file);
                         });
                     });
                     
                     data.images = await Promise.all(promises);
                     await sendData(data);
                } else {
                    await sendData(data);
                }

                async function sendData(payload) {
                    try {
                        const statusDiv = document.getElementById('status');
                        // POST to Cloudflare Worker
                        const WORKER_URL = 'https://avalanche-archiver-uploads.bigdoggybollock.workers.dev/upload';
                        
                        // For demo purposes (mock) -> Switched to Real
                        // console.log('Would upload:', payload);
                        
                        statusDiv.style.display = 'block';
                        statusDiv.className = 'status-msg';
                        statusDiv.innerText = 'Uploading...';
                        
                        const res = await fetch(WORKER_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });

                        if(res.ok) {
                            statusDiv.className = 'status-msg success';
                            statusDiv.innerText = 'Report Submitted! (Pending approval/display on next site build)';
                            e.target.reset();
                            // Clear map
                            if(marker) map.removeLayer(marker);
                            document.getElementById('lat').value = '';
                            document.getElementById('lon').value = '';
                            document.getElementById('locationStatus').innerText = '';
                        } else {
                            const errorText = await res.text();
                            throw new Error('Upload failed (' + res.status + '): ' + errorText);
                        }

                    } catch(err) {
                        console.error(err);
                        alert('Error uploading: ' + err.message);
                        const statusDiv = document.getElementById('status');
                        statusDiv.className = 'status-msg error';
                        statusDiv.innerText = 'Error: ' + err.message;
                    } finally {
                        btn.disabled = false;
                        btn.innerText = 'Submit Report';
                    }
                }
            });
        </script>
    </div>
</body>
</html>`;
}

/**
 * Generate Webcams Page
 */
function generateWebcamPage(webcams) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Allgäu Webcams</title>
    <link rel="stylesheet" href="../../styles.css">
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
    <style>
        .webcam-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; margin-top: 2rem; }
        .webcam-card { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; transition: transform 0.2s; display:flex; flex-direction:column; position: relative; text-decoration: none; color: inherit; }
        .webcam-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        
        /* Hover Border Colors */
        .webcam-card-live:hover { border-color: #ef4444; }
        .webcam-card-static:hover { border-color: #3b82f6; }

        .webcam-img { width: 100%; height: 180px; object-fit: cover; display: block; background: #f1f5f9; }
        
        .badge { position: absolute; top: 8px; right: 8px; padding: 0.25rem 0.6rem; border-radius: 99px; font-size: 0.75rem; font-weight: 700; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .badge-live { background: #ef4444; animation: pulse 2s infinite; }
        .badge-static { background: #3b82f6; }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.8; }
            100% { opacity: 1; }
        }

        .meta-info { font-size: 0.75rem; color: #64748b; margin-top: 0.25rem; }
        .play-overlay { position: absolute; top: 0; left: 0; right: 0; height: 180px; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; background: rgba(0,0,0,0.2); }
        .webcam-card:hover .play-overlay { opacity: 1; }
        .play-icon { font-size: 3rem; color: white; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); }

        /* Map Legend & Markers */
        .map-legend { display: flex; gap: 1.5rem; margin-bottom: 1rem; padding: 0.75rem 1rem; background: white; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; display: inline-flex; align-items: center; }
        .legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: #475569; font-weight: 500; }
        .dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
        .dot-live { background: #ef4444; border: 2px solid rgba(239, 68, 68, 0.3); }
        .dot-static { background: #3b82f6; border: 2px solid rgba(59, 130, 246, 0.3); }

        /* Custom Leaflet Marker Styles */
        .custom-marker { width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .marker-live { background: #ef4444; }
        .marker-static { background: #3b82f6; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="header-content">
                <a href="../../index.html" class="logo">Avalanche Archive</a>
                <div class="date-nav"><span>Webcams</span></div>
            </div>
        </header>
         <div style="margin-bottom:1rem;"><a href="../ground-conditions/index.html">&larr; Back to Ground Conditions</a></div>

        <h1>Allgäu Webcams</h1>

        <!-- Map Legend -->
        <div class="map-legend">
            <span style="font-weight:600; color:#1e293b; margin-right:0.5rem;">Map Key:</span>
            <div class="legend-item"><span class="dot dot-live"></span> Live Stream</div>
            <div class="legend-item"><span class="dot dot-static"></span> Static Image</div>
        </div>

        <!-- Map show webcam locations -->
        <div id="map" style="height: 400px; width: 100%; border-radius: 12px; margin-bottom: 2rem; border:1px solid #e2e8f0;"></div>

        <div class="webcam-grid">
            ${webcams.map(cam => {
        const isLive = cam.type === 'live';
        const badge = isLive ? '<span class="badge badge-live">● LIVE</span>' : '<span class="badge badge-static">📷 IMAGE</span>';
        const meta = isLive ? 'Live Stream' : `Updated: ${cam.updateInterval || 'Daily'}`;
        const cardClass = isLive ? 'webcam-card-live' : 'webcam-card-static';

        return `
            <a href="${cam.linkUrl}" target="_blank" class="webcam-card ${cardClass}">
                ${badge}
                <div style="position:relative;">
                    <img src="${cam.imageUrl}" class="webcam-img" loading="lazy" alt="${cam.title}">
                    ${isLive ? '<div class="play-overlay"><span class="play-icon">▶</span></div>' : ''}
                </div>
                <div style="padding:1rem;">
                    <h3 style="margin:0; font-size:1rem; font-weight:600;">${cam.title}</h3>
                    <p style="margin:0.25rem 0 0; color:#475569; font-size:0.9rem;">${cam.location}</p>
                    <p class="meta-info">${meta}</p>
                </div>
            </a>`;
    }).join('')}
        </div>

        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
        <script>
             const webcams = ${JSON.stringify(webcams)};
             const map = L.map('map').setView([47.45, 10.3], 9);
             L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

             webcams.forEach(cam => {
                 if(cam.lat && cam.lon) {
                    const isLive = cam.type === 'live';
                    // Custom colored marker
                    const icon = L.divIcon({
                        className: 'custom-marker ' + (isLive ? 'marker-live' : 'marker-static'),
                        iconSize: [16, 16],
                        iconAnchor: [8, 8],
                        popupAnchor: [0, -10]
                    });

                    // No image in popup, just title and link
                    const popupContent = \`
                        <div style="text-align:center;">
                            <b>\${cam.title}</b><br>
                            <span style="font-size:0.85rem; color:#64748b;">\${isLive ? 'Live Stream' : 'Static Image'}</span><br>
                            <a href="\${cam.linkUrl}" target="_blank" style="color:#0284c7; font-weight:600; text-decoration:none; display:block; margin-top:4px;">View Feed &rarr;</a>
                        </div>
                    \`;

                    L.marker([cam.lat, cam.lon], { icon: icon })
                     .bindPopup(popupContent)
                     .addTo(map);
                 }
             });
        </script>
    </div>
</body>
</html>`;
}

/**
 * Generate User Upload Detail Page
 */
function generateUserUploadDetailPage(upload) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Report by ${upload.user}</title>
    <link rel="stylesheet" href="../../styles.css">
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
</head>
<body>
    <div class="container">
        <header>
            <div class="header-content">
                <a href="../../index.html" class="logo">Avalanche Archive</a>
                <div class="date-nav"><span>Report Detail</span></div>
            </div>
        </header>
        <div style="margin-bottom:1rem;"><a href="../index.html">&larr; Back to Ground Conditions</a></div>

        <h1>Skier Report</h1>
        <div style="background:white; padding:2rem; border-radius:12px; box-shadow:0 2px 4px rgba(0,0,0,0.1); border:1px solid #e2e8f0;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom:1px solid #eee; padding-bottom:1rem;">
                <div>
                   <h2 style="margin:0; color:#0f172a;">${upload.user}</h2>
                   <div style="color:#64748b; margin-top:0.25rem;">${new Date(upload.date).toLocaleDateString()} ${new Date(upload.date).toLocaleTimeString()}</div>
                </div>
            </div>

            ${upload.image ? `<div style="margin-bottom:2rem;"><img src="${upload.image}" style="max-width:100%; border-radius:8px; display:block; margin:0 auto;"></div>` : ''}

            <p style="font-size:1.1rem; line-height:1.7; color:#334155;">${upload.comment}</p>

            ${(upload.lat && upload.lon) ? `
            <div style="margin-top:2rem;">
                <h3>Location</h3>
                <div id="map" style="height:300px; width:100%; border-radius:8px;"></div>
                <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
                <script>
                    const map = L.map('map').setView([${upload.lat}, ${upload.lon}], 13);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                    L.marker([${upload.lat}, ${upload.lon}]).addTo(map);
                </script>
            </div>` : ''}
        </div>
    </div>
</body>
</html>`;
}

module.exports = {
    generateIndexPage,
    generateProfileDetailPage,
    generateWeatherPage,
    generateIncidentWeatherPage,
    generateIncidentPage,
    generateGroundConditionsPage,
    generateUploadPage,
    generateWebcamPage,
    generateUserUploadDetailPage
};
