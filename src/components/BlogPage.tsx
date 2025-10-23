import { motion } from 'motion/react';
import { ArrowLeft, Calendar, User, ArrowRight, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { BecomeFamousLogo } from './BecomeFamousLogo';

interface BlogPageProps {
  onBack: () => void;
}

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime: string;
  category: string;
  gradient: string;
}

const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: "How to Find Your Content Niche in 7 Days",
    excerpt: "Stop overthinking and start experimenting. Learn the exact framework successful creators use to discover their winning niche through strategic testing.",
    author: "Sarah Chen",
    date: "January 15, 2025",
    readTime: "8 min read",
    category: "Strategy",
    gradient: "linear-gradient(135deg, #9E5DAB 0%, #D1A5DD 100%)"
  },
  {
    id: 2,
    title: "The Psychology Behind Viral Content",
    excerpt: "Discover the hidden patterns that make content shareable. We analyzed 10,000 viral posts to uncover the psychological triggers that drive engagement.",
    author: "Marcus Johnson",
    date: "January 12, 2025",
    readTime: "12 min read",
    category: "Growth",
    gradient: "linear-gradient(135deg, #B481C0 0%, #EBD7DC 100%)"
  },
  {
    id: 3,
    title: "From 0 to 100K: A Creator's Journey",
    excerpt: "Real stories, real struggles, real strategies. Follow Maya's 18-month journey from her first video to building a six-figure creator business.",
    author: "Maya Rodriguez",
    date: "January 10, 2025",
    readTime: "15 min read",
    category: "Case Study",
    gradient: "linear-gradient(135deg, #D1A5DD 0%, #8FD9FB 100%)"
  },
  {
    id: 4,
    title: "AI Tools Every Creator Needs in 2025",
    excerpt: "Cut your editing time in half and triple your output. A comprehensive guide to the AI tools that are transforming content creation.",
    author: "Alex Kim",
    date: "January 8, 2025",
    readTime: "10 min read",
    category: "Tools",
    gradient: "linear-gradient(135deg, #8FD9FB 0%, #9E5DAB 100%)"
  },
  {
    id: 5,
    title: "Building an Authentic Personal Brand",
    excerpt: "Your story is your superpower. Learn how to craft a personal brand that resonates deeply while staying true to who you are.",
    author: "Jordan Lee",
    date: "January 5, 2025",
    readTime: "9 min read",
    category: "Branding",
    gradient: "linear-gradient(135deg, #EBD7DC 0%, #B481C0 100%)"
  },
  {
    id: 6,
    title: "Monetization Strategies Beyond Sponsorships",
    excerpt: "Diversify your creator income with these proven revenue streams. From digital products to membership communities, unlock new income potential.",
    author: "Taylor Brooks",
    date: "January 3, 2025",
    readTime: "11 min read",
    category: "Monetization",
    gradient: "linear-gradient(135deg, #9E5DAB 0%, #8FD9FB 100%)"
  }
];

const categories = ["All", "Strategy", "Growth", "Case Study", "Tools", "Branding", "Monetization"];

export function BlogPage({ onBack }: BlogPageProps) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Floating Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 left-10 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'linear-gradient(135deg, #9E5DAB 0%, #D1A5DD 100%)' }}
        />
        <motion.div
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'linear-gradient(135deg, #EBD7DC 0%, #8FD9FB 100%)' }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-border/50 bg-background/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          <BecomeFamousLogo size="sm" />
          
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "linear"
            }}
            className="inline-block mb-4"
            style={{ 
              background: 'linear-gradient(90deg, #9E5DAB 0%, #D1A5DD 50%, #9E5DAB 100%)',
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            <h1>Creator Insights</h1>
          </motion.div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Expert strategies, success stories, and actionable tips to accelerate your creator journey
          </p>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {categories.map((category, index) => (
            <motion.button
              key={category}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2 rounded-full transition-all relative group"
              style={{
                background: category === "All" 
                  ? 'linear-gradient(135deg, #9E5DAB 0%, #D1A5DD 100%)'
                  : 'white',
                color: category === "All" ? 'white' : '#2d2d2d',
                border: category === "All" ? 'none' : '2px solid #E8E8E8'
              }}
            >
              <span className="relative z-10">{category}</span>
              {category !== "All" && (
                <motion.div
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #9E5DAB10 0%, #D1A5DD10 100%)' }}
                />
              )}
            </motion.button>
          ))}
        </motion.div>

        {/* Blog Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1, duration: 0.6 }}
              whileHover={{ y: -8 }}
              className="group cursor-pointer"
            >
              <div className="h-full rounded-2xl border border-border/50 overflow-hidden bg-card/50 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                {/* Gradient Header */}
                <div 
                  className="h-32 relative overflow-hidden"
                  style={{ background: post.gradient }}
                >
                  <motion.div
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                  />
                  
                  {/* Category Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full text-xs bg-white/20 backdrop-blur-md text-white">
                      {post.category}
                    </span>
                  </div>
                  
                  {/* Sparkle Animation */}
                  <motion.div
                    animate={{
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: index * 0.3,
                    }}
                    className="absolute top-8 right-8 w-2 h-2 rounded-full bg-white"
                  />
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="mb-3 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>

                  {/* Meta Information */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {post.author}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {post.date}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{post.readTime}</span>
                  </div>

                  {/* Read More Arrow */}
                  <motion.div
                    className="mt-4 flex items-center gap-2 text-sm"
                    style={{ color: '#9E5DAB' }}
                    initial={{ x: 0 }}
                    whileHover={{ x: 5 }}
                  >
                    <span>Read article</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Load More Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center mt-16"
        >
          <Button
            size="lg"
            variant="outline"
            className="rounded-full px-8 group"
          >
            <span>Load More Articles</span>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="ml-2"
            >
              ✨
            </motion.div>
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
