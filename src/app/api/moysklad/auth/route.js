import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Токен не предоставлен' },
        { status: 400 }
      );
    }

    // Сохраняем токен в cookies (httpOnly для безопасности)
    const cookieStore = await cookies();
    cookieStore.set('moysklad_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при сохранении токена:', error);
    return NextResponse.json(
      { error: 'Ошибка при сохранении токена' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('moysklad_token');

    return NextResponse.json({ 
      hasToken: !!token,
      token: token?.value || null 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка при получении токена' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('moysklad_token');

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка при удалении токена' },
      { status: 500 }
    );
  }
}
