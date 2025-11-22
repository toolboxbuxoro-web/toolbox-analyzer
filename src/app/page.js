'use client';

import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import { analyzeData } from '@/utils/analyzer';
import { Play, Download, RefreshCw, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Home() {
  const [warehouseFiles, setWarehouseFiles] = useState([]);
  const [storeFiles, setStoreFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    setHasAnalyzed(false);
    try {
      if (warehouseFiles.length === 0 || storeFiles.length === 0) {
        throw new Error('Пожалуйста, загрузите хотя бы один файл для склада и магазина.');
      }
      const data = await analyzeData(warehouseFiles, storeFiles);
      setResults(data);
      setHasAnalyzed(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportToExcel = (storeResult) => {
    const ws = XLSX.utils.json_to_sheet(storeResult.items);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Рекомендации");
    XLSX.writeFile(wb, `отсутствующие_товары_${storeResult.storeName}.xlsx`);
  };

  return (
    <main className="container">
      <header className="header">
        <h1 className="title">
          Анализатор Toolbox
        </h1>
        <p className="subtitle">
          Оптимизируйте свой инвентарь, определяя товары, доступные на складе, но отсутствующие в магазинах.
        </p>
      </header>

      <div className="grid">
        <div className="card">
          <h2 className="card-title text-blue">Данные склада</h2>
          <FileUploader label="Загрузите Excel файлы склада" onFilesChange={setWarehouseFiles} />
        </div>
        <div className="card">
          <h2 className="card-title text-purple">Данные магазина</h2>
          <FileUploader label="Загрузите Excel файлы магазина" onFilesChange={setStoreFiles} />
        </div>
      </div>

      <div className="btn-container">
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || warehouseFiles.length === 0 || storeFiles.length === 0}
          className="btn btn-primary"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="btn-icon spin" size={24} />
              Анализирую...
            </>
          ) : (
            <>
              <Play className="btn-icon" size={24} />
              Анализировать инвентарь
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="error-msg">
          <AlertCircle className="btn-icon" size={24} />
          {error}
        </div>
      )}

      {hasAnalyzed && results.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="subtitle" style={{ color: '#94a3b8' }}>
            Анализ завершен. Все товары со склада присутствуют в магазинах!
          </p>
        </div>
      )}

      {results.map((storeResult, storeIdx) => (
        <div key={storeIdx} className="results-card" style={{ marginBottom: '2rem' }}>
          <div className="results-header">
            <div>
              <h3 className="card-title" style={{ marginBottom: 0 }}>
                Отсутствует в: <span className="text-purple">{storeResult.storeName}</span>
              </h3>
              <p className="subtitle" style={{ fontSize: '0.875rem' }}>
                Найдено {storeResult.items.length} товаров, доступных на складе, но отсутствующих здесь.
              </p>
            </div>
            <button
              onClick={() => exportToExcel(storeResult)}
              className="btn btn-success"
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Download size={20} style={{ marginRight: '0.5rem' }} />
                Экспорт {storeResult.storeName}
              </div>
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Код</th>
                  <th>Название</th>
                  <th>Количество на складе</th>
                  <th>Регион</th>
                  <th>Производитель</th>
                </tr>
              </thead>
              <tbody>
                {storeResult.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="code">{item.code}</td>
                    <td>{item.name}</td>
                    <td className="qty">{item.available}</td>
                    <td className="meta">{item.region}</td>
                    <td className="meta">{item.manufacturer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </main>
  );
}
