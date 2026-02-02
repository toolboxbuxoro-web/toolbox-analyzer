import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function getSmartUpCredentials() {
    const cookieStore = await cookies();
    const credentials = cookieStore.get('smartup_credentials');
    const serverUrl = cookieStore.get('smartup_server_url');
    // We ignore the saved apiPath for this test to try multiple
    return {
        credentials: credentials?.value,
        serverUrl: serverUrl?.value || 'https://smartup.online'
    };
}

export async function POST(request) {
    try {
        const { credentials, serverUrl } = await getSmartUpCredentials();

        if (!credentials) {
            return NextResponse.json({
                results: [{
                    endpoint: 'CHECK_COOKIES',
                    status: 'MISSING_CREDENTIALS',
                    ok: false,
                    error: 'Вы не авторизованы. Пожалуйста, введите логин и пароль в форму и нажмите Войти, чтобы сохранить куки.'
                }]
            });
        }

        const commonEndpoints = [
            '/api/v1/products',
            '/api/products',
            '/b2b/api/v1/catalog/products',
            '/api/nomenclatures',
            '/api/items',
            '/api/catalog',
            '/api/v1/catalog',
            // Try simpler ones that might just return version or status
            '/api/version',
            '/api/status'
        ];

        const results = [];

        for (const endpoint of commonEndpoints) {
            const cleanServerUrl = serverUrl.replace(/\/$/, '');
            const url = `${cleanServerUrl}${endpoint}?limit=1`;

            console.log(`Testing endpoint: ${url}`);

            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Basic ${credentials}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                });

                const text = await response.text();
                console.log(`Result for ${endpoint}: ${response.status}`);

                results.push({
                    endpoint,
                    status: response.status,
                    ok: response.ok,
                    preview: text.substring(0, 100) // First 100 chars
                });

                if (response.ok) {
                    // If we found a working one, we might stop or continue to find the *best* one
                    // Let's continue to see all options
                }
            } catch (err) {
                results.push({
                    endpoint,
                    status: 'ERROR',
                    ok: false,
                    error: err.message
                });
            }
        }

        return NextResponse.json({ results });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
