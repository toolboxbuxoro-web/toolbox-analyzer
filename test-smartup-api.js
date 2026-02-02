/**
 * SmartUp API Debug Script
 * Тестирует различные эндпоинты SmartUp API
 */

const LOGIN = 'artyom@toolboxb2b';
const PASSWORD = '0712miron9218';
const BASE_URL = 'https://smartup.online';

// Basic Auth header
const credentials = Buffer.from(`${LOGIN}:${PASSWORD}`).toString('base64');

const endpoints = [
    '/api/v1/products',
    '/api/products',
    '/b2b/api/v1/products',
    '/b2b/api/v1/catalog/products',
    '/api/v1/nomenclatures',
    '/api/nomenclatures',
    '/api/items',
    '/api/v1/items',
    '/api/catalog',
    '/api/v1/catalog',
    '/api/v1/goods',
    '/api/goods',
    '/b2b/products',
    '/b2b/catalog',
    // Maybe it's a different domain structure
    '/edo/api/products',
    '/edo/api/v1/products',
    // Simple info endpoints
    '/api/version',
    '/api/v1/version',
    '/api/info',
    '/api/v1/info',
    '/api/status',
    // Maybe they use "product" singular
    '/api/v1/product',
    '/api/product',
];

async function testEndpoint(endpoint) {
    const url = `${BASE_URL}${endpoint}?limit=1`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        const text = await response.text();

        console.log(`\n=== ${endpoint} ===`);
        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log(`Response (first 300 chars):`);
        console.log(text.substring(0, 300));

        if (response.ok) {
            console.log('\n✅ SUCCESS! This endpoint works!');
        }

        return { endpoint, status: response.status, ok: response.ok, preview: text.substring(0, 100) };
    } catch (error) {
        console.log(`\n=== ${endpoint} ===`);
        console.log(`Error: ${error.message}`);
        return { endpoint, status: 'ERROR', ok: false, error: error.message };
    }
}

async function main() {
    console.log('SmartUp API Probe Script');
    console.log('========================');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Login: ${LOGIN}`);
    console.log(`Testing ${endpoints.length} endpoints...\n`);

    const results = [];

    for (const endpoint of endpoints) {
        const result = await testEndpoint(endpoint);
        results.push(result);

        // Small delay between requests
        await new Promise(r => setTimeout(r, 200));
    }

    console.log('\n\n========== SUMMARY ==========');
    const working = results.filter(r => r.ok);
    const notFound = results.filter(r => r.status === 404);
    const unauthorized = results.filter(r => r.status === 401);
    const errors = results.filter(r => r.status === 500 || r.status === 'ERROR');

    console.log(`\n✅ Working (200 OK): ${working.length}`);
    working.forEach(r => console.log(`   - ${r.endpoint}`));

    console.log(`\n🔒 Unauthorized (401): ${unauthorized.length}`);
    unauthorized.forEach(r => console.log(`   - ${r.endpoint}`));

    console.log(`\n❌ Not Found (404): ${notFound.length}`);

    console.log(`\n💥 Server Errors (500): ${errors.length}`);
    errors.forEach(r => console.log(`   - ${r.endpoint}: ${r.error || r.status}`));
}

main().catch(console.error);
