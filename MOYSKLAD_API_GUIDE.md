# МойСклад API - Полное руководство по работе с товарами

> **Версия API**: 1.2  
> **Base URL**: `https://api.moysklad.ru/api/remap/1.2`

---

## 🔐 Аутентификация

### Bearer Token
```bash
curl -X GET "https://api.moysklad.ru/api/remap/1.2/entity/product" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept-Encoding: gzip"
```

> [!IMPORTANT]
> **ОБЯЗАТЕЛЬНО** добавляйте заголовок `Accept-Encoding: gzip` - без него API возвращает ошибку 415.

### JavaScript (fetch)
```javascript
const headers = {
  'Authorization': `Bearer ${token}`,
  'Accept-Encoding': 'gzip'
};

const response = await fetch(url, { headers });
const data = await response.json();
```

---

## 📦 Товары (Product)

### Получение списка товаров
```
GET /entity/product
```

### Параметры запроса

| Параметр | Тип | Описание |
|----------|-----|----------|
| `limit` | int | Макс. количество записей (1-1000, по умолчанию 1000) |
| `offset` | int | Смещение для пагинации |
| `expand` | string | Раскрытие вложенных сущностей |
| `filter` | string | Фильтрация |
| `search` | string | Полнотекстовый поиск |
| `order` | string | Сортировка |

### Пагинация
```javascript
async function getAllProducts(token) {
  const limit = 1000;
  let offset = 0;
  let allProducts = [];
  
  while (true) {
    const url = `https://api.moysklad.ru/api/remap/1.2/entity/product?limit=${limit}&offset=${offset}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept-Encoding': 'gzip' }
    });
    const data = await response.json();
    
    allProducts = [...allProducts, ...data.rows];
    
    if (!data.meta.nextHref || data.rows.length < limit) break;
    offset += limit;
  }
  
  return allProducts;
}
```

---

## 📋 Поля товара

### Основные поля

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | Уникальный идентификатор |
| `name` | string | Название товара |
| `code` | string | Артикул |
| `externalCode` | string | Внешний код |
| `archived` | boolean | В архиве |
| `pathName` | string | Путь в иерархии папок |
| `description` | string | Описание |
| `article` | string | Артикул |
| `weight` | number | Вес (кг) |
| `volume` | number | Объём (м³) |
| `updated` | datetime | Дата обновления |

### Связи с другими сущностями

| Поле | Тип | Описание |
|------|-----|----------|
| `productFolder` | object | Папка/категория товара |
| `uom` | object | Единица измерения |
| `supplier` | object | Поставщик |
| `images` | array | Изображения |
| `files` | array | Прикреплённые файлы |
| `country` | object | Страна |

### Цены

| Поле | Тип | Описание |
|------|-----|----------|
| `buyPrice` | object | Закупочная цена |
| `minPrice` | object | Минимальная цена |
| `salePrices` | array | Массив цен продажи (по типам) |

### Штрихкоды

| Поле | Тип | Описание |
|------|-----|----------|
| `barcodes` | array | Массив штрихкодов |
| `barcodes[].ean13` | string | EAN-13 |
| `barcodes[].ean8` | string | EAN-8 |
| `barcodes[].code128` | string | Code 128 |
| `barcodes[].gtin` | string | GTIN |

---

## 💰 Типы цен (Price Types)

### Получение всех типов цен
```
GET /context/companysettings/pricetype
```

### Ваши типы цен

| ID | Название |
|----|----------|
| `f1a6ac3c-4c70-11ed-0a80-0784001a9249` | Цена продажи |
| `ed5567ae-4c7c-11ed-0a80-0935001c6b06` | Цена интернет-магазина |
| `ed5568b0-4c7c-11ed-0a80-0935001c6b07` | Цена перечисления |
| `0af8e5af-2095-11ee-0a80-004c0009df09` | Цена для оптовых продаж |

### Структура цены
```javascript
{
  "value": 8200000.0,  // Цена в копейках! Делите на 100
  "currency": {
    "meta": { "href": "...currency/f1a5d963-4c70..." }
  },
  "priceType": {
    "id": "f1a6ac3c-4c70-11ed-0a80-0784001a9249",
    "name": "Цена продажи"
  }
}
```

> [!WARNING]
> **Цены хранятся в копейках!** Всегда делите `value` на 100 для получения реальной цены.

### Получение нужной цены
```javascript
function getSalePrice(product, priceTypeId) {
  const price = product.salePrices?.find(p => p.priceType.id === priceTypeId);
  return price ? price.value / 100 : null;
}

