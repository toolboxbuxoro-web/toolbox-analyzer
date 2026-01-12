const storeId = '815df250-bce8-11ee-0a80-0f0b001b27f6';
const storeUrl = 'https://api.moysklad.ru/api/remap/1.2/entity/store/' + storeId;
const token = 'd3150a2c7dcf1ab7280f02f24e3b2822b0fc3bc4';

async function getTotal() {
    let totalSum = 0;
    let offset = 0;
    const limit = 1000;

    // Продажи
    while (true) {
        const url = `https://api.moysklad.ru/api/remap/1.2/entity/retaildemand?limit=${limit}&offset=${offset}&filter=moment>=2025-12-01 00:00:00;moment<=2025-12-31 23:59:59;store=${storeUrl}`;

        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await res.json();

        if (offset === 0) {
            console.log('Всего чеков:', data.meta?.size || 0);
        }

        const pageSum = data.rows?.reduce((s, r) => s + (parseFloat(r.sum) || 0), 0) || 0;
        totalSum += pageSum;

        if (!data.rows || data.rows.length < limit) break;
        offset += limit;
    }

    console.log('ИТОГО Продажи:', totalSum / 100);

    // Возвраты
    let returnsSum = 0;
    offset = 0;
    while (true) {
        const url = `https://api.moysklad.ru/api/remap/1.2/entity/retailsalesreturn?limit=${limit}&offset=${offset}&filter=moment>=2025-12-01 00:00:00;moment<=2025-12-31 23:59:59;store=${storeUrl}`;

        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await res.json();

        if (offset === 0) {
            console.log('Всего возвратов:', data.meta?.size || 0);
        }

        const pageSum = data.rows?.reduce((s, r) => s + (parseFloat(r.sum) || 0), 0) || 0;
        returnsSum += pageSum;

        if (!data.rows || data.rows.length < limit) break;
        offset += limit;
    }

    console.log('ИТОГО Возвраты:', returnsSum / 100);
    console.log('');
    console.log('ЧИСТЫЕ ПРОДАЖИ (Продажи - Возвраты):', (totalSum - returnsSum) / 100);
}

getTotal();
