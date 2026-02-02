import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function getMoyskladToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('moysklad_token');
  return token?.value;
}

// Функция для преобразования даты из формата DD.MM.YY в формат для API
function formatDateForAPI(dateString, isEndOfDay = false) {
  if (!dateString) return '';
  const [day, month, year] = dateString.split('.');
  if (!day || !month || !year) return '';
  const fullYear = `20${year}`;
  const time = isEndOfDay ? '23:59:59' : '00:00:00';
  return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${time}`;
}

export async function POST(request) {
  console.log('📥 API: Получен запрос на позиции продаж');
  
  try {
    const token = await getMoyskladToken();

    if (!token) {
      console.error('❌ API: Токен не найден');
      return NextResponse.json(
        { error: 'Токен не найден. Пожалуйста, введите токен.' },
        { status: 401 }
      );
    }

    const { dateFrom, dateTo, warehouseIds } = await request.json();
    console.log('📋 API: Параметры запроса:', { 
      hasDates: !!(dateFrom && dateTo), 
      warehousesCount: warehouseIds?.length || 0 
    });

    // Получаем документы розничных продаж с позициями через expand
    // Это оптимизирует запросы - получаем позиции вместе с документами
    let retailSalesUrl = `https://api.moysklad.ru/api/remap/1.2/entity/retaildemand?expand=positions`;

    // Фильтр по датам опционален
    if (dateFrom && dateTo) {
      const momentFrom = formatDateForAPI(dateFrom, false);
      const momentTo = formatDateForAPI(dateTo, true);
      if (momentFrom && momentTo) {
        retailSalesUrl += `&filter=moment>=${encodeURIComponent(momentFrom)};moment<=${encodeURIComponent(momentTo)}`;
      }
    }

    // Фильтр по складам
    if (warehouseIds && warehouseIds.length > 0) {
      const storeFilters = warehouseIds
        .map(id => `store=https://api.moysklad.ru/api/remap/1.2/entity/store/${id}`)
        .join(';');
      retailSalesUrl += retailSalesUrl.includes('filter=') ? `;${storeFilters}` : `&filter=${storeFilters}`;
    }

    const limit = 100; // Уменьшаем лимит, т.к. с expand данные больше
    let offset = 0;
    let hasMore = true;
    const allPositions = [];
    const productCache = new Map(); // Кэш для данных товаров

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
            console.warn(`Rate limit достигнут, ждем ${retryAfter} секунд...`);
            await delay(retryAfter * 1000);
            continue;
          }
          
          return response;
        } catch (e) {
          if (attempt === maxRetries - 1) throw e;
          // Экспоненциальная задержка при ошибках
          await delay(Math.pow(2, attempt) * 1000);
        }
      }
      return null;
    }

    // Функция для получения данных товара с кэшированием
    async function getProductData(productHref, token) {
      if (productCache.has(productHref)) {
        return productCache.get(productHref);
      }

      try {
        const productResponse = await fetchWithRetry(productHref, {
          headers: { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json' 
          },
        });
        
        if (productResponse && productResponse.ok) {
          const productData = await productResponse.json();
          productCache.set(productHref, productData);
          return productData;
        }
      } catch (e) {
        console.warn('Не удалось получить данные товара:', e);
      }
      return null;
    }

    // Функция для батч-загрузки товаров с rate limiting
    async function loadProductsBatch(productHrefs, token) {
      // Уменьшаем размер батча для снижения нагрузки
      const batchSize = 5; // Было 10, уменьшили для снижения нагрузки
      const delayBetweenBatches = 200; // Задержка 200мс между батчами
      const results = new Map();

      for (let i = 0; i < productHrefs.length; i += batchSize) {
        const batch = productHrefs.slice(i, i + batchSize);
        
        // Загружаем батч с небольшой задержкой между запросами
        const promises = batch.map(async (href, index) => {
          if (index > 0) {
            await delay(100); // 100мс между запросами в батче
          }
          return getProductData(href, token);
        });
        
        const batchResults = await Promise.all(promises);
        
        batch.forEach((href, index) => {
          if (batchResults[index]) {
            results.set(href, batchResults[index]);
          }
        });

        // Задержка между батчами
        if (i + batchSize < productHrefs.length) {
          await delay(delayBetweenBatches);
        }
      }

      return results;
    }

    while (hasMore) {
      const url = `${retailSalesUrl}&limit=${limit}&offset=${offset}`;
      
      // Добавляем задержку между запросами страниц
      if (offset > 0) {
        await delay(300); // 300мс между страницами
      }
      
      const response = await fetchWithRetry(url, {
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
      });

      if (!response || !response.ok) {
        const errorText = response ? await response.text() : 'Нет ответа от сервера';
        console.error('Ошибка API Мой склад (документы продаж):', errorText);
        return NextResponse.json(
          { error: 'Ошибка при получении данных о продажах' },
          { status: response?.status || 500 }
        );
      }

      const data = await response.json();
      const documents = data.rows || [];

      // Проверяем, работает ли expand (если позиций нет в документе, загружаем отдельно)
      const useExpand = documents.length > 0 && documents[0].positions !== undefined;

      let positionsToProcess = [];

      if (useExpand) {
        // Используем позиции из expand
        for (const doc of documents) {
          const saleDate = doc.moment || doc.created;
          const documentName = doc.name || '';
          const documentNumber = doc.number || '';
          const documentId = doc.id;
          const positions = doc.positions?.rows || [];

          for (const position of positions) {
            positionsToProcess.push({
              position,
              documentId,
              documentName,
              documentNumber,
              saleDate,
            });
          }
        }
      } else {
        // Fallback: загружаем позиции параллельно батчами с rate limiting
        const batchSize = 10; // Уменьшили с 20 до 10 для снижения нагрузки
        const delayBetweenBatches = 300; // 300мс между батчами

        for (let i = 0; i < documents.length; i += batchSize) {
          const batch = documents.slice(i, i + batchSize);
          
          const positionPromises = batch.map(async (doc, index) => {
            const documentId = doc.id;
            
            // Задержка между запросами в батче
            if (index > 0) {
              await delay(150); // 150мс между запросами
            }
            
            try {
              const positionsUrl = `https://api.moysklad.ru/api/remap/1.2/entity/retaildemand/${documentId}/positions`;
              const positionsResponse = await fetchWithRetry(positionsUrl, {
                headers: { 
                  'Authorization': `Bearer ${token}`, 
                  'Content-Type': 'application/json' 
                },
              });

              if (positionsResponse && positionsResponse.ok) {
                const positionsData = await positionsResponse.json();
                const positions = positionsData.rows || [];
                const saleDate = doc.moment || doc.created;
                const documentName = doc.name || '';
                const documentNumber = doc.number || '';

                return positions.map(position => ({
                  position,
                  documentId,
                  documentName,
                  documentNumber,
                  saleDate,
                }));
              }
            } catch (e) {
              console.warn(`Ошибка при получении позиций документа ${documentId}:`, e);
            }
            return [];
          });

          const batchResults = await Promise.all(positionPromises);
          positionsToProcess.push(...batchResults.flat());

          // Задержка между батчами
          if (i + batchSize < documents.length) {
            await delay(delayBetweenBatches);
          }
        }
      }

      // Собираем все товары, которым нужны данные
      const productsToLoad = new Set();
      for (const { position } of positionsToProcess) {
        let purchasePrice = position.purchasePrice || 0;
        if (!purchasePrice && position.assortment) {
          const productHref = position.assortment.meta?.href || position.assortment.href;
          if (productHref && !productCache.has(productHref)) {
            productsToLoad.add(productHref);
          }
        }
      }

      // Загружаем данные товаров батчами
      if (productsToLoad.size > 0) {
        await loadProductsBatch(Array.from(productsToLoad), token);
      }

      // Обрабатываем позиции с использованием кэша
      for (const { position, documentId, documentName, documentNumber, saleDate } of positionsToProcess) {
        let purchasePrice = position.purchasePrice || 0;
        let purchasePriceCurrency = position.purchasePriceCurrency || null;

        // Если закупочной цены нет, берем из кэша товара
        if (!purchasePrice && position.assortment) {
          const productHref = position.assortment.meta?.href || position.assortment.href;
          if (productHref) {
            const productData = productCache.get(productHref);
            if (productData) {
              purchasePrice = productData.buyPrice || productData.purchasePrice || purchasePrice;
              purchasePriceCurrency = productData.buyPriceCurrency || purchasePriceCurrency;
            }
          }
        }

        // Получаем цену продажи позиции
        const salePrice = position.price || 0;
        const quantity = position.quantity || 0;
        const discount = position.discount || 0;

        // Рассчитываем цену продажи с учетом скидки
        const salePriceWithDiscount = salePrice * (1 - discount / 100);

        // Получаем информацию о товаре
        const product = position.assortment || {};
        const productName = product.name || 'Неизвестный товар';
        const productCode = product.code || '';

        // Определяем валюту закупочной цены
        let currencyCode = 'UZS';
        if (purchasePriceCurrency) {
          if (typeof purchasePriceCurrency === 'string') {
            currencyCode = purchasePriceCurrency;
          } else if (purchasePriceCurrency.code) {
            currencyCode = purchasePriceCurrency.code;
          } else if (purchasePriceCurrency.name) {
            const name = purchasePriceCurrency.name.toUpperCase();
            if (name.includes('USD') || name.includes('ДОЛЛАР')) {
              currencyCode = 'USD';
            }
          }
        }

        allPositions.push({
          id: position.id,
          documentId,
          documentName,
          documentNumber,
          saleDate,
          productId: product.id || '',
          productName,
          productCode,
          quantity,
          salePrice: salePrice / 100, // Конвертируем из копеек
          salePriceWithDiscount: salePriceWithDiscount / 100,
          discount,
          purchasePrice: purchasePrice / 100, // Конвертируем из копеек
          purchasePriceCurrency: purchasePriceCurrency?.name || 'UZS',
          currencyCode,
        });
      }

      const fetchedCount = documents.length;
      if (fetchedCount < limit || offset + fetchedCount >= (data.meta?.size || 0)) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    console.log('✅ API: Успешно получено позиций:', allPositions.length);
    
    return NextResponse.json({
      positions: allPositions,
      total: allPositions.length,
    });
  } catch (error) {
    console.error('❌ API: Ошибка при получении позиций продаж:', error);
    return NextResponse.json(
      { error: `Ошибка при получении позиций продаж: ${error.message}` },
      { status: 500 }
    );
  }
}
