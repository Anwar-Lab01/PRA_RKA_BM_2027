export default function MapLegend({ activeBasemap }) {
  return (
    <div className="map-legend" style={{ zIndex: 1000, position: 'absolute', bottom: 20, left: 20, background: 'rgba(255, 255, 255, 0.95)', padding: '12px 16px', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--color-border)' }}>
      {activeBasemap && <div style={{ fontSize: 11, marginBottom: 8, opacity: 0.8, color: '#333' }}>Basemap: {activeBasemap}</div>}
      <h4 style={{ fontSize: 13, marginBottom: 8, color: 'var(--color-primary)' }}>Legenda Peta</h4>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 6 }}>
        <span style={{ display: 'inline-block', width: 24, height: 3, backgroundColor: '#94a3b8' }}></span>
        <span>Baseline Jalan</span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 6 }}>
        <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', backgroundColor: '#3b82f6' }}></span>
        <span>Belum Terhubung</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 6 }}>
        <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
        <span>Terhubung (Fisik)</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 6 }}>
        <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', backgroundColor: '#dc2626' }}></span>
        <span>Terhubung (Perencanaan)</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
        <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', backgroundColor: '#eab308', border: '2px solid #fff', boxShadow: '0 0 0 1px #eab308' }}></span>
        <span>Sedang Dipilih</span>
      </div>
    </div>
  );
}
