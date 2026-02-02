/**
 * SmartUp API Debug Script - Testing different login formats
 */

const PASSWORD = '0712miron9218';
const BASE_URL = 'https://smartup.online';

// Try different login formats
const loginFormats = [
    'artyom@toolboxb2b',      // Original
    'artyom',                  // Just username
    'toolboxb2b\\artyom',      // Windows-style domain
    'toolboxb2b/artyom',       // Slash-style
    'artyom@toolboxb2b.uz',    // With TLD
];

async function testLogin(login) {
    const credentials = Buffer.from(`${login}:${PASSWORD}`).toString('base64');
    const url = `${BASE_URL}/api/v1/items?limit=1`;

    console.log(`\n=== Testing login: ${login} ===`);

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

        console.log(`Status: ${response.status}`);
        console.log(`Response: ${text.substring(0, 200)}`);

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
    console.log('Testing different login formats for SmartUp API');
    console.log('================================================\n');

    for (const login of loginFormats) {
        const success = await testLogin(login);
        if (success) {
            console.log(`\n\n🎉 Working login format: ${login}`);
            break;
        }
        await new Promise(r => setTimeout(r, 300));
    }
}

main().catch(console.error);
