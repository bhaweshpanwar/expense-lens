import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../utils/expenseCalculations';

export default function VendorChart({ data, height = 280 }) {
  // data: [{ vendor, total }]
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4DFD3" vertical={false} />
        <XAxis
          dataKey="vendor"
          tick={{ fontSize: 11, fill: '#1F2A28' }}
          axisLine={{ stroke: '#E4DFD3' }}
          tickLine={false}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={60}
        />
        <YAxis
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 12, fill: '#4B5B57' }}
          axisLine={{ stroke: '#E4DFD3' }}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => formatCurrency(value)}
          contentStyle={{ borderRadius: 8, borderColor: '#E4DFD3', fontSize: 13 }}
        />
        <Bar dataKey="total" fill="#C77B2E" radius={[4, 4, 0, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
