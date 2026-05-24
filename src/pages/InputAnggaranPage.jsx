import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import AnggaranForm from '../components/AnggaranForm.jsx';
import AnggaranTable from '../components/AnggaranTable.jsx';

export default function InputAnggaranPage() {
  // ---------- State ----------
  const [dataAnggaran, setDataAnggaran] = useState([]);
  const [subKegiatanList, setSubKegiatanList] = useState([]);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Filter & search
  const [filterTahun, setFilterTahun] = useState('');
  const [search, setSearch] = useState('');

  // ---------- Fetch sub_kegiatan (aktif) ----------
  const fetchSubKegiatan = useCallback(async () => {
    const { data, error } = await supabase
      .from('sub_kegiatan')
      .select('id, kode, nama')
      .eq('aktif', true)
      .order('kode');

    if (error) {
      console.error('Gagal fetch sub_kegiatan:', error.message);
    } else {
      setSubKegiatanList(data || []);
    }
  }, []);

  // ---------- Fetch kecamatan (aktif) ----------
  const fetchKecamatan = useCallback(async () => {
    const { data, error } = await supabase
      .from('kecamatan')
      .select('id, nama')
      .eq('aktif', true)
      .order('nama');

    if (error) {
      console.error('Gagal fetch kecamatan:', error.message);
    } else {
      setKecamatanList(data || []);
    }
  }, []);

  // ---------- Fetch data anggaran ----------
  const fetchAnggaran = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('anggaran_tahun')
      .select(`
        id,
        tahun,
        nama_paket,
        lokasi,
        kecamatan,
        pagu_fisik,
        pagu_perencanaan,
        pagu_pengawasan,
        pagu_honor,
        total_pagu,
        keterangan,
        created_at,
        sub_kegiatan (
          id,
          kode,
          nama
        )
      `)
      .order('created_at', { ascending: false });

    if (filterTahun) {
      query = query.eq('tahun', Number(filterTahun));
    }

    const { data, error: fetchErr } = await query;

    if (fetchErr) {
      setError('Gagal memuat data anggaran: ' + fetchErr.message);
      setDataAnggaran([]);
    } else {
      setDataAnggaran(data || []);
    }
    setLoading(false);
  }, [filterTahun]);

  // ---------- Effects ----------
  useEffect(() => {
    fetchSubKegiatan();
    fetchKecamatan();
  }, [fetchSubKegiatan, fetchKecamatan]);

  useEffect(() => {
    fetchAnggaran();
  }, [fetchAnggaran]);

  // ---------- Handle save ----------
  const handleSave = async (formData) => {
    setError(null);
    setSuccessMsg('');

    const { error: insertErr } = await supabase
      .from('anggaran_tahun')
      .insert([{
        tahun: Number(formData.tahun),
        sub_kegiatan_id: formData.sub_kegiatan_id,
        nama_paket: formData.nama_paket,
        lokasi: formData.lokasi,
        kecamatan: formData.kecamatan,
        pagu_fisik: Number(formData.pagu_fisik) || 0,
        pagu_perencanaan: Number(formData.pagu_perencanaan) || 0,
        pagu_pengawasan: Number(formData.pagu_pengawasan) || 0,
        pagu_honor: Number(formData.pagu_honor) || 0,
        keterangan: formData.keterangan,
      }]);

    if (insertErr) {
      setError('Gagal menyimpan: ' + insertErr.message);
      return false;
    }

    setSuccessMsg('Data anggaran berhasil disimpan!');
    // Auto-hide success message after 4 seconds
    setTimeout(() => setSuccessMsg(''), 4000);
    await fetchAnggaran();
    return true;
  };

  // ---------- Filtered data (client-side search) ----------
  const displayedData = dataAnggaran.filter((row) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (row.nama_paket || '').toLowerCase().includes(q) ||
      (row.sub_kegiatan?.nama || '').toLowerCase().includes(q) ||
      (row.kecamatan || '').toLowerCase().includes(q)
    );
  });

  // ---------- Daftar tahun yang tersedia untuk filter ----------
  const availableYears = [...new Set(dataAnggaran.map((d) => d.tahun))]
    .filter(Boolean)
    .sort((a, b) => b - a);

  return (
    <div>
      <h2 className="page-title">Input Anggaran</h2>

      {/* Messages */}
      {successMsg && <div className="msg msg-success">{successMsg}</div>}
      {error && <div className="msg msg-error">{error}</div>}

      {/* Form */}
      <AnggaranForm
        subKegiatanList={subKegiatanList}
        kecamatanList={kecamatanList}
        onSave={handleSave}
      />

      {/* Table */}
      <div className="card" style={{ marginTop: 24 }}>
        <h3 className="card-title">Data Anggaran</h3>

        <div className="table-controls">
          <select
            value={filterTahun}
            onChange={(e) => setFilterTahun(e.target.value)}
          >
            <option value="">Semua Tahun</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Cari nama paket / sub kegiatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
        </div>

        <AnggaranTable
          data={displayedData}
          loading={loading}
        />
      </div>
    </div>
  );
}
