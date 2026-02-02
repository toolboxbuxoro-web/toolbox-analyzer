import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function getMoyskladToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('moysklad_token');
  return token?.value;
}

// Функция для преобразования даты из формата DD.MM.YY в формат для API
function formatDateForAPI(dateString, isEndOfDay = false) {
  // Формат: DD.MM.YY -> YYYY-MM-DD HH:MM:SS
  if (!dateString) return '';
  const [day, month, year] = dateString.split('.');
  if (!day || !month || !year) return '';
  const fullYear = `20${year}`;
  const time = isEndOfDay ? '23:59:59' : '00:00:00';
  return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${time}`;
}

export async function POST(request) {
  try {
    const token = await getMoyskladToken();

    if (!token) {
      return NextResponse.json(
        { error: 'Токен не найден. Пожалуйста, введите токен.' },
        { status: 401 }
      );
    }

    const { dateFrom, dateTo, warehouseIds } = await request.json();

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: 'Необходимо указать даты начала и конца периода' },
        { status: 400 }
      );
    }

    const momentFrom = formatDateForAPI(dateFrom, false);
    const momentTo = formatDateForAPI(dateTo, true);

    if (!momentFrom || !momentTo) {
      return NextResponse.json(
        { error: 'Неверный формат даты. Используйте формат DD.MM.YY' },
        { status: 400 }
      );
    }

    // --------------------------------------------------------------------------------
    // 1. ПОЛУЧЕНИЕ ДАННЫХ ИЗ ОТЧЕТА ПО ПРИБЫЛЬНОСТИ
    // --------------------------------------------------------------------------------
    // Мы используем этот отчет как основной источник сумм, так как он агрегирует продажи и возвраты

    let totalSellSum = 0;   // Сумма продаж (в копейках)
    let totalReturnSum = 0; // Сумма возвратов (в копейках)
    const limit = 1000;

    // Формируем базовый URL для отчета
    let profitUrl = `https://api.moysklad.ru/api/remap/1.2/report/profit/byproduct?momentFrom=${encodeURIComponent(momentFrom)}&momentTo=${encodeURIComponent(momentTo)}`;

    // Фильтр по складам (store)
    if (warehouseIds && warehouseIds.length > 0) {
      const storeFilters = warehouseIds
        .map(id => `store=https://api.moysklad.ru/api/remap/1.2/entity/store/${id}`)
        .join(';');
      profitUrl += `&filter=${encodeURIComponent(storeFilters)}`;
    }

    // Пагинация для отчета
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const url = `${profitUrl}&limit=${limit}&offset=${offset}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();

        // Суммируем продажи и возвраты из строк отчета
        if (data.rows && Array.isArray(data.rows)) {
          data.rows.forEach(row => {
            totalSellSum += (row.sellSum || 0);
            totalReturnSum += (row.returnSum || 0);
          });
        }

        const fetchedCount = data.rows?.length || 0;
        if (fetchedCount < limit || offset + fetchedCount >= (data.meta?.size || 0)) {
          hasMore = false;
        } else {
          offset += limit;
        }
      } else {
        console.error('Ошибка при получении отчета по прибыльности:', response.status);
        // Если отчет недоступен, мы не можем гарантировать точность данных
        // Но продолжаем выполнение, чтобы попытаться получить хотя бы кол-во чеков
        hasMore = false;
      }
    }

    const grossSales = totalSellSum / 100;
    const totalReturns = totalReturnSum / 100;
    const actualSales = grossSales - totalReturns;

    console.log(`Profit Report -> SellSum: ${grossSales}, ReturnSum: ${totalReturns}, Net: ${actualSales}`);

    // --------------------------------------------------------------------------------
    // 2. ПОЛУЧЕНИЕ КОЛИЧЕСТВА ЧЕКОВ (retaildemand)
    // --------------------------------------------------------------------------------

    let checkCount = 0;
    let retailSalesUrl = `https://api.moysklad.ru/api/remap/1.2/entity/retaildemand?filter=moment>=${encodeURIComponent(momentFrom)};moment<=${encodeURIComponent(momentTo)}`;

    if (warehouseIds && warehouseIds.length > 0) {
      const storeFilters = warehouseIds
        .map(id => `store=https://api.moysklad.ru/api/remap/1.2/entity/store/${id}`)
        .join(';');
      retailSalesUrl += `;${storeFilters}`;
    }

    // Нам нужно только количество, поэтому делаем один запрос с limit=1 если нужно было бы просто count,
    // но API МойСклад отдает meta.size, который показывает общее кол-во.
    // Достаточно одного запроса
    try {
      const response = await fetch(`${retailSalesUrl}&limit=1`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        checkCount = data.meta?.size || 0;
      }
    } catch (e) {
      console.error('Ошибка при получении checkCount', e);
    }

    // --------------------------------------------------------------------------------
    // 3. ПОЛУЧЕНИЕ КОЛИЧЕСТВА ВОЗВРАТОВ (retailsalesreturn)
    // --------------------------------------------------------------------------------

    let returnsCount = 0;
    let retailReturnsUrl = `https://api.moysklad.ru/api/remap/1.2/entity/retailsalesreturn?filter=moment>=${encodeURIComponent(momentFrom)};moment<=${encodeURIComponent(momentTo)}`;

    if (warehouseIds && warehouseIds.length > 0) {
      const storeFilters = warehouseIds
        .map(id => `store=https://api.moysklad.ru/api/remap/1.2/entity/store/${id}`)
        .join(';');
      retailReturnsUrl += `;${storeFilters}`;
    }

    try {
      const response = await fetch(`${retailReturnsUrl}&limit=1`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        returnsCount = data.meta?.size || 0;
      }
    } catch (e) {
      console.error('Ошибка при получении returnsCount', e);
    }

    return NextResponse.json({
      actual: actualSales,
      grossSales: grossSales,       // Продажи без учета возвратов
      returns: totalReturns,        // Сумма возвратов
      returnsCount: returnsCount,   // Количество возвратов
      checkCount: checkCount,
      averageCheck: checkCount > 0 ? actualSales / checkCount : 0,
      visitors: 0,
    });
  } catch (error) {
    console.error('Ошибка при получении данных о продажах:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении данных о продажах' },
      { status: 500 }
    );
  }
}
