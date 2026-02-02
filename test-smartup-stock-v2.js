/**
 * Тест запроса остатков из SmartUp API - версия 2
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
console.log('SmartUp API - Тест получения остатков (v2)');
console.log('='.repeat(60));
console.log('Login:', CONFIG.login);
console.log('Filial ID:', CONFIG.filial_id);
console.log('Project Code:', CONFIG.project_code);
console.log('='.repeat(60));

async function testSmartUpAPI() {
    // Эндпоинты для тестирования на основе документации Smartup 
    // Формат: /b/es/{module}@{method}
    const endpoints = [
        // Остатки (stocks)
        { method: 'POST', path: '/b/es/porting+eapi@get_current_stocks' },
        { method: 'POST', path: '/b/es/porting+eapi@get_stocks' },
        { method: 'POST', path: '/b/es/refs_data+eapi@get_current_stocks' },
        { method: 'POST', path: '/b/es/refs_data+eapi@get_stocks' },
        { method: 'POST', path: '/b/es/warehouse+eapi@get_current_stocks' },
        { method: 'POST', path: '/b/es/warehouse+eapi@get_stocks' },
        // Может быть через products
        { method: 'POST', path: '/b/es/products+eapi@get_stocks' },
        { method: 'POST', path: '/b/es/products+eapi@get_remainders' },
        // Или через reference
        { method: 'GET', path: '/b/es/refs_data+eapi@products' },
        { method: 'POST', path: '/b/es/refs_data+eapi@products' },
    ];

    for (const endpoint of endpoints) {
        await testEndpoint(endpoint.method, endpoint.path);
    }
}

async function testEndpoint(method, path) {
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

        if (method === 'POST') {
            options.body = JSON.stringify({
                // Пустой body или можно добавить параметры
            });
        }

        const response = await fetch(url, options);
        const text = await response.text();

        console.log(`   Status: ${response.status}`);

        if (response.status === 200) {
            try {
                const json = JSON.parse(text);
                console.log('   ✅ SUCCESS!');
                console.log('   Response:', JSON.stringify(json, null, 2).substring(0, 1000));
            } catch {
                console.log('   Response (text):', text.substring(0, 500));
            }
        } else if (response.status === 401) {
            console.log('   ❌ 401 Unauthorized');
        } else if (response.status === 404) {
            console.log('   ⚠️ 404 Not Found');
        } else {
            console.log('   Response:', text.substring(0, 300));
        }

    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
}

// Также попробуем стандартный REST API
async function testRestAPI() {
    console.log('\n' + '='.repeat(60));
    console.log('Testing REST API endpoints');
    console.log('='.repeat(60));

    const restEndpoints = [
        '/api/v1/stocks',
        '/api/v1/products',
        '/api/references/products',
        '/api/references/stocks',
    ];

    for (const path of restEndpoints) {
        await testEndpoint('GET', path);
    }
}

async function main() {
    await testSmartUpAPI();
    await testRestAPI();

    console.log('\n' + '='.repeat(60));
    console.log('Тестирование завершено');
    console.log('='.repeat(60));
}

main();
