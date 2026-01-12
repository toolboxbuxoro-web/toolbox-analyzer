'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, Calculator, CheckCircle2, Download } from 'lucide-react';
import { formatNumber, parseNumber, calculatePercentages, formatDateForDisplay, formatDateForInput } from '@/utils/salesCalculator';
import ExcelJS from 'exceljs';
import styles from './page.module.css';

export default function SalesAnalysis() {
  const [bearerToken, setBearerToken] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouses, setSelectedWarehouses] = useState([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
  const [weeks, setWeeks] = useState([
    { id: 1, startDate: '', endDate: '', plan: '', planPercent: '' },
    { id: 2, startDate: '', endDate: '', plan: '', planPercent: '' },
    { id: 3, startDate: '', endDate: '', plan: '', planPercent: '' },
    { id: 4, startDate: '', endDate: '', plan: '', planPercent: '' },
  ]);
  const [results, setResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [calculatingWeek, setCalculatingWeek] = useState(null);
  const [monthlyPlan, setMonthlyPlan] = useState(''); // Месячный план
  const [selectedMonth, setSelectedMonth] = useState(''); // Выбранный месяц (YYYY-MM)

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


  const handleWeekChange = (weekId, field, value) => {
    setWeeks(prev => prev.map(week => {
      if (week.id === weekId) {
        return { ...week, [field]: value };
      }
      return week;
    }));
  };



  const fetchWeekData = async (week, token, warehouses) => {
    // Преобразуем дату из формата YYYY-MM-DD в DD.MM.YY для API
    const startDateFormatted = formatDateForDisplay(week.startDate);
    const endDateFormatted = formatDateForDisplay(week.endDate);

    const response = await fetch('/api/moysklad/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        dateFrom: startDateFormatted,
        dateTo: endDateFormatted,
        warehouseIds: warehouses,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Ошибка при получении данных');
    }

    const data = await response.json();
    return {
      id: week.id,
      startDate: startDateFormatted,
      endDate: endDateFormatted,
      fact: data.actual || 0,
      checks: data.checkCount || 0,
      visitors: data.visitors || 0,
    };
  };

  const calculateAllWeeks = async (weeksToCalculate) => {
    if (!monthlyPlan) {
      setError('Введите месячный план');
      return;
    }

    if (selectedWarehouses.length === 0) {
      setError('Выберите хотя бы один склад');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const promises = weeksToCalculate.map(week => fetchWeekData(week, bearerToken, selectedWarehouses));
      const resultsData = await Promise.all(promises);

      setResults(prev => {
        const newResults = {
          weeks: resultsData,
          totalPlan: parseNumber(monthlyPlan),
          totalFact: 0,
          totalChecks: 0,
        };

        newResults.totalFact = newResults.weeks.reduce((sum, w) => sum + w.fact, 0);
        newResults.totalChecks = newResults.weeks.reduce((sum, w) => sum + w.checks, 0);

        return newResults;
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setIsCalculating(false);
    }
  };

  // Автоматическое разделение месяца на 4 недели
  const autoFillWeeks = () => {
    if (!selectedMonth) return;

    const [year, month] = selectedMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0); // Последний день месяца
    const totalDays = lastDay.getDate();

    // Рассчитываем дни для каждой недели (примерно 7 дней)
    const weekDays = Math.ceil(totalDays / 4);

    const newWeeks = [];
    let currentDay = 1;

    for (let i = 1; i <= 4; i++) {
      const startDay = currentDay;
      let endDay = Math.min(currentDay + weekDays - 1, totalDays);

      // Последняя неделя забирает все оставшиеся дни
      if (i === 4) {
        endDay = totalDays;
      }

      const startDate = new Date(year, month - 1, startDay);
      const endDate = new Date(year, month - 1, endDay);

      // Формат YYYY-MM-DD
      const formatDate = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };

      newWeeks.push({
        id: i,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        plan: '',
        planPercent: ''
      });

      currentDay = endDay + 1;
    }

    setWeeks(newWeeks);

    // Если есть план и выбраны склады, сразу считаем
    if (monthlyPlan && selectedWarehouses.length > 0) {
      calculateAllWeeks(newWeeks);
    }
  };

  const calculateWeek = async (weekId) => {
    const week = weeks.find(w => w.id === weekId);
    if (!week.startDate || !week.endDate) {
      setError('Заполните даты для недели');
      return;
    }

    if (!monthlyPlan) {
      setError('Введите месячный план');
      return;
    }

    if (selectedWarehouses.length === 0) {
      setError('Выберите хотя бы один склад');
      return;
    }

    setIsCalculating(true);
    setCalculatingWeek(weekId);
    setError(null);

    try {
      // Преобразуем дату из формата YYYY-MM-DD в DD.MM.YY для API
      const startDateFormatted = formatDateForDisplay(week.startDate);
      const endDateFormatted = formatDateForDisplay(week.endDate);

      const response = await fetch('/api/moysklad/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateFrom: startDateFormatted,
          dateTo: endDateFormatted,
          warehouseIds: selectedWarehouses,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Ошибка при получении данных');
      }

      const data = await response.json();

      // Update results
      setResults(prev => {
        const newResults = prev ? { ...prev } : {
          weeks: [],
          totalPlan: 0,
          totalFact: 0,
          totalChecks: 0,
        };

        const weekIndex = newResults.weeks.findIndex(w => w.id === weekId);
        const weekData = {
          id: weekId,
          startDate: startDateFormatted,
          endDate: endDateFormatted,
          fact: data.actual || 0,
          checks: data.checkCount || 0,
          visitors: data.visitors || 0,
        };

        if (weekIndex >= 0) {
          newResults.weeks[weekIndex] = weekData;
        } else {
          newResults.weeks.push(weekData);
        }

        // Используем введённый месячный план
        newResults.totalPlan = parseNumber(monthlyPlan);
        newResults.totalFact = newResults.weeks.reduce((sum, w) => sum + w.fact, 0);
        newResults.totalChecks = newResults.weeks.reduce((sum, w) => sum + w.checks, 0);

        return newResults;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCalculating(false);
      setCalculatingWeek(null);
    }
  };

  // Функция экспорта в Excel с красивым форматированием
  const exportToExcel = async () => {
    if (!results || results.weeks.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Toolbox Sklad';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Анализ продаж', {
      properties: { tabColor: { argb: '3B82F6' } }
    });

    // Заголовок отчета
    worksheet.mergeCells('A1:I1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Анализ продаж';
    titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: '1E3A8A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 35;

    // Дата отчета
    worksheet.mergeCells('A2:I2');
    const dateCell = worksheet.getCell('A2');
    dateCell.value = `Дата формирования: ${new Date().toLocaleDateString('ru-RU')}`;
    dateCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '6B7280' } };
    dateCell.alignment = { horizontal: 'center' };
    worksheet.getRow(2).height = 20;

    // Пустая строка
    worksheet.getRow(3).height = 10;

    // Заголовки таблицы
    const headers = ['Неделя', 'Факт', 'Факт % от месяца', 'Кол-во чеков', 'Средний чек', 'Посетители'];
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 25;

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '3B82F6' }
      };
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: '1E3A8A' } },
        left: { style: 'thin', color: { argb: '1E3A8A' } },
        bottom: { style: 'thin', color: { argb: '1E3A8A' } },
        right: { style: 'thin', color: { argb: '1E3A8A' } }
      };
    });

    // Данные по неделям
    results.weeks
      .sort((a, b) => a.id - b.id)
      .forEach((week, index) => {
        const factPercent = results.totalPlan > 0 ? (week.fact / results.totalPlan) * 100 : 0;
        const avgCheck = week.checks > 0 ? Math.round(week.fact / week.checks) : 0;

        const row = worksheet.addRow([
          `Неделя ${week.id} (${week.startDate}-${week.endDate})`,
          week.fact,
          `${factPercent.toFixed(2)}%`,
          week.checks,
          avgCheck,
          week.visitors || 0
        ]);
        row.height = 30;

        const isEven = index % 2 === 0;
        row.eachCell((cell, colNumber) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isEven ? 'F8FAFC' : 'FFFFFF' }
          };
          cell.font = { name: 'Arial', size: 10 };
          cell.alignment = { horizontal: colNumber === 1 ? 'left' : 'center', vertical: 'middle', wrapText: true };
          cell.border = {
            top: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } }
          };

          // Форматирование чисел
          if (colNumber === 2 || colNumber === 4 || colNumber === 5 || colNumber === 6) {
            cell.numFmt = '#,##0';
          }
        });
      });

    // Итоговая строка
    const totalPercent = (results.totalFact / results.totalPlan) * 100;
    const totalRow = worksheet.addRow([
      `ИТОГО (Месячный план: ${formatNumber(results.totalPlan)})`,
      results.totalFact,
      `${totalPercent.toFixed(2)}%`,
      results.totalChecks,
      results.totalChecks > 0 ? Math.round(results.totalFact / results.totalChecks) : 0,
      results.weeks.reduce((sum, w) => sum + (w.visitors || 0), 0)
    ]);
    totalRow.height = 30;

    totalRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'DBEAFE' }
      };
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: '1E3A8A' } };
      cell.alignment = { horizontal: colNumber === 1 ? 'left' : 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'medium', color: { argb: '3B82F6' } },
        left: { style: 'thin', color: { argb: '3B82F6' } },
        bottom: { style: 'medium', color: { argb: '3B82F6' } },
        right: { style: 'thin', color: { argb: '3B82F6' } }
      };

      if (colNumber === 3) {
        cell.font = {
          name: 'Arial',
          size: 11,
          bold: true,
          color: { argb: totalPercent < 100 ? 'DC2626' : '16A34A' }
        };
      }

      if (colNumber === 2 || colNumber === 4 || colNumber === 5 || colNumber === 6) {
        cell.numFmt = '#,##0';
      }
    });

    // Ширина колонок
    worksheet.columns = [
      { width: 35 },  // Неделя
      { width: 18 },  // Факт
      { width: 18 },  // Факт %
      { width: 14 },  // Кол-во чеков
      { width: 14 },  // Средний чек
      { width: 14 },  // Посетители
    ];

    // Скачивание файла
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Анализ_продаж_${new Date().toLocaleDateString('ru-RU').replace(/\\./g, '_')}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <main className="container">
      <header className="header">
        <h1 className="title">Анализ продаж</h1>
        <p className="subtitle">Анализ продаж по неделям с интеграцией Мой склад</p>
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

      {/* Warehouses Selection */}
      {warehouses.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 className="card-title text-purple">Выбор складов</h2>
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
      {/* Monthly Plan */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 className="card-title text-blue">Месячный план</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <label className="uploader-label">Сумма плана</label>
            <input
              type="text"
              value={monthlyPlan}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setMonthlyPlan(value);
              }}
              placeholder="730000000"
              className={styles.planInput}
              style={{ maxWidth: '200px' }}
            />
          </div>
          <div>
            <label className="uploader-label">Месяц</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className={styles.dateInput}
              style={{ minWidth: '150px' }}
            />
          </div>
          <button
            onClick={autoFillWeeks}
            disabled={!selectedMonth}
            className="btn btn-primary"
            style={{ alignSelf: 'flex-end', marginBottom: '0.5rem' }}
          >
            Разделить на 4 недели
          </button>
          {monthlyPlan && (
            <span style={{ color: '#94a3b8', fontSize: '0.875rem', alignSelf: 'flex-end', marginBottom: '0.75rem' }}>
              = {formatNumber(parseNumber(monthlyPlan))}
            </span>
          )}
        </div>
      </div>

      {/* Weeks Form */}
      <div className={styles.weeksContainer}>
        {weeks.map((week) => (
          <div key={week.id} className="card">
            <h3 className="card-title" style={{ fontSize: '1rem', marginBottom: '1rem' }}>
              Неделя {week.id}
            </h3>
            <div className={styles.weekForm}>
              <div>
                <label className="uploader-label">Дата начала</label>
                <input
                  type="date"
                  value={formatDateForInput(week.startDate)}
                  onChange={(e) => handleWeekChange(week.id, 'startDate', e.target.value)}
                  className={styles.dateInput}
                />
              </div>
              <div>
                <label className="uploader-label">Дата конца</label>
                <input
                  type="date"
                  value={formatDateForInput(week.endDate)}
                  onChange={(e) => handleWeekChange(week.id, 'endDate', e.target.value)}
                  className={styles.dateInput}
                />
              </div>
              <button
                onClick={() => calculateWeek(week.id)}
                disabled={isCalculating || !week.startDate || !week.endDate || !monthlyPlan || selectedWarehouses.length === 0}
                className="btn btn-primary"
                style={{ alignSelf: 'flex-end' }}
              >
                {isCalculating && calculatingWeek === week.id ? (
                  <>
                    <RefreshCw className="btn-icon spin" size={20} />
                    Расчет...
                  </>
                ) : (
                  <>
                    <Calculator className="btn-icon" size={20} />
                    Рассчитать
                  </>
                )}
              </button>
            </div>
            {week.plan && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                План: {formatNumber(parseNumber(week.plan))}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Results Table */}
      {results && results.weeks.length > 0 && (
        <div className="results-card" style={{ marginTop: '2rem' }}>
          <div className="results-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title" style={{ marginBottom: 0 }}>Результаты анализа</h2>
            <button
              onClick={exportToExcel}
              className="btn btn-success"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Download size={20} />
              Скачать Excel
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Неделя</th>
                  <th>Факт</th>
                  <th>Факт % от месяца</th>
                  <th>Кол-во чеков</th>
                  <th>Средний чек</th>
                  <th>Посетители</th>
                </tr>
              </thead>
              <tbody>
                {results.weeks
                  .sort((a, b) => a.id - b.id)
                  .map((week) => {
                    const factPercent = results.totalPlan > 0 ? (week.fact / results.totalPlan) * 100 : 0;
                    const avgCheck = week.checks > 0 ? week.fact / week.checks : 0;

                    return (
                      <tr key={week.id}>
                        <td>Неделя {week.id}<br />({week.startDate}-{week.endDate})</td>
                        <td className="qty">{formatNumber(week.fact)}</td>
                        <td>{factPercent.toFixed(2)}%</td>
                        <td>{formatNumber(week.checks)}</td>
                        <td>{formatNumber(Math.round(avgCheck))}</td>
                        <td>{formatNumber(week.visitors)}</td>
                      </tr>
                    );
                  })}
                {/* Total Row */}
                {results.totalPlan > 0 && (
                  <tr style={{ fontWeight: 'bold', background: 'rgba(59, 130, 246, 0.1)' }}>
                    <td>ИТОГО (Месячный план: {formatNumber(results.totalPlan)})</td>
                    <td className="qty">{formatNumber(results.totalFact)}</td>
                    <td className={results.totalFact < results.totalPlan ? styles.negative : styles.positive}>
                      {((results.totalFact / results.totalPlan) * 100).toFixed(2)}%
                    </td>
                    <td>{formatNumber(results.totalChecks)}</td>
                    <td>
                      {results.totalChecks > 0
                        ? formatNumber(Math.round(results.totalFact / results.totalChecks))
                        : '0'}
                    </td>
                    <td>{formatNumber(results.weeks.reduce((sum, w) => sum + (w.visitors || 0), 0))}</td>
                  </tr>
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
