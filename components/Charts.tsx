'use client'
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'

// Neutral palette; Tailwind will theme around it
const COLORS = ['#111827', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB']

export function PlatformPie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Legend />
          <RTooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CadenceBar({ data }: { data: { name: string; posts: number }[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <RTooltip />
          <Bar dataKey="posts" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}