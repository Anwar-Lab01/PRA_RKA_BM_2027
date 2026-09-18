const STOP_WORDS = new Set([
  'badan',
  'desa',
  'ds',
  'jalan',
  'jasa',
  'kec',
  'kecamatan',
  'konsultansi',
  'lanjutan',
  'perencanaan',
  'pengawasan',
  'ruas',
  'tahun'
]);

const WORK_PREFIXES = [
  'pengamanan badan jalan',
  'peningkatan struktur',
  'siring pasangan batu',
  'pemeliharaan berkala',
  'pemeliharaan rutin',
  'jasa konsultansi',
  'long segment',
  'rekonstruksi',
  'rehabilitasi',
  'pembangunan',
  'pelebaran',
  'pemeliharaan',
  'pengamanan',
  'perencanaan',
  'pengawasan'
].sort((a, b) => b.length - a.length);

const normalizeWhitespace = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const canonicalizeRoadWords = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[�]/g, '-')
  .replace(/[–—]/g, '-')
  .replace(/(?<![a-z0-9])(?:jl|jln)\.?\s*/g, 'jalan ')
  .replace(/(?<![a-z0-9])ds\.?\s*/g, 'desa ')
  .replace(/\bsp\.?\s*(\d*)\b/g, 'simpang $1')
  .replace(/(?<![a-z0-9])sei\.?\s*/g, 'sungai ');

const stripAdministrativeSuffix = (value) => value
  .replace(/\b(?:kec|kecamatan)\.?\s+[a-z0-9][a-z0-9 .'-]*$/i, ' ')
  .replace(/\btahun\s*20\d{2}\b/gi, ' ');

const stripWorkPrefix = (value) => {
  let result = value;
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of WORK_PREFIXES) {
      const pattern = new RegExp(`^${prefix.replace(/\s+/g, '\\s+')}\\s+`, 'i');
      if (pattern.test(result)) {
        result = result.replace(pattern, '');
        changed = true;
        break;
      }
    }
  }
  return result;
};

const normalizeSegment = (value) => value
  .replace(/[^a-z0-9\s]/g, ' ')
  .split(/\s+/)
  .filter((token) => token && !STOP_WORDS.has(token) && !/^20\d{2}$/.test(token))
  .join(' ')
  .trim();

/**
 * Normalize package/road text while retaining hyphen-separated endpoints.
 * This is intentionally shared by the UI suggestion flow and the importer
 * scoring contract documented in docs/audit.
 */
export function normalizeText(value) {
  let text = canonicalizeRoadWords(value);
  text = stripAdministrativeSuffix(text);
  text = stripWorkPrefix(text);
  text = text
    .replace(/[+/&]/g, ' ')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();

  return text
    .split(' - ')
    .map(normalizeSegment)
    .filter(Boolean)
    .join(' - ')
    .trim();
}

const toTokens = (text) => normalizeText(text).replace(/-/g, ' ').split(/\s+/).filter(Boolean);

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
  road?.input ||
  road?.match ||
  road?.properties?.nama ||
  getRoadRef(road);

const levenshteinSimilarity = (left, right) => {
  if (left === right) return 1;
  if (!left || !right) return 0;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }
    for (let j = 0; j <= right.length; j += 1) previous[j] = current[j];
  }

  return 1 - previous[right.length] / Math.max(left.length, right.length);
};

const tokenMetrics = (sourceTokens, candidateTokens) => {
  const source = new Set(sourceTokens);
  const candidate = new Set(candidateTokens);
  const overlap = candidateTokens.filter((token) => source.has(token)).length;
  const union = new Set([...source, ...candidate]).size;
  return {
    overlap,
    candidateCoverage: candidateTokens.length ? overlap / candidateTokens.length : 0,
    jaccard: union ? overlap / union : 0
  };
};

const endpointMatch = (sourceNorm, candidateNorm) => {
  const sourceParts = sourceNorm.split(' - ').filter(Boolean);
  const candidateParts = candidateNorm.split(' - ').filter(Boolean);
  if (sourceParts.length < 2 || candidateParts.length < 2) return { exact: false, reverse: false };

  const first = sourceParts.join(' - ');
  const last = [...sourceParts].reverse().join(' - ');
  return {
    exact: sourceParts.length === candidateParts.length && first === candidateNorm,
    reverse: sourceParts.length === candidateParts.length && last === candidateNorm
  };
};

