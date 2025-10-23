import { motion } from 'motion/react';
import { Card } from './ui/card';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

interface FameScoreCardProps {
  score: number;
  trend: number;
}

export function FameScoreCard({ score, trend }: FameScoreCardProps) {
  const data = [
    {
      name: 'Fame Score',
      value: score,
      fill: score >= 70 ? '#9E5DAB' : score >= 40 ? '#B481C0' : '#D1A5DD'
    }
  ];

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#9E5DAB';
    if (score >= 40) return '#B481C0';
    return '#D1A5DD';
  };

  return (
    <Card className="p-4 md:p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, #9E5DAB15, #EBD7DC15)' }} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-2">
          <div>
            <h3 className="mb-1">Fame Score</h3>
            <p className="text-muted-foreground text-sm">Success probability based on your profile</p>
          </div>
          <div 
            className="flex items-center gap-1 px-2 py-1 rounded-full text-sm"
            style={{ 
              backgroundColor: trend >= 0 ? '#9E5DAB15' : '#EBD7DC', 
              color: trend >= 0 ? '#9E5DAB' : '#B481C0' 
            }}
          >
            <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-32 h-32 sm:w-40 sm:h-40">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="70%" 
                outerRadius="100%" 
                data={data}
                startAngle={180}
                endAngle={0}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar
                  background
                  dataKey="value"
                  cornerRadius={10}
                  fill={getScoreColor(score)}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                <div className="text-4xl" style={{ color: getScoreColor(score) }}>{score}</div>
                <div className="text-xs text-muted-foreground text-center">/ 100</div>
              </motion.div>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Rating</span>
                <span className="text-sm" style={{ color: getScoreColor(score) }}>{getScoreLabel(score)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  {score >= 70 
                    ? "You're on the right track! Keep executing consistently."
                    : score >= 40 
                    ? "Solid foundation. Focus on niche clarity and consistency."
                    : "High potential! Address key blockers to accelerate growth."}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Content Quality</span>
                <span>{Math.min(score + 15, 95)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Consistency</span>
                <span>{Math.max(score - 20, 25)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Niche Clarity</span>
                <span>{Math.max(score - 10, 30)}%</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </Card>
  );
}
