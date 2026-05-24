import { formatRupiah } from '../lib/aggregateHelpers';

export default function DashboardSummary({ totalAnggaran, totalFisik, totalPerencanaan, jumlahPaket, topSubKegiatan }) {
  return (
    <div className="dashboard-summary">
      <div className="summary-card" style={{ borderTopColor: 'var(--color-fisik)' }}>
        <div className="summary-content">
          <p className="summary-label">Total Anggaran</p>
          <h3 className="summary-value" style={{ color: 'var(--color-primary)' }}>{formatRupiah(totalAnggaran)}</h3>
          {(totalFisik > 0 || totalPerencanaan > 0) && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              {totalFisik > 0 && <span className="badge badge-fisik" style={{ margin: 0 }}>Fisik</span>}
              {totalPerencanaan > 0 && <span className="badge badge-perencanaan" style={{ margin: 0 }}>Perencanaan</span>}
            </div>
          )}
        </div>
      </div>
      
      <div className="summary-card" style={{ borderTopColor: 'var(--color-perencanaan)' }}>
        <div className="summary-content">
          <p className="summary-label">Jumlah Paket</p>
          <h3 className="summary-value">{jumlahPaket}</h3>
        </div>
      </div>
      
      <div className="summary-card" style={{ borderTopColor: 'var(--color-honor)' }}>
        <div className="summary-content">
          <p className="summary-label">Sub Kegiatan Terbesar</p>
          <h3 className="summary-value" style={{ fontSize: '15px', lineHeight: '1.3', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }} title={topSubKegiatan?.nama_sub_kegiatan}>
            {topSubKegiatan?.nama_sub_kegiatan || '-'}
          </h3>
          <p className="summary-subline" style={{ color: 'var(--color-primary-light)' }}>{formatRupiah(topSubKegiatan?.total_pagu)}</p>
        </div>
      </div>
    </div>
  );
}
