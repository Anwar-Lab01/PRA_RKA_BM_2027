import { useState, useEffect } from 'react';
import { parseMapData } from '../lib/mapHelpers';

export default function CoordinatePastePanel({ onApplyData, onResetData }) {
  const [inputText, setInputText] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Load saved raw text on mount
  useEffect(() => {
    const saved = localStorage.getItem('pra_rka_pasted_data');
    if (saved) {
      setInputText(saved);
    }
  }, []);

  const handleApply = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!inputText.trim()) {
      setErrorMsg('Teks kosong. Silakan paste JSON array.');
      return;
    }

    const result = parseMapData(inputText);
    if (result.error) {
      setErrorMsg(result.error);
    } else {
      setSuccessMsg(`Berhasil memuat ${result.data.length} objek spasial.`);
      localStorage.setItem('pra_rka_pasted_data', inputText); // Save raw data
      onApplyData(result.data); // Pass parsed clean data
    }
  };

  const handleReset = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setInputText('');
    localStorage.removeItem('pra_rka_pasted_data');
    onResetData(); // Fallback back to default legacy data
  };

  return (
    <div className="card" style={{ marginTop: '24px' }}>
      <h3 className="card-title">Panel Paste Koordinat Manual (JSON)</h3>
      <p className="text-secondary" style={{ marginBottom: 16 }}>
        Jika peta error tertutup atau Anda ingin mengganti koordinat, paste isi file JSON di sini secara langsung.
      </p>

      {errorMsg && <div className="msg msg-error">{errorMsg}</div>}
      {successMsg && <div className="msg msg-success">{successMsg}</div>}

      <textarea 
        className="form-group"
        value={inputText}
        onChange={e => setInputText(e.target.value)}
        placeholder='[\n  {\n    "ref": "ruas_001",\n    "input": "Nama Ruas / Paket",\n    "geometryType": "line",\n    "coordinates": [[115.1, -2.7], [115.2, -2.8]]\n  }\n]'
        style={{ width: '100%', minHeight: '150px', padding: 12, fontFamily: 'monospace', fontSize: 13, border: '1px solid var(--color-border)', borderRadius: 8, resize: 'vertical' }}
      />
      
      <div className="form-actions" style={{ marginTop: 16, justifyContent: 'flex-start' }}>
        <button className="btn btn-primary" onClick={handleApply}>Gunakan Data Paste</button>
        <button className="btn btn-secondary" onClick={handleReset}>Reset ke Data Default</button>
      </div>
    </div>
  );
}
