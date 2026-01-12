const https = require('https');

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

(async () => {
    const locations = await fetchJson('https://lawis.at/lawis_api/v2_3/location/');

    function search(obj, path = '') {
        for (const key in obj) {
            const val = obj[key];
            if (val && typeof val === 'object') {
                if (val.name) {
                    if (val.name.includes('Bayern') || val.name.includes('Deutschland') || val.name.includes('Germany') || val.name.includes('Allgäu')) {
                        console.log(`Found: ${val.name} (ID: ${key}?) Path: ${path}/${val.name}`);
                    }
                }
                search(val, `${path}/${val.name || key}`);
            }
        }
    }
    search(locations);
})();
