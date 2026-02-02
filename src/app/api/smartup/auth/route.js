import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
    try {
        const { login, password, serverUrl, apiPath } = await request.json();

        if (!login || !password) {
            return NextResponse.json(
                { error: 'Логин и пароль обязательны' },
                { status: 400 }
            );
        }

        // Создаем Basic Auth токен
        const credentials = Buffer.from(`${login}:${password}`).toString('base64');

        // По умолчанию используем стандартный URL SmartUp
        const baseUrl = serverUrl || 'https://smartup.online';
        const finalApiPath = apiPath || '/api/v1/products';

        // Сохраняем credentials в cookies
        const cookieStore = await cookies();

        cookieStore.set('smartup_credentials', credentials, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 дней
        });

        cookieStore.set('smartup_server_url', baseUrl, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
        });

        cookieStore.set('smartup_api_path', finalApiPath, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
        });

        return NextResponse.json({ success: true, message: 'SmartUp авторизация успешна' });
    } catch (error) {
        console.error('Ошибка при сохранении SmartUp credentials:', error);
        return NextResponse.json(
            { error: 'Ошибка при сохранении данных авторизации' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const cookieStore = await cookies();
        const credentials = cookieStore.get('smartup_credentials');
        const serverUrl = cookieStore.get('smartup_server_url');
        const apiPath = cookieStore.get('smartup_api_path');

        return NextResponse.json({
            hasCredentials: !!credentials,
            serverUrl: serverUrl?.value || null,
            apiPath: apiPath?.value || null
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Ошибка при получении данных авторизации' },
            { status: 500 }
        );
    }
}

export async function DELETE() {
    try {
        const cookieStore = await cookies();
        cookieStore.delete('smartup_credentials');
        cookieStore.delete('smartup_server_url');
        cookieStore.delete('smartup_api_path');

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: 'Ошибка при удалении данных авторизации' },
            { status: 500 }
        );
    }
}
