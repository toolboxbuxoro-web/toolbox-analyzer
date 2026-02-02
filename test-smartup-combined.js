/**
 * SmartUp API - Combined Auth Test (POST + Basic Auth header)
 */

const LOGIN = 'artyom@toolboxb2b';
const PASSWORD = '0712miron9218';
const BASE_URL = 'https://smartup.online';
const credentials = Buffer.from(`${LOGIN}:${PASSWORD}`).toString('base64');

async function testWithBasicAuth(endpoint, method, body = null) {
    const url = `${BASE_URL}${endpoint}`;

    console.log(`\n=== ${method} ${endpoint} (with Basic Auth header) ===`);

    const options = {
        method: method,
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        const text = await response.text();

        console.log(`Status: ${response.status}`);
        console.log(`Headers: ${JSON.stringify(Object.fromEntries(response.headers))}`);
        console.log(`Response: ${text.substring(0, 500)}`);

        if (response.ok) {
            console.log('✅ SUCCESS!');
            return true;
        }
        return false;
    } catch (error) {
        console.log(`Error: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('Testing SmartUp API with Basic Auth + different methods');
    console.log('=========================================================\n');

    // Test auth endpoints with Basic Auth header
    await testWithBasicAuth('/api/v1/auth/login', 'POST', { login: LOGIN, password: PASSWORD });
    await testWithBasicAuth('/api/v1/auth', 'POST', { login: LOGIN, password: PASSWORD });
    await testWithBasicAuth('/api/v1/login', 'POST', { login: LOGIN, password: PASSWORD });

    // Try GET on auth endpoints (sometimes they work like session check)
    await testWithBasicAuth('/api/v1/auth', 'GET');
    await testWithBasicAuth('/api/v1/me', 'GET');
    await testWithBasicAuth('/api/v1/user', 'GET');
    await testWithBasicAuth('/api/v1/session', 'GET');

    // Check if there's a company/tenant specific path
    await testWithBasicAuth('/toolboxb2b/api/v1/products', 'GET');
    await testWithBasicAuth('/api/v1/toolboxb2b/products', 'GET');
}

main().catch(console.error);
