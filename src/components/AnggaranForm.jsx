import { useState } from 'react';
import { formatRupiah } from '../lib/formatRupiah.js';

const INITIAL_FORM = {
  tahun: new Date().getFullYear(),
  sub_kegiatan_id: '',
  nama_paket: '',
  lokasi: '',
  kecamatan: '',
  pagu_fisik: '',
  pagu_perencanaan: '',
  pagu_pengawasan: '',
  pagu_honor: '',
  keterangan: '',
};

export default function AnggaranForm({ subKegiatanList, kecamatanList = [], onSave }) {
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // ---------- Computed total ----------
  const totalPagu =
    (Number(form.pagu_fisik) || 0) +
    (Number(form.pagu_perencanaan) || 0) +
    (Number(form.pagu_pengawasan) || 0) +
    (Number(form.pagu_honor) || 0);

  // ---------- Handlers ----------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const validate = () => {
    const errors = {};
    if (!form.tahun) errors.tahun = 'Tahun wajib diisi';
    if (!form.sub_kegiatan_id) errors.sub_kegiatan_id = 'Sub kegiatan wajib dipilih';
    if (!form.nama_paket.trim()) errors.nama_paket = 'Nama paket wajib diisi';

    const paguFields = ['pagu_fisik', 'pagu_perencanaan', 'pagu_pengawasan', 'pagu_honor'];
    for (const field of paguFields) {
      const val = Number(form[field]);
      if (form[field] !== '' && (isNaN(val) || val < 0)) {
        errors[field] = 'Tidak boleh negatif';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    const success = await onSave(form);
    setSaving(false);

    if (success) {
      // Reset form but keep tahun
      const keepTahun = form.tahun;
      setForm({ ...INITIAL_FORM, tahun: keepTahun });
    }
  };

  const handleReset = () => {
    const keepTahun = form.tahun;
    setForm({ ...INITIAL_FORM, tahun: keepTahun });
    setValidationErrors({});
  };

  // ---------- Render helper ----------
  const fieldError = (name) =>
    validationErrors[name] ? (
      <span style={{ color: 'var(--color-error)', fontSize: 12 }}>
        {validationErrors[name]}
      </span>
    ) : null;

  return (
    <div className="card">
      <h3 className="card-title">Form Input Anggaran</h3>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* Tahun */}
          <div className="form-group">
            <label htmlFor="tahun">Tahun *</label>
            <input
              id="tahun"
              type="number"
              name="tahun"
              value={form.tahun}
              onChange={handleChange}
              min="2020"
              max="2040"
            />
            {fieldError('tahun')}
          </div>

          {/* Sub Kegiatan */}
          <div className="form-group">
            <label htmlFor="sub_kegiatan_id">Sub Kegiatan *</label>
            <select
              id="sub_kegiatan_id"
              name="sub_kegiatan_id"
              value={form.sub_kegiatan_id}
              onChange={handleChange}
            >
              <option value="">— Pilih Sub Kegiatan —</option>
              {subKegiatanList.map((sk) => (
                <option key={sk.id} value={sk.id}>
                  {sk.kode} – {sk.nama}
                </option>
              ))}
            </select>
            {fieldError('sub_kegiatan_id')}
          </div>

          {/* Nama Paket */}
          <div className="form-group full-width">
            <label htmlFor="nama_paket">Nama Paket *</label>
            <input
              id="nama_paket"
              type="text"
              name="nama_paket"
              value={form.nama_paket}
              onChange={handleChange}
              placeholder="Masukkan nama paket"
            />
            {fieldError('nama_paket')}
          </div>

          {/* Lokasi */}
          <div className="form-group">
            <label htmlFor="lokasi">Lokasi</label>
            <input
              id="lokasi"
              type="text"
              name="lokasi"
              value={form.lokasi}
              onChange={handleChange}
              placeholder="Masukkan lokasi"
            />
          </div>

          {/* Kecamatan (dropdown from tabel kecamatan) */}
          <div className="form-group">
            <label htmlFor="kecamatan">Kecamatan</label>
            <select
              id="kecamatan"
              name="kecamatan"
              value={form.kecamatan}
              onChange={handleChange}
            >
              <option value="">
                {kecamatanList.length === 0
                  ? 'Memuat kecamatan...'
                  : '— Pilih Kecamatan —'}
              </option>
              {kecamatanList.map((kec) => (
                <option key={kec.id} value={kec.nama}>
                  {kec.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Pagu Fields */}
          <div className="form-group">
            <label htmlFor="pagu_fisik">Pagu Fisik</label>
            <input
              id="pagu_fisik"
              type="number"
              name="pagu_fisik"
              value={form.pagu_fisik}
              onChange={handleChange}
              min="0"
              placeholder="0"
            />
            {fieldError('pagu_fisik')}
          </div>

          <div className="form-group">
            <label htmlFor="pagu_perencanaan">Pagu Perencanaan</label>
            <input
              id="pagu_perencanaan"
              type="number"
              name="pagu_perencanaan"
              value={form.pagu_perencanaan}
              onChange={handleChange}
              min="0"
              placeholder="0"
            />
            {fieldError('pagu_perencanaan')}
          </div>

          <div className="form-group">
            <label htmlFor="pagu_pengawasan">Pagu Pengawasan</label>
            <input
              id="pagu_pengawasan"
              type="number"
              name="pagu_pengawasan"
              value={form.pagu_pengawasan}
              onChange={handleChange}
              min="0"
              placeholder="0"
            />
            {fieldError('pagu_pengawasan')}
          </div>

          <div className="form-group">
            <label htmlFor="pagu_honor">Pagu Honor</label>
            <input
              id="pagu_honor"
              type="number"
              name="pagu_honor"
              value={form.pagu_honor}
              onChange={handleChange}
              min="0"
              placeholder="0"
            />
            {fieldError('pagu_honor')}
          </div>

          {/* Keterangan */}
          <div className="form-group full-width">
            <label htmlFor="keterangan">Keterangan</label>
            <textarea
              id="keterangan"
              name="keterangan"
              value={form.keterangan}
              onChange={handleChange}
              placeholder="Catatan tambahan (opsional)"
            />
          </div>
        </div>

        {/* Total Preview */}
        <div className="total-preview">
          Total Pagu (preview): {formatRupiah(totalPagu)}
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={saving}
          >
            Reset
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
}
