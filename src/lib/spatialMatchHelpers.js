const STOP_WORDS = new Set([
  'peningkatan',
  'pembangunan',
  'rehabilitasi',
  'rekonstruksi',
  'pemeliharaan',
  'ruas',
  'jalan',
  'kec',
  'kecamatan',
  'jasa',
  'konsultansi',
  'perencanaan',
  'pengawasan',
  'lanjutan'
]);

export function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && !STOP_WORDS.has(token))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const toTokens = (text) => normalizeText(text).split(/\s+/).filter(Boolean);

const confidenceMeta = (score) => {
  if (score >= 0.85) return { confidence: score, confidenceLabel: 'Tinggi' };
  if (score >= 0.6) return { confidence: score, confidenceLabel: 'Sedang' };
  return { confidence: score, confidenceLabel: 'Rendah' };
};

const getRoadRef = (road) =>
  road?.id ||
  road?.ref ||
  road?.spasialRef ||
  road?.properties?.id ||
  road?.properties?.ref ||
  road?.properties?.spasial_ref ||
  road?.properties?.nama ||
  road?.nama ||
  road?.name;

const getRoadName = (road) =>
  road?.name ||
  road?.nama ||
  road?.properties?.nama ||
  getRoadRef(road);

export function suggestSpatialLinksForAnggaran(anggaran, roads = []) {
  if (!anggaran?.id) return [];
  const sourceText = [anggaran.nama_paket, anggaran.lokasi, anggaran.kecamatan].filter(Boolean).join(' ');
  const sourceNorm = normalizeText(sourceText);
  const sourceTokens = new Set(toTokens(sourceText));
  if (!sourceNorm) return [];

  const suggestions = roads
    .map((road) => {
      const roadRef = getRoadRef(road);
      const roadName = getRoadName(road);
      const roadNorm = normalizeText(roadName || roadRef);
      const roadTokens = toTokens(roadName || roadRef);
      if (!roadRef || !roadNorm) return null;

      let score = 0;
      let reason = 'Kemiripan teks rendah.';

      if (sourceNorm.includes(roadNorm)) {
        score = 0.95;
        reason = 'Nama ruas termuat langsung pada nama paket/lokasi.';
      } else {
        const overlap = roadTokens.filter((t) => sourceTokens.has(t)).length;
        const overlapRatio = roadTokens.length > 0 ? overlap / roadTokens.length : 0;
        if (overlapRatio >= 0.75 && overlap >= 2) {
          score = 0.75;
          reason = 'Overlap token kuat antara paket/lokasi dan nama ruas.';
        } else if (overlapRatio >= 0.4 && overlap >= 1) {
          score = 0.6;
          reason = 'Overlap token sedang antara paket/lokasi dan nama ruas.';
        } else if (overlap > 0) {
          score = 0.35;
          reason = 'Ada sebagian token yang cocok.';
        }
      }

      if (score < 0.35) return null;

      const conf = confidenceMeta(score);
      return {
        anggaranId: anggaran.id,
        namaPaket: anggaran.nama_paket,
        roadRef,
        roadName,
        confidence: conf.confidence,
        confidenceLabel: conf.confidenceLabel,
        reason
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6);

  return suggestions;
}
