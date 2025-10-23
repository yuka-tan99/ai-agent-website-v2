import { motion } from 'motion/react';
import { Card } from './ui/card';
import { TrendingUp, Target, Clock, Award } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  color: string;
  delay: number;
}

function StatCard({ title, value, change, icon, color, delay }: StatCardProps) {
  const isPositive = !change.startsWith('-');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="p-6 hover:shadow-md transition-shadow duration-300">
        <div className="flex items-start justify-between mb-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <div style={{ color }}>
              {icon}
            </div>
          </div>
          <div 
            className="text-sm px-2 py-1 rounded-full"
            style={{ 
              backgroundColor: isPositive ? '#9E5DAB15' : '#EBD7DC', 
              color: isPositive ? '#9E5DAB' : '#B481C0' 
            }}
          >
            {change}
          </div>
        </div>
        
        <div>
          <p className="text-muted-foreground text-sm mb-1">{title}</p>
          <h2>{value}</h2>
        </div>
      </Card>
    </motion.div>
  );
}

export function QuickStatsGrid() {
  const stats = [
    {
      title: 'Completion Rate',
      value: '35%',
      change: '+12%',
      icon: <Target className="w-6 h-6" />,
      color: '#9E5DAB'
    },
    {
      title: 'Avg. Daily Posts',
      value: '1.6',
      change: '-0.4',
      icon: <Clock className="w-6 h-6" />,
      color: '#B481C0'
    },
    {
      title: 'Quick Wins Ready',
      value: '8',
      change: '+3',
      icon: <Award className="w-6 h-6" />,
      color: '#D1A5DD'
    },
    {
      title: 'Growth Potential',
      value: 'High',
      change: '+2 levels',
      icon: <TrendingUp className="w-6 h-6" />,
      color: '#6BA3D1'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, idx) => (
        <StatCard key={stat.title} {...stat} delay={idx * 0.1} />
      ))}
    </div>
  );
}
