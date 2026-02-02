/**
 * Тест SmartUp API через Anor формат
 * 
 * Данные:
 * - filial_id: 15443912
 * - project_code: trade
 * - login: artyom@toolboxb2b
 * - password: 0712miron9218
 */

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
console.log('SmartUp API - Тест через Anor формат');
console.log('='.repeat(60));
console.log('Login:', CONFIG.login);
console.log('Filial ID:', CONFIG.filial_id);
console.log('Project Code:', CONFIG.project_code);
console.log('='.repeat(60));

async function testEndpoint(method, path, body = null) {
    console.log(`\n📡 Testing ${method}: ${path}`);

    try {
        const url = `${CONFIG.base_url}${path}`;

        const headers = {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'project_code': CONFIG.project_code,
            'filial_id': CONFIG.filial_id
        };

        const options = {
            method,
            headers
        };

        if (body && method === 'POST') {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        const text = await response.text();

        console.log(`   Status: ${response.status}`);

        if (response.status === 200) {
            try {
                const json = JSON.parse(text);
                console.log('   ✅ SUCCESS!');
                console.log('   Response:', JSON.stringify(json, null, 2).substring(0, 2000));
                return json;
            } catch {
                console.log('   Response (text):', text.substring(0, 1000));
            }
        } else if (response.status === 401) {
            console.log('   ❌ 401 Unauthorized');
            console.log('   Response:', text.substring(0, 500));
        } else if (response.status === 404) {
            console.log('   ⚠️ 404 Not Found');
        } else {
            console.log('   Response:', text.substring(0, 500));
        }

    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
    return null;
}

async function main() {
    // Эндпоинты для остатков (stocks/inventory)
    const stockEndpoints = [
        // Anor формат - остатки на складе
        { method: 'POST', path: '/anor/mxik/mqpf@current_stocks' },
        { method: 'POST', path: '/anor/mxik/mqpf@stocks' },
        { method: 'POST', path: '/anor/mkr/mqpf@current_stocks' },
        { method: 'POST', path: '/anor/mkr/mqpf@stocks' },
        { method: 'GET', path: '/anor/mxik/mqpf@current_stocks' },

        // Biruni формат
        { method: 'POST', path: '/b/es/porting+eapi@get_current_stocks' },
        { method: 'POST', path: '/b/anor/mxik+mqpf@current_stocks' },

        // Возможные варианты для товаров/остатков
        { method: 'GET', path: '/anor/api/v2/mkr/products' },
        { method: 'GET', path: '/anor/api/v2/mkr/stocks' },
        { method: 'GET', path: '/anor/api/v2/mkr/inventory' },
        { method: 'GET', path: '/anor/api/v2/mkr/remainders' },

        // API v1 формат
        { method: 'GET', path: '/api/v1/products' },
        { method: 'GET', path: '/api/v1/goods' },
    ];

    for (const endpoint of stockEndpoints) {
        await testEndpoint(endpoint.method, endpoint.path, endpoint.body);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Тестирование завершено');
    console.log('='.repeat(60));
}

main();
