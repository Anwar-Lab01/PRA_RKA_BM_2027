import { useState } from 'react';
import { formatRupiah } from '../lib/aggregateHelpers';
import { suggestSpatialLinksForAnggaran } from '../lib/spatialMatchHelpers';

export default function CoordinateLinkPanel({ 
  selectedMapObj, 
  setSelectedMapObj, 
  linkedState, 
  onLinkAssign,
  onUnlinkAssign,
  allAnggaran,
  interactiveRoads = [],
  bridgeObjects = []
}) {
  const [searchAnggaran, setSearchAnggaran] = useState('');
  const [searchRuas, setSearchRuas] = useState('');
  const [selectedAnggaranId, setSelectedAnggaranId] = useState(null);
  const [isSavingLink, setIsSavingLink] = useState(false);

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

  const normalizeKey = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[–—]/g, '-')
      .replace(/[^a-z0-9-]/g, '');

  const isBridgeObject = (obj) => obj?.properties?.spatialType === 'bridge' || obj?.type === 'bridge';

  const allMapObjects = [
    ...(interactiveRoads || []),
    ...(bridgeObjects || []).filter(
      (bridge) => !(interactiveRoads || []).some((obj) => normalizeKey(getRoadRef(obj)) === normalizeKey(getRoadRef(bridge)))
    )
  ];

  // Derived state
  const selectedAnggaran = allAnggaran.find(a => a.id === selectedAnggaranId);
  const linksForSelectedAnggaran = Array.isArray(linkedState) && selectedAnggaranId 
    ? linkedState.filter(l => l.anggaranId === selectedAnggaranId) 
    : [];

  const filteredAnggaran = allAnggaran.filter(a => {
    if (!searchAnggaran) return true;
    const q = searchAnggaran.toLowerCase();
    return a.nama_paket?.toLowerCase().includes(q) || a.tahun?.toString().includes(q);
  });

  const filteredRuas = allMapObjects.filter(r => {
    if (isBridgeObject(r)) return false;
    if (!searchRuas) return true;
    const q = searchRuas.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.nama?.toLowerCase().includes(q) ||
      r.id?.toLowerCase().includes(q) ||
      r.properties?.nama?.toLowerCase().includes(q)
    );
  });

  const filteredJembatan = allMapObjects.filter(r => {
    if (!isBridgeObject(r)) return false;
    if (!searchRuas) return true;
    const q = searchRuas.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.nama?.toLowerCase().includes(q) ||
      r.id?.toLowerCase().includes(q) ||
      r.refId?.toString().toLowerCase().includes(q) ||
      r.properties?.nama?.toLowerCase().includes(q) ||
      r.properties?.kecamatan?.toLowerCase().includes(q) ||
      r.properties?.kode_jembatan?.toLowerCase().includes(q)
    );
  });

  const selectedAnggaranSuggestions = selectedAnggaran
    ? suggestSpatialLinksForAnggaran(
        selectedAnggaran,
        allMapObjects.filter((r) => !isBridgeObject(r))
      )
    : [];

  // Action handlers
  const handleLink = async (type) => {
    if (!selectedMapObj || !selectedAnggaranId || isSavingLink) return;

    const selectedRoadRef = getRoadRef(selectedMapObj);
    const selectedRoadName =
      selectedMapObj?.nama ||
      selectedMapObj?.name ||
      selectedMapObj?.properties?.nama ||
      selectedRoadRef;

    if (!selectedRoadRef) {
      console.error('[LINK_PANEL_INVALID_ROAD]', { selectedMapObj, selectedRoadRef });
      return;
    }

    try {
      setIsSavingLink(true);
      await onLinkAssign(selectedRoadRef, selectedRoadName, selectedAnggaranId, type || 'fisik');
      setSelectedMapObj(null);
    } catch (err) {
      console.error('[LINK_PANEL_ERROR]', err);
    } finally {
      setIsSavingLink(false);
    }
  };

  const handleCancelSelection = () => {
    setSelectedMapObj(null);
    setSelectedAnggaranId(null);
  };

  const handleApproveSuggestion = async (suggestion) => {
    if (!suggestion?.roadRef || !selectedAnggaranId || isSavingLink) return;
    try {
      setIsSavingLink(true);
      await onLinkAssign(suggestion.roadRef, suggestion.roadName, selectedAnggaranId, 'fisik');
    } catch (err) {
      console.error('[LINK_SUGGESTION_ERROR]', err);
    } finally {
      setIsSavingLink(false);
    }
  };

  // Stats
  const totalLinks = Array.isArray(linkedState) ? linkedState.length : 0;
  const totalFisikLinks = Array.isArray(linkedState) ? linkedState.filter(l => l.linkType === 'fisik').length : 0;
  const totalPerencanaanLinks = Array.isArray(linkedState) ? linkedState.filter(l => l.linkType === 'perencanaan').length : 0;

  return (
    <div className="card" style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 className="card-title" style={{ margin: 0 }}>Sistem Penghubung Geospasial</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="link-count-pill green">🔗 {totalLinks} total link</span>
          {totalFisikLinks > 0 && <span className="badge badge-fisik">Fisik: {totalFisikLinks}</span>}
          {totalPerencanaanLinks > 0 && <span className="badge badge-perencanaan">Prc: {totalPerencanaanLinks}</span>}
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        
        {/* ====== KOLOM KIRI: Paket Anggaran ====== */}
        <div className="link-panel-column">
          <div className="link-panel-box">
            <h4><span className="step-num">1</span> Pilih Paket Anggaran</h4>
            <input 
              type="text" 
              className="link-search-input"
              placeholder="🔍 Cari nama paket..." 
              value={searchAnggaran}
              onChange={(e) => setSearchAnggaran(e.target.value)}
            />
            
            <div className="link-list-scroll">
              {filteredAnggaran.length === 0 ? (
                <div className="empty-state-mini">
                  <div className="empty-icon">📦</div>
                  <p>Paket tidak ditemukan.</p>
                </div>
              ) : (
                filteredAnggaran.map(item => {
                  const isSelected = selectedAnggaranId === item.id;
                  const linkCount = Array.isArray(linkedState) ? linkedState.filter(l => l.anggaranId === item.id).length : 0;
                  return (
                    <div 
                      key={item.id} 
                      className={`link-list-item ${isSelected ? 'selected-anggaran' : ''}`}
                      onClick={() => setSelectedAnggaranId(item.id)}
                    >
                      <div style={{ fontWeight: 600, fontSize: 12, color: isSelected ? 'var(--color-primary)' : 'inherit' }}>
                        {item.nama_paket}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                          Thn {item.tahun} &bull; {formatRupiah(item.total_pagu)}
                        </div>
                        {linkCount > 0 && (
                          <span className="link-count-pill green">{linkCount} ruas</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Status Paket Terpilih */}
            {selectedAnggaran && (
              <div className="link-status-section">
                <div className="link-status-label">Ruas Terhubung ke Paket Ini</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 10 }}>
                  {linksForSelectedAnggaran.length} ruas terhubung
                </div>
                {linksForSelectedAnggaran.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {linksForSelectedAnggaran.map(link => (
                      <div key={`${link.anggaranId}-${link.spasialRef}`} className="link-connected-item">
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{link.spasialNama}</div>
                          <span className={`badge badge-${link.linkType}`}>
                            {link.linkType === 'fisik' ? 'Fisik' : 'Perencanaan'}
                          </span>
                        </div>
                        <button 
                          className="btn-unlink"
                          onClick={() => onUnlinkAssign(link.spasialRef, selectedAnggaranId, link.linkType)}
                        >
                          ✕ Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rekap-child-empty">
                    <span>📍</span> Belum ada ruas terhubung. Pilih ruas di panel kanan.
                  </div>
                )}
                <div style={{ marginTop: 14 }}>
                  <div className="link-status-label">Saran Link Otomatis (Perlu Persetujuan)</div>
                  {selectedAnggaranSuggestions.length === 0 ? (
                    <div className="rekap-child-empty">Belum ada saran ruas yang cukup relevan.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {selectedAnggaranSuggestions.map((s) => (
                        <div key={`${selectedAnggaranId}-${s.roadRef}`} className="link-connected-item">
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{s.roadName}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                              {s.reason}
                            </div>
                            <span className="badge badge-fisik">Confidence: {s.confidenceLabel}</span>
                          </div>
                          <button
                            className="btn-link-fisik"
                            disabled={isSavingLink}
                            onClick={() => handleApproveSuggestion(s)}
                          >
                            Approve Link
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ====== KOLOM KANAN: Ruas Peta ====== */}
        <div className="link-panel-column">
          <div className="link-panel-box">
            <h4><span className="step-num">2</span> Pilih Ruas / Jembatan</h4>
            <input 
              type="text" 
              className="link-search-input"
              placeholder="🔍 Cari nama ruas..." 
              value={searchRuas}
              onChange={(e) => setSearchRuas(e.target.value)}
            />
            
            <div className="link-status-label" style={{ marginBottom: 8 }}>Daftar Ruas</div>
            <div className="link-list-scroll" style={{ maxHeight: 180 }}>
              {filteredRuas.length === 0 ? (
                <div className="empty-state-mini">
                  <div className="empty-icon">🗺️</div>
                  <p>Ruas tidak ditemukan.</p>
                </div>
              ) : (
                filteredRuas.map(item => {
                  const isSelected = selectedMapObj?.id === item.id;
                  const itemRoadRef = getRoadRef(item);
                  const mapLinks = Array.isArray(linkedState)
                    ? linkedState.filter(l => normalizeKey(l.spasialRef) === normalizeKey(itemRoadRef))
                    : [];
                  return (
                    <div 
                      key={item.id} 
                      className={`link-list-item ${isSelected ? 'selected-ruas' : ''}`}
                      onClick={() => setSelectedMapObj(item)}
                    >
                      <div style={{ fontWeight: 600, fontSize: 12, color: isSelected ? '#b45309' : 'inherit' }}>
                        {item.name}
                      </div>
                      {mapLinks.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <span className="link-count-pill gray">{mapLinks.length} paket</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="link-status-label" style={{ marginTop: 12, marginBottom: 8 }}>Daftar Jembatan ({filteredJembatan.length})</div>
            <div className="link-list-scroll" style={{ maxHeight: 180 }}>
              {filteredJembatan.length === 0 ? (
                <div className="empty-state-mini">
                  <div className="empty-icon">--</div>
                  <p>Jembatan tidak ditemukan.</p>
                </div>
              ) : (
                filteredJembatan.map(item => {
                  const isSelected = selectedMapObj?.id === item.id;
                  const itemRef = getRoadRef(item);
                  const mapLinks = Array.isArray(linkedState)
                    ? linkedState.filter(l => normalizeKey(l.spasialRef) === normalizeKey(itemRef))
                    : [];
                  return (
                    <div
                      key={item.id}
                      className={`link-list-item ${isSelected ? 'selected-ruas' : ''}`}
                      onClick={() => setSelectedMapObj(item)}
                    >
                      <div style={{ fontWeight: 600, fontSize: 12, color: isSelected ? '#b45309' : 'inherit' }}>
                        {item.name || item.nama || item.properties?.nama || item.id}
                      </div>
                      {mapLinks.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <span className="link-count-pill gray">{mapLinks.length} paket</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Aksi Penghubung */}
            <div className="link-action-area">
              <div className="link-status-label">Aksi Penghubung</div>
              
              {!selectedAnggaranId && !selectedMapObj ? (
                <div className="link-action-hint">
                  <span>💡</span> Silakan pilih paket anggaran (kiri) dan ruas/jembatan (kanan atau klik di peta).
                </div>
              ) : (selectedAnggaranId && !selectedMapObj) ? (
                <div className="link-action-hint warning">
                  <span>⚠️</span> Pilih ruas atau jembatan dari daftar di atas, atau klik langsung di peta.
                </div>
              ) : (!selectedAnggaranId && selectedMapObj) ? (
                <div className="link-action-hint warning">
                  <span>⚠️</span> Pilih paket anggaran dari panel kiri.
                </div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, marginBottom: 10, lineHeight: 1.5, color: 'var(--color-text)' }}>
                    Hubungkan <strong style={{ color: 'var(--color-primary)' }}>{selectedAnggaran.nama_paket}</strong> dengan ruas <strong style={{ color: '#b45309' }}>{selectedMapObj?.name || selectedMapObj?.nama || selectedMapObj?.properties?.nama || getRoadRef(selectedMapObj)}</strong>:
                  </div>
                  
                  {Array.isArray(linkedState) && linkedState.some(
                    l =>
                      l.anggaranId === selectedAnggaranId &&
                      normalizeKey(l.spasialRef) === normalizeKey(getRoadRef(selectedMapObj))
                  ) ? (
                    <div className="link-already-connected">
                      <span>✅</span> Kombinasi ini sudah terhubung.
                    </div>
                  ) : (
                    <div className="link-action-buttons">
                      <button className="btn-link-fisik" disabled={isSavingLink} onClick={() => handleLink('fisik')}>
                        🔵 {isSavingLink ? 'Menyimpan...' : 'Link sbg Fisik'}
                      </button>
                      <button className="btn-link-perencanaan" disabled={isSavingLink} onClick={() => handleLink('perencanaan')}>
                        🟠 {isSavingLink ? 'Menyimpan...' : 'Link sbg Perencanaan'}
                      </button>
                      <button className="btn-link-cancel" onClick={handleCancelSelection}>
                        Batalkan
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
