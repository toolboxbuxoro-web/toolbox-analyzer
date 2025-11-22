'use client';

import { useState } from 'react';
import { Upload, X, FileSpreadsheet } from 'lucide-react';

export default function FileUploader({ label, onFilesChange }) {
    const [files, setFiles] = useState([]);

    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        const updatedFiles = [...files, ...newFiles];
        setFiles(updatedFiles);
        onFilesChange(updatedFiles);
    };

    const removeFile = (index) => {
        const updatedFiles = files.filter((_, i) => i !== index);
        setFiles(updatedFiles);
        onFilesChange(updatedFiles);
    };

    return (
        <div style={{ width: '100%', marginBottom: '1.5rem' }}>
            <label className="uploader-label">{label}</label>
            <div className="dropzone">
                <input
                    type="file"
                    multiple
                    accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleFileChange}
                    className="file-input"
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Upload size={40} color="#94a3b8" />
                    <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                        Перетащите файлы или нажмите для выбора
                    </p>
                </div>
            </div>

            {files.length > 0 && (
                <ul className="file-list">
                    {files.map((file, index) => (
                        <li key={index} className="file-item">
                            <div className="file-info">
                                <FileSpreadsheet size={20} color="#22c55e" style={{ marginRight: '0.5rem' }} />
                                <span className="file-name">{file.name}</span>
                            </div>
                            <button
                                onClick={() => removeFile(index)}
                                className="remove-btn"
                            >
                                <X size={16} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