// Использование
const retailPrice = getSalePrice(product, 'f1a6ac3c-4c70-11ed-0a80-0784001a9249');
const webPrice = getSalePrice(product, 'ed5567ae-4c7c-11ed-0a80-0935001c6b06');
```

---

## 💱 Валюты

### Получение валют
```
GET /entity/currency
```

### Ваши валюты

| ID | Код | Название | Курс |
|----|-----|----------|------|
| `f1a5d963-4c70-11ed-0a80-0784001a9248` | UZS | Узбекский сум | 1.0 (базовая) |
| `77d87aa9-5b74-11ed-0a80-042b00119142` | USD | Доллар США | 12700.0 |

---

## 🏷️ Дополнительные поля (Attributes)

### Получение метаданных атрибутов
```
GET /entity/product/metadata/attributes
```

### Ваши дополнительные поля

| ID | Название | Тип |
|----|----------|-----|
| `027333d8-5c35-11ee-0a80-000f00051f59` | Бренд | customentity (справочник) |

### Получение товара с атрибутами
```
GET /entity/product?expand=attributes
```

### Структура атрибута в товаре
```javascript
{
  "attributes": [
    {
      "meta": { ... },
      "id": "027333d8-5c35-11ee-0a80-000f00051f59",
      "name": "Бренд",
      "type": "customentity",
      "value": {
        "meta": { ... },
        "name": "PIT"  // Значение бренда
      }
    }
  ]
}
```

### Получение значения атрибута
```javascript
function getAttributeValue(product, attributeId) {
  const attr = product.attributes?.find(a => a.id === attributeId);
  if (!attr) return null;
  
  // Для справочников (customentity)
  if (attr.type === 'customentity') {
    return attr.value?.name;
  }
  
  return attr.value;
}

