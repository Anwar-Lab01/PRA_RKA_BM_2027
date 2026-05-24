import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatRupiah } from '../lib/aggregateHelpers';

const formatCompactRupiah = (val) => {
  const n = Number(val) || 0;
  if (n === 0) return 'Rp0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000_000) return `Rp${(n / 1_000_000_000_000).toFixed(1).replace(/\.0$/, '')}T`;
  if (abs >= 1_000_000_000) return `Rp${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1_000_000) return `Rp${(n / 1_000_000).toFixed(0)}jt`;
  if (abs >= 1_000) return `Rp${(n / 1_000).toFixed(0)}rb`;
  return `Rp${n}`;
};

const toAxisLabel = (name) => {
  const text = String(name || '');
  if (text.length <= 28) return text;
  return `${text.slice(0, 28)}…`;
};

export default function SubKegiatanChart({ dataRekap, onBarClick }) {
  if (!dataRekap || dataRekap.length === 0) {
    return (
      <div className="card chart-card">
        <h3 className="card-title">Anggaran per Sub Kegiatan</h3>
        <div className="state-box">
          <p>Belum ada ringkasan sub kegiatan.</p>
        </div>
      </div>
    );
  }

  const grouped = dataRekap.reduce((acc, item) => {
    const key =
      item?.nama_sub_kegiatan ||
      item?.sub_kegiatan ||
      'Tidak Diketahui';
    const value = Number(item?.total_pagu) || 0;
    acc[key] = (acc[key] || 0) + value;
    return acc;
  }, {});

  const chartData = Object.entries(grouped)
    .map(([name, total_pagu]) => ({ name, total_pagu }))
    .sort((a, b) => b.total_pagu - a.total_pagu);

  const chartHeight = Math.max(360, chartData.length * 44);

  const handleBarClick = (data) => {
    if (typeof onBarClick === 'function' && data?.name) {
      onBarClick(data.name);
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="chart-tooltip">
          <p className="label" style={{ fontWeight: 600 }}>{item.name}</p>
          <p className="value" style={{ color: '#2b6cb0', fontWeight: 600 }}>
            {formatRupiah(item.total_pagu)}
          </p>
          {typeof onBarClick === 'function' && (
            <p style={{ fontSize: 11, color: '#718096', marginTop: 6, fontStyle: 'italic' }}>
              Klik untuk melihat rincian →
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card chart-card flex-col">
      <h3 className="card-title" style={{ flexShrink: 0 }}>Anggaran per Sub Kegiatan</h3>
      <div className="chart-scroll-body">
        <div className="chart-inner" style={{ width: '100%', minWidth: 0, height: chartHeight }}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 18, right: 32, left: 20, bottom: 32 }}
              barCategoryGap={8}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis
                type="number"
                tickFormatter={formatCompactRupiah}
                style={{ fontSize: 11 }}
              />
              <YAxis
                dataKey="name"
                type="category"
                tickFormatter={toAxisLabel}
                width={170}
                interval={0}
                style={{ fontSize: 11, fontWeight: 500 }}
                tick={typeof onBarClick === 'function' ? { style: { cursor: 'pointer' } } : undefined}
                onClick={(e) => {
                  if (typeof onBarClick === 'function' && e?.value) {
                    onBarClick(e.value);
                  }
                }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.08)' }} />
              <Bar
                dataKey="total_pagu"
                fill="var(--color-primary-light)"
                radius={[0, 4, 4, 0]}
                barSize={18}
                className={typeof onBarClick === 'function' ? 'clickable-bar' : ''}
                onClick={handleBarClick}
                style={typeof onBarClick === 'function' ? { cursor: 'pointer' } : undefined}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
