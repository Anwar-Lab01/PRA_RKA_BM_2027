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
  if (text.length <= 22) return text;
  return `${text.slice(0, 22)}…`;
};

export default function KecamatanChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="card chart-card">
        <h3 className="card-title">Anggaran per Kecamatan</h3>
        <div className="state-box">
          <p>Belum ada data anggaran per kecamatan.</p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="label" style={{ fontWeight: 600 }}>{label}</p>
          <p className="value" style={{ color: '#2b6cb0', fontWeight: 600 }}>
            {formatRupiah(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const chartHeight = Math.max(360, data.length * 42);

  return (
    <div className="card chart-card flex-col">
      <h3 className="card-title" style={{ flexShrink: 0 }}>Anggaran per Kecamatan</h3>
      <div className="chart-scroll-body">
        <div className="chart-inner" style={{ width: '100%', minWidth: 0, height: chartHeight }}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={data}
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
                dataKey="kecamatan"
                type="category"
                tickFormatter={toAxisLabel}
                width={150}
                style={{ fontSize: 11, fontWeight: 500 }}
                interval={0}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
              <Bar
                dataKey="total_pagu"
                fill="var(--color-primary-light)"
                radius={[0, 4, 4, 0]}
                barSize={16}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
