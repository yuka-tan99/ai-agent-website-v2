import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface BecomeFamousLogoProps {
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function BecomeFamousLogo({ size = 'md', onClick }: BecomeFamousLogoProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
    >
      <motion.div
        animate={{ 
          rotate: [0, 360],
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Sparkles className={sizes[size]} style={{ color: '#9E5DAB' }} />
      </motion.div>
      <span 
        className={`${textSizes[size]} font-medium`}
        style={{ 
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#2d2d2d'
        }}
      >
        BecomeFamous.AI
      </span>
    </button>
  );
}
