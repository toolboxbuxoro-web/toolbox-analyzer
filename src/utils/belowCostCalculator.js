/**
 * Утилита для расчета продаж ниже себестоимости
 */

/**
 * Конвертирует закупочную цену в UZS
 * @param {number} purchasePrice - Закупочная цена
 * @param {string} currencyCode - Код валюты (USD, UZS и т.д.)
 * @param {number} usdRate - Курс USD к UZS
 * @returns {number} Цена в UZS
 */
export function convertToUZS(purchasePrice, currencyCode, usdRate) {
  if (!purchasePrice || purchasePrice <= 0) return 0;
  
  const normalizedCurrency = String(currencyCode || 'UZS').toUpperCase().trim();
  
  // Если валюта USD - конвертируем в UZS
  if (normalizedCurrency === 'USD' || 
      normalizedCurrency === '840' || 
      normalizedCurrency === 'US DOLLAR' ||
      normalizedCurrency.includes('USD') ||
      normalizedCurrency.includes('ДОЛЛАР')) {
    if (!usdRate || usdRate <= 0) {
      console.warn('⚠️ Курс USD не указан, но цена в USD. Невозможно конвертировать.');
      return 0; // Возвращаем 0, чтобы товар не попал в результаты
    }
    return purchasePrice * usdRate;
  }
  
  // Если уже в UZS или другой валюте (не USD), возвращаем как есть
  return purchasePrice;
}

/**
 * Проверяет, продана ли позиция ниже себестоимости
 * @param {Object} position - Позиция продажи
 * @param {number} usdRate - Курс USD к UZS
 * @returns {Object} Результат проверки
 */
export function checkBelowCost(position, usdRate) {
  const purchasePriceUZS = convertToUZS(
    position.purchasePrice,
    position.currencyCode,
    usdRate
  );
  
  const salePriceUZS = position.salePriceWithDiscount || position.salePrice;
  
  const isBelowCost = salePriceUZS < purchasePriceUZS;
  const loss = isBelowCost ? purchasePriceUZS - salePriceUZS : 0;
  const lossTotal = loss * position.quantity;
  
  return {
    ...position,
    purchasePriceUZS,
    salePriceUZS,
    isBelowCost,
    loss,
    lossTotal,
  };
}

/**
 * Фильтрует позиции, проданные ниже себестоимости
 * @param {Array} positions - Массив позиций продаж
 * @param {number} usdRate - Курс USD к UZS
 * @returns {Array} Отфильтрованные позиции
 */
export function filterBelowCost(positions, usdRate) {
  return positions
    .filter(pos => pos.purchasePrice && pos.purchasePrice > 0) // Исключаем позиции без себестоимости
    .map(pos => checkBelowCost(pos, usdRate))
    .filter(pos => pos.isBelowCost && pos.purchasePriceUZS > 0); // Дополнительная проверка
}

/**
 * Рассчитывает сводку по продажам ниже себестоимости
 * @param {Array} belowCostPositions - Позиции ниже себестоимости
 * @returns {Object} Сводка
 */
export function calculateSummary(belowCostPositions) {
  const totalPositions = belowCostPositions.length;
  const totalLoss = belowCostPositions.reduce((sum, pos) => sum + pos.lossTotal, 0);
  const totalQuantity = belowCostPositions.reduce((sum, pos) => sum + pos.quantity, 0);
  
  return {
    totalPositions,
    totalLoss,
    totalQuantity,
  };
}

/**
 * Группирует позиции по товарам и агрегирует данные
 * @param {Array} positions - Массив позиций продаж
 * @param {number} usdRate - Курс USD к UZS
 * @returns {Array} Агрегированные данные по товарам
 */
export function groupByProduct(positions, usdRate) {
  const productMap = new Map();

  positions.forEach(pos => {
    const checked = checkBelowCost(pos, usdRate);
    const productId = pos.productId || pos.productCode || pos.id;
    const productName = pos.productName || 'Неизвестный товар';
    const productCode = pos.productCode || '';

    if (!productMap.has(productId)) {
      productMap.set(productId, {
        productId,
        productName,
        productCode,
        totalQuantity: 0,
        totalSales: 0,
        totalCost: 0,
        belowCostQuantity: 0,
        belowCostSales: 0,
        belowCostLoss: 0,
        hasBelowCost: false,
        minSalePrice: Infinity,
        maxSalePrice: 0,
        avgSalePrice: 0,
        purchasePriceUZS: checked.purchasePriceUZS,
        currencyCode: pos.currencyCode || 'UZS',
        positions: [],
      });
    }

    const product = productMap.get(productId);
    product.totalQuantity += pos.quantity;
    product.totalSales += pos.salePriceWithDiscount * pos.quantity;
    product.totalCost += checked.purchasePriceUZS * pos.quantity;
    product.minSalePrice = Math.min(product.minSalePrice, checked.salePriceUZS);
    product.maxSalePrice = Math.max(product.maxSalePrice, checked.salePriceUZS);
    product.positions.push(checked);

    if (checked.isBelowCost) {
      product.hasBelowCost = true;
      product.belowCostQuantity += pos.quantity;
      product.belowCostSales += checked.salePriceUZS * pos.quantity;
      product.belowCostLoss += checked.lossTotal;
    }
  });

  // Рассчитываем средние значения и преобразуем в массив
  const result = Array.from(productMap.values()).map(product => {
    product.avgSalePrice = product.totalQuantity > 0 
      ? product.totalSales / product.totalQuantity 
      : 0;
    return product;
  });

  return result;
}

