/**
 * Проверка всех полей товара из API МойСклад
 */

const API_TOKEN = 'd3150a2c7dcf1ab7280f02f24e3b2822b0fc3bc4';
const API_URL = 'https://api.moysklad.ru/api/remap/1.2/entity/product';

async function checkProductFields() {
  console.log('🔍 Проверка полей товара из API МойСклад\n');
  console.log('='.repeat(70));

  try {
    const response = await fetch(`${API_URL}?limit=1`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const products = data.rows || [];

    if (products.length === 0) {
      console.log('❌ Товары не найдены');
      return;
    }

    const product = products[0];

    console.log('📦 Первый товар из API:\n');
    console.log(`Название: ${product.name || 'нет'}`);
    console.log(`ID: ${product.id || 'нет'}`);
    console.log(`Код: ${product.code || 'нет'}\n`);

    console.log('📋 ВСЕ ПОЛЯ ТОВАРА:\n');
    console.log('='.repeat(70));

    // Выводим все поля с их значениями
    const fields = Object.keys(product).sort();
    
    fields.forEach(field => {
      const value = product[field];
      let displayValue;
      
      if (value === null || value === undefined) {
        displayValue = 'null/undefined';
      } else if (typeof value === 'object') {
        if (Array.isArray(value)) {
          displayValue = `[массив, длина: ${value.length}]`;
          if (value.length > 0 && value.length <= 3) {
            displayValue += ` ${JSON.stringify(value).substring(0, 200)}`;
          }
        } else {
          // Объект - показываем ключи
          const objKeys = Object.keys(value);
          displayValue = `{объект, поля: ${objKeys.join(', ')}}`;
          if (objKeys.length <= 5) {
            displayValue += ` ${JSON.stringify(value).substring(0, 300)}`;
          }
        }
      } else if (typeof value === 'string' && value.length > 100) {
        displayValue = value.substring(0, 100) + '...';
      } else {
        displayValue = String(value);
      }
      
      console.log(`${field.padEnd(30)} : ${displayValue}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('\n🔍 ДЕТАЛЬНЫЙ АНАЛИЗ ПОЛЕЙ ЦЕН:\n');

    // Детальный анализ полей, связанных с ценами
    const priceFields = [
      'buyPrice',
      'purchasePrice',
      'salePrice',
      'salePrices',
      'minPrice',
      'price',
      'buyPriceCurrency',
      'salePriceCurrency',
      'currency',
    ];

    priceFields.forEach(field => {
      if (product[field] !== undefined) {
        console.log(`\n${field}:`);
        console.log(JSON.stringify(product[field], null, 2));
      }
    });

    console.log('\n' + '='.repeat(70));
    console.log('\n📊 СТРУКТУРА buyPrice:\n');
    if (product.buyPrice) {
      console.log(JSON.stringify(product.buyPrice, null, 2));
    } else {
      console.log('buyPrice отсутствует');
    }

    console.log('\n📊 СТРУКТУРА salePrices:\n');
    if (product.salePrices) {
      console.log(JSON.stringify(product.salePrices, null, 2));
    } else {
      console.log('salePrices отсутствует');
    }

    console.log('\n📊 СТРУКТУРА minPrice:\n');
    if (product.minPrice) {
      console.log(JSON.stringify(product.minPrice, null, 2));
    } else {
      console.log('minPrice отсутствует');
    }

  } catch (error) {
    console.error('❌ ОШИБКА:', error.message);
    console.error(error.stack);
  }
}

checkProductFields();