export function scoreRoadCandidate(sourceText, road) {
  const roadRef = getRoadRef(road);
  const roadName = getRoadName(road);
  const sourceNorm = normalizeText(sourceText);
  const roadNorm = normalizeText(roadName || roadRef);
  if (!roadRef || !sourceNorm || !roadNorm) return null;

  const sourceTokens = toTokens(sourceNorm);
  const roadTokens = toTokens(roadNorm);
  const metrics = tokenMetrics(sourceTokens, roadTokens);
  const endpoints = endpointMatch(sourceNorm, roadNorm);
  const sourceFlat = sourceNorm.replace(/\s+/g, ' ');
  const roadFlat = roadNorm.replace(/\s+/g, ' ');

  let score = 0;
  let method = 'fuzzy_token_edit';
  let reason = 'Token overlap dan normalized edit similarity.';

  if (sourceFlat === roadFlat) {
    score = 1;
    method = 'exact_normalized';
    reason = 'Nama paket/lokasi dan nama ruas sama setelah normalisasi.';
  } else if (sourceFlat.includes(roadFlat)) {
    score = 0.98;
    method = 'strong_containment';
    reason = 'Nama ruas termuat lengkap pada nama paket/lokasi.';
  } else if (endpoints.reverse) {
    score = 0.97;
    method = 'reverse_endpoint';
    reason = 'Endpoint ruas cocok dalam urutan terbalik.';
  } else {
    const edit = levenshteinSimilarity(sourceFlat, roadFlat);
    score = (metrics.candidateCoverage * 0.5) + (metrics.jaccard * 0.3) + (edit * 0.2);
    if (metrics.candidateCoverage >= 0.8 && metrics.overlap >= 2) {
      score = Math.max(score, 0.86);
    }
  }

  return {
    roadRef,
    roadName,
    score: Number(Math.min(1, score).toFixed(4)),
    method,
    reason,
    normalizedSource: sourceNorm,
    normalizedRoad: roadNorm,
    endpointOverlap: metrics.candidateCoverage
  };
}

const isMultiRoadName = (value) => {
  const text = String(value || '').toLowerCase();
  return /\s(?:dan|\+)\s/.test(text) || /\s\/\s/.test(text);
};

const isNonRoadPackage = (value) => {
  const text = String(value || '').toLowerCase();
  if (/\bjembatan\b|\bbridge\b/.test(text)) return 'Paket jembatan diarahkan ke layer jembatan, bukan polyline jalan.';
  if (/survey kondisi|penyelidikan tanah|dokumen ukl|appraisal objek|studi kelayakan/.test(text)) {
    return 'Paket bersifat studi/dokumen umum dan tidak memiliki identitas ruas yang aman.';
  }
  if (/^\s*pemeliharaan rutin jalan\s*$/i.test(text)) {
    return 'Pemeliharaan rutin jalan tidak menyebut ruas tertentu.';
  }
  return null;
};

export function classifyRoadMatches(sourceText, roads = []) {
  const skipReason = isNonRoadPackage(sourceText);
  if (skipReason) {
    return { status: 'SKIPPED_NON_ROAD', candidates: [], notes: skipReason };
  }

  const candidates = roads
    .map((road) => scoreRoadCandidate(sourceText, road))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];
  const second = candidates[1];
  if (!best || best.score < 0.7) {
    return {
      status: 'UNMATCHED',
      candidates: candidates.slice(0, 5),
      notes: 'Tidak ada kandidat jalan dengan skor minimal 0.70.'
    };
  }

  if (isMultiRoadName(sourceText)) {
    return {
      status: 'REVIEW',
      candidates: candidates.slice(0, 5),
      notes: 'Nama paket mengindikasikan lebih dari satu ruas; tidak memilih satu ruas secara otomatis.'
    };
  }

  const gap = second ? best.score - second.score : best.score;
  if (best.score >= 0.95 && gap >= 0.08) {
    return { status: 'EXACT', candidates: candidates.slice(0, 5), notes: best.reason };
  }
  if (best.score >= 0.85 && gap >= 0.08) {
    return { status: 'FUZZY_AUTO', candidates: candidates.slice(0, 5), notes: best.reason };
  }
  if (best.score >= 0.7) {
    return {
      status: 'REVIEW',
      candidates: candidates.slice(0, 5),
      notes: second && gap < 0.08
        ? 'Kandidat terbaik terlalu dekat dengan kandidat kedua.'
        : 'Skor berada pada rentang review.'
    };
  }

  return { status: 'UNMATCHED', candidates: candidates.slice(0, 5), notes: 'Skor di bawah ambang auto-link.' };
}

export function suggestSpatialLinksForAnggaran(anggaran, roads = []) {
  if (!anggaran?.id) return [];
  const sourceText = [anggaran.nama_paket, anggaran.lokasi, anggaran.kecamatan].filter(Boolean).join(' ');
  const result = classifyRoadMatches(sourceText, roads);
  return result.candidates.slice(0, 6).map((candidate) => ({
    anggaranId: anggaran.id,
    namaPaket: anggaran.nama_paket,
    roadRef: candidate.roadRef,
    roadName: candidate.roadName,
    confidence: candidate.score,
    confidenceLabel: candidate.score >= 0.95 ? 'Sangat tinggi' : candidate.score >= 0.85 ? 'Tinggi' : 'Review',
    matchStatus: result.status,
    matchMethod: candidate.method,
    reason: candidate.reason
  }));
}

export function getDefaultSpatialLinkType(anggaran) {
  return Number(anggaran?.pagu_perencanaan) > 0 || Number(anggaran?.tahun) === 2027
    ? 'perencanaan'
    : 'fisik';
}
