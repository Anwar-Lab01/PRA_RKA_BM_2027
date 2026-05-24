-- Seed Jembatan Spasial 2027
-- Aman dijalankan berulang: insert hanya jika kode_jembatan belum ada.

WITH seed_data AS (
  SELECT *
  FROM (
    VALUES
      ('JBT-2027-001', 'Penggantian Jembatan Ds. Loksado (Menuju Pustu) Kec. Loksado', 'Kecamatan Loksado', 'Loksado', -2.795128::numeric, 115.496519::numeric),
      ('JBT-2027-002', 'Penggantian Jembatan Pabahanan Ds. Sirih Hulu Kec. Simpur', 'Kecamatan Simpur', 'Sirih Hulu', -2.835102::numeric, 115.186830::numeric),
      ('JBT-2027-003', 'Penggantian Jembatan Katilang Ds. Bago Tanggul Kec. Kalumpang', 'Kecamatan Kalumpang', 'Bago Tanggul', -2.812361::numeric, 115.129589::numeric),
      ('JBT-2027-004', 'Penggantian Jembatan Ruas Jalan Mawangi - Pariangan Kec. Padang Batung', 'Kecamatan Padang Batung', NULL, -2.829711::numeric, 115.343539::numeric),
      ('JBT-2027-005', 'Pembangunan Jembatan Ruas Jalan Kalumpang - Balimau Kec. Balimau', 'Kecamatan Kalumpang', NULL, -2.830900::numeric, 115.119664::numeric),
      ('JBT-2027-006', 'Penggantian Jembatan Ruas Jalan Sukaramai - Keramat Kec. Daha Utara', 'Kecamatan Daha Utara', NULL, -2.625592::numeric, 115.109736::numeric),
      ('JBT-2027-007', 'Penggantian Jembatan Ds. Sungai Minting Kec. Padang Batung', 'Kecamatan Padang Batung', 'Sungai Minting', -2.859956::numeric, 115.283700::numeric),
      ('JBT-2027-008', 'Penggantian Jembatan Gantung Ds. Tumingki Kec. Loksado', 'Kecamatan Loksado', 'Tumingki', -2.810525::numeric, 115.463489::numeric),
      ('JBT-2027-009', 'Pembangunan Jembatan Ruas Jalan Hulu Banyu - Datar Mangkung - Tumingki Kec. Loksado', 'Kecamatan Loksado', 'Tumingki', -2.810525::numeric, 115.463489::numeric),
      ('JBT-2027-010', 'Penggantian Jembatan Desa Panjampang Bahagia Kec. Simpur', 'Kecamatan Simpur', 'Panjampang Bahagia', -2.776236::numeric, 115.180900::numeric),
      ('JBT-2027-011', 'Penggantian Jembatan Ruas Jalan Madang - Ambutun Kec. Padang Batung', 'Kecamatan Padang Batung', NULL, -2.763831::numeric, 115.323886::numeric),
      ('JBT-2027-012', 'Penggantian Jembatan Ruas Jalan Sungai Kupang Utara - Simpang Empat Lungau Kec. Kandangan', 'Kecamatan Kandangan', NULL, -2.738887::numeric, 115.227919::numeric),
      ('JBT-2027-013', 'Penggantian Jembatan Ruas Jalan Mandapai - Madang Kec. Padang Batung', 'Kecamatan Padang Batung', NULL, -2.808620::numeric, 115.327563::numeric)
  ) AS t(kode_jembatan, nama_jembatan, kecamatan, desa_kelurahan, latitude, longitude)
)
INSERT INTO jembatan_spasial (
  kode_jembatan,
  nama_jembatan,
  kecamatan,
  desa_kelurahan,
  latitude,
  longitude,
  sumber_data,
  aktif
)
SELECT
  s.kode_jembatan,
  s.nama_jembatan,
  s.kecamatan,
  s.desa_kelurahan,
  s.latitude,
  s.longitude,
  'seed_koordinat_manual'::text AS sumber_data,
  true AS aktif
FROM seed_data s
WHERE NOT EXISTS (
  SELECT 1
  FROM jembatan_spasial j
  WHERE j.kode_jembatan = s.kode_jembatan
);

-- Verifikasi hasil seed
SELECT
  kode_jembatan,
  nama_jembatan,
  kecamatan,
  latitude,
  longitude
FROM jembatan_spasial
WHERE sumber_data = 'seed_koordinat_manual'
ORDER BY kode_jembatan;