/**
 * Фильтрует товары, которые продавались ниже себестоимости
 * @param {Array} products - Агрегированные данные по товарам
 * @returns {Array} Товары, которые продавались ниже себестоимости
 */
export function filterProductsBelowCost(products) {
  return products.filter(product => product.hasBelowCost);
}

/**
 * Проверяет, ниже ли цена продажи товара его себестоимости
 * @param {Object} product - Товар из справочника
 * @param {number} usdRate - Курс USD к UZS
 * @returns {Object} Результат проверки
 */
export function checkProductBelowCost(product, usdRate) {
  // Конвертируем себестоимость в UZS
  // Себестоимость может быть в USD или UZS
  const buyPriceUZS = convertToUZS(
    product.buyPrice,
    product.buyCurrencyCode,
    usdRate
  );

  // Цена продажи обычно в UZS, но на всякий случай тоже конвертируем
  const salePriceUZS = convertToUZS(
    product.salePrice,
    product.saleCurrencyCode,
    usdRate
  );

  // Логирование для отладки (только для первых 10 товаров)
  const shouldLog = product.productName && (
    product.buyCurrencyCode === 'USD' || 
    product.saleCurrencyCode === 'USD' ||
    Math.random() < 0.02
  );

  if (shouldLog) {
    console.log('🔍 Конвертация валют:', {
      товар: product.productName,
      себестоимость: `${product.buyPrice} ${product.buyCurrencyCode}`,
      себестоимость_UZS: buyPriceUZS,
      цена_продажи: `${product.salePrice} ${product.saleCurrencyCode}`,
      цена_продажи_UZS: salePriceUZS,
      курс_USD: usdRate,
      ниже_себестоимости: salePriceUZS < buyPriceUZS
    });
  }

  // Проверяем, ниже ли цена продажи себестоимости
  // Обе цены уже в UZS после конвертации
  const isBelowCost = salePriceUZS > 0 && buyPriceUZS > 0 && salePriceUZS < buyPriceUZS;
  const loss = isBelowCost ? buyPriceUZS - salePriceUZS : 0;

  return {
    ...product,
    buyPriceUZS,
    salePriceUZS,
    isBelowCost,
    loss,
  };
}

/**
 * Фильтрует товары, у которых цена продажи ниже себестоимости
 * @param {Array} products - Массив товаров из справочника
 * @param {number} usdRate - Курс USD к UZS
 * @returns {Array} Товары, у которых цена продажи < себестоимости
 */
export function filterProductsWithBelowCostPrice(products, usdRate) {
  return products
    .filter(product => product.buyPrice && product.buyPrice > 0 && product.salePrice && product.salePrice > 0)
    .map(product => checkProductBelowCost(product, usdRate))
    .filter(product => product.isBelowCost);
}

/**
 * Рассчитывает сводку по товарам с ценой продажи ниже себестоимости
 * @param {Array} belowCostProducts - Товары с ценой продажи ниже себестоимости
 * @returns {Object} Сводка
 */
export function calculateProductsSummary(belowCostProducts) {
  const totalProducts = belowCostProducts.length;
  const totalLoss = belowCostProducts.reduce((sum, product) => sum + product.loss, 0);
  
  return {
    totalProducts,
    totalLoss,
  };
}

/**
 * Рассчитывает наценку товара в процентах
 * @param {Object} product - Товар с ценами в UZS
 * @returns {Object} Товар с рассчитанной наценкой
 */
export function calculateMargin(product) {
  const { buyPriceUZS, salePriceUZS } = product;
  
  if (!buyPriceUZS || buyPriceUZS <= 0) {
    return {
      ...product,
      margin: 0,
      marginPercent: 0,
    };
  }
  
  const margin = salePriceUZS - buyPriceUZS;
  const marginPercent = (margin / buyPriceUZS) * 100;
  
  return {
    ...product,
    margin,
    marginPercent,
  };
}

