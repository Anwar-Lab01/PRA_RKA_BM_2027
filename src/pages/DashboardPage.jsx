import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import DashboardSummary from '../components/DashboardSummary';
import KecamatanChart from '../components/KecamatanChart';
import SubKegiatanChart from '../components/SubKegiatanChart';
import SubKegiatanDetailView from '../components/SubKegiatanDetailView';
import BudgetMap from '../components/BudgetMap';
import CoordinateLinkPanel from '../components/CoordinateLinkPanel';
import AnggaranTable from '../components/AnggaranTable';
import { backgroundRoads } from '../lib/backgroundRoads';
import { legacyCoordinates } from '../lib/legacyCoordinates';
import { parseMapData } from '../lib/mapHelpers';
import { 
  getTotalAnggaran, 
  getJumlahPaket, 
  getUniqueKecamatan, 
  getTopSubKegiatan
} from '../lib/aggregateHelpers';

export default function DashboardPage() {
  const [dataAnggaran, setDataAnggaran] = useState([]);
  const [dataRekap, setDataRekap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubKegiatan, setSelectedSubKegiatan] = useState(null);

  // States for map and linking
  const [selectedMapObj, setSelectedMapObj] = useState(null);
  const [interactiveRoads, setInteractiveRoads] = useState([]);
  const [baseRoadObjects, setBaseRoadObjects] = useState([]);
  const [bridgeObjects, setBridgeObjects] = useState([]);
  const [linkedState, setLinkedState] = useState([]);
  const [filterTahun, setFilterTahun] = useState('');
  const [search, setSearch] = useState('');
  const [bulkDeleteYear, setBulkDeleteYear] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [isBridgeMarkMode, setIsBridgeMarkMode] = useState(false);
  const [pendingBridgePoint, setPendingBridgePoint] = useState(null);
  const [bridgeForm, setBridgeForm] = useState({
    nama_jembatan: '',
    kode_jembatan: '',
    kecamatan: '',
    desa_kelurahan: ''
  });
  const [kecamatanOverrides, setKecamatanOverrides] = useState([]);
  const [kecamatanMaster, setKecamatanMaster] = useState([]);
  const [overrideSavingId, setOverrideSavingId] = useState(null);

  const normalizeKey = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[–—]/g, '-')
      .replace(/[^a-z0-9-]/g, '');

  // Normalize legacy coordinates on mount
  useEffect(() => {
    const parsed = parseMapData(legacyCoordinates);
    setBaseRoadObjects(parsed.data || []);
  }, []);

  useEffect(() => {
    setInteractiveRoads([...(baseRoadObjects || []), ...(bridgeObjects || [])]);
  }, [baseRoadObjects, bridgeObjects]);

  const fetchBridgeObjects = useCallback(async () => {
    try {
      const { data, error: bridgeError } = await supabase
        .from('jembatan_spasial')
        .select('id, kode_jembatan, nama_jembatan, kecamatan, desa_kelurahan, latitude, longitude, sumber_data, aktif');

      if (bridgeError) {
        const message = String(bridgeError.message || '').toLowerCase();
        const tableMissing =
          bridgeError.code === '42P01' ||
          bridgeError.code === 'PGRST205' ||
          message.includes('jembatan_spasial');
        if (tableMissing) {
          setBridgeObjects([]);
          return;
        }
        throw bridgeError;
      }

      const normalized = (data || [])
        .filter((row) => row?.latitude != null && row?.longitude != null && row?.aktif !== false)
        .map((row) => ({
          id: `bridge_${row.id}`,
          refId: row.id,
          name: row.nama_jembatan || `Jembatan ${row.kode_jembatan || row.id}`,
          type: 'bridge',
          coordinates: [Number(row.latitude), Number(row.longitude)],
          properties: {
            kode_jembatan: row.kode_jembatan,
            kecamatan: row.kecamatan,
            desa_kelurahan: row.desa_kelurahan,
            sumber_data: row.sumber_data,
            spatialType: 'bridge'
          }
        }))
        .filter(
          (row) =>
            Array.isArray(row.coordinates) &&
            row.coordinates.length === 2 &&
            Number.isFinite(row.coordinates[0]) &&
            Number.isFinite(row.coordinates[1])
        );

      setBridgeObjects(normalized);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data jembatan: ' + err.message);
    }
  }, []);

  const fetchKecamatanMaster = useCallback(async () => {
    try {
      const { data, error: kecError } = await supabase
        .from('kecamatan')
        .select('id, nama, aktif')
        .eq('aktif', true)
        .order('nama', { ascending: true });
      if (kecError) throw kecError;
      setKecamatanMaster(
        (data || []).map((row) => ({
          ...row,
          nama: row.nama || row.nama_kecamatan,
          label: row.nama || row.nama_kecamatan,
          value: row.id
        }))
      );
    } catch (err) {
      console.error(err);
      setError('Gagal memuat master kecamatan: ' + err.message);
    }
  }, []);

  const fetchKecamatanOverrides = useCallback(async () => {
    try {
      const { data, error: mapError } = await supabase
        .from('anggaran_kecamatan_override')
        .select('*')
        .eq('aktif', true);
      if (mapError) {
        const msg = String(mapError.message || '').toLowerCase();
        if (mapError.code === '42P01' || mapError.code === 'PGRST205' || msg.includes('anggaran_kecamatan_override')) {
          setKecamatanOverrides([]);
          return;
        }
        throw mapError;
      }
      setKecamatanOverrides(data || []);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat override kecamatan: ' + err.message);
    }
  }, []);

  const handleMapClickForBridge = useCallback(
    (latlng) => {
      if (!isBridgeMarkMode || !latlng) return;
      setPendingBridgePoint({
        latitude: Number(latlng.lat),
        longitude: Number(latlng.lng)
      });
    },
    [isBridgeMarkMode]
  );

  const handleCancelBridge = useCallback(() => {
    setIsBridgeMarkMode(false);
    setPendingBridgePoint(null);
    setBridgeForm({
      nama_jembatan: '',
      kode_jembatan: '',
      kecamatan: '',
      desa_kelurahan: ''
    });
  }, []);

  const handleSaveBridge = useCallback(async () => {
    try {
      const namaJembatan = (bridgeForm.nama_jembatan || '').trim();
      if (!namaJembatan) {
        setError('Nama jembatan wajib diisi.');
        return;
      }
      if (!pendingBridgePoint?.latitude || !pendingBridgePoint?.longitude) {
        setError('Koordinat jembatan belum dipilih.');
        return;
      }

      const payload = {
        nama_jembatan: namaJembatan,
        kode_jembatan: (bridgeForm.kode_jembatan || '').trim() || null,
        kecamatan: (bridgeForm.kecamatan || '').trim() || null,
        desa_kelurahan: (bridgeForm.desa_kelurahan || '').trim() || null,
        latitude: pendingBridgePoint.latitude,
        longitude: pendingBridgePoint.longitude,
        sumber_data: 'manual',
        aktif: true
      };

      const { data, error: insertError } = await supabase
        .from('jembatan_spasial')
        .insert(payload)
        .select('id, kode_jembatan, nama_jembatan, kecamatan, desa_kelurahan, latitude, longitude, sumber_data, aktif')
        .single();

      if (insertError) throw insertError;

      const bridgeObj = {
        id: `bridge_${data.id}`,
        refId: data.id,
        name: data.nama_jembatan || `Jembatan ${data.kode_jembatan || data.id}`,
        type: 'bridge',
        coordinates: [Number(data.latitude), Number(data.longitude)],
        properties: {
          kode_jembatan: data.kode_jembatan,
          kecamatan: data.kecamatan,
          desa_kelurahan: data.desa_kelurahan,
          sumber_data: data.sumber_data,
          spatialType: 'bridge'
        }
      };

      setBridgeObjects((prev) => [...prev, bridgeObj]);
      handleCancelBridge();
    } catch (err) {
      console.error(err);
      setError('Gagal menyimpan titik jembatan: ' + err.message);
    }
  }, [bridgeForm, handleCancelBridge, pendingBridgePoint]);

  // 1. Fetch data Anggaran + Rekap
  const fetchLinks = useCallback(async (anggaranRows) => {
    try {
      const anggaranIds = Array.isArray(anggaranRows)
        ? anggaranRows.map((r) => r?.id).filter(Boolean)
        : [];

      if (anggaranIds.length === 0) {
        setLinkedState([]);
        return;
      }

      const { data, error: linksError } = await supabase
        .from('anggaran_ruas_link')
        .select('id, anggaran_id, spasial_ref, spasial_nama, link_type, sumber_link, confidence_score, catatan')
        .in('anggaran_id', anggaranIds);

      if (linksError) throw linksError;

      const normalizedLinks = (data || []).map((row) => ({
        id: row.id,
        anggaranId: row.anggaran_id,
        spasialRef: row.spasial_ref,
        spasialNama: row.spasial_nama,
        linkType: row.link_type,
        sumberLink: row.sumber_link,
        confidenceScore: row.confidence_score,
        catatan: row.catatan
      }));

      setLinkedState(normalizedLinks);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data link ruas: ' + err.message);
    }
  }, []);

  const fetchData = useCallback(async () => {
    // ... logic tetap ...
    setLoading(true);
    setError(null);

    try {
      // Query Anggaran
      let queryAnggaran = supabase
        .from('anggaran_tahun')
        .select(`
          id, tahun, nama_paket, lokasi, kecamatan, pagu_fisik, pagu_perencanaan, pagu_pengawasan, pagu_honor, total_pagu, keterangan, created_at,
          sub_kegiatan(id, kode, nama)
        `)
        .order('created_at', { ascending: false });

      if (filterTahun) {
        queryAnggaran = queryAnggaran.eq('tahun', Number(filterTahun));
      }

      // Query Rekap view
      let queryRekap = supabase
        .from('v_rekap_sub_kegiatan_tahun')
        .select('*');

      if (filterTahun) {
        queryRekap = queryRekap.eq('tahun', Number(filterTahun));
      }

      const [resAnggaran, resRekap] = await Promise.all([
        queryAnggaran,
        queryRekap,
        fetchBridgeObjects(),
        fetchKecamatanOverrides(),
        fetchKecamatanMaster()
      ]);

      if (resAnggaran.error) throw resAnggaran.error;
      if (resRekap.error) throw resRekap.error;

      const anggaranRows = (resAnggaran.data || []).map((row) => ({
        ...row,
        id: row?.id || row?.anggaran_id
      }));
      setDataAnggaran(anggaranRows);
      setDataRekap(resRekap.data || []);
      await fetchLinks(anggaranRows);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data dashboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchBridgeObjects, fetchKecamatanOverrides, fetchKecamatanMaster, fetchLinks, filterTahun]);

  // Fetch when filter changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 2. Linking Mechanism Function
  const handleLinkAssign = async (mapObjId, mapObjName, anggaranId, linkType = 'fisik') => {
    if (!mapObjId || !anggaranId) {
      console.error('[LINK_ASSIGN_INVALID_PAYLOAD]', { mapObjId, mapObjName, anggaranId, linkType });
      setError?.('Data link belum lengkap. Pilih ruas dan paket terlebih dahulu.');
      return;
    }

    try {
      const spatialType = String(mapObjId || '').startsWith('bridge_') ? 'bridge' : 'road';
      const payload = {
        anggaran_id: anggaranId,
        spasial_ref: mapObjId,
        spasial_nama: mapObjName,
        link_type: linkType || 'fisik',
        sumber_link: 'manual',
        confidence_score: 1.0
      };
      const payloadWithSpatialType = { ...payload, spasial_type: spatialType };

      let data;
      let upsertError;

      {
        const res = await supabase
          .from('anggaran_ruas_link')
          .upsert(payloadWithSpatialType, { onConflict: 'anggaran_id,spasial_ref,link_type' })
          .select('id, anggaran_id, spasial_ref, spasial_nama, link_type, sumber_link, confidence_score, catatan')
          .single();
        data = res.data;
        upsertError = res.error;
      }

      if (upsertError) {
        const message = String(upsertError.message || '').toLowerCase();
        const spatialTypeColumnMissing =
          upsertError.code === '42703' ||
          message.includes('spasial_type') ||
          message.includes('column');
        if (spatialTypeColumnMissing) {
          const fallbackRes = await supabase
            .from('anggaran_ruas_link')
            .upsert(payload, { onConflict: 'anggaran_id,spasial_ref,link_type' })
            .select('id, anggaran_id, spasial_ref, spasial_nama, link_type, sumber_link, confidence_score, catatan')
            .single();
          data = fallbackRes.data;
          upsertError = fallbackRes.error;
        }
      }

      if (upsertError) {
        console.error('[LINK_UPSERT_ERROR]', upsertError);
        throw upsertError;
      }

      const normalized = {
        id: data.id,
        anggaranId: data.anggaran_id,
        spasialRef: data.spasial_ref,
        spasialNama: data.spasial_nama,
        linkType: data.link_type,
        sumberLink: data.sumber_link,
        confidenceScore: data.confidence_score,
        catatan: data.catatan
      };

      setLinkedState((prev) => {
        const filtered = prev.filter(
          (l) =>
            !(
              normalizeKey(l.spasialRef) === normalizeKey(normalized.spasialRef) &&
              l.anggaranId === normalized.anggaranId &&
              l.linkType === normalized.linkType
            )
        );
        return [...filtered, normalized];
      });
      return normalized;
    } catch (err) {
      console.error(err);
      setError('Gagal menyimpan link ruas: ' + err.message);
      throw err;
    }
  };

  const handleUnlinkAssign = async (mapObjId, anggaranId, linkType = 'fisik') => {
    try {
      const { error: deleteError } = await supabase
        .from('anggaran_ruas_link')
        .delete()
        .eq('anggaran_id', anggaranId)
        .eq('spasial_ref', mapObjId)
        .eq('link_type', linkType);

      if (deleteError) throw deleteError;

      setLinkedState((prev) => {
        const updated = prev.filter(
          (l) =>
            !(
              normalizeKey(l.spasialRef) === normalizeKey(mapObjId) &&
              l.anggaranId === anggaranId &&
              l.linkType === linkType
            )
        );
        return updated;
      });
    } catch (err) {
      console.error(err);
      setError('Gagal menghapus link ruas: ' + err.message);
    }
  };

  const handleDeleteAnggaran = useCallback(
    async (rowOrId) => {
      const anggaranId =
        typeof rowOrId === 'string'
          ? rowOrId
          : rowOrId?.id || rowOrId?.anggaran_id;
      const rowName = typeof rowOrId === 'string' ? '' : rowOrId?.nama_paket;

      if (import.meta.env.DEV) {
        console.log('[DELETE_ROW_PAYLOAD]', rowOrId);
        console.log('[DELETE_ANGGARAN_ID]', anggaranId);
      }

      if (!anggaranId) {
        console.error('[DELETE_INVALID_ID]', rowOrId);
        setError('Gagal menghapus: ID data anggaran tidak ditemukan.');
        return;
      }

      const ok = window.confirm(`Yakin ingin menghapus paket ini?\n\n${rowName || '(tanpa nama paket)'}`);
      if (!ok) return;

      setDeletingId(anggaranId);
      try {
        if (import.meta.env.DEV) {
          console.log('[DELETE_START]', { anggaranId, namaPaket: rowName });
        }

        const { data: deletedLinks, error: deleteLinksError } = await supabase
          .from('anggaran_ruas_link')
          .delete()
          .eq('anggaran_id', anggaranId)
          .select('id');
        if (deleteLinksError) throw deleteLinksError;

        if (import.meta.env.DEV) {
          console.log('[DELETE_LINKS_RESULT]', { deletedCount: (deletedLinks || []).length, deletedLinks });
        }

        const { data: deletedAnggaranRows, error: deleteAnggaranError } = await supabase
          .from('anggaran_tahun')
          .delete()
          .eq('id', anggaranId)
          .select('id');
        if (deleteAnggaranError) throw deleteAnggaranError;
        if (import.meta.env.DEV) {
          console.log('[DELETE_ANGGARAN_RESULT]', { deletedCount: (deletedAnggaranRows || []).length, deletedAnggaranRows });
        }
        if (!Array.isArray(deletedAnggaranRows) || deletedAnggaranRows.length === 0) {
          throw new Error('Data tidak ditemukan atau tidak punya izin delete untuk anggaran_tahun.id tersebut.');
        }

        setDataAnggaran((prev) => prev.filter((item) => item.id !== anggaranId));
        setLinkedState((prev) => prev.filter((link) => link.anggaranId !== anggaranId));
        if (import.meta.env.DEV) {
          console.log('[DELETE_SUCCESS]', { anggaranId });
        }
      } catch (err) {
        console.error('[DELETE_BACKEND_ERROR]', err);
        const lower = String(err?.message || '').toLowerCase();
        if (
          lower.includes('rls') ||
          lower.includes('policy') ||
          lower.includes('permission denied') ||
          lower.includes('not allowed')
        ) {
          setError('Gagal menghapus data dari database: ditolak oleh policy/izin RLS.');
        } else {
          setError('Gagal menghapus data dari database: ' + err.message);
        }
      } finally {
        setDeletingId(null);
      }
    },
    []
  );

  const handleBulkDeleteByYear = useCallback(
    async (year) => {
      const targetYear = Number(year);
      if (!targetYear) {
        setError('Pilih tahun yang valid untuk bulk delete.');
        return;
      }

      const ok = window.confirm(`Semua data tahun ${targetYear} akan dihapus. Lanjutkan?`);
      if (!ok) return;

      setBulkDeleting(true);
      try {
        if (import.meta.env.DEV) {
          console.log('[DELETE_START]', { mode: 'bulk', year: targetYear });
        }

        const { data: rows, error: idsError } = await supabase
          .from('anggaran_tahun')
          .select('id')
          .eq('tahun', targetYear);
        if (idsError) throw idsError;

        const ids = (rows || []).map((r) => r.id).filter(Boolean);
        if (ids.length === 0) {
          setBulkDeleteYear('');
          return;
        }

        const { data: deletedLinks, error: deleteLinksError } = await supabase
          .from('anggaran_ruas_link')
          .delete()
          .in('anggaran_id', ids)
          .select('id');
        if (deleteLinksError) throw deleteLinksError;
        if (import.meta.env.DEV) {
          console.log('[DELETE_LINKS_RESULT]', { mode: 'bulk', year: targetYear, deletedCount: (deletedLinks || []).length });
        }

        const { data: deletedAnggaranRows, error: deleteAnggaranError } = await supabase
          .from('anggaran_tahun')
          .delete()
          .eq('tahun', targetYear)
          .select('id');
        if (deleteAnggaranError) throw deleteAnggaranError;
        if (import.meta.env.DEV) {
          console.log('[DELETE_ANGGARAN_RESULT]', { mode: 'bulk', year: targetYear, deletedCount: (deletedAnggaranRows || []).length });
        }

        setDataAnggaran((prev) => prev.filter((item) => Number(item.tahun) !== targetYear));
        setLinkedState((prev) => prev.filter((link) => !ids.includes(link.anggaranId)));
        setBulkDeleteYear('');
        await fetchData();
        if (import.meta.env.DEV) {
          console.log('[DELETE_SUCCESS]', { mode: 'bulk', year: targetYear, deletedPackages: ids.length });
        }
        window.alert(`${ids.length} paket berhasil dihapus.`);
      } catch (err) {
        console.error('[DELETE_BACKEND_ERROR]', err);
        const lower = String(err?.message || '').toLowerCase();
        if (
          lower.includes('rls') ||
          lower.includes('policy') ||
          lower.includes('permission denied') ||
          lower.includes('not allowed')
        ) {
          setError('Gagal menghapus data dari database: ditolak oleh policy/izin RLS.');
        } else {
          setError('Gagal menghapus data dari database: ' + err.message);
        }
      } finally {
        setBulkDeleting(false);
      }
    },
    [fetchData]
  );

  // 3. Helpers processing
  const totalAnggaran = getTotalAnggaran(dataAnggaran);
  const jumlahPaket = getJumlahPaket(dataAnggaran);
  const jumlahKecamatan = getUniqueKecamatan(dataAnggaran);
  const topSubKegiatan = getTopSubKegiatan(dataRekap);
  const overrideByAnggaranId = kecamatanOverrides.reduce((acc, item) => {
    if (!item?.anggaran_id) return acc;
    acc[item.anggaran_id] = item;
    return acc;
  }, {});
  const kecamatanAgg = dataAnggaran
    .reduce((acc, row) => {
      const rowId = row?.id || row?.anggaran_id;
      const effectiveKecamatan =
        overrideByAnggaranId[rowId]?.mapped_kecamatan_nama ||
        row?.kecamatan ||
        'Tidak Diketahui';
      const pagu = Number(row?.total_pagu) || 0;
      if (pagu <= 0) return acc;
      acc[effectiveKecamatan] = (acc[effectiveKecamatan] || 0) + pagu;
      return acc;
    }, {});

  const totalFisik = dataAnggaran.reduce((sum, r) => sum + (Number(r.pagu_fisik) || 0), 0);
  const totalPerencanaan = dataAnggaran.reduce((sum, r) => sum + (Number(r.pagu_perencanaan) || 0), 0);

  // Karena satu paket dapat ditautkan ke banyak ruas, unlinkedItems bisa disamakan dengan semua data Anggaran
  const unlinkedItems = dataAnggaran;

  // Table Filter options
  const availableYears = [...new Set(dataAnggaran.map((d) => d.tahun))]
    .filter(Boolean)
    .sort((a, b) => b - a);

  const displayedData = dataAnggaran.filter((row) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (row.nama_paket || '').toLowerCase().includes(q) ||
      (row.sub_kegiatan?.nama || '').toLowerCase().includes(q) ||
      (row.kecamatan || '').toLowerCase().includes(q)
    );
  });

  const kecamatanAggData = Object.keys(kecamatanAgg)
    .map((kecamatan) => ({ kecamatan, total_pagu: kecamatanAgg[kecamatan] }))
    .sort((a, b) => b.total_pagu - a.total_pagu);

  const handleSaveKecamatanOverride = async (row, selectedValue) => {
    const anggaranId = row?.id || row?.anggaran_id;
    if (!anggaranId) {
      console.error('[KECAMATAN_OVERRIDE_INVALID_ROW]', row);
      return;
    }
    try {
      setOverrideSavingId(anggaranId);
      const virtualMap = {
        kabupaten_umum: 'Kabupaten / Umum',
        honorarium: 'Honorarium',
        lainnya: 'Lainnya',
        tidak_diketahui: 'Tidak Diketahui'
      };
      const isVirtual = Object.prototype.hasOwnProperty.call(virtualMap, selectedValue);
      let mappedId = selectedValue;
      let mappedNama = virtualMap[selectedValue] || 'Kabupaten / Umum';
      if (!isVirtual) {
        const selected = (kecamatanMaster || []).find((k) => String(k.id) === String(selectedValue));
        mappedId = selected?.id || selectedValue;
        mappedNama = selected?.nama || selected?.nama_kecamatan || 'Tidak Diketahui';
      } else {
        mappedId = null;
      }

      const payload = {
        anggaran_id: anggaranId,
        raw_kecamatan: row?.kecamatan || 'Tidak Diketahui',
        mapped_kecamatan_id: mappedId,
        mapped_kecamatan_nama: mappedNama,
        sumber_override: 'manual',
        aktif: true
      };

      const { data, error: upsertError } = await supabase
        .from('anggaran_kecamatan_override')
        .upsert(payload, { onConflict: 'anggaran_id' })
        .select('*')
        .single();
      if (upsertError) throw upsertError;

      setKecamatanOverrides((prev) => {
        const filtered = prev.filter((it) => it.anggaran_id !== anggaranId);
        return [...filtered, data];
      });
    } catch (errorSave) {
      console.error('[KECAMATAN_OVERRIDE_SAVE_ERROR]', errorSave);
      setError('Gagal menyimpan override kecamatan: ' + errorSave.message);
    } finally {
      setOverrideSavingId(null);
    }
  };

  const handleClearKecamatanOverride = async (row) => {
    const anggaranId = row?.id || row?.anggaran_id;
    if (!anggaranId) {
      console.error('[KECAMATAN_OVERRIDE_INVALID_ROW]', row);
      return;
    }
    try {
      setOverrideSavingId(anggaranId);
      const { error: clearError } = await supabase
        .from('anggaran_kecamatan_override')
        .delete()
        .eq('anggaran_id', anggaranId);
      if (clearError) throw clearError;
      setKecamatanOverrides((prev) => prev.filter((it) => it.anggaran_id !== anggaranId));
    } catch (errorClear) {
      console.error('[KECAMATAN_OVERRIDE_CLEAR_ERROR]', errorClear);
      setError('Gagal menghapus override kecamatan: ' + errorClear.message);
    } finally {
      setOverrideSavingId(null);
    }
  };

  // --- Drill-down: Sub Kegiatan Detail View ---
  if (selectedSubKegiatan) {
    return (
      <div className="dashboard-page">
        <SubKegiatanDetailView
          subKegiatanName={selectedSubKegiatan}
          dataAnggaran={dataAnggaran}
          onBack={() => setSelectedSubKegiatan(null)}
          onDeleteRow={handleDeleteAnggaran}
          deletingId={deletingId}
          overrideByAnggaranId={overrideByAnggaranId}
        />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h2 className="page-title">Executive Dashboard Pra RKA</h2>
        <div className="dashboard-actions">
          <select 
            className="filter-year"
            value={filterTahun}
            onChange={(e) => setFilterTahun(e.target.value)}
          >
            <option value="">Semua Tahun</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            className="filter-year"
            value={bulkDeleteYear}
            onChange={(e) => setBulkDeleteYear(e.target.value)}
            disabled={bulkDeleting}
            style={{ marginLeft: 8 }}
          >
            <option value="">Pilih Tahun Hapus</option>
            {availableYears.map(y => <option key={`bulk-${y}`} value={y}>{y}</option>)}
          </select>
          <button
            type="button"
            className="btn-link-cancel"
            style={{ marginLeft: 8, color: '#b91c1c', borderColor: '#fecaca' }}
            disabled={bulkDeleting || !bulkDeleteYear}
            onClick={() => handleBulkDeleteByYear(bulkDeleteYear)}
          >
            {bulkDeleting ? 'Menghapus...' : 'Hapus Semua Data Tahun'}
          </button>
        </div>
      </div>

      {error && <div className="msg msg-error">{error}</div>}

      {/* KPI Overviews */}
      <DashboardSummary 
        totalAnggaran={totalAnggaran}
        totalFisik={totalFisik}
        totalPerencanaan={totalPerencanaan}
        jumlahPaket={jumlahPaket}
        topSubKegiatan={topSubKegiatan}
      />

      {/* Charts Row */}
      <div className="dashboard-grid-2">
        <KecamatanChart data={kecamatanAggData} />
        <SubKegiatanChart dataRekap={dataRekap} onBarClick={(name) => setSelectedSubKegiatan(name)} />
      </div>

      {/* Geospasial Map Section */}
      <div style={{ marginTop: '24px' }}>
        <BudgetMap 
          backgroundRoads={backgroundRoads}
          interactiveRoads={interactiveRoads}
          linkedState={linkedState} 
          selectedMapObj={selectedMapObj}
          setSelectedMapObj={setSelectedMapObj}
          isBridgeMarkMode={isBridgeMarkMode}
          onBridgeMapClick={handleMapClickForBridge}
          onToggleBridgeMark={() => {
            setIsBridgeMarkMode((prev) => !prev);
            setPendingBridgePoint(null);
          }}
        />
        {isBridgeMarkMode && pendingBridgePoint && (
          <div className="card" style={{ marginTop: 12, padding: 16 }}>
            <h4 style={{ marginTop: 0, marginBottom: 12 }}>Form Titik Jembatan</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input
                type="text"
                placeholder="Nama Jembatan (wajib)"
                value={bridgeForm.nama_jembatan}
                onChange={(e) => setBridgeForm((prev) => ({ ...prev, nama_jembatan: e.target.value }))}
              />
              <input
                type="text"
                placeholder="Kode Jembatan (opsional)"
                value={bridgeForm.kode_jembatan}
                onChange={(e) => setBridgeForm((prev) => ({ ...prev, kode_jembatan: e.target.value }))}
              />
              <input
                type="text"
                placeholder="Kecamatan (opsional)"
                value={bridgeForm.kecamatan}
                onChange={(e) => setBridgeForm((prev) => ({ ...prev, kecamatan: e.target.value }))}
              />
              <input
                type="text"
                placeholder="Desa/Kelurahan (opsional)"
                value={bridgeForm.desa_kelurahan}
                onChange={(e) => setBridgeForm((prev) => ({ ...prev, desa_kelurahan: e.target.value }))}
              />
              <input type="text" readOnly value={pendingBridgePoint.latitude} />
              <input type="text" readOnly value={pendingBridgePoint.longitude} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn-link-fisik" type="button" onClick={handleSaveBridge}>Simpan Jembatan</button>
              <button className="btn-link-cancel" type="button" onClick={handleCancelBridge}>Batal</button>
            </div>
          </div>
        )}
        <CoordinateLinkPanel 
          selectedMapObj={selectedMapObj}
          setSelectedMapObj={setSelectedMapObj}
          unlinkedItems={unlinkedItems}
          linkedState={linkedState}
          onLinkAssign={handleLinkAssign}
          onUnlinkAssign={handleUnlinkAssign}
          allAnggaran={dataAnggaran}
          interactiveRoads={interactiveRoads}
          bridgeObjects={bridgeObjects}
        />
      </div>

      {/* Detail Table */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="card-title" style={{ margin: 0 }}>Rincian Paket Anggaran</h3>
          <input
            type="text"
            placeholder="Cari nama paket/sub kegiatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '300px', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px' }}
          />
        </div>
        <AnggaranTable
          data={displayedData}
          loading={loading}
          onDeleteRow={handleDeleteAnggaran}
          deletingId={deletingId}
          kecamatanMaster={kecamatanMaster}
          overrideByAnggaranId={overrideByAnggaranId}
          onSaveKecamatanOverride={handleSaveKecamatanOverride}
          onClearKecamatanOverride={handleClearKecamatanOverride}
          overrideSavingId={overrideSavingId}
        />
      </div>

    </div>
  );
}
