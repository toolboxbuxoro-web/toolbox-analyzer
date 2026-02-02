/**
 * SmartUp API Debug - Try auth endpoints
 */

const LOGIN = 'artyom@toolboxb2b';
const PASSWORD = '0712miron9218';
const BASE_URL = 'https://smartup.online';

const authEndpoints = [
    { path: '/api/auth/login', method: 'POST', body: { login: LOGIN, password: PASSWORD } },
    { path: '/api/v1/auth/login', method: 'POST', body: { login: LOGIN, password: PASSWORD } },
    { path: '/api/auth', method: 'POST', body: { login: LOGIN, password: PASSWORD } },
    { path: '/api/v1/auth', method: 'POST', body: { login: LOGIN, password: PASSWORD } },
    { path: '/api/login', method: 'POST', body: { login: LOGIN, password: PASSWORD } },
    { path: '/api/v1/login', method: 'POST', body: { login: LOGIN, password: PASSWORD } },
    { path: '/b2b/auth/login', method: 'POST', body: { login: LOGIN, password: PASSWORD } },
    { path: '/oauth/token', method: 'POST', body: { grant_type: 'password', username: LOGIN, password: PASSWORD } },
    // Try with "username" instead of "login"
    { path: '/api/auth/login', method: 'POST', body: { username: LOGIN, password: PASSWORD } },
    { path: '/api/v1/auth/login', method: 'POST', body: { username: LOGIN, password: PASSWORD } },
];

async function testAuthEndpoint(endpoint) {
    const url = `${BASE_URL}${endpoint.path}`;

    console.log(`\n=== ${endpoint.method} ${endpoint.path} ===`);

    try {
        const response = await fetch(url, {
            method: endpoint.method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(endpoint.body),
        });

        const text = await response.text();

        console.log(`Status: ${response.status}`);
        console.log(`Response: ${text.substring(0, 300)}`);

        if (response.ok) {
            console.log('✅ SUCCESS! Token endpoint found!');
            return true;
        }
        return false;
    } catch (error) {
        console.log(`Error: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('Testing auth endpoints for SmartUp API');
    console.log('======================================\n');

    for (const endpoint of authEndpoints) {
        const success = await testAuthEndpoint(endpoint);
        if (success) {
            console.log(`\n\n🎉 Working auth endpoint: ${endpoint.path}`);
            break;
        }
        await new Promise(r => setTimeout(r, 300));
    }
}

main().catch(console.error);
