/**
 * Утилита для расчета метрик продаж
 */

/**
 * Рассчитывает все метрики для недели
 * @param {Object} weekData - Данные недели
 * @param {number} weekData.plan - План на неделю
 * @param {number} weekData.actual - Фактические продажи
 * @param {number} weekData.checkCount - Количество чеков
 * @param {number} totalMonthlyPlan - Общий месячный план
 * @returns {Object} Рассчитанные метрики
 */
export function calculateWeekMetrics(weekData, totalMonthlyPlan) {
  const { plan, actual, checkCount } = weekData;

  // Хафталик план %да = (план недели / общий план месяца) × 100
  const weeklyPlanPercent = totalMonthlyPlan > 0 
    ? (plan / totalMonthlyPlan) * 100 
    : 0;

  // Хафталик факт %да = (факт недели / общий план месяца) × 100
  const weeklyActualPercent = totalMonthlyPlan > 0 
    ? (actual / totalMonthlyPlan) * 100 
    : 0;

  // Отставание %да = Хафталик факт %да - Хафталик план %да
  const deviationPercent = weeklyActualPercent - weeklyPlanPercent;

  // Уртача чек = Факт / Чек сони
  const averageCheck = checkCount > 0 ? actual / checkCount : 0;

  return {
    weeklyPlanPercent: Number(weeklyPlanPercent.toFixed(2)),
    weeklyActualPercent: Number(weeklyActualPercent.toFixed(2)),
    deviationPercent: Number(deviationPercent.toFixed(2)),
    averageCheck: Math.round(averageCheck),
  };
}

/**
 * Рассчитывает итоговые метрики для месяца
 * @param {Array} weeksData - Массив данных по неделям
 * @returns {Object} Итоговые метрики
 */
export function calculateMonthlyMetrics(weeksData) {
  const totalPlan = weeksData.reduce((sum, week) => sum + (week.plan || 0), 0);
  const totalActual = weeksData.reduce((sum, week) => sum + (week.actual || 0), 0);
  const totalCheckCount = weeksData.reduce((sum, week) => sum + (week.checkCount || 0), 0);

  const monthlyPlanPercent = 100; // Всегда 100% для месячного плана
  const monthlyActualPercent = totalPlan > 0 
    ? (totalActual / totalPlan) * 100 
    : 0;
  const monthlyDeviationPercent = monthlyActualPercent - monthlyPlanPercent;
  const monthlyAverageCheck = totalCheckCount > 0 
    ? totalActual / totalCheckCount 
    : 0;

  return {
    plan: totalPlan,
    actual: totalActual,
    weeklyPlanPercent: monthlyPlanPercent,
    weeklyActualPercent: Number(monthlyActualPercent.toFixed(2)),
    deviationPercent: Number(monthlyDeviationPercent.toFixed(2)),
    checkCount: totalCheckCount,
    averageCheck: Math.round(monthlyAverageCheck),
  };
}

/**
 * Форматирует число с разделителями тысяч
 * @param {number} num - Число для форматирования
 * @returns {string} Отформатированное число
 */
export function formatNumber(num) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(num));
}

/**
 * Форматирует процент
 * @param {number} percent - Процент
 * @returns {string} Отформатированный процент
 */
export function formatPercent(percent) {
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
}

/**
 * Парсит число из строки (удаляет все нецифровые символы)
 * @param {string} str - Строка с числом
 * @returns {number} Распарсенное число
 */
export function parseNumber(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/\D/g, '');
  return parseInt(cleaned, 10) || 0;
}

/**
 * Форматирует дату из формата YYYY-MM-DD в DD.MM.YY
 * @param {string} dateStr - Дата в формате YYYY-MM-DD
 * @returns {string} Дата в формате DD.MM.YY
 */
export function formatDateForDisplay(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
}

/**
 * Форматирует дату из формата DD.MM.YY в YYYY-MM-DD для input[type="date"]
 * @param {string} dateStr - Дата в формате DD.MM.YY или YYYY-MM-DD
 * @returns {string} Дата в формате YYYY-MM-DD
 */
export function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  
  // Если уже в формате YYYY-MM-DD, возвращаем как есть
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Парсим формат DD.MM.YY
  const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (match) {
    const [, day, month, year] = match;
    return `20${year}-${month}-${day}`;
  }
  
  return dateStr;
}

/**
 * Рассчитывает проценты для недели
 * @param {number} plan - План недели
 * @param {number} actual - Факт недели
 * @param {number} totalPlan - Общий месячный план
 * @returns {Object} Проценты
 */
export function calculatePercentages(plan, actual, totalPlan) {
  const planPercent = totalPlan > 0 ? (plan / totalPlan) * 100 : 0;
  const factPercent = totalPlan > 0 ? (actual / totalPlan) * 100 : 0;
  const difference = factPercent - planPercent;
  
  return {
    planPercent: Number(planPercent.toFixed(2)),
    factPercent: Number(factPercent.toFixed(2)),
    difference: Number(difference.toFixed(2)),
  };
}
