'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

export function PlatformPie({ data }:{ data:{name:string; value:number}[] }) {
  return (
    <div className="card p-4">
      <div className="font-semibold mb-2">Platform Focus</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={100} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function CadenceBar({ data }:{ data:{name:string; posts:number}[] }){
  return (
    <div className="card p-4">
      <div className="font-semibold mb-2">Posting Cadence</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" /><YAxis /><Tooltip />
            <Bar dataKey="posts" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
