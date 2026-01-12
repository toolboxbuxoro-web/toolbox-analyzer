const https = require('https');

const storeId = '815df250-bce8-11ee-0a80-0f0b001b27f6';
const storeUrl = 'https://api.moysklad.ru/api/remap/1.2/entity/store/' + storeId;
const token = 'd3150a2c7dcf1ab7280f02f24e3b2822b0fc3bc4';

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        https.get(url, options, (res) => {
            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error(`Request failed with status: ${res.statusCode}`));
            }

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function verifySales() {
    let totalSum = 0;
    let offset = 0;
    const limit = 1000;
    let allRows = 0;

    console.log('Node version:', process.version);
    console.log('Fetching sales for store:', storeId);
    console.log('Period: 2025-12-01 to 2025-12-31');

    // 1. SALES
    while (true) {
        const url = `https://api.moysklad.ru/api/remap/1.2/entity/retaildemand?limit=${limit}&offset=${offset}&filter=moment>=2025-12-01 00:00:00;moment<=2025-12-31 23:59:59;store=${storeUrl}`;

        try {
            const data = await fetchUrl(url);

            if (offset === 0) {
                console.log('Total checks (meta.size):', data.meta?.size);
            }

            const rows = data.rows || [];
            allRows += rows.length;

            const pageSum = rows.reduce((s, r) => s + (parseFloat(r.sum) || 0), 0);
            totalSum += pageSum;

            console.log(`Sales Offset ${offset}: fetched ${rows.length}, page sum: ${pageSum / 100}`);

            if (rows.length < limit) break;
            offset += limit;
        } catch (e) {
            console.error('Sales Fetch error:', e.message);
            break;
        }
    }

    // 2. RETURNS
    let returnsSum = 0;
    let returnsCount = 0;
    offset = 0;

    while (true) {
        const url = `https://api.moysklad.ru/api/remap/1.2/entity/retailsalesreturn?limit=${limit}&offset=${offset}&filter=moment>=2025-12-01 00:00:00;moment<=2025-12-31 23:59:59;store=${storeUrl}`;

        try {
            const data = await fetchUrl(url);

            if (offset === 0) {
                console.log('Total returns (meta.size):', data.meta?.size);
                returnsCount = data.meta?.size || 0;
            }

            const rows = data.rows || [];
            const pageSum = rows.reduce((s, r) => s + (parseFloat(r.sum) || 0), 0);
            returnsSum += pageSum;

            console.log(`Returns Offset ${offset}: fetched ${rows.length}, page sum: ${pageSum / 100}`);

            if (rows.length < limit) break;
            offset += limit;
        } catch (e) {
            console.error('Returns Fetch error:', e.message);
            break;
        }
    }

    console.log('--------------------------------');
    console.log('Total Sales (Gross):', totalSum / 100);
    console.log('Total Returns:', returnsSum / 100);
    console.log('NET SALES:', (totalSum - returnsSum) / 100);
    console.log('--------------------------------');
}

verifySales();
