import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../utils/expenseCalculations';

export default function MonthlyExpenseChart({ data, height = 280 }) {
  // data: [{ month, total }]
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4DFD3" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: '#4B5B57' }}
          axisLine={{ stroke: '#E4DFD3' }}
          tickLine={false}
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
        <Line
          type="monotone"
          dataKey="total"
          stroke="#23514A"
          strokeWidth={2.5}
          dot={{ r: 4, fill: '#23514A' }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
