'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, Search, Download, TrendingDown, TrendingUp } from 'lucide-react';
import { formatNumber, filterProductsWithBelowCostPrice, calculateProductsSummary, filterProductsWithLowMargin, calculateLowMarginSummary, checkProductBelowCost, calculateMargin } from '@/utils/belowCostCalculator';
import ExcelJS from 'exceljs';
import styles from './page.module.css';

export default function BelowCostPage() {
  const [bearerToken, setBearerToken] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouses, setSelectedWarehouses] = useState([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
  const [usdRate, setUsdRate] = useState('');
  const [analysisMode, setAnalysisMode] = useState('belowCost'); // 'belowCost' или 'lowMargin'
  const [minMarginPercent, setMinMarginPercent] = useState('10');
  const [products, setProducts] = useState([]);
  const [belowCostProducts, setBelowCostProducts] = useState([]);
  const [lowMarginProducts, setLowMarginProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingStatus, setLoadingStatus] = useState('');
  const [progress, setProgress] = useState(null); // { current: 0, total: 0, stage: '' }

  // Load token from sessionStorage on mount
  useEffect(() => {
    const savedToken = sessionStorage.getItem('moysklad_token');
    if (savedToken) {
      setBearerToken(savedToken);
      loadWarehouses(savedToken);
    }
  }, []);

  // Save token to sessionStorage when changed
  useEffect(() => {
    if (bearerToken) {
      sessionStorage.setItem('moysklad_token', bearerToken);
    }
  }, [bearerToken]);

  const loadWarehouses = async (token) => {
    if (!token) return;

    setIsLoadingWarehouses(true);
    setError(null);

    try {
      // Save token to API
      await fetch('/api/moysklad/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      // Load warehouses
      const response = await fetch('/api/moysklad/warehouses', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Не удалось загрузить список складов');
      }

      const data = await response.json();
      setWarehouses(data.warehouses || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoadingWarehouses(false);
    }
  };

  const handleTokenSubmit = async (e) => {
    e.preventDefault();
    if (!bearerToken.trim()) {
      setError('Введите Bearer Token');
      return;
    }
    await loadWarehouses(bearerToken);
  };

  const handleWarehouseToggle = (warehouseId) => {
    setSelectedWarehouses(prev =>
      prev.includes(warehouseId)
        ? prev.filter(id => id !== warehouseId)
        : [...prev, warehouseId]
    );
  };

  const handleAnalyze = async () => {
    console.log('🔍 Начало анализа товаров...', { mode: analysisMode });
    
    if (!usdRate || parseFloat(usdRate) <= 0) {
      setError('Укажите курс USD→UZS');
      console.error('❌ Ошибка: не указан курс USD');
      return;
    }

    if (analysisMode === 'lowMargin' && (!minMarginPercent || parseFloat(minMarginPercent) < 0)) {
      setError('Укажите максимальную наценку в процентах');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStatus('Загрузка товаров из МойСклад...');
    setProgress({ current: 0, total: 0, stage: 'Подготовка...' });

    try {
      const requestBody = {
        warehouseIds: selectedWarehouses,
      };

      setProgress({ current: 0, total: 0, stage: 'Отправка запроса к API...' });

      const response = await fetch('/api/moysklad/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Ошибка при получении данных');
        } catch (e) {
          throw new Error('Ошибка при получении товаров из МойСклад');
        }
      }

      const data = await response.json();
      const allProducts = data.products || [];
      
      console.log('📦 Получены товары из API:', {
        всего: allProducts.length,
        пример_товара: allProducts[0] ? {
          название: allProducts[0].productName,
          себестоимость: allProducts[0].buyPrice,
          валюта_себестоимости: allProducts[0].buyCurrencyCode,
          цена_продажи: allProducts[0].salePrice,
          валюта_продажи: allProducts[0].saleCurrencyCode
        } : 'нет товаров'
      });
      
      if (allProducts.length === 0) {
        setError('Не найдено товаров в МойСклад. Проверьте токен и доступ к API.');
        setLoadingStatus('');
        setProgress(null);
        setIsLoading(false);
        return;
      }

      // Проверяем, сколько товаров имеют обе цены
      const withBothPrices = allProducts.filter(p => p.buyPrice && p.buyPrice > 0 && p.salePrice && p.salePrice > 0);
      console.log('💰 Статистика по ценам:', {
        всего_товаров: allProducts.length,
        с_обеими_ценами: withBothPrices.length,
        без_себестоимости: allProducts.filter(p => !p.buyPrice || p.buyPrice <= 0).length,
        без_цены_продажи: allProducts.filter(p => !p.salePrice || p.salePrice <= 0).length
      });

      if (withBothPrices.length === 0) {
        setError('Не найдено товаров с обеими ценами (себестоимость и цена продажи). Проверьте данные в МойСклад.');
        setLoadingStatus('');
        setProgress(null);
        setIsLoading(false);
        return;
      }

      setProducts(allProducts);
      setLoadingStatus(`Обработка ${allProducts.length} товаров...`);
      setProgress({ current: 0, total: allProducts.length, stage: 'Начало обработки...' });

      const rate = parseFloat(usdRate);
      
      const batchSize = 100;
      let results = [];
      let processedCount = 0;
      
      if (analysisMode === 'belowCost') {
        // Режим: ниже себестоимости
        setLoadingStatus('Сравнение цен...');
        
        for (let i = 0; i < allProducts.length; i += batchSize) {
          const batch = allProducts.slice(i, i + batchSize);
          const batchChecked = filterProductsWithBelowCostPrice(batch, rate);
          results.push(...batchChecked);
          
          processedCount = Math.min(i + batchSize, allProducts.length);
          setProgress({
            current: processedCount,
            total: allProducts.length,
            stage: `Проверка цен: ${processedCount} из ${allProducts.length} товаров`
          });
          
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        setBelowCostProducts(results);
        setLowMarginProducts([]);
        const summaryData = calculateProductsSummary(results);
        setSummary(summaryData);
      } else {
        // Режим: низкая наценка
        const marginThreshold = parseFloat(minMarginPercent);
        console.log('💰 Режим низкой наценки:', {
          порог: marginThreshold,
          всего_товаров: allProducts.length,
          курс: rate
        });
        
        setLoadingStatus('Проверка наценки...');
        
        for (let i = 0; i < allProducts.length; i += batchSize) {
          const batch = allProducts.slice(i, i + batchSize);
          const batchChecked = filterProductsWithLowMargin(batch, rate, marginThreshold);
          results.push(...batchChecked);
          
          processedCount = Math.min(i + batchSize, allProducts.length);
          setProgress({
            current: processedCount,
            total: allProducts.length,
            stage: `Проверка наценки: ${processedCount} из ${allProducts.length} товаров`
          });
          
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        console.log('📊 Итоговые результаты низкой наценки:', {
          найдено: results.length,
          порог: marginThreshold,
          всего_обработано: allProducts.length,
          примеры: results.slice(0, 5).map(p => ({
            название: p.productName,
            себестоимость: p.buyPriceUZS,
            цена_продажи: p.salePriceUZS,
            наценка_UZS: p.margin,
            наценка_процент: p.marginPercent.toFixed(2)
          }))
        });

        if (results.length === 0) {
          // Берем первые 5 товаров с обеими ценами и показываем их наценки
          const sampleProducts = allProducts
            .filter(p => p.buyPrice > 0 && p.salePrice > 0)
            .slice(0, 5)
            .map(p => {
              const checked = checkProductBelowCost(p, rate);
              const withMargin = calculateMargin(checked);
              return {
                название: p.productName,
                себестоимость: checked.buyPriceUZS,
                цена_продажи: checked.salePriceUZS,
                наценка_процент: withMargin.marginPercent?.toFixed(2) + '%',
                почему_не_прошел: withMargin.marginPercent >= marginThreshold 
                  ? `Наценка ${withMargin.marginPercent.toFixed(2)}% >= порога ${marginThreshold}%`
                  : withMargin.marginPercent < 0 
                    ? 'Отрицательная наценка (ниже себестоимости)'
                    : 'Неизвестная причина'
              };
            });
          
          console.warn('⚠️ Товаров с наценкой меньше', marginThreshold + '% не найдено');
          console.log('💡 Примеры товаров и их наценки:', sampleProducts);
          console.log('💡 Всего товаров с обеими ценами:', allProducts.filter(p => p.buyPrice > 0 && p.salePrice > 0).length);
        }
        
        console.log('✅ Устанавливаем результаты в состояние:', {
          lowMarginProducts: results.length,
          summary: results.length > 0 ? 'будет создана' : 'пустая'
        });
        
        setLowMarginProducts(results);
        setBelowCostProducts([]);
        const summaryData = calculateLowMarginSummary(results);
        setSummary(summaryData);
      }
      
      setProgress({ current: allProducts.length, total: allProducts.length, stage: 'Завершено!' });
      setLoadingStatus('');
      
      setTimeout(() => {
        setProgress(null);
      }, 1000);
    } catch (err) {
      console.error('❌ Ошибка при анализе:', err);
      setError(err.message || 'Неизвестная ошибка. Откройте консоль браузера (F12) для подробностей.');
      setLoadingStatus('');
      setProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Фильтрация по поисковому запросу
  const currentProducts = analysisMode === 'belowCost' ? belowCostProducts : lowMarginProducts;
  const filteredProducts = currentProducts.filter(product => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      product.productName.toLowerCase().includes(term) ||
      product.productCode.toLowerCase().includes(term)
    );
  });

  const exportToExcel = async () => {
    if (filteredProducts.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Toolbox Sklad';
    workbook.created = new Date();

    const isLowMargin = analysisMode === 'lowMargin';
    const worksheet = workbook.addWorksheet(isLowMargin ? 'Товары с низкой наценкой' : 'Товары ниже себестоимости', {
      properties: { tabColor: { argb: isLowMargin ? 'F59E0B' : 'EF4444' } }
    });

    // Заголовок отчета
    const mergeRange = isLowMargin ? 'A1:H1' : 'A1:G1';
    worksheet.mergeCells(mergeRange);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = isLowMargin 
      ? `Товары с наценкой меньше ${minMarginPercent}%`
      : 'Товары с ценой продажи ниже себестоимости';
    titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: isLowMargin ? 'D97706' : 'DC2626' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 35;

    // Информация о курсе
    const infoRange = isLowMargin ? 'A2:H2' : 'A2:G2';
    worksheet.mergeCells(infoRange);
    const infoCell = worksheet.getCell('A2');
    infoCell.value = isLowMargin 
      ? `Курс USD: ${usdRate} | Максимальная наценка: ${minMarginPercent}%`
      : `Курс USD: ${usdRate}`;
    infoCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '6B7280' } };
    infoCell.alignment = { horizontal: 'center' };
    worksheet.getRow(2).height = 20;

    // Сводка
    if (summary) {
      const summaryRange = isLowMargin ? 'A3:H3' : 'A3:G3';
      worksheet.mergeCells(summaryRange);
      const summaryCell = worksheet.getCell('A3');
      if (isLowMargin) {
        summaryCell.value = `Всего товаров: ${summary.totalProducts} | Средняя наценка: ${formatNumber(summary.avgMarginPercent)}% | Общая наценка: ${formatNumber(summary.totalMargin)} UZS`;
      } else {
        summaryCell.value = `Всего товаров: ${summary.totalProducts} | Общий убыток: ${formatNumber(summary.totalLoss)} UZS`;
      }
      summaryCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: isLowMargin ? 'D97706' : 'DC2626' } };
      summaryCell.alignment = { horizontal: 'center' };
      worksheet.getRow(3).height = 25;
    }

    worksheet.getRow(4).height = 10;

    // Заголовки таблицы
    const headers = isLowMargin ? [
      'Товар',
      'Код',
      'Себестоимость (UZS)',
      'Цена продажи (UZS)',
      'Наценка (UZS)',
      'Наценка (%)',
      'Валюта себестоимости',
      'Валюта продажи'
    ] : [
      'Товар',
      'Код',
      'Себестоимость (UZS)',
      'Цена продажи (UZS)',
      'Разница (убыток)',
      'Валюта себестоимости',
      'Валюта продажи'
    ];
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 25;

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isLowMargin ? 'F59E0B' : 'DC2626' }
      };
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: isLowMargin ? '92400E' : '991B1B' } },
        left: { style: 'thin', color: { argb: isLowMargin ? '92400E' : '991B1B' } },
        bottom: { style: 'thin', color: { argb: isLowMargin ? '92400E' : '991B1B' } },
        right: { style: 'thin', color: { argb: isLowMargin ? '92400E' : '991B1B' } }
      };
    });

    // Данные
    filteredProducts.forEach((product, index) => {
      const rowData = isLowMargin ? [
        product.productName,
        product.productCode,
        product.buyPriceUZS,
        product.salePriceUZS,
        product.margin,
        product.marginPercent,
        product.buyPriceCurrency,
        product.salePriceCurrency
      ] : [
        product.productName,
        product.productCode,
        product.buyPriceUZS,
        product.salePriceUZS,
        product.loss,
        product.buyPriceCurrency,
        product.salePriceCurrency
      ];
      const row = worksheet.addRow(rowData);
      row.height = 25;

      const isEven = index % 2 === 0;
      row.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? (isLowMargin ? 'FEF3C7' : 'FEF2F2') : 'FFFFFF' }
        };
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = { 
          horizontal: colNumber <= 2 ? 'left' : 'right', 
          vertical: 'middle', 
          wrapText: true 
        };
        cell.border = {
          top: { style: 'thin', color: { argb: isLowMargin ? 'FDE68A' : 'FECACA' } },
          left: { style: 'thin', color: { argb: isLowMargin ? 'FDE68A' : 'FECACA' } },
          bottom: { style: 'thin', color: { argb: isLowMargin ? 'FDE68A' : 'FECACA' } },
          right: { style: 'thin', color: { argb: isLowMargin ? 'FDE68A' : 'FECACA' } }
        };

        if (isLowMargin && colNumber >= 3 && colNumber <= 6) {
          cell.numFmt = '#,##0.00';
        } else if (!isLowMargin && colNumber >= 3 && colNumber <= 5) {
          cell.numFmt = '#,##0.00';
        }
      });
    });

    // Ширина колонок
    if (isLowMargin) {
      worksheet.columns = [
        { width: 35 }, { width: 15 }, { width: 20 }, { width: 20 },
        { width: 18 }, { width: 15 }, { width: 20 }, { width: 18 },
      ];
    } else {
      worksheet.columns = [
        { width: 35 }, { width: 15 }, { width: 20 }, { width: 20 },
        { width: 18 }, { width: 20 }, { width: 18 },
      ];
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isLowMargin 
      ? `Товары_с_низкой_наценкой_${new Date().toISOString().split('T')[0]}.xlsx`
      : `Товары_ниже_себестоимости_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <main className="container">
      <header className="header">
        <h1 className="title">Ниже себестоимости</h1>
        <p className="subtitle" style={{ marginBottom: '0.75rem' }}>
          {analysisMode === 'belowCost' 
            ? 'Показываем только товары, где цена продажи меньше себестоимости.'
            : 'Показываем товары, которые почти не приносят прибыль (низкая наценка).'}
        </p>
        <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '640px', margin: '0 auto' }}>
          1) Введите курс USD → UZS. 2) Выберите режим: «Ниже себестоимости» или «Низкая наценка». 
          3) Нажмите «Анализировать», чтобы увидеть список проблемных товаров.
        </p>
      </header>

      {/* Bearer Token Form */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 className="card-title text-blue">Авторизация</h2>
        <form onSubmit={handleTokenSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="uploader-label">Bearer Token</label>
            <input
              type="password"
              value={bearerToken}
              onChange={(e) => setBearerToken(e.target.value)}
              placeholder="Введите Bearer Token для Мой склад"
              className={styles.tokenInput}
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={isLoadingWarehouses || !bearerToken.trim()}
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.5rem' }}
          >
            {isLoadingWarehouses ? (
              <>
                <RefreshCw className="btn-icon spin" size={20} />
                Загрузка...
              </>
            ) : (
              'Загрузить склады'
            )}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-msg" style={{ marginBottom: '2rem' }}>
          <AlertCircle className="btn-icon" size={24} />
          {error}
        </div>
      )}

      {/* Warehouses Selection - опционально, товары не привязаны напрямую к складам */}
      {warehouses.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 className="card-title text-purple">Выбор складов (опционально)</h2>
          <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#94a3b8' }}>
            Товары не привязаны напрямую к складам. Анализ будет выполнен по всем товарам из справочника.
          </p>
          <div className={styles.warehouseGrid}>
            {warehouses.map((warehouse) => (
              <label key={warehouse.id} className={styles.warehouseCheckbox}>
                <input
                  type="checkbox"
                  checked={selectedWarehouses.includes(warehouse.id)}
                  onChange={() => handleWarehouseToggle(warehouse.id)}
                />
                <span>{warehouse.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Mode Selection */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 className="card-title text-blue">Что ищем?</h2>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
          Выберите, что именно хотите контролировать: продажи в минус или слишком низкую наценку.
        </p>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setAnalysisMode('belowCost');
              setBelowCostProducts([]);
              setLowMarginProducts([]);
              setSummary(null);
            }}
            className="btn"
            style={{
              flex: 1,
              background: analysisMode === 'belowCost' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(31, 41, 55, 0.5)',
              border: `2px solid ${analysisMode === 'belowCost' ? '#ef4444' : '#475569'}`,
              color: analysisMode === 'belowCost' ? '#fca5a5' : '#94a3b8',
              fontWeight: analysisMode === 'belowCost' ? '600' : '400'
            }}
          >
            <TrendingDown size={20} style={{ marginRight: '0.5rem' }} />
            Ниже себестоимости
          </button>
          <button
            onClick={() => {
              setAnalysisMode('lowMargin');
              setBelowCostProducts([]);
              setLowMarginProducts([]);
              setSummary(null);
            }}
            className="btn"
            style={{
              flex: 1,
              background: analysisMode === 'lowMargin' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(31, 41, 55, 0.5)',
              border: `2px solid ${analysisMode === 'lowMargin' ? '#f59e0b' : '#475569'}`,
              color: analysisMode === 'lowMargin' ? '#fbbf24' : '#94a3b8',
              fontWeight: analysisMode === 'lowMargin' ? '600' : '400'
            }}
          >
            <TrendingUp size={20} style={{ marginRight: '0.5rem' }} />
            Низкая наценка
          </button>
        </div>
        <ul style={{ fontSize: '0.8rem', color: '#9ca3af', margin: 0, paddingLeft: '1.2rem' }}>
          <li>«Ниже себестоимости» — товары, где вы гарантированно продаёте себе в убыток.</li>
          <li>«Низкая наценка» — товары, где наценка меньше порога (по умолчанию 10%) и прибыль почти нулевая.</li>
        </ul>
      </div>

      {/* Rate */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 className="card-title text-blue">Параметры анализа</h2>
        <div className={styles.paramsGrid}>
          <div>
            <label className="uploader-label">Курс USD → UZS *</label>
            <input
              type="number"
              value={usdRate}
              onChange={(e) => setUsdRate(e.target.value)}
              placeholder="12500"
              className={styles.rateInput}
              step="0.01"
              min="0"
              required
            />
            <p style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: '#94a3b8' }}>
              Курс на ту дату, которая для вас актуальна (например, текущий день).
            </p>
          </div>
          {analysisMode === 'lowMargin' && (
            <div>
              <label className="uploader-label">Максимальная наценка (%) *</label>
              <input
                type="number"
                value={minMarginPercent}
                onChange={(e) => setMinMarginPercent(e.target.value)}
                placeholder="10"
                className={styles.rateInput}
                step="0.1"
                min="0"
                required
              />
              <p style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                Например, 10% — покажем товары, где наценка меньше 10% и прибыль слишком маленькая.
              </p>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-end', gridColumn: analysisMode === 'lowMargin' ? 'span 1' : 'span 2' }}>
            <button
              onClick={handleAnalyze}
              disabled={isLoading || !usdRate || !bearerToken || (analysisMode === 'lowMargin' && !minMarginPercent)}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="btn-icon spin" size={20} />
                  {loadingStatus || 'Анализирую...'}
                </>
              ) : (
                <>
                  {analysisMode === 'belowCost' ? (
                    <>
                      <TrendingDown className="btn-icon" size={20} />
                      Найти товары с ценой продажи ниже себестоимости
                    </>
                  ) : (
                    <>
                      <TrendingUp className="btn-icon" size={20} />
                      Найти товары с наценкой меньше {minMarginPercent}%
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
        {loadingStatus && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#60a5fa', textAlign: 'center' }}>
            {loadingStatus}
          </p>
        )}
        {progress && (
          <div style={{ marginTop: '1rem', padding: '1.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.9375rem', color: '#60a5fa', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>
                  {progress.stage}
                </span>
                {progress.total > 0 && (
                  <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                    Обработано: {progress.current} из {progress.total} товаров
                  </span>
                )}
              </div>
              {progress.total > 0 && (
                <div style={{ fontSize: '1.25rem', color: '#60a5fa', fontWeight: '700', minWidth: '60px', textAlign: 'right' }}>
                  {Math.round((progress.current / progress.total) * 100)}%
                </div>
              )}
            </div>
            {progress.total > 0 && (
              <>
                <div style={{ width: '100%', height: '12px', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '6px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                  <div
                    style={{
                      width: `${(progress.current / progress.total) * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(to right, #3b82f6, #60a5fa, #a78bfa)',
                      borderRadius: '6px',
                      transition: 'width 0.3s ease',
                      boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                  <span>Начало</span>
                  <span style={{ color: progress.current === progress.total ? '#22c55e' : '#60a5fa', fontWeight: '600' }}>
                    {progress.current === progress.total ? '✓ Завершено' : 'В процессе...'}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
          * {analysisMode === 'belowCost' 
            ? 'Система проверит все товары из справочника МойСклад и найдет те, у которых цена продажи ниже себестоимости'
            : `Система найдет все товары с наценкой меньше ${minMarginPercent}% (исключая товары с отрицательной наценкой)`}
        </p>
      </div>

      {/* Summary */}
      {summary && (
        <div className="card" style={{ 
          marginBottom: '2rem', 
          background: analysisMode === 'lowMargin' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
          borderColor: analysisMode === 'lowMargin' ? 'rgba(245, 158, 11, 0.5)' : 'rgba(239, 68, 68, 0.5)' 
        }}>
          <h2 className="card-title" style={{ color: analysisMode === 'lowMargin' ? '#fbbf24' : '#fca5a5' }}>Сводка</h2>
          <div className={styles.summaryGrid}>
            {analysisMode === 'belowCost' ? (
              <>
                <div>
                  <div className={styles.summaryLabel}>Товаров с ценой продажи ниже себестоимости</div>
                  <div className={styles.summaryValue}>{summary.totalProducts}</div>
                </div>
                <div>
                  <div className={styles.summaryLabel}>Общий убыток (разница)</div>
                  <div className={styles.summaryValue}>{formatNumber(summary.totalLoss)} UZS</div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className={styles.summaryLabel}>Товаров с наценкой &lt; {minMarginPercent}%</div>
                  <div className={styles.summaryValue}>{summary.totalProducts}</div>
                </div>
                <div>
                  <div className={styles.summaryLabel}>Средняя наценка</div>
                  <div className={styles.summaryValue}>{formatNumber(summary.avgMarginPercent)}%</div>
                </div>
                <div>
                  <div className={styles.summaryLabel}>Общая наценка</div>
                  <div className={styles.summaryValue}>{formatNumber(summary.totalMargin)} UZS</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Results Table */}
      {summary && (
        <div className="results-card" style={{ marginTop: '2rem' }}>
          <div className="results-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 className="card-title" style={{ marginBottom: 0 }}>
              Результаты анализа
              {currentProducts.length > 0 && (
                <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: '#94a3b8', marginLeft: '0.5rem' }}>
                  ({currentProducts.length} {currentProducts.length === 1 ? 'товар' : 'товаров'})
                </span>
              )}
            </h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, maxWidth: '400px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={20} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Поиск по товару, коду..."
                  className={styles.searchInput}
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
              <button
                onClick={exportToExcel}
                className="btn btn-success"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
              >
                <Download size={20} />
                Excel
              </button>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>Код</th>
                  <th>Себестоимость (UZS)</th>
                  <th>Цена продажи (UZS)</th>
                  {analysisMode === 'lowMargin' ? (
                    <>
                      <th>Наценка (UZS)</th>
                      <th>Наценка (%)</th>
                    </>
                  ) : (
                    <th>Разница (убыток)</th>
                  )}
                  <th>Валюта себестоимости</th>
                  <th>Валюта продажи</th>
                </tr>
              </thead>
              <tbody>
                {currentProducts.length === 0 ? (
                  <tr>
                    <td colSpan={analysisMode === 'lowMargin' ? 8 : 7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                        {analysisMode === 'lowMargin' 
                          ? `Товаров с наценкой меньше ${minMarginPercent}% не найдено`
                          : 'Товаров с ценой продажи ниже себестоимости не найдено'}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        {analysisMode === 'lowMargin'
                          ? 'Попробуйте увеличить значение "Максимальная наценка" или проверьте, что у товаров указаны обе цены (себестоимость и цена продажи).'
                          : 'Все товары продаются выше себестоимости. Это хорошо!'}
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={analysisMode === 'lowMargin' ? 8 : 7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      Ничего не найдено по запросу "{searchTerm}"
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>{product.productName}</td>
                      <td className="code">{product.productCode}</td>
                      <td className="qty">
                        {formatNumber(product.buyPriceUZS)}
                        <br />
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          ({product.buyCurrencyCode === 'USD' ? 'USD→UZS' : 'UZS'})
                        </span>
                      </td>
                      <td className="qty" style={{ color: analysisMode === 'lowMargin' ? '#f59e0b' : '#fca5a5' }}>
                        {formatNumber(product.salePriceUZS)}
                        <br />
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          ({product.saleCurrencyCode === 'USD' ? 'USD→UZS' : 'UZS'})
                        </span>
                      </td>
                      {analysisMode === 'lowMargin' ? (
                        <>
                          <td className="qty" style={{ color: '#f59e0b' }}>{formatNumber(product.margin)}</td>
                          <td style={{ 
                            color: product.marginPercent < 5 ? '#ef4444' : '#f59e0b', 
                            fontWeight: 'bold' 
                          }}>
                            {formatNumber(product.marginPercent)}%
                          </td>
                        </>
                      ) : (
                        <td style={{ color: '#ef4444', fontWeight: 'bold' }}>{formatNumber(product.loss)}</td>
                      )}
                      <td className="meta">{product.buyPriceCurrency}</td>
                      <td className="meta">{product.salePriceCurrency}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Navigation Link */}
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <a href="/" style={{ color: '#60a5fa', textDecoration: 'none' }}>
          ← Вернуться на главную
        </a>
      </div>
    </main>
  );
}
