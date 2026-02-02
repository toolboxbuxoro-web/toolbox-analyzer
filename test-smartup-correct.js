/**
 * SmartUp API - Правильный тест как показано в Postman
 * 
 * Конфигурация из Postman:
 * - URL: http://app3.gw.greenwhite.uz
 * - Auth: Basic Auth (one@dodge / 1)
 * - Headers: filial_id=107, project_code=trade
 */

// Ваши учётные данные
const CONFIG = {
    // Данные из примера Postman
    example: {
        login: 'one@dodge',
        password: '1',
        filial_id: '107',
        project_code: 'trade',
        base_url: 'http://app3.gw.greenwhite.uz'
    },
    // Ваши данные
    yours: {
        login: 'artyom@toolboxb2b',
        password: '0712miron9218',
        filial_id: '15443912',
        project_code: 'trade',
        base_url: 'http://app3.gw.greenwhite.uz'  // Исправлено!
    }
};

// Используем ваши данные с правильным URL
const ACTIVE_CONFIG = CONFIG.yours;

const credentials = Buffer.from(`${ACTIVE_CONFIG.login}:${ACTIVE_CONFIG.password}`).toString('base64');

console.log('='.repeat(60));
console.log('SmartUp API - Тест с правильным URL (как в Postman)');
console.log('='.repeat(60));
console.log('Base URL:', ACTIVE_CONFIG.base_url);
console.log('Login:', ACTIVE_CONFIG.login);
console.log('Filial ID:', ACTIVE_CONFIG.filial_id);
console.log('Project Code:', ACTIVE_CONFIG.project_code);
console.log('='.repeat(60));

async function testEndpoint(method, path, body = null) {
    const url = `${ACTIVE_CONFIG.base_url}${path}`;
    console.log(`\n📡 ${method} ${path}`);
    console.log(`   Full URL: ${url}`);

    try {
        const headers = {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'filial_id': ACTIVE_CONFIG.filial_id,
            'project_code': ACTIVE_CONFIG.project_code
        };

        const options = {
            method,
            headers
        };

        if (method === 'POST' && body !== null) {
            options.body = JSON.stringify(body);
        }

        console.log('   Headers:', JSON.stringify(headers, null, 2));

        const response = await fetch(url, options);
        const text = await response.text();

        console.log(`   Status: ${response.status}`);

        if (response.ok) {
            try {
                const json = JSON.parse(text);
                console.log('   ✅ SUCCESS!');
                console.log('   Response:', JSON.stringify(json, null, 2).substring(0, 500));
            } catch {
                console.log('   Response (text):', text.substring(0, 500));
            }
        } else {
            console.log('   ❌ Error:', text.substring(0, 300));
        }
    } catch (error) {
        console.log(`   ❌ Network Error: ${error.message}`);
    }
}

async function main() {
    // Эндпоинты из Postman (видно на скриншоте)
    // Формат URL: /xtrade/b/anor/mxsx/m/service$import

    const endpoints = [
        // Тот же эндпоинт, что на скриншоте
        { method: 'POST', path: '/xtrade/b/anor/mxsx/m/service$import', body: {} },

        // Inventory endpoints (видны в меню слева)
        { method: 'POST', path: '/xtrade/b/anor/mxsx/m/inventory$import', body: {} },
        { method: 'POST', path: '/xtrade/b/anor/mxsx/m/inventory$export', body: {} },

        // Product group
        { method: 'POST', path: '/xtrade/b/anor/mxsx/m/product_group$import', body: {} },
        { method: 'POST', path: '/xtrade/b/anor/mxsx/m/product_group$export', body: {} },
    ];

    console.log('\n🔍 Тестируем эндпоинты из Postman...');

    for (const ep of endpoints) {
        await testEndpoint(ep.method, ep.path, ep.body);
        await new Promise(r => setTimeout(r, 500));
    }

    console.log('\n' + '='.repeat(60));
    console.log('Тестирование завершено');
    console.log('='.repeat(60));
}

main().catch(console.error);
