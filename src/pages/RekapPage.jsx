import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { formatRupiah } from '../lib/formatRupiah.js';

export default function RekapPage() {
  const [rekapData, setRekapData] = useState([]);
  const [paketData, setPaketData] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterTahun, setFilterTahun] = useState('');

  const toggleRow = (idx) => {
    setExpandedRows(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const fetchRekap = useCallback(async () => {
    setLoading(true);
    setError(null);

    let queryRekap = supabase
      .from('v_rekap_sub_kegiatan_tahun')
      .select('*')
      .order('tahun', { ascending: false })
      .order('kode');

    let queryAnggaran = supabase
      .from('anggaran_tahun')
      .select(`
        id, tahun, nama_paket, kecamatan, total_pagu,
        sub_kegiatan(id, kode, nama)
      `)
      .order('nama_paket', { ascending: true });

    if (filterTahun) {
      queryRekap = queryRekap.eq('tahun', Number(filterTahun));
      queryAnggaran = queryAnggaran.eq('tahun', Number(filterTahun));
    }

    const [resRekap, resAnggaran] = await Promise.all([queryRekap, queryAnggaran]);

    if (resRekap.error) {
      setError('Gagal memuat data rekap: ' + resRekap.error.message);
      setRekapData([]);
    } else {
      setRekapData(resRekap.data || []);
      setPaketData(resAnggaran.data || []);
    }
    setLoading(false);
  }, [filterTahun]);

  useEffect(() => {
    fetchRekap();
  }, [fetchRekap]);

  // ---------- Summary cards ----------
  const totalPaket = rekapData.reduce((sum, r) => sum + (r.jumlah_paket || 0), 0);
  const totalPagu = rekapData.reduce((sum, r) => sum + (Number(r.total_pagu) || 0), 0);
  const totalFisik = rekapData.reduce((sum, r) => sum + (Number(r.total_fisik) || 0), 0);
  const totalPerencanaan = rekapData.reduce((sum, r) => sum + (Number(r.total_perencanaan) || 0), 0);
  const totalPengawasan = rekapData.reduce((sum, r) => sum + (Number(r.total_pengawasan) || 0), 0);
  const totalHonor = rekapData.reduce((sum, r) => sum + (Number(r.total_honor) || 0), 0);

  // ---------- Available years ----------
  const availableYears = [...new Set(rekapData.map((d) => d.tahun))]
    .filter(Boolean)
    .sort((a, b) => b - a);

  return (
    <div>
      <h2 className="page-title">Rekap Anggaran</h2>

      {error && <div className="msg msg-error">{error}</div>}

      {/* Filter */}
      <div className="table-controls" style={{ marginBottom: 16 }}>
        <select
          value={filterTahun}
          onChange={(e) => setFilterTahun(e.target.value)}
        >
          <option value="">Semua Tahun</option>
          {availableYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="rekap-cards">
        <div className="rekap-card">
          <div className="label">Jumlah Paket</div>
          <div className="value">{totalPaket}</div>
        </div>
        <div className="rekap-card" style={{ gridColumn: 'span 2' }}>
          <div className="label">Total Pagu</div>
          <div className="value">{formatRupiah(totalPagu)}</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: 16, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Fisik</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-fisik)' }}>{formatRupiah(totalFisik)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Perencanaan</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-perencanaan)' }}>{formatRupiah(totalPerencanaan)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Pengawasan</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-pengawasan)' }}>{formatRupiah(totalPengawasan)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Honor</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-honor)' }}>{formatRupiah(totalHonor)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend Komponen */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, fontSize: 13, color: 'var(--color-text-secondary)' }}>
        <strong style={{ color: 'var(--color-primary)' }}>Legenda Komponen:</strong>
        <span className="badge badge-fisik">Fisik</span>
        <span className="badge badge-perencanaan">Perencanaan</span>
        <span className="badge badge-pengawasan">Pengawasan</span>
        <span className="badge badge-honor">Honor</span>
      </div>

      {/* Tabel Rekap */}
      <div className="card">
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          Rekap per Sub Kegiatan
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-text-secondary)' }}>— klik baris untuk melihat detail paket</span>
        </h3>

        {loading ? (
          <div className="state-box">
            <div className="spinner" />
            <p style={{ marginTop: 8 }}>Memuat data rekap...</p>
          </div>
        ) : rekapData.length === 0 ? (
          <div className="state-box">
            <div className="icon">📋</div>
            <p>Belum ada data rekap untuk ditampilkan.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}></th>
                  <th>Tahun</th>
                  <th>Kode</th>
                  <th>Sub Kegiatan</th>
                  <th className="text-right">Jml Paket</th>
                  <th className="text-right">Total Fisik</th>
                  <th className="text-right">Total Perencanaan</th>
                  <th className="text-right">Total Pengawasan</th>
                  <th className="text-right">Total Honor</th>
                  <th className="text-right">Total Pagu</th>
                </tr>
              </thead>
              <tbody>
                {rekapData.map((row, idx) => {
                  const isExpanded = expandedRows[idx];
                  const childPackages = paketData.filter(p => p.sub_kegiatan?.kode === row.kode && p.tahun === row.tahun);

                  return (
                    <React.Fragment key={idx}>
                      <tr 
                        className={`rekap-parent-row ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => toggleRow(idx)} 
                      >
                        <td className="rekap-expand-icon">
                          {isExpanded ? '▼' : '▶'}
                        </td>
                        <td>{row.tahun}</td>
                        <td><code style={{ fontSize: 12, background: '#edf2f7', padding: '2px 6px', borderRadius: 4 }}>{row.kode}</code></td>
                        <td>{row.nama_sub_kegiatan}</td>
                        <td className="text-right">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {row.jumlah_paket}
                            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>pkt</span>
                          </span>
                        </td>
                        <td className="text-right" style={{ color: 'var(--color-fisik)' }}>{formatRupiah(row.total_fisik)}</td>
                        <td className="text-right" style={{ color: 'var(--color-perencanaan)' }}>{formatRupiah(row.total_perencanaan)}</td>
                        <td className="text-right" style={{ color: 'var(--color-pengawasan)' }}>{formatRupiah(row.total_pengawasan)}</td>
                        <td className="text-right" style={{ color: 'var(--color-honor)' }}>{formatRupiah(row.total_honor)}</td>
                        <td className="text-right"><strong>{formatRupiah(row.total_pagu)}</strong></td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={10} style={{ padding: 0 }}>
                            <div className="rekap-child-wrapper">
                              <h5 className="rekap-child-title">
                                Daftar Paket Pekerjaan
                                <span className="child-count">{childPackages.length}</span>
                              </h5>
                              {childPackages.length > 0 ? (
                                <table className="rekap-child-table">
                                  <thead>
                                    <tr>
                                      <th style={{ width: '5%' }}>No</th>
                                      <th>Nama Paket</th>
                                      <th>Kecamatan</th>
                                      <th className="text-right">Total Pagu</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {childPackages.map((pkg, pIdx) => (
                                      <tr key={pkg.id}>
                                        <td style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{pIdx + 1}</td>
                                        <td style={{ fontWeight: 500 }}>{pkg.nama_paket}</td>
                                        <td>{pkg.kecamatan || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>—</span>}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(pkg.total_pagu)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="rekap-child-empty">
                                  <span>📋</span> Tidak ada paket pekerjaan yang terkait dengan sub kegiatan ini.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#edf2f7', fontWeight: 600 }}>
                  <td colSpan={4}>TOTAL</td>
                  <td className="text-right">{totalPaket}</td>
                  <td className="text-right">{formatRupiah(totalFisik)}</td>
                  <td className="text-right">{formatRupiah(totalPerencanaan)}</td>
                  <td className="text-right">{formatRupiah(totalPengawasan)}</td>
                  <td className="text-right">{formatRupiah(totalHonor)}</td>
                  <td className="text-right">{formatRupiah(totalPagu)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
