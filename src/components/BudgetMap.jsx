import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, LayersControl, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import MapLegend from './MapLegend';
import L from 'leaflet';

// Fix untuk masalah ikon default Leaflet di Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;

const DEFAULT_MARKER = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const GREEN_MARKER = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const RED_MARKER = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const SELECTED_MARKER = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const createBridgeDivIcon = (linked = false, selected = false) =>
  L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 8px;
        background: ${linked ? '#0f766e' : '#334155'};
        border: 2px solid ${selected ? '#f59e0b' : linked ? '#99f6e4' : '#cbd5e1'};
        box-shadow: ${linked ? '0 0 0 3px rgba(16,185,129,0.25)' : '0 2px 6px rgba(15,23,42,0.25)'};
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 9px;
        font-weight: 700;
        line-height: 1;
        font-family: Arial, sans-serif;
        letter-spacing: 0.2px;
      ">JB</div>
    `
  });

// Komponen kecil untuk auto-resize dan fallback map logic
function MapController({ interactiveRoads, backgroundRoads, selectedMapObj }) {
  const map = useMap();
  
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 300);
    const t2 = setTimeout(() => map.invalidateSize(), 800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);

  useEffect(() => {
    // Jika ada selected map object, zoom ke fitur tsb
    if (selectedMapObj && selectedMapObj.coordinates && selectedMapObj.coordinates.length > 0) {
      try {
        const bounds = new L.LatLngBounds();
        if (selectedMapObj.type === 'marker' || selectedMapObj.type === 'point' || selectedMapObj.type === 'bridge') {
          bounds.extend(selectedMapObj.coordinates);
        } else {
          selectedMapObj.coordinates.forEach(coord => bounds.extend(coord));
        }
        if (bounds.isValid()) {
          map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 16, duration: 1.5 });
          return;
        }
      } catch (e) {
        console.error("FlyToBounds Error: ", e);
      }
    }

    // Zoom default to interactive roads if available, else background roads
    if (interactiveRoads && interactiveRoads.length > 0) {
      try {
        const bounds = new L.LatLngBounds();
        let hasValidCoords = false;
        interactiveRoads.forEach(obj => {
          if (obj.coordinates && obj.coordinates.length > 0) {
            if (obj.type === 'marker' || obj.type === 'point' || obj.type === 'bridge') {
              bounds.extend(obj.coordinates);
              hasValidCoords = true;
            } else {
              obj.coordinates.forEach(coord => { bounds.extend(coord); });
              hasValidCoords = true;
            }
          }
        });
        if (hasValidCoords && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
        }
      } catch (e) {
        console.error("FitBounds Error: ", e);
      }
    } else if (backgroundRoads && backgroundRoads.length > 0) {
      try {
        const bounds = new L.LatLngBounds();
        let hasValidCoords = false;
        backgroundRoads.forEach(obj => {
          if (obj.coordinates && obj.coordinates.length > 0) {
            if (obj.type === 'marker' || obj.type === 'point' || obj.type === 'bridge') {
              bounds.extend(obj.coordinates);
              hasValidCoords = true;
            } else {
              obj.coordinates.forEach(coord => { bounds.extend(coord); });
              hasValidCoords = true;
            }
          }
        });
        if (hasValidCoords && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
        }
      } catch (e) {
        console.error("FitBounds Error (Background): ", e);
      }
    }
  }, [map, interactiveRoads, backgroundRoads, selectedMapObj]);

  return null;
}

function BridgeMapClickHandler({ isBridgeMarkMode, onBridgeMapClick }) {
  useMapEvents({
    click(e) {
      if (!isBridgeMarkMode || typeof onBridgeMapClick !== 'function') return;
      onBridgeMapClick(e.latlng);
    }
  });
  return null;
}

export default function BudgetMap({ 
  backgroundRoads = [], 
  interactiveRoads = [], 
  linkedState, 
  selectedMapObj,
  setSelectedMapObj,
  isBridgeMarkMode = false,
  onBridgeMapClick,
  onToggleBridgeMark
}) {
  const [activeBasemap, setActiveBasemap] = useState('OSM Jalan');

  // Pusat peta fallback (Hulu Sungai Selatan)
  const mapCenter = [-2.800, 115.150];

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

  const isRoadLinked = (road) => {
    const roadRef = getRoadRef(road);
    return Array.isArray(linkedState) && linkedState.some(
      (link) => normalizeKey(link.spasialRef) === normalizeKey(roadRef)
    );
  };

  const getLinksForRuas = (road) => {
    const roadKey = normalizeKey(getRoadRef(road));
    return Array.isArray(linkedState)
      ? linkedState.filter((link) => normalizeKey(link.spasialRef) === roadKey)
      : [];
  };

  const totalInteractive = interactiveRoads.length;
  const linkedCount = interactiveRoads.filter(obj => getLinksForRuas(obj).length > 0).length;
  const unlinkedCount = totalInteractive - linkedCount;

  // Background style
  const bgRoadStyle = { color: '#94a3b8', weight: 3, opacity: 0.6 };

  // Helper styling untuk interactive roads
  const getStyleForObj = (obj) => {
    const linked = isRoadLinked(obj);
    if (linked) {
      const links = getLinksForRuas(obj);
      const linkType = links[0].linkType; // fallback to first link for coloring
      if (linkType === 'perencanaan') {
        return { color: '#dc2626', weight: 6, opacity: 0.9 }; // Red
      }
      return { color: '#22c55e', weight: 6, opacity: 0.9 }; // Green (Fisik)
    }
    if (selectedMapObj?.id === obj?.id) {
      return { color: '#eab308', weight: 7, opacity: 1 }; // Yellow (Selected)
    }
    return { color: '#3b82f6', weight: 5, opacity: 0.8 }; // Blue (Default Interactive)
  };

  const getMarkerForObj = (obj) => {
    const isBridge = obj?.type === 'bridge' || obj?.properties?.spatialType === 'bridge';
    const isSelected = selectedMapObj?.id === obj?.id;
    if (isRoadLinked(obj)) {
      const links = getLinksForRuas(obj);
      const linkType = links[0].linkType;
      if (isBridge) return createBridgeDivIcon(true, isSelected);
      if (linkType === 'perencanaan') return RED_MARKER;
      return GREEN_MARKER;
    }
    if (isSelected) return SELECTED_MARKER;
    if (isBridge) return createBridgeDivIcon(false, false);
    return DEFAULT_MARKER;
  };

  return (
    <div className="card map-card flex-col">
      <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 className="card-title" style={{ margin: 0 }}>Peta Geospasial Anggaran & Linking Tool</h3>
        <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
          <div><strong>Context Background:</strong> {backgroundRoads.length} Ruas</div>
          <div style={{ color: '#0f172a' }}><strong>Ruas Interaktif:</strong> {totalInteractive}</div>
          <div style={{ color: '#16a34a' }}><strong>Telah Tertaud:</strong> {linkedCount}</div>
          <div style={{ color: '#2563eb' }}><strong>Belum Tertaud:</strong> {unlinkedCount}</div>
        </div>
      </div>
      
      <div className="map-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
         <span>{isBridgeMarkMode ? 'Klik lokasi jembatan di peta.' : 'Silakan klik ruas jaringan di peta untuk menautkannya dengan paket anggaran pada panel di bawah.'}</span>
         <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
           <button className="btn-link-fisik" type="button" onClick={onToggleBridgeMark}>
             {isBridgeMarkMode ? 'Batal Mark Jembatan' : 'Tambah Titik Jembatan'}
           </button>
           {isBridgeMarkMode && <span className="badge badge-fisik">Mode Mark Jembatan Aktif</span>}
         </div>
      </div>

      <div className="map-wrapper" style={{ width: '100%', height: '500px', position: 'relative' }}>
        <MapContainer 
          center={mapCenter} 
          zoom={10} 
          style={{
            position: 'absolute',
            inset: 0,
            height: '100%',
            width: '100%',
            borderRadius: '4px',
            zIndex: 1,
            backgroundColor: '#f8fafc',
            cursor: isBridgeMarkMode ? 'crosshair' : 'grab'
          }}
        >
          <MapController interactiveRoads={interactiveRoads} backgroundRoads={backgroundRoads} selectedMapObj={selectedMapObj} />
          <BridgeMapClickHandler isBridgeMarkMode={isBridgeMarkMode} onBridgeMapClick={onBridgeMapClick} />
          
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="OSM Jalan">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                eventHandlers={{
                  add: () => setActiveBasemap('OSM Jalan')
                }}
              />
            </LayersControl.BaseLayer>
            
            <LayersControl.BaseLayer name="Esri Satellite">
              <TileLayer
                attribution='Tiles &copy; Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                eventHandlers={{
                  add: () => setActiveBasemap('Esri Satellite')
                }}
              />
            </LayersControl.BaseLayer>
          </LayersControl>
          
          {/* Layer Background (Non Interaktif/Statis) */}
          {backgroundRoads.map((obj) => (
            <Polyline 
              key={obj.id} 
              positions={obj.coordinates} 
              color={bgRoadStyle.color} 
              weight={bgRoadStyle.weight}
              opacity={bgRoadStyle.opacity}
              interactive={false}
            />
          ))}

          {/* Layer Interactive */}
          {interactiveRoads.map((obj) => {
             const styleProps = getStyleForObj(obj);
             const markerIcon = getMarkerForObj(obj);
             const links = getLinksForRuas(obj);
             const isLinked = links.length > 0;
             const roadRef = getRoadRef(obj);
             const dynamicKey = `${roadRef}-${styleProps.color}-${styleProps.weight}-${styleProps.opacity}-${isLinked}-${links.length}`;

             if (obj.type === 'marker' || obj.type === 'point' || obj.type === 'bridge') {
                return (
                  <Marker 
                    key={dynamicKey}
                    position={obj.coordinates}
                    icon={markerIcon}
                    eventHandlers={{ click: () => setSelectedMapObj(obj) }}
                  >
                    {obj.type === 'bridge' || obj?.properties?.spatialType === 'bridge' ? (
                      <Popup>
                        <div style={{ minWidth: 220, fontSize: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 8 }}>{obj.name}</div>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                              <tr><td style={{ padding: '2px 0', color: '#64748b' }}>Kecamatan</td><td style={{ padding: '2px 0' }}>{obj?.properties?.kecamatan || '-'}</td></tr>
                              <tr><td style={{ padding: '2px 0', color: '#64748b' }}>Latitude</td><td style={{ padding: '2px 0' }}>{obj?.coordinates?.[0]}</td></tr>
                              <tr><td style={{ padding: '2px 0', color: '#64748b' }}>Longitude</td><td style={{ padding: '2px 0' }}>{obj?.coordinates?.[1]}</td></tr>
                              <tr><td style={{ padding: '2px 0', color: '#64748b' }}>Sumber Data</td><td style={{ padding: '2px 0' }}>{obj?.properties?.sumber_data || '-'}</td></tr>
                              <tr>
                                <td style={{ padding: '2px 0', color: '#64748b' }}>Status</td>
                                <td style={{ padding: '2px 0' }}>
                                  {isLinked ? 'Terhubung ke Paket' : 'Belum Terhubung'}
                                  {isLinked ? ` (${links.length} ${links.length > 1 ? 'Paket Terhubung' : 'Paket Terhubung'})` : ''}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </Popup>
                    ) : (
                      <Popup>
                        <strong>{obj.name}</strong><br/>
                        Status: {isLinked ? `Terhubung (${links.length} paket)` : 'Tersedia untuk Dilink'}
                      </Popup>
                    )}
                  </Marker>
                );
             }

             return (
               <Polyline 
                 key={dynamicKey} 
                 positions={obj.coordinates} 
                 color={styleProps.color} 
                 weight={styleProps.weight}
                 opacity={styleProps.opacity}
                 eventHandlers={{ click: () => setSelectedMapObj(obj) }}
               >
                 <Popup>
                   <strong>{obj.name}</strong><br/>
                   Status: {isLinked ? `Terhubung (${links.length} paket)` : 'Tersedia untuk Dilink'}
                 </Popup>
               </Polyline>
             );
          })}
        </MapContainer>
        <MapLegend activeBasemap={activeBasemap} />
      </div>
    </div>
  );
}
