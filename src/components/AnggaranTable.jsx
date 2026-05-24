import { useState } from 'react';
import { formatRupiah } from '../lib/formatRupiah.js';

/**
 * AnggaranTable - presentational component.
 */
export default function AnggaranTable({
  data,
  loading,
  onDeleteRow,
  deletingId,
  kecamatanMaster = [],
  overrideByAnggaranId = {},
  onSaveKecamatanOverride,
  onClearKecamatanOverride,
  overrideSavingId
}) {
  const [editingAnggaranId, setEditingAnggaranId] = useState(null);
  const [selectedKecamatanValue, setSelectedKecamatanValue] = useState('');
  const VIRTUAL_OPTIONS = [
    { value: 'kabupaten_umum', label: 'Kabupaten / Umum' },
    { value: 'honorarium', label: 'Honorarium' },
    { value: 'lainnya', label: 'Lainnya' },
    { value: 'tidak_diketahui', label: 'Tidak Diketahui' }
  ];

  const resolveAnggaranId = (row) => row?.id || row?.anggaran_id;

  const startEdit = (row) => {
    const anggaranId = resolveAnggaranId(row);
    const current = overrideByAnggaranId[anggaranId];
    const virtual = VIRTUAL_OPTIONS.find(
      (opt) => opt.label === current?.mapped_kecamatan_nama
    );
    setEditingAnggaranId(anggaranId);
    setSelectedKecamatanValue(
      current?.mapped_kecamatan_id || virtual?.value || ''
    );
  };

  const cancelEdit = () => {
    setEditingAnggaranId(null);
    setSelectedKecamatanValue('');
  };

  const saveEdit = async (row) => {
    if (!selectedKecamatanValue || typeof onSaveKecamatanOverride !== 'function') return;
    await onSaveKecamatanOverride(row, selectedKecamatanValue);
    cancelEdit();
  };

  const clearEdit = async (row) => {
    if (typeof onClearKecamatanOverride !== 'function') return;
    await onClearKecamatanOverride(row);
    cancelEdit();
  };

  if (loading) {
    return (
      <div className="state-box">
        <div className="spinner" />
        <p style={{ marginTop: 8 }}>Memuat data anggaran...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="state-box">
        <div className="icon">??</div>
        <p>Belum ada data anggaran.</p>
        <p style={{ fontSize: 12, marginTop: 4 }}>
          Gunakan form di atas untuk menambahkan data baru.
        </p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Tahun</th>
            <th>Sub Kegiatan</th>
            <th>Nama Paket</th>
            <th>Kecamatan</th>
            <th className="text-right">Pagu Fisik</th>
            <th className="text-right">Pagu Perencanaan</th>
            <th className="text-right">Pagu Pengawasan</th>
            <th className="text-right">Pagu Honor</th>
            <th className="text-right">Total Pagu</th>
            {typeof onDeleteRow === 'function' && <th>Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const anggaranId = resolveAnggaranId(row);
            const override = overrideByAnggaranId[anggaranId];
            const effectiveKecamatan =
              override?.mapped_kecamatan_nama || row.kecamatan || 'Tidak Diketahui';
            const isEditing = editingAnggaranId === anggaranId;
            const isOverrideSaving = overrideSavingId === anggaranId;

            return (
              <tr key={row.id || row.anggaran_id}>
                <td>{idx + 1}</td>
                <td>{row.tahun}</td>
                <td>
                  {row.sub_kegiatan
                    ? `${row.sub_kegiatan.kode} - ${row.sub_kegiatan.nama}`
                    : '-'}
                </td>
                <td>
                  <div style={{ fontWeight: 500, marginBottom: 6 }}>{row.nama_paket}</div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {Number(row.pagu_fisik) > 0 && <span className="badge badge-fisik">Fisik</span>}
                    {Number(row.pagu_perencanaan) > 0 && <span className="badge badge-perencanaan">Perencanaan</span>}
                    {Number(row.pagu_pengawasan) > 0 && <span className="badge badge-pengawasan">Pengawasan</span>}
                    {Number(row.pagu_honor) > 0 && <span className="badge badge-honor">Honor</span>}
                  </div>
                </td>
                <td>
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      style={{ background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                    >
                      <div style={{ fontWeight: 500 }}>{effectiveKecamatan}</div>
                      {override && <span className="badge badge-perencanaan">Manual</span>}
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
                      <select
                        value={selectedKecamatanValue}
                        onChange={(e) => setSelectedKecamatanValue(e.target.value)}
                        disabled={isOverrideSaving}
                      >
                        <option value="">Pilih kecamatan</option>
                        <optgroup label="Kategori Khusus">
                          {VIRTUAL_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Kecamatan">
                        {kecamatanMaster.map((kec) => (
                          <option key={kec.id} value={kec.id}>{kec.nama || kec.nama_kecamatan}</option>
                        ))}
                        </optgroup>
                      </select>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="btn-link-fisik" disabled={!selectedKecamatanValue || isOverrideSaving} onClick={() => saveEdit(row)}>
                          Save
                        </button>
                        <button type="button" className="btn-link-cancel" disabled={isOverrideSaving} onClick={() => clearEdit(row)}>
                          Clear
                        </button>
                        <button type="button" className="btn-link-cancel" disabled={isOverrideSaving} onClick={cancelEdit}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </td>
                <td className="text-right">{formatRupiah(row.pagu_fisik)}</td>
                <td className="text-right">{formatRupiah(row.pagu_perencanaan)}</td>
                <td className="text-right">{formatRupiah(row.pagu_pengawasan)}</td>
                <td className="text-right">{formatRupiah(row.pagu_honor)}</td>
                <td className="text-right">
                  <strong>{formatRupiah(row.total_pagu)}</strong>
                </td>
                {typeof onDeleteRow === 'function' && (
                  <td>
                    <button
                      type="button"
                      className="btn-link-cancel"
                      style={{ color: '#b91c1c', borderColor: '#fecaca' }}
                      disabled={deletingId === anggaranId}
                      onClick={() => onDeleteRow(row)}
                    >
                      {deletingId === anggaranId ? 'Menghapus...' : 'Hapus'}
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 8 }}>
        Menampilkan {data.length} data
      </p>
    </div>
  );
}
