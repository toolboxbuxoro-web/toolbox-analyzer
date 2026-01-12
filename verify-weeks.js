const storeId = '815df250-bce8-11ee-0a80-0f0b001b27f6';
const storeUrl = 'https://api.moysklad.ru/api/remap/1.2/entity/store/' + storeId;
const token = 'd3150a2c7dcf1ab7280f02f24e3b2822b0fc3bc4';

const weeks = [
    { start: '2025-12-01 00:00:00', end: '2025-12-08 23:59:59' },
    { start: '2025-12-09 00:00:00', end: '2025-12-16 23:59:59' },
    { start: '2025-12-17 00:00:00', end: '2025-12-24 23:59:59' },
    { start: '2025-12-25 00:00:00', end: '2025-12-31 23:59:59' }
];

async function fetchTotal(entity, dateFrom, dateTo) {
    let totalSum = 0;
    let count = 0;
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
        // NOTE: encoded dateTo must be correct
        const url = `https://api.moysklad.ru/api/remap/1.2/entity/${entity}?limit=${limit}&offset=${offset}&filter=moment>=${dateFrom};moment<=${encodeURIComponent(dateTo)};store=${storeUrl}`;

        try {
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    // fetch automatically handles Accept logic mostly, but let's be explicit if needed.
                    // MoySklad often needs Content-Type even on GET or just Accept
                    'Accept-Encoding': 'gzip',
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) {
                console.error(`Status ${res.status}: ${res.statusText}`);
                hasMore = false;
                continue;
            }

            const data = await res.json();

            if (offset === 0) {
                count += (data.meta?.size || 0);
            }

            const rows = data.rows || [];
            totalSum += rows.reduce((s, r) => s + (parseFloat(r.sum) || 0), 0);

            if (rows.length < limit || offset + rows.length >= data.meta?.size) {
                hasMore = false;
            } else {
                offset += limit;
            }
        } catch (e) {
            console.error(`Error fetching ${entity}:`, e.message);
            hasMore = false;
        }
    }
    return { sum: totalSum, count };
}

async function verifyWeeks() {
    console.log('Verifying weeks for store:', storeId);

    let monthSales = 0;
    let monthReturns = 0;
    let monthChecks = 0;

    for (let i = 0; i < weeks.length; i++) {
        const { start, end } = weeks[i];
        console.log(`\nWeek ${i + 1}: ${start} - ${end}`);

        // Retail Demand
        const sales = await fetchTotal('retaildemand', encodeURIComponent(start), end);
        // Retail Sales Return
        const returns = await fetchTotal('retailsalesreturn', encodeURIComponent(start), end);

        const netSales = (sales.sum - returns.sum) / 100;

        console.log(`  Sales: ${(sales.sum / 100).toLocaleString('ru-RU')} (Checks: ${sales.count})`);
        console.log(`  Returns: ${(returns.sum / 100).toLocaleString('ru-RU')}`);
        console.log(`  Net Fact: ${netSales.toLocaleString('ru-RU')}`);

        monthSales += sales.sum;
        monthReturns += returns.sum;
        monthChecks += sales.count;
    }

    console.log('\n--------------------------------');
    console.log(`TOTAL MONTH (Dec 2025)`);
    console.log(`  Gross Sales: ${(monthSales / 100).toLocaleString('ru-RU')}`);
    console.log(`  Total Returns: ${(monthReturns / 100).toLocaleString('ru-RU')}`);
    console.log(`  NET FACT: ${((monthSales - monthReturns) / 100).toLocaleString('ru-RU')}`);
    console.log(`  TOTAL CHECKS: ${monthChecks}`);
}

verifyWeeks();
