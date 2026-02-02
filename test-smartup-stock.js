/**
 * Тест запроса остатков из SmartUp API
 * 
 * Данные:
 * - filial_id: 15443912
 * - project_code: trade
 * - login: artyom@toolboxb2b
 * - password: 0712miron9218
 */

const https = require('https');

const CONFIG = {
    login: 'artyom@toolboxb2b',
    password: '0712miron9218',
    filial_id: '15443912',
    project_code: 'trade',
    base_url: 'https://smartup.online'
};

// Создаём Basic Auth credentials
const credentials = Buffer.from(`${CONFIG.login}:${CONFIG.password}`).toString('base64');

console.log('='.repeat(60));
console.log('SmartUp API - Тест получения остатков');
console.log('='.repeat(60));
console.log('Credentials (base64):', credentials);
console.log('Filial ID:', CONFIG.filial_id);
console.log('Project Code:', CONFIG.project_code);
console.log('='.repeat(60));

// Попробуем разные эндпоинты для остатков
const endpoints = [
    '/b/es/porting+eapi@get_current_stocks', // Из документации
    '/api/v1/stocks',
    '/api/v1/inventory',
    '/api/v1/products/stocks',
    '/api/v1/remainders',
    '/b/es/porting+eapi@stocks',
];

async function testEndpoint(endpoint) {
    return new Promise((resolve) => {
        const url = new URL(endpoint, CONFIG.base_url);

        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'project_code': CONFIG.project_code,
                'filial_id': CONFIG.filial_id
            }
        };

        console.log(`\n📡 Testing: ${endpoint}`);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`   Status: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        console.log('   ✅ SUCCESS!');
                        console.log('   Response (first 500 chars):', JSON.stringify(json).substring(0, 500));
                    } catch (e) {
                        console.log('   Response (text):', data.substring(0, 300));
                    }
                } else if (res.statusCode === 401) {
                    console.log('   ❌ 401 Unauthorized');
                } else if (res.statusCode === 404) {
                    console.log('   ⚠️ 404 Not Found');
                } else {
                    console.log('   Response:', data.substring(0, 300));
                }
                resolve({ endpoint, status: res.statusCode, data });
            });
        });

        req.on('error', (e) => {
            console.log(`   ❌ Error: ${e.message}`);
            resolve({ endpoint, error: e.message });
        });

        req.end();
    });
}

// POST запрос для get_current_stocks
async function testGetCurrentStocks() {
    return new Promise((resolve) => {
        const url = new URL('/b/es/porting+eapi@get_current_stocks', CONFIG.base_url);

        const postData = JSON.stringify({
            // Попробуем без параметров сначала
        });

        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'project_code': CONFIG.project_code,
                'filial_id': CONFIG.filial_id,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        console.log(`\n📡 Testing POST: /b/es/porting+eapi@get_current_stocks`);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`   Status: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        console.log('   ✅ SUCCESS!');
                        console.log('   Response (first 1000 chars):', JSON.stringify(json, null, 2).substring(0, 1000));
                    } catch (e) {
                        console.log('   Response (text):', data.substring(0, 500));
                    }
                } else {
                    console.log('   Response:', data.substring(0, 500));
                }
                resolve({ status: res.statusCode, data });
            });
        });

        req.on('error', (e) => {
            console.log(`   ❌ Error: ${e.message}`);
            resolve({ error: e.message });
        });

        req.write(postData);
        req.end();
    });
}

async function main() {
    // Тестируем GET эндпоинты
    for (const endpoint of endpoints) {
        await testEndpoint(endpoint);
    }

    // Тестируем POST для get_current_stocks
    await testGetCurrentStocks();

    console.log('\n' + '='.repeat(60));
    console.log('Тестирование завершено');
    console.log('='.repeat(60));
}

main();
