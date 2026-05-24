/**
 * Aggregate Helpers untuk Dashboard Pra RKA
 */

// Format Rupiah menggunakan Intl.NumberFormat
export const formatRupiah = (value) => {
  if (value == null || isNaN(value)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
};

// 1. Total Anggaran
export const getTotalAnggaran = (dataAnggaran) => {
  return dataAnggaran.reduce((sum, item) => sum + (Number(item.total_pagu) || 0), 0);
};

// 2. Jumlah Paket
export const getJumlahPaket = (dataAnggaran) => {
  return dataAnggaran.length;
};

// 3. Jumlah Kecamatan Unik
export const getUniqueKecamatan = (dataAnggaran) => {
  const keks = dataAnggaran.map(item => item.kecamatan).filter(k => k && k.trim() !== '');
  return new Set(keks).size;
};

// 4. Sub Kegiatan Terbesar
export const getTopSubKegiatan = (dataRekap) => {
  if (!dataRekap || dataRekap.length === 0) return { nama_sub_kegiatan: '-', total_pagu: 0 };
  
  return dataRekap.reduce((max, current) => {
    return (Number(current.total_pagu) > Number(max.total_pagu)) ? current : max;
  }, dataRekap[0]);
};

// 5. Anggaran per Kecamatan (Agregasi dari dataAnggaran)
export const getAnggaranPerKecamatan = (dataAnggaran) => {
  const map = {};
  
  dataAnggaran.forEach(item => {
    let kec = item.kecamatan || 'Tidak Diketahui';
    
    // Normalisasi string nama
    if (kec.toLowerCase().includes('hulu sungai selatan') || kec.toLowerCase().includes('kabupaten')) {
      kec = 'Kabupaten / Umum';
    } else {
      kec = kec.replace(/^Kecamatan\s+/i, '');
      if (kec.includes('Kandangan')) kec = 'Kandangan';
    }

    const pagu = Number(item.total_pagu) || 0;
    
    if (pagu > 0) {
      if (!map[kec]) {
        map[kec] = 0;
      }
      map[kec] += pagu;
    }
  });
  
  // Transform ke array format recharts, urut dari terbesar ke terkecil
  return Object.keys(map)
    .map(kec => ({
      kecamatan: kec,
      total_pagu: map[kec]
    }))
    .sort((a, b) => b.total_pagu - a.total_pagu);
};

// 6. Anggaran per Kecamatan dengan Single Mapping Manual
export const applyKecamatanSingleMapping = (rows = [], mappings = []) => {
  const mappingByRaw = {};
  mappings.forEach((m) => {
    if (!m?.raw_kecamatan || m?.aktif === false) return;
    mappingByRaw[m.raw_kecamatan] = m;
  });

  const map = {};
  rows.forEach((row) => {
    const raw = row?.kecamatan || 'Tidak Diketahui';
    const mapping = mappingByRaw[raw];
    const category = mapping?.mapped_kecamatan_nama || raw;
    const pagu = Number(row?.total_pagu) || 0;
    if (pagu <= 0) return;
    map[category] = (map[category] || 0) + pagu;
  });

  return Object.keys(map)
    .map((kecamatan) => ({ kecamatan, total_pagu: map[kecamatan] }))
    .sort((a, b) => b.total_pagu - a.total_pagu);
};
