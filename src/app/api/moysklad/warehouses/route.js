import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function getMoyskladToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('moysklad_token');
  return token?.value;
}

export async function GET() {
  try {
    const token = await getMoyskladToken();

    if (!token) {
      return NextResponse.json(
        { error: 'Токен не найден. Пожалуйста, введите токен.' },
        { status: 401 }
      );
    }

    // Получаем список складов из API Мой склад
    const response = await fetch('https://api.moysklad.ru/api/remap/1.2/entity/store', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ошибка API Мой склад:', errorText);
      return NextResponse.json(
        { error: `Ошибка API Мой склад: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Форматируем данные складов
    const warehouses = data.rows.map(warehouse => ({
      id: warehouse.id,
      name: warehouse.name,
      address: warehouse.address || '',
    }));

    return NextResponse.json({ warehouses });
  } catch (error) {
    console.error('Ошибка при получении складов:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении списка складов' },
      { status: 500 }
    );
  }
}
