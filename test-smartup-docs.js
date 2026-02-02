/**
 * SmartUp API Test - Из официальной документации
 * 
 * Правильный формат: /b/anor/mxsx/mr/{action}
 * 
 * Документация: https://api.greenwhite.uz/
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
console.log('SmartUp API - Тест по документации');
console.log('='.repeat(60));
console.log('URL:', CONFIG.base_url);
console.log('Login:', CONFIG.login);
console.log('Filial ID:', CONFIG.filial_id);
console.log('Project Code:', CONFIG.project_code);
console.log('='.repeat(60));

async function testEndpoint(method, path, body = {}) {
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

        const response = await fetch(url, {
            method,
            headers,
            body: JSON.stringify(body)
        });

        const text = await response.text();
        console.log(`   Status: ${response.status}`);
        console.log(`   Headers:`, Object.fromEntries(response.headers));

        if (response.ok) {
            try {
                const json = JSON.parse(text);
                console.log('   ✅ SUCCESS!');
                console.log('   Response:', JSON.stringify(json, null, 2).substring(0, 1000));
                return { success: true, data: json };
            } catch {
                console.log('   Response:', text.substring(0, 500));
            }
        } else {
            console.log('   ❌ Error:', text.substring(0, 400));
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
    return { success: false };
}

async function main() {
    // Точные эндпоинты из документации (формат /b/anor/mxsx/mr/)

    console.log('\n🔍 Тест 1: Inventory Export (из документации)');
    await testEndpoint('POST', '/b/anor/mxsx/mr/inventory$export', {
        code: '',
        begin_created_on: '',
        end_created_on: '',
        begin_modified_on: '',
        end_modified_on: ''
    });

    console.log('\n🔍 Тест 2: Inventory Export (последние 7 дней)');
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const formatDate = (d) => `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;

    await testEndpoint('POST', '/b/anor/mxsx/mr/inventory$export', {
        begin_created_on: formatDate(weekAgo),
        end_created_on: formatDate(today)
    });

    console.log('\n🔍 Тест 3: Product Group Export');
    await testEndpoint('POST', '/b/anor/mxsx/mr/product_group$export', {});

    console.log('\n🔍 Тест 4: Service Export');
    await testEndpoint('POST', '/b/anor/mxsx/mr/service$export', {});

    console.log('\n' + '='.repeat(60));
    console.log('Тестирование завершено');
    console.log('='.repeat(60));
}

main().catch(console.error);
