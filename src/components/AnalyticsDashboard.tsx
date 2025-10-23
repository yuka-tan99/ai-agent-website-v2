import { motion } from 'motion/react';
import { Card } from './ui/card';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart
} from 'recharts';

interface AnalyticsDashboardProps {
  sectionScores: { section: string; score: number; potential: number }[];
}

export function AnalyticsDashboard({ sectionScores }: AnalyticsDashboardProps) {
  // Growth projection data
  const projectionData = [
    { month: 'Now', followers: 0, projected: 0 },
    { month: 'Month 1', followers: 150, projected: 200 },
    { month: 'Month 2', followers: 450, projected: 600 },
    { month: 'Month 3', followers: 1200, projected: 1800 },
    { month: 'Month 4', followers: 2800, projected: 4500 },
    { month: 'Month 5', followers: 5500, projected: 9000 },
    { month: 'Month 6', followers: 10000, projected: 18000 }
  ];

  // Readiness radar data
  const readinessData = [
    { category: 'Content', value: 65, fullMark: 100 },
    { category: 'Consistency', value: 45, fullMark: 100 },
    { category: 'Niche', value: 40, fullMark: 100 },
    { category: 'Brand', value: 55, fullMark: 100 },
    { category: 'Marketing', value: 50, fullMark: 100 },
    { category: 'Systems', value: 35, fullMark: 100 }
  ];

  // Weekly consistency data
  const consistencyData = [
    { day: 'Mon', posts: 2, target: 3 },
    { day: 'Tue', posts: 1, target: 3 },
    { day: 'Wed', posts: 3, target: 3 },
    { day: 'Thu', posts: 0, target: 3 },
    { day: 'Fri', posts: 2, target: 3 },
    { day: 'Sat', posts: 1, target: 3 },
    { day: 'Sun', posts: 2, target: 3 }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section Completion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="p-6">
            <h3 className="mb-4">Section Readiness</h3>
            <p className="text-sm text-muted-foreground mb-4">Current vs. Potential scores</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sectionScores}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis 
                  dataKey="section" 
                  tick={{ fill: 'currentColor' }}
                  tickLine={{ stroke: 'currentColor' }}
                />
                <YAxis 
                  tick={{ fill: 'currentColor' }}
                  tickLine={{ stroke: 'currentColor' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="score" fill="#9E5DAB" name="Current" radius={[8, 8, 0, 0]} />
                <Bar dataKey="potential" fill="#6BA3D1" name="Potential" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Platform Readiness Radar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="p-6">
            <h3 className="mb-4">Platform Readiness</h3>
            <p className="text-sm text-muted-foreground mb-4">Your current strength across key areas</p>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={readinessData}>
                <PolarGrid stroke="currentColor" opacity={0.2} />
                <PolarAngleAxis 
                  dataKey="category" 
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]}
                  tick={{ fill: 'currentColor', fontSize: 11 }}
                  tickCount={6}
                />
                <Radar 
                  name="Readiness" 
                  dataKey="value" 
                  stroke="#6BA3D1" 
                  fill="#6BA3D1" 
                  fillOpacity={0.3} 
                />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Projection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="p-6">
            <h3 className="mb-4">Growth Projection</h3>
            <p className="text-sm text-muted-foreground mb-4">Expected vs. potential follower growth</p>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={projectionData}>
                <defs>
                  <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B481C0" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#B481C0" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6BA3D1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6BA3D1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'currentColor' }}
                  tickLine={{ stroke: 'currentColor' }}
                />
                <YAxis 
                  tick={{ fill: 'currentColor' }}
                  tickLine={{ stroke: 'currentColor' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="followers" 
                  stroke="#B481C0" 
                  fillOpacity={1} 
                  fill="url(#colorFollowers)" 
                  name="Expected"
                />
                <Area 
                  type="monotone" 
                  dataKey="projected" 
                  stroke="#6BA3D1" 
                  fillOpacity={1} 
                  fill="url(#colorProjected)" 
                  name="With Improvements"
                  strokeDasharray="5 5"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Weekly Consistency */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="p-6">
            <h3 className="mb-4">Weekly Consistency</h3>
            <p className="text-sm text-muted-foreground mb-4">Posts per day vs. your target</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={consistencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis 
                  dataKey="day" 
                  tick={{ fill: 'currentColor' }}
                  tickLine={{ stroke: 'currentColor' }}
                />
                <YAxis 
                  tick={{ fill: 'currentColor' }}
                  tickLine={{ stroke: 'currentColor' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="posts" 
                  stroke="#B481C0" 
                  strokeWidth={3}
                  name="Actual Posts"
                  dot={{ fill: '#B481C0', r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke="#6BA3D1" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Target"
                  dot={{ fill: '#6BA3D1', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