// Использование
const brandId = '027333d8-5c35-11ee-0a80-000f00051f59';
const brand = getAttributeValue(product, brandId);
```

---

## 📁 Получение справочника брендов

### Endpoint
```
GET /entity/customentity/55c5aded-5c34-11ee-0a80-000f000504d3
```

### Примеры брендов

| ID | Название |
|----|----------|
| `e18b2810-5c3e-11ee-0a80-054d00072666` | Mirolis |
| `e6301ff2-5c48-11ee-0a80-10720009cb03` | Tayor |
| `f34a3350-8545-11ee-0a80-11e700120afc` | Epica |
| `f5e934a2-5c3e-11ee-0a80-000f000748b5` | PIT |
| `f6b672d7-5c49-11ee-0a80-0eb2000a3411` | SINEBE |

---

## 📂 Категории товаров (ProductFolder)

### Получение категорий
```
GET /entity/productfolder
```

### Структура категории
```javascript
{
  "id": "0034d207-b301-11f0-0a80-147a0028c415",
  "name": "Комплектующие",
  "pathName": "Запчасти/Для цепных пил",  // Полный путь
  "productFolder": { ... },  // Родительская категория
  "archived": false
}
```

### Получение товаров категории
```
GET /entity/product?filter=productFolder=https://api.moysklad.ru/api/remap/1.2/entity/productfolder/{folder_id}
```

---

## 🖼️ Изображения

### Структура изображения
```javascript
{
  "images": {
    "rows": [
      {
        "title": "6792",
        "filename": "6792.jpg",
        "size": 193371,
        "miniature": {
          "downloadHref": "https://miniature-prod.moysklad.ru/..."  // Миниатюра (PNG)
        },
        "tiny": {
          "href": "https://tinyimage-prod.moysklad.ru/..."  // Маленькая версия
        },
        "meta": {
          "downloadHref": "https://api.moysklad.ru/api/remap/1.2/download/..."  // Оригинал
        }
      }
    ]
  }
}
```

### Получение URL изображения
```javascript
function getProductImageUrl(product, size = 'miniature') {
  const image = product.images?.rows?.[0];
  if (!image) return null;
  
  switch (size) {
    case 'original':
      return image.meta?.downloadHref;
    case 'miniature':
      return image.miniature?.downloadHref;
    case 'tiny':
      return image.tiny?.href;
    default:
      return image.miniature?.downloadHref;
  }
}
```

> [!NOTE]
> Для скачивания изображений нужна авторизация! Добавьте Bearer token в заголовок.

---

## 🔍 Фильтрация

### Синтаксис
```
filter=field=value
filter=field1=value1;field2=value2  // AND
```

### Операторы

| Оператор | Пример | Описание |
|----------|--------|----------|
| `=` | `name=Товар` | Равно |
| `!=` | `archived!=true` | Не равно |
| `>` | `updated>2024-01-01` | Больше |
| `<` | `updated<2024-12-31` | Меньше |
| `>=` | `price>=1000` | Больше или равно |
| `<=` | `price<=5000` | Меньше или равно |
| `~` | `name~пила` | Содержит (like) |
| `=~` | `name=~пила` | Начинается с |
| `~=` | `name~=пила` | Заканчивается на |

### Примеры фильтров
```javascript
// Не архивные товары
/entity/product?filter=archived=false

// Товары определённой категории
/entity/product?filter=productFolder=https://api.moysklad.ru/api/remap/1.2/entity/productfolder/{id}

// Товары с определённым поставщиком
/entity/product?filter=supplier=https://api.moysklad.ru/api/remap/1.2/entity/counterparty/{id}

// Поиск по названию
/entity/product?filter=name~пила

// Обновлённые за период
/entity/product?filter=updated>=2024-01-01 00:00:00;updated<=2024-12-31 23:59:59
```

---

## 📑 Expand (раскрытие связей)

### Доступные expand для товаров
```
expand=images,productFolder,supplier,uom,files,owner,group
```

### Пример с expand
```javascript
const url = 'https://api.moysklad.ru/api/remap/1.2/entity/product' +
  '?limit=100' +
  '&expand=images,productFolder,supplier';
```

> [!TIP]
> Используйте `expand` для уменьшения количества запросов, но помните что большой expand увеличивает размер ответа.

---

## ⚡ Оптимизация запросов

### 1. Выбирайте только нужные поля
К сожалению, МойСклад не поддерживает выборку полей (`fields=...`), но можно оптимизировать через `expand`.

### 2. Используйте пакетные запросы
```javascript
// Плохо: 100 отдельных запросов
for (const id of productIds) {
  await fetch(`/entity/product/${id}`);
}

// Хорошо: 1 запрос с фильтром
const ids = productIds.join(',');
await fetch(`/entity/product?filter=id=${ids}`);
```

### 3. Правильная пагинация
```javascript
// Используйте limit=1000 (максимум) для минимизации запросов
const limit = 1000;
```

### 4. Кэширование справочников
```javascript
// Кэшируйте редко меняющиеся данные
const cache = {
  priceTypes: null,
  currencies: null,
  uom: null,
  
  async getPriceTypes(token) {
    if (!this.priceTypes) {
      const response = await fetch('/context/companysettings/pricetype', ...);
      this.priceTypes = await response.json();
    }
    return this.priceTypes;
  }
};
```

### 5. Обработка Rate Limiting
```javascript
async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      // Rate limit - ждём 1 секунду
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }
    
    return response;
  }
  throw new Error('Rate limit exceeded');
}
```

---

## 📊 Полный пример: Синхронизация товаров

```javascript
const MOYSKLAD_API = 'https://api.moysklad.ru/api/remap/1.2';
const TOKEN = 'd3150a2c7dcf1ab7280f02f24e3b2822b0fc3bc4';
const BRAND_ATTR_ID = '027333d8-5c35-11ee-0a80-000f00051f59';
const RETAIL_PRICE_ID = 'f1a6ac3c-4c70-11ed-0a80-0784001a9249';

