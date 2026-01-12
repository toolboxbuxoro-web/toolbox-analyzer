'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertCircle, Warehouse } from 'lucide-react';
import styles from './WarehouseSelector.module.css';

/**
 * Компонент выбора складов с загрузкой списка из API Мой склад
 * 
 * @param {string} bearerToken - Bearer Token для авторизации в API Мой склад
 * @param {string[]} selectedWarehouses - Массив ID выбранных складов
 * @param {function} onSelectionChange - Callback функция, вызываемая при изменении выбора (warehouseIds: string[]) => void
 * @param {boolean} autoLoad - Автоматически загружать склады при изменении токена (по умолчанию true)
 */
export default function WarehouseSelector({
  bearerToken,
  selectedWarehouses = [],
  onSelectionChange,
  autoLoad = true,
}) {
  const [warehouses, setWarehouses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadWarehouses = useCallback(async () => {
    if (!bearerToken) {
      setError('Bearer Token не указан');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Сохраняем токен в API (для использования в других запросах)
      await fetch('/api/moysklad/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: bearerToken }),
      });

      // Загружаем список складов
      const response = await fetch('/api/moysklad/warehouses', {
        headers: { 'Authorization': `Bearer ${bearerToken}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Не удалось загрузить список складов');
      }

      const data = await response.json();
      const loadedWarehouses = data.warehouses || [];
      
      // Фильтруем только неархивированные склады
      const activeWarehouses = loadedWarehouses.filter(w => !w.archived);
      
      setWarehouses(activeWarehouses);
      
      // Если были выбраны склады, которые больше не существуют, очищаем их
      if (selectedWarehouses.length > 0) {
        const validIds = activeWarehouses.map(w => w.id);
        const invalidIds = selectedWarehouses.filter(id => !validIds.includes(id));
        if (invalidIds.length > 0 && onSelectionChange) {
          onSelectionChange(selectedWarehouses.filter(id => validIds.includes(id)));
        }
      }
    } catch (err) {
      setError(err.message);
      setWarehouses([]);
    } finally {
      setIsLoading(false);
    }
  }, [bearerToken, selectedWarehouses, onSelectionChange]);

  // Загрузка складов при изменении токена
  useEffect(() => {
    if (autoLoad && bearerToken) {
      loadWarehouses();
    } else if (!bearerToken) {
      // Очищаем список складов при отсутствии токена
      setWarehouses([]);
      setError(null);
    }
  }, [bearerToken, autoLoad, loadWarehouses]);

  const handleWarehouseToggle = (warehouseId) => {
    if (!onSelectionChange) return;

    const newSelection = selectedWarehouses.includes(warehouseId)
      ? selectedWarehouses.filter(id => id !== warehouseId)
      : [...selectedWarehouses, warehouseId];

    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    const allIds = warehouses.map(w => w.id);
    onSelectionChange(allIds);
  };

  const handleDeselectAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange([]);
  };

  // Если токен не указан, не показываем компонент
  if (!bearerToken) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <Warehouse size={20} style={{ marginRight: '0.5rem' }} />
          Выбор складов
        </h3>
        {warehouses.length > 0 && (
          <div className={styles.actions}>
            <button
              type="button"
              onClick={handleSelectAll}
              className={styles.actionButton}
              disabled={selectedWarehouses.length === warehouses.length}
            >
              Выбрать все
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className={styles.actionButton}
              disabled={selectedWarehouses.length === 0}
            >
              Снять все
            </button>
            <button
              type="button"
              onClick={loadWarehouses}
              className={styles.refreshButton}
              disabled={isLoading}
              title="Обновить список складов"
            >
              <RefreshCw size={16} className={isLoading ? styles.spin : ''} />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className={styles.error}>
          <AlertCircle size={20} />
          <span>{error}</span>
          <button
            type="button"
            onClick={loadWarehouses}
            className={styles.retryButton}
            disabled={isLoading}
          >
            Повторить
          </button>
        </div>
      )}

      {isLoading && (
        <div className={styles.loading}>
          <RefreshCw size={24} className={styles.spin} />
          <span>Загрузка складов...</span>
        </div>
      )}

      {!isLoading && !error && warehouses.length === 0 && bearerToken && (
        <div className={styles.empty}>
          <Warehouse size={32} />
          <p>Склады не найдены</p>
          <button
            type="button"
            onClick={loadWarehouses}
            className={styles.retryButton}
          >
            Загрузить склады
          </button>
        </div>
      )}

      {!isLoading && !error && warehouses.length > 0 && (
        <>
          <div className={styles.warehouseGrid}>
            {warehouses.map((warehouse) => (
              <label
                key={warehouse.id}
                className={`${styles.warehouseCheckbox} ${
                  selectedWarehouses.includes(warehouse.id) ? styles.checked : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedWarehouses.includes(warehouse.id)}
                  onChange={() => handleWarehouseToggle(warehouse.id)}
                />
                <span className={styles.warehouseName}>{warehouse.name}</span>
                {warehouse.code && (
                  <span className={styles.warehouseCode}>{warehouse.code}</span>
                )}
              </label>
            ))}
          </div>
          {selectedWarehouses.length > 0 && (
            <div className={styles.selectionInfo}>
              Выбрано складов: <strong>{selectedWarehouses.length}</strong> из {warehouses.length}
            </div>
          )}
        </>
      )}
    </div>
  );
}