/**
 * Фильтрует товары с наценкой меньше указанного процента
 * @param {Array} products - Массив товаров из справочника
 * @param {number} usdRate - Курс USD к UZS
 * @param {number} minMarginPercent - Минимальная наценка в процентах (по умолчанию 10)
 * @returns {Array} Товары с наценкой меньше указанного процента
 */
export function filterProductsWithLowMargin(products, usdRate, minMarginPercent = 10) {
  console.log('🔍 filterProductsWithLowMargin: начало', {
    всего_товаров: products.length,
    курс: usdRate,
    порог_наценки: minMarginPercent
  });

  // Сначала проверим, сколько товаров имеют обе цены
  const withBothPrices = products.filter(p => p.buyPrice && p.buyPrice > 0 && p.salePrice && p.salePrice > 0);
  console.log('📦 Товаров с обеими ценами:', withBothPrices.length);
  
  if (withBothPrices.length > 0 && withBothPrices.length <= 10) {
    console.log('📋 Примеры товаров с ценами:', withBothPrices.map(p => ({
      название: p.productName,
      себестоимость: p.buyPrice,
      валюта_себестоимости: p.buyCurrencyCode,
      цена_продажи: p.salePrice,
      валюта_продажи: p.saleCurrencyCode
    })));
  }

  let logCount = 0;
  const filtered = products
    .filter(product => {
      const hasPrices = product.buyPrice && product.buyPrice > 0 && product.salePrice && product.salePrice > 0;
      return hasPrices;
    })
    .map(product => {
      // Используем существующую функцию для конвертации валют
      const checked = checkProductBelowCost(product, usdRate);
      // Рассчитываем наценку
      const withMargin = calculateMargin(checked);
      
      return withMargin;
    })
    .filter(product => {
      // Фильтруем товары с наценкой меньше указанного процента
      // Исключаем товары с отрицательной наценкой (они уже в разделе "ниже себестоимости")
      const passes = product.marginPercent >= 0 && product.marginPercent < minMarginPercent;
      
      // Логируем первые 10 товаров с расчетами
      if (logCount < 10) {
        console.log('📊 Расчет наценки:', {
          название: product.productName,
          себестоимость_UZS: product.buyPriceUZS,
          цена_продажи_UZS: product.salePriceUZS,
          наценка_UZS: product.margin,
          наценка_процент: product.marginPercent?.toFixed(2) + '%',
          порог: minMarginPercent + '%',
          проходит: passes ? '✅ ДА' : '❌ НЕТ'
        });
        logCount++;
      }
      
      return passes;
    });

  console.log('✅ filterProductsWithLowMargin: результат', {
    найдено_товаров: filtered.length,
    порог: minMarginPercent + '%',
    всего_обработано: products.length,
    с_обеими_ценами: withBothPrices.length
  });

  // Если ничего не найдено, покажем примеры товаров с их наценками
  if (filtered.length === 0 && withBothPrices.length > 0) {
    const examples = withBothPrices.slice(0, 5).map(p => {
      const checked = checkProductBelowCost(p, usdRate);
      const withMargin = calculateMargin(checked);
      return {
        название: p.productName,
        себестоимость: checked.buyPriceUZS,
        цена_продажи: checked.salePriceUZS,
        наценка_процент: withMargin.marginPercent?.toFixed(2) + '%',
        почему_не_прошел: withMargin.marginPercent >= minMarginPercent 
          ? `Наценка ${withMargin.marginPercent.toFixed(2)}% >= порога ${minMarginPercent}%`
          : withMargin.marginPercent < 0 
            ? 'Отрицательная наценка (ниже себестоимости)'
            : 'Неизвестная причина'
      };
    });
    console.log('💡 Примеры товаров и почему они не прошли фильтр:', examples);
  }

  return filtered;
}

/**
 * Рассчитывает сводку по товарам с низкой наценкой
 * @param {Array} lowMarginProducts - Товары с низкой наценкой
 * @returns {Object} Сводка
 */
export function calculateLowMarginSummary(lowMarginProducts) {
  const totalProducts = lowMarginProducts.length;
  const avgMarginPercent = lowMarginProducts.length > 0
    ? lowMarginProducts.reduce((sum, product) => sum + product.marginPercent, 0) / lowMarginProducts.length
    : 0;
  const totalMargin = lowMarginProducts.reduce((sum, product) => sum + product.margin, 0);
  
  return {
    totalProducts,
    avgMarginPercent,
    totalMargin,
  };
}

/**
 * Форматирует число с разделителями тысяч
 * @param {number} num - Число для форматирования
 * @returns {string} Отформатированное число
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Форматирует дату из формата API в читаемый формат
 * @param {string} dateString - Дата в формате API
 * @returns {string} Отформатированная дата
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}.${month}.${year}`;
  } catch {
    return dateString;
  }
}
