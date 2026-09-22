import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../utils/expenseCalculations';

export default function CategoryChart({ data, height = 280 }) {
  // data: [{ category, total }]
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4DFD3" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 12, fill: '#4B5B57' }}
          axisLine={{ stroke: '#E4DFD3' }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="category"
          width={130}
          tick={{ fontSize: 12, fill: '#1F2A28' }}
          axisLine={{ stroke: '#E4DFD3' }}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => formatCurrency(value)}
          contentStyle={{ borderRadius: 8, borderColor: '#E4DFD3', fontSize: 13 }}
        />
        <Bar dataKey="total" fill="#23514A" radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
