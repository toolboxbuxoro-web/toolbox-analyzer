# SmartUp API - Руководство по интеграции

## Быстрый старт

### Конфигурация

```javascript
const CONFIG = {
    base_url: 'https://smartup.online',
    login: 'artyom@toolboxb2b',
    password: '0712miron9218',
    filial_id: '15443912',
    project_code: 'trade'
};
```

### Формат запроса

```javascript
const credentials = Buffer.from(`${login}:${password}`).toString('base64');

const response = await fetch('https://smartup.online/b/anor/mxsx/mr/inventory$export', {
    method: 'POST',
    headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'filial_id': '15443912',
        'project_code': 'trade'
    },
    body: JSON.stringify({})
});
```

---

## Параметры авторизации

| Параметр | Значение | Описание |
|----------|----------|----------|
| **Base URL** | `https://smartup.online` | Основной URL сервера |
| **Auth Type** | Basic Auth | `login:password` в base64 |
| **filial_id** | `15443912` | ID филиала (в Headers) |
| **project_code** | `trade` | Код проекта (в Headers) |

---

## Доступные эндпоинты

### Формат URL
```
https://smartup.online/b/anor/mxsx/mr/{action}
```

### Товары (Inventory)

#### Экспорт товаров
```http
POST /b/anor/mxsx/mr/inventory$export
```

**Request Body:**
```json
{
  "code": "",
  "begin_created_on": "01.01.2026",
  "end_created_on": "15.01.2026",
  "begin_modified_on": "",
  "end_modified_on": ""
}
```

**Response:**
```json
{
  "inventory": [
    {
      "product_id": "3794162",
      "code": "6818",
      "name": "Мойка высокого давления TOP-X3",
      "state": "A",
      "groups": [...],
      "inventory_kinds": [{"inventory_kind": "G"}]
    }
  ]
}
```

| Поле | Описание |
|------|----------|
| `product_id` | Уникальный ID товара |
| `code` | Код для интеграции |
| `name` | Полное название |
| `state` | Статус: `A` - активен, `P` - неактивен |
| `inventory_kind` | Тип: `P` - продукция, `G` - товар, `M` - сырьё |

---

### Группы товаров

```http
POST /b/anor/mxsx/mr/product_group$export
```

**Response:**
```json
{
  "product_group": [
    {
      "product_group_id": "21288",
      "code": "PRDGR:3",
      "name": "Группа",
      "product_kind": "I",
      "state": "A",
      "product_group_types": [
        {"product_type_id": "317510", "name": "UBAY"},
        {"product_type_id": "317511", "name": "PIT"}
      ]
    }
  ]
}
```

---

### Другие эндпоинты

| Действие | Эндпоинт |
|----------|----------|
| Услуги | `POST /b/anor/mxsx/mr/service$export` |
| Услуги (импорт) | `POST /b/anor/mxsx/mr/service$import` |
| Юр. лица | `POST /b/anor/mxsx/mr/legal_entity$export` |
| Физ. лица | `POST /b/anor/mxsx/mr/natural_persons$export` |
| Цены | `POST /b/anor/mxsx/mr/price_type$export` |
| Склады | `POST /b/anor/mxsx/mr/workspaces$export` |
| Производители | `POST /b/anor/mxsx/mr/producers$export` |
| Внутр. перемещения | `POST /b/anor/mxsx/mr/internal_movement$export` |

---

## Лимиты API

| Ограничение | Значение |
|-------------|----------|
| Справочники | 100 запросов/день |
| Редкие документы | 300 запросов/день |
| Частые документы | 500 запросов/день |
| Период данных | Только последние 7 дней |
| Объекты за запрос | Максимум 5000 |

---

## Примеры использования

### Node.js - Получение всех товаров

```javascript
async function getInventory() {
    const credentials = Buffer.from('artyom@toolboxb2b:0712miron9218').toString('base64');
    
    const response = await fetch('https://smartup.online/b/anor/mxsx/mr/inventory$export', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
            'filial_id': '15443912',
            'project_code': 'trade'
        },
        body: JSON.stringify({})
    });
    
    const data = await response.json();
    return data.inventory;
}
```

### cURL

```bash
curl -X POST 'https://smartup.online/b/anor/mxsx/mr/inventory$export' \
  -H 'Authorization: Basic YXJ0eW9tQHRvb2xib3hiMmI6MDcxMm1pcm9uOTIxOA==' \
  -H 'Content-Type: application/json' \
  -H 'filial_id: 15443912' \
  -H 'project_code: trade' \
  -d '{}'
```

---

## Документация

- **Официальная документация**: https://api.greenwhite.uz/
- **Тестовый файл**: `test-smartup-docs.js`

---

## Troubleshooting

| Ошибка | Причина | Решение |
|--------|---------|---------|
| 401 | Неверные credentials | Проверьте login/password |
| 404 | Неверный путь | Используйте `/b/anor/mxsx/mr/` |
| 500 | Отсутствуют headers | Добавьте `filial_id` и `project_code` |
| Network Error | Недоступен хост | Проверьте интернет-соединение |
