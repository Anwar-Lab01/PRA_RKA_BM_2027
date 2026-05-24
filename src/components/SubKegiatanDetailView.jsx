import { useState, useMemo } from 'react';
import { formatRupiah } from '../lib/formatRupiah.js';

/**
 * SubKegiatanDetailView – drill-down detail page for a selected Sub Kegiatan.
 * Renders summary KPI cards and a full budget-package table.
 */
export default function SubKegiatanDetailView({
  subKegiatanName,
  dataAnggaran,
  onBack,
  onDeleteRow,
  deletingId,
  overrideByAnggaranId = {},
}) {
  const [search, setSearch] = useState('');
  const [filterKecamatan, setFilterKecamatan] = useState('');

  // ---------- Filter rows belonging to this sub kegiatan ----------
  const normalize = (str) =>
    String(str || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

  const selectedRows = useMemo(() => {
    const target = normalize(subKegiatanName);
    return (dataAnggaran || []).filter((row) => {
      const rowSub =
        row?.sub_kegiatan?.nama ||
        row?.nama_sub_kegiatan ||
        row?.sub_kegiatan_nama ||
        'Tidak Diketahui';
      return normalize(rowSub) === target;
    });
  }, [dataAnggaran, subKegiatanName]);

  // ---------- Available kecamatan for filter ----------
  const availableKecamatan = useMemo(() => {
    const set = new Set();
    selectedRows.forEach((row) => {
      const anggaranId = row?.id || row?.anggaran_id;
      const kec =
        overrideByAnggaranId[anggaranId]?.mapped_kecamatan_nama ||
        row?.kecamatan ||
        'Tidak Diketahui';
      set.add(kec);
    });
    return [...set].sort();
  }, [selectedRows, overrideByAnggaranId]);

  // ---------- Apply search + kecamatan filter ----------
  const displayedRows = useMemo(() => {
    let rows = selectedRows;
    if (filterKecamatan) {
      rows = rows.filter((row) => {
        const anggaranId = row?.id || row?.anggaran_id;
        const kec =
          overrideByAnggaranId[anggaranId]?.mapped_kecamatan_nama ||
          row?.kecamatan ||
          'Tidak Diketahui';
        return kec === filterKecamatan;
      });
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (row) =>
          (row.nama_paket || '').toLowerCase().includes(q) ||
          (row.kecamatan || '').toLowerCase().includes(q) ||
          (row.keterangan || '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [selectedRows, filterKecamatan, search, overrideByAnggaranId]);

  // ---------- Summary calculations ----------
  const summary = useMemo(() => {
    const sum = (arr, key) => arr.reduce((s, r) => s + (Number(r[key]) || 0), 0);
    return {
      totalAnggaran: sum(selectedRows, 'total_pagu'),
      totalFisik: sum(selectedRows, 'pagu_fisik'),
      totalPerencanaan: sum(selectedRows, 'pagu_perencanaan'),
      totalPengawasan: sum(selectedRows, 'pagu_pengawasan'),
      totalHonor: sum(selectedRows, 'pagu_honor'),
      jumlahPaket: selectedRows.length,
    };
  }, [selectedRows]);

  const resolveAnggaranId = (row) => row?.id || row?.anggaran_id;

  // ---------- Render ----------
  return (
    <div className="subkegiatan-detail">
      {/* ---- Header ---- */}
      <div className="detail-header">
        <button type="button" className="btn-back" onClick={onBack}>
          <span className="btn-back-arrow">←</span>
          Kembali ke Dashboard
        </button>
        <div className="detail-title-group">
          <p className="detail-breadcrumb">Sub Kegiatan</p>
          <h2 className="detail-title">{subKegiatanName}</h2>
        </div>
      </div>

      {/* ---- Summary Cards ---- */}
      <div className="detail-summary-grid">
        <div className="detail-card detail-card--primary">
          <div className="detail-card-body">
            <span className="detail-card-label">Total Anggaran</span>
            <span className="detail-card-value">{formatRupiah(summary.totalAnggaran)}</span>
          </div>
        </div>
        <div className="detail-card detail-card--accent">
          <div className="detail-card-body">
            <span className="detail-card-label">Jumlah Paket</span>
            <span className="detail-card-value">{summary.jumlahPaket}</span>
          </div>
        </div>
        <div className="detail-card detail-card--fisik">
          <div className="detail-card-body">
            <span className="detail-card-label">Total Fisik</span>
            <span className="detail-card-value">{formatRupiah(summary.totalFisik)}</span>
          </div>
        </div>
        <div className="detail-card detail-card--perencanaan">
          <div className="detail-card-body">
            <span className="detail-card-label">Total Perencanaan</span>
            <span className="detail-card-value">{formatRupiah(summary.totalPerencanaan)}</span>
          </div>
        </div>
        <div className="detail-card detail-card--pengawasan">
          <div className="detail-card-body">
            <span className="detail-card-label">Total Pengawasan</span>
            <span className="detail-card-value">{formatRupiah(summary.totalPengawasan)}</span>
          </div>
        </div>
        <div className="detail-card detail-card--honor">
          <div className="detail-card-body">
            <span className="detail-card-label">Total Honor</span>
            <span className="detail-card-value">{formatRupiah(summary.totalHonor)}</span>
          </div>
        </div>
      </div>

      {/* ---- Filters ---- */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="detail-filters">
          <div className="detail-filter-group">
            <label htmlFor="detail-search">Cari Paket</label>
            <input
              id="detail-search"
              type="text"
              placeholder="Cari nama paket, kecamatan, keterangan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="detail-search-input"
            />
          </div>
          <div className="detail-filter-group">
            <label htmlFor="detail-kecamatan">Kecamatan</label>
            <select
              id="detail-kecamatan"
              value={filterKecamatan}
              onChange={(e) => setFilterKecamatan(e.target.value)}
              className="detail-filter-select"
            >
              <option value="">Semua Kecamatan</option>
              {availableKecamatan.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className="detail-filter-count">
            Menampilkan <strong>{displayedRows.length}</strong> dari{' '}
            <strong>{selectedRows.length}</strong> paket
          </div>
        </div>
      </div>

      {/* ---- Table ---- */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 16 }}>
          Rincian Paket Anggaran
        </h3>

        {displayedRows.length === 0 ? (
          <div className="state-box">
            <div className="icon" style={{ fontSize: 32 }}>—</div>
            <p>Tidak ada paket ditemukan untuk sub kegiatan ini.</p>
            {search && (
              <p style={{ fontSize: 12, marginTop: 4 }}>
                Coba ubah kata kunci pencarian.
              </p>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Tahun</th>
                  <th>Nama Paket</th>
                  <th>Kecamatan</th>
                  <th className="text-right">Pagu Fisik</th>
                  <th className="text-right">Pagu Perencanaan</th>
                  <th className="text-right">Pagu Pengawasan</th>
                  <th className="text-right">Pagu Honor</th>
                  <th className="text-right">Total Pagu</th>
                  <th>Keterangan</th>
                  {typeof onDeleteRow === 'function' && <th>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row, idx) => {
                  const anggaranId = resolveAnggaranId(row);
                  const override = overrideByAnggaranId[anggaranId];
                  const effectiveKecamatan =
                    override?.mapped_kecamatan_nama || row.kecamatan || 'Tidak Diketahui';

                  return (
                    <tr key={anggaranId || idx}>
                      <td>{idx + 1}</td>
                      <td>{row.tahun}</td>
                      <td>
                        <div style={{ fontWeight: 500, marginBottom: 4 }}>
                          {row.nama_paket}
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {Number(row.pagu_fisik) > 0 && (
                            <span className="badge badge-fisik">Fisik</span>
                          )}
                          {Number(row.pagu_perencanaan) > 0 && (
                            <span className="badge badge-perencanaan">Perencanaan</span>
                          )}
                          {Number(row.pagu_pengawasan) > 0 && (
                            <span className="badge badge-pengawasan">Pengawasan</span>
                          )}
                          {Number(row.pagu_honor) > 0 && (
                            <span className="badge badge-honor">Honor</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{effectiveKecamatan}</span>
                        {override && (
                          <span
                            className="badge badge-perencanaan"
                            style={{ marginLeft: 6 }}
                          >
                            Manual
                          </span>
                        )}
                      </td>
                      <td className="text-right">{formatRupiah(row.pagu_fisik)}</td>
                      <td className="text-right">{formatRupiah(row.pagu_perencanaan)}</td>
                      <td className="text-right">{formatRupiah(row.pagu_pengawasan)}</td>
                      <td className="text-right">{formatRupiah(row.pagu_honor)}</td>
                      <td className="text-right">
                        <strong>{formatRupiah(row.total_pagu)}</strong>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          {row.keterangan || '—'}
                        </span>
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
              <tfoot>
                <tr>
                  <td colSpan={3}></td>
                  <td style={{ fontWeight: 700 }}>Total</td>
                  <td className="text-right">
                    {formatRupiah(
                      displayedRows.reduce((s, r) => s + (Number(r.pagu_fisik) || 0), 0)
                    )}
                  </td>
                  <td className="text-right">
                    {formatRupiah(
                      displayedRows.reduce((s, r) => s + (Number(r.pagu_perencanaan) || 0), 0)
                    )}
                  </td>
                  <td className="text-right">
                    {formatRupiah(
                      displayedRows.reduce((s, r) => s + (Number(r.pagu_pengawasan) || 0), 0)
                    )}
                  </td>
                  <td className="text-right">
                    {formatRupiah(
                      displayedRows.reduce((s, r) => s + (Number(r.pagu_honor) || 0), 0)
                    )}
                  </td>
                  <td className="text-right">
                    <strong>
                      {formatRupiah(
                        displayedRows.reduce((s, r) => s + (Number(r.total_pagu) || 0), 0)
                      )}
                    </strong>
                  </td>
                  <td></td>
                  {typeof onDeleteRow === 'function' && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
