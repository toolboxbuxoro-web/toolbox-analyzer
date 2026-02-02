/**
 * SmartUp API - Test with required headers (project_code, filial_id)
 */

const LOGIN = 'artyom@toolboxb2b';
const PASSWORD = '0712miron9218';
const BASE_URL = 'https://smartup.online';
const credentials = Buffer.from(`${LOGIN}:${PASSWORD}`).toString('base64');

// Common project codes in SmartUp
const projectCodes = ['trade', 'anor', 'b2b', 'toolboxb2b', 'wholesale', 'distribution'];

async function testWithHeaders(projectCode) {
    const url = `${BASE_URL}/api/v1/items?limit=1`;

    console.log(`\n=== Testing with project_code: ${projectCode} ===`);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'project_code': projectCode,
                // Try without filial_id first, or with a placeholder
            },
        });

        const text = await response.text();

        console.log(`Status: ${response.status}`);
        console.log(`Response: ${text.substring(0, 300)}`);

        if (response.ok) {
            console.log('✅ SUCCESS!');
            return true;
        }

        // Check if response is JSON and has useful info
        try {
            const json = JSON.parse(text);
            if (json.message) console.log(`Message: ${json.message}`);
            if (json.error) console.log(`Error: ${json.error}`);
        } catch (e) { }

        return false;
    } catch (error) {
        console.log(`Error: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('Testing SmartUp API with project_code header');
    console.log('=============================================\n');

    for (const code of projectCodes) {
        const success = await testWithHeaders(code);
        if (success) {
            console.log(`\n\n🎉 Working project_code: ${code}`);
            break;
        }
        await new Promise(r => setTimeout(r, 300));
    }

    // Also try the exact pattern from docs - maybe filial_id is needed
    console.log('\n\n=== Trying with filial_id header ===');
    const filialIds = ['1', '0', 'toolboxb2b', 'main'];

    for (const filialId of filialIds) {
        const url = `${BASE_URL}/api/v1/items?limit=1`;

        console.log(`\nTrying filial_id: ${filialId}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'project_code': 'trade',
                'filial_id': filialId,
            },
        });

        const text = await response.text();
        console.log(`Status: ${response.status}, Response: ${text.substring(0, 100)}`);

        await new Promise(r => setTimeout(r, 300));
    }
}

main().catch(console.error);
