/**
 * SmartUp API Test - https://smartup.online
 * 
 * Ваши данные:
 * - login: artyom@toolboxb2b
 * - password: 0712miron9218
 * - filial_id: 15443912
 * - project_code: trade
 */

const CONFIG = {
    login: 'artyom@toolboxb2b',
    password: '0712miron9218',
    filial_id: '15443912',
    project_code: 'trade',
    base_url: 'https://smartup.online'
};

const credentials = Buffer.from(`${CONFIG.login}:${CONFIG.password}`).toString('base64');

console.log('='.repeat(60));
console.log('SmartUp API - smartup.online');
console.log('='.repeat(60));
console.log('Login:', CONFIG.login);
console.log('Filial ID:', CONFIG.filial_id);
console.log('='.repeat(60));

async function testEndpoint(method, path, body = null) {
    const url = `${CONFIG.base_url}${path}`;
    console.log(`\n📡 ${method} ${path}`);

    try {
        const headers = {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'filial_id': CONFIG.filial_id,
            'project_code': CONFIG.project_code
        };

        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(url, options);
        const text = await response.text();

        console.log(`   Status: ${response.status}`);

        if (response.ok) {
            try {
                const json = JSON.parse(text);
                console.log('   ✅ SUCCESS!');
                console.log('   Response:', JSON.stringify(json, null, 2).substring(0, 800));
                return { success: true, data: json };
            } catch {
                console.log('   Response:', text.substring(0, 500));
                return { success: true, data: text };
            }
        } else {
            console.log('   ❌ Error:', text.substring(0, 300));
            return { success: false };
        }
    } catch (error) {
        console.log(`   ❌ Network Error: ${error.message}`);
        return { success: false };
    }
}

async function main() {
    // Эндпоинты для тестирования
    // Формат из Postman: /xtrade/b/anor/mxsx/m/{action}
    // Формат из URL: /anor/mkw/balance/balance_list

    const endpoints = [
        // Формат как в Postman (xtrade)
        { method: 'POST', path: '/xtrade/b/anor/mxsx/m/inventory$export' },
        { method: 'POST', path: '/xtrade/b/anor/mxsx/m/inventory$import' },
        { method: 'POST', path: '/xtrade/b/anor/mxsx/m/product_group$export' },

        // Формат из URL (anor/mkw)
        { method: 'POST', path: '/b/anor/mkw/m/balance$export' },
        { method: 'GET', path: '/b/anor/mkw/m/balance$export' },

        // Стандартный API формат
        { method: 'GET', path: '/api/v1/products' },
        { method: 'GET', path: '/api/products' },
        { method: 'GET', path: '/api/v1/inventory' },
        { method: 'GET', path: '/api/v1/stocks' },

        // Возможные форматы REST API
        { method: 'POST', path: '/b/es/refs_data+eapi@get_current_stocks' },
        { method: 'POST', path: '/b/es/porting+eapi@get_current_stocks' },
    ];

    for (const ep of endpoints) {
        const result = await testEndpoint(ep.method, ep.path, ep.body || {});
        if (result.success) {
            console.log('\n🎉 Нашли рабочий эндпоинт!');
        }
        await new Promise(r => setTimeout(r, 300));
    }

    console.log('\n' + '='.repeat(60));
    console.log('Тестирование завершено');
    console.log('='.repeat(60));
}

main().catch(console.error);
