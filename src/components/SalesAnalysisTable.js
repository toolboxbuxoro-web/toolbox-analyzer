'use client';

/**
 * Компонент таблицы для отображения результатов анализа продаж
 * @param {Object} props
 * @param {Array} props.weeklyData - Массив данных для каждой недели
 * @param {Object} props.monthlyTotal - Итоговые данные за месяц
 */
export default function SalesAnalysisTable({ weeklyData = [], monthlyTotal = null }) {
  // Форматирование числа с разделителями тысяч
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '-';
    return new Intl.NumberFormat('ru-RU').format(Math.round(num));
  };

  // Форматирование процента
  const formatPercent = (num) => {
    if (num === null || num === undefined) return '-';
    return `${num.toFixed(2)}%`;
  };

  // Форматирование даты в формате DD.MM.YY
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      return `${day}.${month}.${year}`;
    } catch {
      return dateString;
    }
  };

  // Если нет данных, показываем пустую таблицу
  if (!weeklyData || weeklyData.length === 0) {
    return (
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Хафта</th>
              <th>План</th>
              <th>Факт</th>
              <th>Хафталик план %да</th>
              <th>Хафталик факт %да</th>
              <th>Отставание %да</th>
              <th>Чек сони</th>
              <th>Уртача чек</th>
              <th>Посетители</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                Нет данных для отображения
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="sales-analysis-table">
        <thead>
          <tr>
            <th>Хафта</th>
            <th>План</th>
            <th>Факт</th>
            <th>Хафталик план %да</th>
            <th>Хафталик факт %да</th>
            <th>Отставание %да</th>
            <th>Чек сони</th>
            <th>Уртача чек</th>
            <th>Посетители</th>
          </tr>
        </thead>
        <tbody>
          {/* Строки для каждой недели */}
          {weeklyData.map((week, index) => (
            <tr key={index} className="week-row">
              <td className="week-label">
                {week.startDate && week.endDate
                  ? `${formatDate(week.startDate)} - ${formatDate(week.endDate)}`
                  : `Хафта ${index + 1}`}
              </td>
              <td className="number-cell">{formatNumber(week.plan)}</td>
              <td className="number-cell">{formatNumber(week.fact)}</td>
              <td className="percent-cell">{formatPercent(week.weeklyPlanPercent)}</td>
              <td className="percent-cell">{formatPercent(week.weeklyFactPercent)}</td>
              <td className={`percent-cell ${week.gapPercent < 0 ? 'negative' : ''}`}>
                {formatPercent(week.gapPercent)}
              </td>
              <td className="number-cell">{formatNumber(week.checkCount)}</td>
              <td className="number-cell">{formatNumber(week.averageCheck)}</td>
              <td className="number-cell">{formatNumber(week.visitors)}</td>
            </tr>
          ))}

          {/* Итоговая строка "Ойлик план" */}
          {monthlyTotal && (
            <tr className="monthly-total-row">
              <td className="total-label">
                <strong>Ойлик план</strong>
              </td>
              <td className="number-cell total">
                <strong>{formatNumber(monthlyTotal.plan)}</strong>
              </td>
              <td className="number-cell total">
                <strong>{formatNumber(monthlyTotal.fact)}</strong>
              </td>
              <td className="percent-cell total">
                <strong>{formatPercent(monthlyTotal.weeklyPlanPercent)}</strong>
              </td>
              <td className="percent-cell total">
                <strong>{formatPercent(monthlyTotal.weeklyFactPercent)}</strong>
              </td>
              <td className={`percent-cell total ${monthlyTotal.gapPercent < 0 ? 'negative' : ''}`}>
                <strong>{formatPercent(monthlyTotal.gapPercent)}</strong>
              </td>
              <td className="number-cell total">
                <strong>{formatNumber(monthlyTotal.checkCount)}</strong>
              </td>
              <td className="number-cell total">
                <strong>{formatNumber(monthlyTotal.averageCheck)}</strong>
              </td>
              <td className="number-cell total">
                <strong>{formatNumber(monthlyTotal.visitors)}</strong>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
