'use client';

import { useState, useEffect } from 'react';
import { LogIn, LogOut, Search, Package, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

export default function SmartUpPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [serverUrl, setServerUrl] = useState('https://smartup.online');
    const [apiPath, setApiPath] = useState('/api/v1/products');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Products state
    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [totalProducts, setTotalProducts] = useState(0);

    const [loadingProgress, setLoadingProgress] = useState(null);

    // Check authentication status on mount
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/smartup/auth');
            const data = await response.json();
            setIsAuthenticated(data.hasCredentials);
            if (data.serverUrl) {
                setServerUrl(data.serverUrl);
            }
            if (data.apiPath) {
                setApiPath(data.apiPath);
            }
        } catch (err) {
            console.error('Error checking auth:', err);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/api/smartup/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, password, serverUrl, apiPath }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка авторизации');
            }

            setIsAuthenticated(true);
            setSuccess('Успешная авторизация в SmartUp!');
            setPassword(''); // Clear password for security
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/smartup/auth', { method: 'DELETE' });
            setIsAuthenticated(false);
            setProducts([]);
            setSuccess('Вы вышли из SmartUp');
            // Reset to defaults
            setApiPath('/api/v1/products');
        } catch (err) {
            setError('Ошибка при выходе');
        }
    };

    const fetchProducts = async () => {
        setIsLoadingProducts(true);
        setError(null);
        setLoadingProgress(null);

        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            params.append('limit', '50');

            const response = await fetch(`/api/smartup/products?${params}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка получения товаров');
            }

            setProducts(data.products || []);
            setTotalProducts(data.total || 0);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoadingProducts(false);
        }
    };

    const fetchAllProducts = async () => {
        setIsLoadingProducts(true);
        setError(null);
        setProducts([]);

        try {
            let allProducts = [];
            let offset = 0;
            const limit = 100;
            let hasMore = true;

            // First request to get total count
            const initialResponse = await fetch(`/api/smartup/products?limit=1&offset=0`);
            const initialData = await initialResponse.json();
            const total = initialData.total || 0;
            setTotalProducts(total);

            while (hasMore) {
                setLoadingProgress(`${allProducts.length} / ${total}`);

                const response = await fetch(`/api/smartup/products?limit=${limit}&offset=${offset}`);
                if (!response.ok) throw new Error('Ошибка загрузки данных');

                const data = await response.json();
                const chunk = data.products || [];

                if (chunk.length === 0) {
                    hasMore = false;
                } else {
                    allProducts = [...allProducts, ...chunk];
                    offset += limit;
                    if (offset >= total) hasMore = false;
                }

                // Safety break
                if (offset > 100000) hasMore = false;
            }

            setProducts(allProducts);
            setLoadingProgress(null);
            setSuccess(`Загружено ${allProducts.length} товаров`);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoadingProducts(false);
            setLoadingProgress(null);
        }
    };

    const exportToExcel = async () => {
        if (products.length === 0) return;

        // Dynamic import to avoid SSR issues if library assumes window
        const XLSX = await import('xlsx');

        const worksheet = XLSX.utils.json_to_sheet(products.map(p => ({
            'ID': p.id,
            'Code': p.code || p.article,
            'Name': p.name || p.title,
            'Price': p.price,
            'Quantity': p.quantity ?? p.stock,
            'Category': p.category || p.group,
            'Barcode': p.barcode
        })));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "SmartUp Products");
        XLSX.writeFile(workbook, "smartup_products.xlsx");
    };

    return (
        <main className="container">
            <header className="header">
                <h1 className="title">SmartUp Интеграция</h1>
                <p className="subtitle">
                    Получение данных товаров из системы SmartUp
                </p>
                <div style={{ marginTop: '1rem', display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a href="/" style={{ color: '#60a5fa', textDecoration: 'none', fontSize: '1rem' }}>
                        ← Главная
                    </a>
                    <a href="/sales-analysis" style={{ color: '#60a5fa', textDecoration: 'none', fontSize: '1rem' }}>
                        → Анализ продаж (МойСклад)
                    </a>
                </div>
            </header>

            {/* Auth Card */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 className="card-title" style={{ marginBottom: 0 }}>
                        {isAuthenticated ? (
                            <span style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle size={24} />
                                Подключено к SmartUp
                            </span>
                        ) : (
                            <span style={{ color: '#60a5fa' }}>Авторизация SmartUp</span>
                        )}
                    </h2>
                    {isAuthenticated && (
                        <button onClick={handleLogout} className="btn" style={{ background: '#ef4444' }}>
                            <LogOut size={18} style={{ marginRight: '0.5rem' }} />
                            Выйти
                        </button>
                    )}
                </div>

                {!isAuthenticated && (
                    <form onSubmit={handleLogin}>
                        <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>
                                    URL сервера SmartUp
                                </label>
                                <input
                                    type="url"
                                    value={serverUrl}
                                    onChange={(e) => setServerUrl(e.target.value)}
                                    placeholder="https://smartup.online"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid #334155',
                                        background: '#1e293b',
                                        color: '#fff',
                                    }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>
                                        Логин
                                    </label>
                                    <input
                                        type="text"
                                        value={login}
                                        onChange={(e) => setLogin(e.target.value)}
                                        placeholder="Введите логин"
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid #334155',
                                            background: '#1e293b',
                                            color: '#fff',
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>
                                        Пароль
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Введите пароль"
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid #334155',
                                            background: '#1e293b',
                                            color: '#fff',
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Advanced Settings Toggle */}
                        <div style={{ marginBottom: '1rem' }}>
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#60a5fa',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        padding: 0,
                                        textDecoration: 'underline',
                                        marginBottom: '0.5rem'
                                    }}
                                >
                                    {showAdvanced ? 'Скрыть расширенные настройки' : 'Показать расширенные настройки (API URL)'}
                                </button>

                                {showAdvanced && (
                                    <div style={{ padding: '1rem', background: '#0f172a', borderRadius: '0.5rem', marginTop: '0.5rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>
                                            Путь к API товаров (API Path)
                                        </label>
                                        <input
                                            type="text"
                                            value={apiPath}
                                            onChange={(e) => setApiPath(e.target.value)}
                                            placeholder="/api/v1/products"
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                borderRadius: '0.5rem',
                                                border: '1px solid #334155',
                                                background: '#1e293b',
                                                color: '#fff',
                                                fontFamily: 'monospace'
                                            }}
                                        />
                                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                                            По умолчанию: /api/v1/products.
                                        </p>

                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setIsLoading(true);
                                                try {
                                                    const res = await fetch('/api/smartup/test-connection', { method: 'POST' });
                                                    const data = await res.json();
                                                    alert(JSON.stringify(data.results, null, 2));
                                                } catch (e) {
                                                    alert('Ошибка теста: ' + e.message);
                                                } finally {
                                                    setIsLoading(false);
                                                }
                                            }}
                                            style={{
                                                marginTop: '1rem',
                                                padding: '0.5rem 1rem',
                                                background: '#4b5563',
                                                color: '#fff',
                                                borderRadius: '0.25rem',
                                                fontSize: '0.875rem',
                                                cursor: 'pointer',
                                                border: 'none'
                                            }}
                                        >
                                            🔍 Тест подключений (Probe Endpoints)
                                        </button>
                                        <p style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.5rem' }}>
                                            Нажмите кнопку, чтобы проверить доступность разных стандартных адресов API. Результат покажется в окне.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !login || !password}
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                        >
                            {isLoading ? (
                                <>
                                    <RefreshCw className="btn-icon spin" size={20} />
                                    Подключение...
                                </>
                            ) : (
                                <>
                                    <LogIn size={20} style={{ marginRight: '0.5rem' }} />
                                    Войти в SmartUp
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>

            {/* Messages */}
            {error && (
                <div className="error-msg" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {success && (
                <div style={{
                    background: '#166534',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#fff'
                }}>
                    <CheckCircle size={20} />
                    {success}
                </div>
            )}

            {/* Products Section */}
            {isAuthenticated && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 className="card-title" style={{ color: '#a78bfa', marginBottom: 0 }}>
                            <Package size={24} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                            Товары SmartUp
                        </h2>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={fetchAllProducts}
                                disabled={isLoadingProducts}
                                className="btn"
                                style={{ background: '#7c3aed' }}
                            >
                                {isLoadingProducts && loadingProgress ? (
                                    <>
                                        <RefreshCw className="spin" size={18} style={{ marginRight: '0.5rem' }} />
                                        {loadingProgress}
                                    </>
                                ) : (
                                    '📥 Загрузить ВСЕ'
                                )}
                            </button>
                            {products.length > 0 && (
                                <button
                                    onClick={exportToExcel}
                                    className="btn btn-success"
                                >
                                    📤 Excel
                                </button>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Поиск товаров..."
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: '1px solid #334155',
                                background: '#1e293b',
                                color: '#fff',
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
                        />
                        <button
                            onClick={fetchProducts}
                            disabled={isLoadingProducts && !loadingProgress}
                            className="btn btn-primary"
                        >
                            {isLoadingProducts && !loadingProgress ? (
                                <RefreshCw className="spin" size={20} />
                            ) : (
                                <>
                                    <Search size={20} style={{ marginRight: '0.5rem' }} />
                                    Найти
                                </>
                            )}
                        </button>
                    </div>

                    {totalProducts > 0 && (
                        <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
                            Найдено товаров: {totalProducts} {products.length > 0 && `(Загружено: ${products.length})`}
                        </p>
                    )}

                    {products.length > 0 && (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Код</th>
                                        <th>Название</th>
                                        <th>Цена</th>
                                        <th>Остаток</th>
                                        <th>Категория</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.slice(0, 100).map((product, idx) => (
                                        <tr key={product.id || idx}>
                                            <td className="code">{product.code || product.article || '-'}</td>
                                            <td>{product.name || product.title || '-'}</td>
                                            <td className="qty">{product.price ? product.price.toLocaleString() : '-'}</td>
                                            <td className="qty">{product.quantity ?? product.stock ?? '-'}</td>
                                            <td className="meta">{product.category || product.group || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {products.length > 100 && (
                                <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                    Показано первых 100 товаров из {products.length}
                                </div>
                            )}
                        </div>
                    )}

                    {products.length === 0 && !isLoadingProducts && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                            <Package size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <p>Нажмите "Найти" или "Загрузить ВСЕ"</p>
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}
