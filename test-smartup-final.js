/**
 * SmartUp API - Full login + data fetch flow
 */

const crypto = require('crypto');

const LOGIN = 'artyom@toolboxb2b';
const PASSWORD = '0712miron9218';
const BASE_URL = 'https://smartup.online';
const FILIAL_ID = '1s6d9w5r60';
const PROJECT_CODE = 'trade';

// Hash password with SHA-1
const passwordHash = crypto.createHash('sha1').update(PASSWORD).digest('hex');

async function main() {
    console.log('SmartUp API - Complete login + data fetch');
    console.log('==========================================\n');

    // Step 1: Login and get session cookie
    console.log('Step 1: Logging in...');

    const loginResponse = await fetch(`${BASE_URL}/b/biruni/s$log_in`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            login: LOGIN,
            password: passwordHash,
        }),
    });

    const cookies = loginResponse.headers.get('set-cookie');
    console.log(`Login status: ${loginResponse.status}`);

    if (loginResponse.status !== 200) {
        console.log('Login failed!');
        return;
    }

    // Extract JSESSIONID
    const jsessionMatch = cookies.match(/JSESSIONID=([^;]+)/);
    const biruniMatch = cookies.match(/biruni_device_id=([^;]+)/);

    const sessionCookie = `JSESSIONID=${jsessionMatch[1]}; biruni_device_id=${biruniMatch[1]}`;
    console.log(`Session cookie: ${sessionCookie.substring(0, 80)}...`);

    // Step 2: Try to fetch products with session cookie
    console.log('\n\nStep 2: Fetching products with session...');

    const endpoints = [
        '/api/v1/products',
        '/api/v1/items',
        '/api/v1/catalog',
        '/api/v1/goods',
        `/b/trade/${FILIAL_ID}/ref/products`,
        `/b/trade/${FILIAL_ID}/ref/items`,
        '/b/trade/ref/products',
        `/b/trade/${FILIAL_ID}/sr$products`,
        `/b/anor/${FILIAL_ID}/sr$products`,
    ];

    for (const endpoint of endpoints) {
        console.log(`\n--- Testing ${endpoint} ---`);

        try {
            const response = await fetch(`${BASE_URL}${endpoint}?limit=1`, {
                method: 'GET',
                headers: {
                    'Cookie': sessionCookie,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'project_code': PROJECT_CODE,
                    'filial_id': FILIAL_ID,
                },
            });

            const text = await response.text();
            console.log(`Status: ${response.status}`);

            if (response.ok) {
                console.log(`✅ SUCCESS! Response: ${text.substring(0, 300)}`);
            } else {
                console.log(`Response: ${text.substring(0, 150)}`);
            }
        } catch (err) {
            console.log(`Error: ${err.message}`);
        }
    }
}

main().catch(console.error);
