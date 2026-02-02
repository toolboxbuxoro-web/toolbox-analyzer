import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function getMoyskladToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('moysklad_token');
  return token?.value;
}

export async function POST(request) {
  console.log('📥 API: Получен запрос на товары');
  
  try {
    const token = await getMoyskladToken();

    if (!token) {
      console.error('❌ API: Токен не найден');
      return NextResponse.json(
        { error: 'Токен не найден. Пожалуйста, введите токен.' },
        { status: 401 }
      );
    }

    const { warehouseIds } = await request.json();
    console.log('📋 API: Параметры запроса:', { 
      warehousesCount: warehouseIds?.length || 0 
    });

    // Получаем товары из справочника
    let productsUrl = `https://api.moysklad.ru/api/remap/1.2/entity/product`;

    // Фильтр по складам (если товары привязаны к складам через остатки)
    // В МойСклад товары не привязаны напрямую к складам, но можно фильтровать через остатки
    // Пока получаем все товары, фильтрацию по складам можно добавить позже если нужно

    const limit = 1000; // Максимальный лимит для одного запроса
    let offset = 0;
    let hasMore = true;
    const allProducts = [];
    let requestCount = 0; // Счетчик запросов для мониторинга

    // Задержка между запросами для снижения нагрузки на API
    async function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Функция для выполнения запроса с обработкой rate limit и retry
    async function fetchWithRetry(url, options, maxRetries = 3) {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await fetch(url, options);
          
          // Если rate limit (429), ждем и повторяем
          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
            console.warn(`⚠️ Rate limit достигнут, ждем ${retryAfter} секунд...`);
            await delay(retryAfter * 1000);
            continue;
          }
          
          return response;
        } catch (e) {
          if (attempt === maxRetries - 1) throw e;
          // Экспоненциальная задержка при ошибках
          const delayMs = Math.pow(2, attempt) * 1000;
          console.warn(`⚠️ Ошибка запроса, повтор через ${delayMs}мс...`);
          await delay(delayMs);
        }
      }
      return null;
    }

    while (hasMore) {
      // Правильно формируем URL с параметрами
      const url = `${productsUrl}?limit=${limit}&offset=${offset}`;
      
      // Добавляем задержку между запросами страниц (кроме первого)
      if (offset > 0) {
        await delay(500); // Увеличено до 500мс для снижения нагрузки
      }
      
      requestCount++;
      console.log(`📤 Запрос ${requestCount}: получение товаров (offset: ${offset}, limit: ${limit})`);
      console.log(`🔗 URL: ${url}`);
      
      const response = await fetchWithRetry(url, {
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
      });

      if (!response || !response.ok) {
        const errorText = response ? await response.text() : 'Нет ответа от сервера';
        console.error('❌ API: Ошибка при получении товаров:', errorText);
        return NextResponse.json(
          { error: 'Ошибка при получении товаров из МойСклад' },
          { status: response?.status || 500 }
        );
      }

      const data = await response.json();
      const products = data.rows || [];

      for (const product of products) {
        // Получаем себестоимость (buyPrice - это объект { value, currency })
        let buyPrice = 0;
        let buyPriceCurrency = null;
        if (product.buyPrice) {
          if (typeof product.buyPrice === 'object' && product.buyPrice.value !== undefined) {
            buyPrice = product.buyPrice.value || 0;
            buyPriceCurrency = product.buyPrice.currency || null;
          } else if (typeof product.buyPrice === 'number') {
            buyPrice = product.buyPrice;
          }
        }
        if (!buyPrice && product.purchasePrice) {
          if (typeof product.purchasePrice === 'object' && product.purchasePrice.value !== undefined) {
            buyPrice = product.purchasePrice.value || 0;
            buyPriceCurrency = product.purchasePrice.currency || null;
          } else if (typeof product.purchasePrice === 'number') {
            buyPrice = product.purchasePrice;
          }
        }
        
        // Получаем цену продажи (salePrices - это массив объектов)
        let salePrice = 0;
        let salePriceCurrency = null;
        if (product.salePrices && Array.isArray(product.salePrices) && product.salePrices.length > 0) {
          // Берем первую цену продажи (обычно основная цена)
          const firstSalePrice = product.salePrices[0];
          if (firstSalePrice && firstSalePrice.value !== undefined) {
            salePrice = firstSalePrice.value || 0;
            salePriceCurrency = firstSalePrice.currency || null;
          }
        } else if (product.salePrice) {
          // Fallback на salePrice, если есть
          if (typeof product.salePrice === 'object' && product.salePrice.value !== undefined) {
            salePrice = product.salePrice.value || 0;
            salePriceCurrency = product.salePrice.currency || null;
          } else if (typeof product.salePrice === 'number') {
            salePrice = product.salePrice;
          }
        }
        
        // Если валюты не получены из объектов цен, пробуем получить из других полей
        if (!buyPriceCurrency) {
          buyPriceCurrency = product.buyPriceCurrency || null;
        }
        if (!salePriceCurrency) {
          salePriceCurrency = product.salePriceCurrency || product.currency || null;
        }

        // Получаем информацию о товаре
        const productName = product.name || 'Неизвестный товар';
        const productCode = product.code || '';
        const productId = product.id || '';

        // Определяем валюту себестоимости
        let buyCurrencyCode = 'UZS';
        if (buyPriceCurrency) {
          if (typeof buyPriceCurrency === 'string') {
            const code = buyPriceCurrency.toUpperCase();
            buyCurrencyCode = (code === 'USD' || code === '840') ? 'USD' : code;
          } else if (buyPriceCurrency.code) {
            const code = String(buyPriceCurrency.code).toUpperCase();
            buyCurrencyCode = (code === 'USD' || code === '840') ? 'USD' : code;
          } else if (buyPriceCurrency.name) {
            const name = buyPriceCurrency.name.toUpperCase();
            if (name.includes('USD') || name.includes('ДОЛЛАР') || name.includes('DOLLAR')) {
              buyCurrencyCode = 'USD';
            }
          } else if (buyPriceCurrency.meta && buyPriceCurrency.meta.href) {
            // Если валюта - это объект с meta, пытаемся определить по href или используем дефолт
            const href = buyPriceCurrency.meta.href.toLowerCase();
            if (href.includes('currency') && href.includes('77d87aa9')) {
              // Это может быть UZS, но нужно проверить
              buyCurrencyCode = 'UZS';
            }
          }
        }

        // Определяем валюту цены продажи
        let saleCurrencyCode = 'UZS';
        if (salePriceCurrency) {
          if (typeof salePriceCurrency === 'string') {
            const code = salePriceCurrency.toUpperCase();
            saleCurrencyCode = (code === 'USD' || code === '840') ? 'USD' : code;
          } else if (salePriceCurrency.code) {
            const code = String(salePriceCurrency.code).toUpperCase();
            saleCurrencyCode = (code === 'USD' || code === '840') ? 'USD' : code;
          } else if (salePriceCurrency.name) {
            const name = salePriceCurrency.name.toUpperCase();
            if (name.includes('USD') || name.includes('ДОЛЛАР') || name.includes('DOLLAR')) {
              saleCurrencyCode = 'USD';
            }
          } else if (salePriceCurrency.meta && salePriceCurrency.meta.href) {
            // Если валюта - это объект с meta, пытаемся определить по href
            const href = salePriceCurrency.meta.href.toLowerCase();
            if (href.includes('currency') && href.includes('77d87aa9')) {
              saleCurrencyCode = 'UZS';
            }
          }
        }

        // Логирование для отладки валют (только для первых товаров)
        if (allProducts.length < 5) {
          console.log('🔍 Отладка валют товара:', {
            product: productName,
            buyPrice,
            buyPriceCurrency,
            buyCurrencyCode,
            salePrice,
            salePriceCurrency,
            saleCurrencyCode
          });
        }

        allProducts.push({
          id: productId,
          productName,
          productCode,
          buyPrice: buyPrice / 100, // Конвертируем из копеек
          salePrice: salePrice / 100, // Конвертируем из копеек
          buyPriceCurrency: (buyPriceCurrency && typeof buyPriceCurrency === 'object' && buyPriceCurrency.name) 
            ? buyPriceCurrency.name 
            : (typeof buyPriceCurrency === 'string' ? buyPriceCurrency : 'UZS'),
          salePriceCurrency: (salePriceCurrency && typeof salePriceCurrency === 'object' && salePriceCurrency.name) 
            ? salePriceCurrency.name 
            : (typeof salePriceCurrency === 'string' ? salePriceCurrency : 'UZS'),
          buyCurrencyCode,
          saleCurrencyCode,
        });
      }

      const fetchedCount = products.length;
      console.log(`📥 Получено ${fetchedCount} товаров на странице ${requestCount}`);
      
      if (fetchedCount < limit || offset + fetchedCount >= (data.meta?.size || 0)) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    console.log(`✅ API: Успешно получено товаров: ${allProducts.length} (запросов: ${requestCount})`);
    
    return NextResponse.json({
      products: allProducts,
      total: allProducts.length,
    });
  } catch (error) {
    console.error('❌ API: Ошибка при получении товаров:', error);
    return NextResponse.json(
      { error: `Ошибка при получении товаров: ${error.message}` },
      { status: 500 }
    );
  }
}