async function fetchAPI(endpoint) {
  const response = await fetch(`${MOYSKLAD_API}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept-Encoding': 'gzip'
    }
  });
  return response.json();
}

async function syncAllProducts() {
  let offset = 0;
  const limit = 1000;
  const products = [];
  
  while (true) {
    const data = await fetchAPI(
      `/entity/product?limit=${limit}&offset=${offset}&expand=images,productFolder`
    );
    
    for (const product of data.rows) {
      products.push({
        id: product.id,
        name: product.name,
        code: product.code,
        barcode: product.barcodes?.[0]?.ean13,
        category: product.productFolder?.name,
        categoryPath: product.pathName,
        price: getSalePrice(product, RETAIL_PRICE_ID),
        buyPrice: product.buyPrice?.value / 100,
        image: product.images?.rows?.[0]?.miniature?.downloadHref,
        brand: getAttributeValue(product, BRAND_ATTR_ID),
        updated: product.updated,
        archived: product.archived
      });
    }
    
    if (!data.meta.nextHref) break;
    offset += limit;
    
    console.log(`Synced ${products.length} / ${data.meta.size}`);
  }
  
  return products;
}

function getSalePrice(product, priceTypeId) {
  const price = product.salePrices?.find(p => p.priceType.id === priceTypeId);
  return price ? price.value / 100 : null;
}

function getAttributeValue(product, attributeId) {
  const attr = product.attributes?.find(a => a.id === attributeId);
  return attr?.value?.name || attr?.value;
}
```

---

## 🔗 Полезные эндпоинты

| Эндпоинт | Описание |
|----------|----------|
| `/entity/product` | Товары |
| `/entity/product/metadata` | Метаданные товаров |
| `/entity/product/metadata/attributes` | Доп. поля товаров |
| `/entity/productfolder` | Категории товаров |
| `/entity/store` | Склады |
| `/entity/counterparty` | Контрагенты |
| `/entity/currency` | Валюты |
| `/entity/uom` | Единицы измерения |
| `/context/companysettings/pricetype` | Типы цен |
| `/entity/customentity/{id}` | Справочник (бренды и т.д.) |
| `/report/stock/all` | Остатки товаров |
| `/report/profit/byproduct` | Прибыльность по товарам |

---

## 📝 Ваши ID для быстрого доступа

### Типы цен
```javascript
const PRICE_TYPES = {
  RETAIL: 'f1a6ac3c-4c70-11ed-0a80-0784001a9249',      // Цена продажи
  WEB: 'ed5567ae-4c7c-11ed-0a80-0935001c6b06',         // Цена интернет-магазина
  TRANSFER: 'ed5568b0-4c7c-11ed-0a80-0935001c6b07',    // Цена перечисления
  WHOLESALE: '0af8e5af-2095-11ee-0a80-004c0009df09'    // Оптовая цена
};
```

### Валюты
```javascript
const CURRENCIES = {
  UZS: 'f1a5d963-4c70-11ed-0a80-0784001a9248',  // Узбекский сум
  USD: '77d87aa9-5b74-11ed-0a80-042b00119142'   // Доллар США
};
```

### Доп. поля
```javascript
const ATTRIBUTES = {
  BRAND: '027333d8-5c35-11ee-0a80-000f00051f59'  // Бренд
};
```

### Справочники
```javascript
const CUSTOM_ENTITIES = {
  BRANDS: '55c5aded-5c34-11ee-0a80-000f000504d3'  // Справочник брендов
};
```
