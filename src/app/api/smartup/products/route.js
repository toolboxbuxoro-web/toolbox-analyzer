import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function getSmartUpCredentials() {
    const cookieStore = await cookies();
    const credentials = cookieStore.get('smartup_credentials');
    const serverUrl = cookieStore.get('smartup_server_url');
    const apiPath = cookieStore.get('smartup_api_path');

    return {
        credentials: credentials?.value,
        serverUrl: serverUrl?.value || 'https://smartup.online',
        // Remove leading slash if present in apiPath to avoid double slashes, 
        // BUT serverUrl might not have trailing slash.
        // Let's assume serverUrl has no trailing slash and apiPath starts with slash.
        apiRoute: apiPath?.value || '/api/v1/products'
    };
}

export async function GET(request) {
    try {
        const { credentials, serverUrl, apiRoute } = await getSmartUpCredentials();

        if (!credentials) {
            return NextResponse.json(
                { error: 'Не авторизован. Пожалуйста, введите логин и пароль SmartUp.' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const limit = searchParams.get('limit') || 100;
        const offset = searchParams.get('offset') || 0;
        const search = searchParams.get('search') || '';

        // Clean up slashes
        const cleanServerUrl = serverUrl.replace(/\/$/, '');
        const cleanApiRoute = apiRoute.startsWith('/') ? apiRoute : `/${apiRoute}`;

        let apiUrl = `${cleanServerUrl}${cleanApiRoute}?limit=${limit}&offset=${offset}`;

        if (search) {
            apiUrl += `&search=${encodeURIComponent(search)}`;
        }

        console.log('Fetching SmartUp URL:', apiUrl);
        console.log('With credentials length:', credentials?.length);

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        console.log('SmartUp Response Status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('SmartUp API Error Body:', errorText);

            if (response.status === 401) {
                return NextResponse.json(
                    { error: 'SmartUp: Ошибка авторизации (401). Проверьте логин/пароль.' },
                    { status: 401 }
                );
            }

            return NextResponse.json(
                { error: `Ошибка SmartUp API: ${response.status} - ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        return NextResponse.json({
            success: true,
            products: data.rows || data.items || data,
            total: data.meta?.size || data.total || 0,
            limit: parseInt(limit),
            offset: parseInt(offset),
        });

    } catch (error) {
        console.error('CRITICAL ERROR in SmartUp API Route:', error);
        return NextResponse.json(
            { error: `Internal Server Error: ${error.message}` },
            { status: 500 }
        );
    }
}

// POST для поиска товаров с дополнительными фильтрами
export async function POST(request) {
    try {
        const { credentials, serverUrl } = await getSmartUpCredentials();

        if (!credentials) {
            return NextResponse.json(
                { error: 'Не авторизован. Пожалуйста, введите логин и пароль SmartUp.' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { filters, limit = 100, offset = 0 } = body;

        // SmartUp API для получения товаров с фильтрами
        const apiUrl = `${serverUrl}/api/v1/products`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                limit,
                offset,
                ...filters,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('SmartUp API Error:', response.status, errorText);

            return NextResponse.json(
                { error: `Ошибка SmartUp API: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        return NextResponse.json({
            success: true,
            products: data.rows || data.items || data,
            total: data.meta?.size || data.total || 0,
        });

    } catch (error) {
        console.error('Ошибка при поиске товаров SmartUp:', error);
        return NextResponse.json(
            { error: 'Ошибка при поиске товаров в SmartUp' },
            { status: 500 }
        );
    }
}
