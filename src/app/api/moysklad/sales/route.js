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

    // Получаем данные о прибыльности
    // ВАЖНО: Для отчета о прибыльности используем retailStore (розничная точка), а не store
    let profitUrl = `https://api.moysklad.ru/api/remap/1.2/report/profit/byproduct?momentFrom=${encodeURIComponent(momentFrom)}&momentTo=${encodeURIComponent(momentTo)}`;

    // Если указаны склады, добавляем фильтр через retailStore с полным URL
    if (warehouseIds && warehouseIds.length > 0) {
      // Для отчета о прибыльности используем retailStore с полным href
      const storeFilters = warehouseIds
        .map(id => `retailStore=https://api.moysklad.ru/api/remap/1.2/entity/retailstore/${id}`)
        .join(';');
      profitUrl += `&filter=${encodeURIComponent(storeFilters)}`;
    }

    const profitResponse = await fetch(profitUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!profitResponse.ok) {
      const errorText = await profitResponse.text();
      console.error('Ошибка API Мой склад (прибыльность):', errorText);
      // Не прерываем выполнение - пробуем получить данные из retailsales
    }

    let profitData = { rows: [] };
    if (profitResponse.ok) {
      profitData = await profitResponse.json();
    }

    // --------------------------------------------------------------------------------
    // 1. ПОЛУЧЕНИЕ ПРОДАЖ (РОЗНИЦА + ОТГРУЗКИ/ОПТ)
    // --------------------------------------------------------------------------------

    let totalSales = 0;
    let checkCount = 0; // Общее количество документов продажи
    const limit = 1000;

    // A. Розничные продажи (retaildemand)
    let retailSalesUrl = `https://api.moysklad.ru/api/remap/1.2/entity/retaildemand?filter=moment>=${encodeURIComponent(momentFrom)};moment<=${encodeURIComponent(momentTo)}`;

    if (warehouseIds && warehouseIds.length > 0) {
      const storeFilters = warehouseIds
        .map(id => `store=https://api.moysklad.ru/api/remap/1.2/entity/store/${id}`)
        .join(';');
      retailSalesUrl += `;${storeFilters}`;
    }

    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const url = `${retailSalesUrl}&limit=${limit}&offset=${offset}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        if (offset === 0) checkCount += (data.meta?.size || 0);

        const pageSum = data.rows?.reduce((sum, item) => sum + (parseFloat(item.sum) || 0), 0) || 0;
        totalSales += pageSum;

        const fetchedCount = data.rows?.length || 0;
        if (fetchedCount < limit || offset + fetchedCount >= (data.meta?.size || 0)) {
          hasMore = false;
        } else {
          offset += limit;
        }
      } else {
        hasMore = false;
        console.error('Ошибка при получении retaildemand');
      }
    }

    // (Блок получения отгрузок/опта удален для соответствия розничным данным)

    totalSales = totalSales / 100; // Конвертируем из копеек в рубли/сумы

    // --------------------------------------------------------------------------------
    // 2. ПОЛУЧЕНИЕ ВОЗВРАТОВ (РОЗНИЦА + ОПТ)
    // --------------------------------------------------------------------------------

    let totalReturns = 0;
    let returnsCount = 0; // Общее количество документов возврата

    // C. Розничные возвраты (retailsalesreturn)
    let retailReturnsUrl = `https://api.moysklad.ru/api/remap/1.2/entity/retailsalesreturn?filter=moment>=${encodeURIComponent(momentFrom)};moment<=${encodeURIComponent(momentTo)}`;

    if (warehouseIds && warehouseIds.length > 0) {
      const storeFilters = warehouseIds
        .map(id => `store=https://api.moysklad.ru/api/remap/1.2/entity/store/${id}`)
        .join(';');
      retailReturnsUrl += `;${storeFilters}`;
    }

    offset = 0;
    hasMore = true;

    while (hasMore) {
      const url = `${retailReturnsUrl}&limit=${limit}&offset=${offset}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        if (offset === 0) returnsCount += (data.meta?.size || 0);

        const pageSum = data.rows?.reduce((sum, item) => sum + (parseFloat(item.sum) || 0), 0) || 0;
        totalReturns += pageSum;

        const fetchedCount = data.rows?.length || 0;
        if (fetchedCount < limit || offset + fetchedCount >= (data.meta?.size || 0)) {
          hasMore = false;
        } else {
          offset += limit;
        }
      } else {
        hasMore = false;
        console.error('Ошибка при получении retailsalesreturn');
      }
    }

    // (Блок получения оптовых возвратов удален для соответствия розничным данным)

    totalReturns = totalReturns / 100; // Конвертируем из копеек

    console.log(`Продажи: ${totalSales}, Возвраты: ${totalReturns}, Чистые продажи: ${totalSales - totalReturns}`);

    // Рассчитываем метрики из данных о прибыльности
    // В отчете о прибыльности может быть поле sellPrice (цена продажи) или quantity * price
    const totalProfit = profitData.rows?.reduce((sum, item) => {
      // Пробуем разные поля для суммы продаж
      const sellPrice = parseFloat(item.sellPrice) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      const revenue = sellPrice || (quantity * price);
      return sum + revenue;
    }, 0) || 0;

    // Используем totalSales если он больше, иначе totalProfit
    // totalSales берется из документов розничных продаж (более точные данные)
    const grossSales = totalSales > 0 ? totalSales : totalProfit;

    // Вычитаем возвраты из продаж
    const actualSales = grossSales - totalReturns;

    return NextResponse.json({
      actual: actualSales,
      grossSales: grossSales,       // Продажи без учета возвратов
      returns: totalReturns,        // Сумма возвратов
      returnsCount: returnsCount,   // Количество возвратов
      checkCount: checkCount,
      averageCheck: checkCount > 0 ? actualSales / checkCount : 0,
      visitors: 0, // Пока не доступно из API, можно добавить позже
    });
  } catch (error) {
    console.error('Ошибка при получении данных о продажах:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении данных о продажах' },
      { status: 500 }
    );
  }
}
