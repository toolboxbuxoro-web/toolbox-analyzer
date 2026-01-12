const storeId = '815df250-bce8-11ee-0a80-0f0b001b27f6';
const storeUrl = 'https://api.moysklad.ru/api/remap/1.2/entity/store/' + storeId;
const token = 'd3150a2c7dcf1ab7280f02f24e3b2822b0fc3bc4';

async function verifySales() {
    let totalSum = 0;
    let offset = 0;
    const limit = 1000;
    let allRows = 0;

    console.log('Fetching sales for store:', storeId);
    console.log('Period: 2025-12-01 to 2025-12-31');

    while (true) {
        const url = `https://api.moysklad.ru/api/remap/1.2/entity/retaildemand?limit=${limit}&offset=${offset}&filter=moment>=2025-12-01 00:00:00;moment<=2025-12-31 23:59:59;store=${storeUrl}`;

        try {
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) {
                console.log('Error fetching:', res.status, res.statusText);
                break;
            }

            const data = await res.json();

            if (offset === 0) {
                console.log('Total checks (meta.size):', data.meta?.size);
            }

            const rows = data.rows || [];
            allRows += rows.length;

            const pageSum = rows.reduce((s, r) => s + (parseFloat(r.sum) || 0), 0);
            totalSum += pageSum;

            console.log(`Page offset ${offset}: fetched ${rows.length} rows, page sum: ${pageSum / 100}`);

            if (rows.length < limit) break;
            offset += limit;
        } catch (e) {
            console.error('Fetch error:', e);
            break;
        }
    }

    console.log('--------------------------------');
    console.log('Calculated Total Sales:', totalSum / 100);
    console.log('Total Rows Fetched:', allRows);
}

verifySales();
