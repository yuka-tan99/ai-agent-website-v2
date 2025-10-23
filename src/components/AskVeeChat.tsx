import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Sparkles, 
  Lightbulb,
  Hash,
  FileText,
  Mic,
  Pin,
  Trash2,
  TrendingUp,
  Video,
  Bot,
  History,
  DollarSign,
  Target,
  Users,
  Calendar,
  Zap
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isPinned?: boolean;
  suggestions?: string[];
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  messages: Message[];
}

interface OnboardingAnswer {
  questionId: number;
  answer: string | string[];
}

interface AskVeeChatProps {
  isPaidUser?: boolean;
  creatorType?: string;
  onboardingAnswers?: OnboardingAnswer[];
}

export function AskVeeChat({ 
  isPaidUser = false,
  creatorType = "content creator",
  onboardingAnswers = []
}: AskVeeChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [inputValue, setInputValue] = useState('');
  const [questionsUsed, setQuestionsUsed] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'history' | 'pinned'>('chat');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxFreeQuestions = 3;
  const questionsRemaining = isPaidUser ? Infinity : maxFreeQuestions - questionsUsed;

  // Generate personalized suggestions based on onboarding
  const getPersonalizedSuggestions = (userMessage: string): string[] => {
    const suggestions: string[] = [];
    
    // Base suggestions that are always relevant
    const baseSuggestions = [
      "Give me 3 video ideas for this week",
      "How can I improve my engagement?",
      "What hashtags should I use?",
      "Review my content strategy",
    ];

    // Add personalized suggestions based on onboarding
    if (onboardingAnswers.length > 0) {
      // Example: if user mentioned they struggle with consistency
      suggestions.push("Help me create a posting schedule");
      suggestions.push("Give me a content batching strategy");
    }

    // Contextual suggestions based on recent message
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes('video') || lowerMessage.includes('content')) {
      suggestions.push("Suggest video formats that work");
      suggestions.push("How do I make my videos more engaging?");
    } else if (lowerMessage.includes('grow') || lowerMessage.includes('follower')) {
      suggestions.push("What's my growth strategy?");
      suggestions.push("How do I reach more people?");
    } else if (lowerMessage.includes('monetize') || lowerMessage.includes('money')) {
      suggestions.push("When should I start monetizing?");
      suggestions.push("What are my monetization options?");
    }

    // Return mix of contextual and base suggestions
    const combined = [...suggestions, ...baseSuggestions];
    return combined.slice(0, 4); // Return top 4 suggestions
  };

  // Quick action buttons
  const quickActions = [
    { 
      icon: <Video className="w-4 h-4" />, 
      label: "Suggest a video idea",
      prompt: "Can you suggest 3 video ideas for my content based on current trends?"
    },
    { 
      icon: <FileText className="w-4 h-4" />, 
      label: "Review my bio",
      prompt: "Can you help me optimize my social media bio to attract more followers?"
    },
    { 
      icon: <Hash className="w-4 h-4" />, 
      label: "Optimize hashtags",
      prompt: "What are the best hashtags I should be using for my niche?"
    },
  ];

  // Initialize with welcome message and session
  useEffect(() => {
    if (messages.length === 0 && isOpen) {
      const sessionId = Date.now().toString();
      setCurrentSessionId(sessionId);
      
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: `Hey there! 👋 I'm Vee, your AI growth coach. I'm here to help you become the ${creatorType} you've always dreamed of being!\n\nI can help you with content ideas, strategy tips, platform optimization, and more. What would you like to work on today?`,
        timestamp: new Date(),
        isPinned: false,
        suggestions: [
          "Give me 3 video ideas",
          "Review my strategy",
          "Help me with monetization",
          "Optimize my hashtags"
        ]
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length, creatorType]);

  // Save session when closing
  const handleCloseChat = () => {
    if (messages.length > 1) {
      // Save current session
      const session: ChatSession = {
        id: currentSessionId,
        title: messages[1]?.content.slice(0, 50) + '...' || 'New conversation',
        timestamp: new Date(),
        messages: messages
      };
      
      setSessions(prev => [session, ...prev].slice(0, 10)); // Keep last 10 sessions
    }
    setIsOpen(false);
  };

  // Load a past session
  const loadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setActiveTab('chat');
  };

  // Start new chat
  const startNewChat = () => {
    const sessionId = Date.now().toString();
    setCurrentSessionId(sessionId);
    setMessages([]);
    setActiveTab('chat');
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = (content: string = inputValue) => {
    if (!content.trim()) return;

    // Check if user has questions remaining
    if (!isPaidUser && questionsUsed >= maxFreeQuestions) {
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      isPinned: false
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setQuestionsUsed(prev => prev + 1);

    // Simulate AI response (in real app, this would call your AI API)
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateAIResponse(content),
        timestamp: new Date(),
        isPinned: false,
        suggestions: getPersonalizedSuggestions(content)
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const generateAIResponse = (userMessage: string): string => {
    // Mock AI responses - in production, this would call your AI backend
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('video') || lowerMessage.includes('content') || lowerMessage.includes('idea')) {
      return `Great question! Here are 3 video ideas tailored for you:\n\n1. **"5 Things I Wish I Knew Before..."** - Share your biggest lessons in your niche. These perform incredibly well because they're relatable and valuable.\n\n2. **Behind-the-scenes of your process** - People love seeing the "real" you. Show how you actually create content or organize your day.\n\n3. **Trend remix with your unique spin** - Take a trending audio or format and adapt it to your niche. This leverages algorithm momentum while showcasing your expertise.\n\nWant me to dive deeper into any of these?`;
    }
    
    if (lowerMessage.includes('bio') || lowerMessage.includes('profile')) {
      return `Let's optimize your bio! A great bio should answer three questions:\n\n✨ **Who are you?** (Your niche/specialty)\n💡 **What value do you provide?** (What transformation or benefit)\n🎯 **Who is it for?** (Your target audience)\n\nHere's a formula that works:\n"I help [target audience] achieve [specific result] through [your method/approach]"\n\nFor example: "I help busy creators grow their audience through 5-minute daily content strategies 🚀"\n\nWhat's your current bio? I can help you refine it!`;
    }
    
    if (lowerMessage.includes('hashtag')) {
      return `Hashtag strategy is crucial! Here's what I recommend:\n\n**The 3-Tier Approach:**\n\n🔥 High Competition (100K-1M posts): 2-3 hashtags\n- These give you a shot at massive reach\n\n⚡ Medium Competition (10K-100K posts): 4-5 hashtags\n- Your sweet spot for discoverability\n\n🎯 Niche Specific (<10K posts): 3-4 hashtags\n- Highly targeted audience, higher engagement\n\n**Pro tip:** Create 3 hashtag sets and rotate them. Don't use the exact same set every time!\n\nWhat's your niche? I can suggest specific hashtags for you.`;
    }
    
    return `That's a great question! As your AI coach, I'm here to help you grow strategically. ${
      isPaidUser 
        ? 'Since you\'re a premium member, I have access to advanced strategies and can provide detailed, personalized advice.' 
        : `You have ${questionsRemaining - 1} questions remaining this week. Upgrade to get unlimited access and saved conversation history!`
    }\n\nCould you give me a bit more context about what you're trying to achieve? The more specific you are, the better I can help!`;
  };

  const handleQuickAction = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const togglePin = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, isPinned: !msg.isPinned } : msg
    ));
  };

  const deleteMessage = (messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const toggleVoiceInput = () => {
    setIsListening(!isListening);
    // In production, implement actual voice recognition here
    if (!isListening) {
      setTimeout(() => {
        setIsListening(false);
      }, 3000);
    }
  };

  const pinnedMessages = messages.filter(msg => msg.isPinned);

  return (
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50"
          >
            <motion.button
              onClick={() => setIsOpen(true)}
              className="relative group"
              whileHover={{ scale: 1.08, rotate: 5 }}
              whileTap={{ scale: 0.92 }}
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                y: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
            >
              {/* Soft glow effect */}
              <motion.div
                className="absolute inset-0 rounded-full blur-2xl"
                style={{ background: 'radial-gradient(circle, #9E5DAB 0%, #EBD7DC 70%, transparent 100%)' }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Main button */}
              <div 
                className="relative w-[60px] h-[60px] md:w-[70px] md:h-[70px] rounded-full flex items-center justify-center shadow-2xl border-4"
                style={{ 
                  background: 'linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)',
                  borderColor: '#EBD7DC'
                }}
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                >
                  <MessageCircle className="w-8 h-8 text-white" strokeWidth={2.5} />
                </motion.div>
                
                {/* Cute sparkle badge */}
                <motion.div
                  className="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-lg"
                  style={{ 
                    background: 'linear-gradient(135deg, #8FD9FB 0%, #6BA3D1 100%)',
                    border: '2px solid white'
                  }}
                  animate={{ 
                    scale: [1, 1.15, 1],
                    rotate: [0, 360]
                  }}
                  transition={{ 
                    scale: { duration: 1.5, repeat: Infinity },
                    rotate: { duration: 3, repeat: Infinity, ease: "linear" }
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </motion.div>

                {/* Cute little dots floating around */}
                <motion.div
                  className="absolute w-2 h-2 rounded-full"
                  style={{ 
                    backgroundColor: '#EBD7DC',
                    top: '10%',
                    right: '-5px'
                  }}
                  animate={{
                    y: [-3, 3, -3],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <motion.div
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{ 
                    backgroundColor: '#8FD9FB',
                    bottom: '15%',
                    left: '-3px'
                  }}
                  animate={{
                    y: [3, -3, 3],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                />
              </div>

              {/* Cute tooltip */}
              <motion.div
                className="absolute bottom-full right-0 mb-3 px-4 py-2 text-sm rounded-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-xl"
                style={{ 
                  pointerEvents: 'none',
                  background: 'linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)',
                  color: 'white',
                  border: '2px solid #EBD7DC'
                }}
              >
                <span className="flex items-center gap-1.5">
                  Ask Vee 💬
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <div 
                  className="absolute top-full right-6 w-3 h-3 transform rotate-45 -mt-1.5"
                  style={{ 
                    background: 'linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)',
                    border: '2px solid #EBD7DC',
                    borderTop: 'none',
                    borderLeft: 'none'
                  }}
                />
              </motion.div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, type: "spring", bounce: 0.3 }}
            className="fixed bottom-4 right-4 md:bottom-16 md:right-8 z-50 flex flex-col"
            style={{ 
              width: '480px', 
              maxWidth: 'calc(100vw - 2rem)',
              height: 'calc(100vh - 10rem)',
              maxHeight: '700px'
            }}
          >
            <Card className="overflow-hidden shadow-2xl backdrop-blur-xl relative flex flex-col h-full" style={{ 
              background: 'linear-gradient(to bottom, #FDFBFD, #FFFFFF)',
              border: '3px solid',
              borderColor: '#EBD7DC',
              borderRadius: '28px',
              boxShadow: '0 20px 60px rgba(158, 93, 171, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1)'
            }}>
              {/* Subtle floating orb decorations */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden" style={{ borderRadius: '28px' }}>
                <motion.div
                  className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-10"
                  style={{ background: 'radial-gradient(circle, #9E5DAB 0%, transparent 70%)' }}
                  animate={{
                    scale: [1, 1.2, 1],
                    x: [0, -20, 0],
                    y: [0, 20, 0],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <motion.div
                  className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full opacity-10"
                  style={{ background: 'radial-gradient(circle, #8FD9FB 0%, transparent 70%)' }}
                  animate={{
                    scale: [1, 1.1, 1],
                    x: [0, 20, 0],
                    y: [0, -20, 0],
                  }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                  }}
                />
              </div>
              {/* Header */}
              <div 
                className="px-5 py-4 border-b flex items-center justify-between relative overflow-hidden z-10 flex-shrink-0"
                style={{ 
                  background: 'linear-gradient(135deg, #EBD7DC 0%, #F5E6F0 100%)',
                  borderColor: '#EBD7DC',
                  borderTopLeftRadius: '24px',
                  borderTopRightRadius: '24px'
                }}
              >
                {/* Cute floating orbs in background */}
                <motion.div
                  className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20"
                  style={{ background: 'radial-gradient(circle, #9E5DAB 0%, transparent 70%)' }}
                  animate={{
                    scale: [1, 1.2, 1],
                    x: [0, -10, 0],
                    y: [0, 10, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <motion.div
                  className="absolute bottom-0 left-0 w-20 h-20 rounded-full opacity-20"
                  style={{ background: 'radial-gradient(circle, #8FD9FB 0%, transparent 70%)' }}
                  animate={{
                    scale: [1, 1.1, 1],
                    x: [0, 10, 0],
                    y: [0, -5, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                />
                
                <div className="flex items-center gap-3 relative z-10">
                  <div className="relative">
                    <motion.div
                      animate={{
                        rotate: [0, 5, -5, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Avatar className="w-12 h-12 border-3 shadow-md" style={{ 
                        borderColor: '#9E5DAB',
                        background: 'linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)'
                      }}>
                        <AvatarFallback className="text-white" style={{ background: 'transparent' }}>
                          <Bot className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                    <motion.div
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 shadow-sm"
                      style={{ 
                        backgroundColor: '#8FD9FB',
                        borderColor: '#FDFBFD'
                      }}
                      animate={{ 
                        scale: [1, 1.15, 1],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  <div>
                    <h3 style={{ color: '#9E5DAB' }}>Ask Vee 💬</h3>
                    <p className="text-xs" style={{ color: '#9E5DAB99' }}>Your AI Growth Coach</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 relative z-10">
                  {isPaidUser && sessions.length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setActiveTab(activeTab === 'history' ? 'chat' : 'history')}
                      className="h-8 w-8 rounded-full hover:bg-white/60"
                      style={{ color: '#9E5DAB' }}
                    >
                      <History className="w-4 h-4" />
                    </Button>
                  )}
                  {!isPaidUser && (
                    <Badge 
                      variant="secondary" 
                      className="shadow-sm"
                      style={{ 
                        backgroundColor: '#9E5DAB20',
                        color: '#9E5DAB',
                        border: '1.5px solid #9E5DAB40'
                      }}
                    >
                      {questionsRemaining} left
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCloseChat}
                    className="h-8 w-8 rounded-full hover:bg-white/60"
                    style={{ color: '#9E5DAB' }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Quick Stats Mini Dashboard */}
              <div 
                className="px-4 py-2.5 border-b flex-shrink-0" 
                style={{ 
                  background: 'linear-gradient(to right, #F8F3F9, #FDF8FB)',
                  borderColor: '#EBD7DC50'
                }}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ y: [-1, 1, -1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <TrendingUp className="w-3.5 h-3.5" style={{ color: '#9E5DAB' }} />
                    </motion.div>
                    <span style={{ color: '#6b6b6b' }}>Fame Score: <span style={{ color: '#9E5DAB' }}>58</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-3.5 h-3.5" style={{ color: '#8FD9FB' }} />
                    </motion.div>
                    <span style={{ color: '#6b6b6b' }}>+12% this week</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              {messages.length === 1 && (
                <div 
                  className="px-4 py-3 border-b flex-shrink-0" 
                  style={{ 
                    background: '#FDFBFD',
                    borderColor: '#EBD7DC50'
                  }}
                >
                  <p className="text-xs mb-2" style={{ color: '#9E5DAB' }}>✨ Quick actions:</p>
                  <div className="flex flex-wrap gap-2">
                    {quickActions.map((action, idx) => (
                      <motion.div
                        key={idx}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickAction(action.prompt)}
                          className="text-xs h-8 gap-1.5 rounded-full shadow-sm"
                          style={{
                            borderColor: '#EBD7DC',
                            backgroundColor: '#FFFFFF',
                            color: '#9E5DAB'
                          }}
                          disabled={!isPaidUser && questionsUsed >= maxFreeQuestions}
                        >
                          {action.icon}
                          {action.label}
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pinned Messages */}
              {pinnedMessages.length > 0 && (
                <div 
                  className="px-4 py-2.5 border-b flex-shrink-0" 
                  style={{ 
                    background: 'linear-gradient(to right, #FFF9E6, #FFFEF9)',
                    borderColor: '#F4D03F50'
                  }}
                >
                  <p className="text-xs mb-1.5 flex items-center gap-1.5" style={{ color: '#9E5DAB' }}>
                    <motion.div
                      animate={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </motion.div>
                    Pinned Advice ({pinnedMessages.length})
                  </p>
                  <div className="space-y-1">
                    {pinnedMessages.map(msg => (
                      <p key={msg.id} className="text-xs line-clamp-2" style={{ color: '#6b6b6b' }}>
                        {msg.content}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages with Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col relative z-10 min-h-0">
                <TabsList className="w-full grid grid-cols-3 mx-4 mt-2 flex-shrink-0" style={{ backgroundColor: '#F8F3F9' }}>
                  <TabsTrigger value="chat" className="text-xs">Chat</TabsTrigger>
                  <TabsTrigger value="pinned" className="text-xs">
                    Pinned {pinnedMessages.length > 0 && `(${pinnedMessages.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-xs" disabled={!isPaidUser}>
                    History {!isPaidUser && '🔒'}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="chat" className="flex-1 mt-0 min-h-0 overflow-hidden">
                  <ScrollArea className="h-full" ref={scrollAreaRef}>
                    <div className="p-4 space-y-4">
                      {messages.map((message, index) => (
                    <div key={message.id}>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", bounce: 0.3 }}
                        className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {message.role === 'assistant' && (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                          >
                            <Avatar className="w-9 h-9 flex-shrink-0 shadow-sm" style={{ 
                              background: 'linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)',
                              border: '2px solid #EBD7DC'
                            }}>
                              <AvatarFallback className="text-white" style={{ background: 'transparent' }}>
                                <Bot className="w-4 h-4" />
                              </AvatarFallback>
                            </Avatar>
                          </motion.div>
                        )}
                      
                      <div className={`flex-1 group ${message.role === 'user' ? 'flex justify-end' : ''}`}>
                        <motion.div
                          whileHover={{ scale: 1.01 }}
                          className={`inline-block px-4 py-3 max-w-[85%] relative ${
                            message.role === 'user'
                              ? 'rounded-3xl shadow-sm'
                              : 'rounded-3xl shadow-sm'
                          }`}
                          style={
                            message.role === 'user'
                              ? {
                                  background: 'linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)',
                                  color: 'white'
                                }
                              : {
                                  background: '#F8F3F9',
                                  border: '1.5px solid #EBD7DC',
                                  color: '#2d2d2d'
                                }
                          }
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          
                          {/* Message Pin Button - Visible on hover, always visible when pinned */}
                          {message.role === 'assistant' && (
                            <motion.div
                              initial={{ opacity: message.isPinned ? 1 : 0, scale: message.isPinned ? 1 : 0.8 }}
                              animate={{ 
                                opacity: message.isPinned ? 1 : undefined,
                                scale: message.isPinned ? 1 : undefined
                              }}
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                              className={`absolute -right-2 -top-2 z-10 ${message.isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-200`}
                              title={message.isPinned ? '📌 Unpin this advice' : '📌 Pin to save this advice'}
                            >
                              <motion.div
                                animate={message.isPinned ? {
                                  rotate: [0, -10, 10, -10, 0],
                                } : {}}
                                transition={{ duration: 0.5 }}
                              >
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePin(message.id);
                                  }}
                                  className="h-8 w-8 rounded-full shadow-lg hover:shadow-xl transition-all"
                                  style={message.isPinned ? { 
                                    background: 'linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)',
                                    color: 'white',
                                    border: '2.5px solid white'
                                  } : {
                                    backgroundColor: 'white',
                                    border: '2.5px solid #EBD7DC',
                                    color: '#9E5DAB'
                                  }}
                                >
                                  <Pin className={`w-4 h-4 transition-transform ${message.isPinned ? 'fill-current rotate-45' : ''}`} />
                                </Button>
                              </motion.div>
                            </motion.div>
                          )}
                        </motion.div>
                        <p className="text-xs mt-1 px-2" style={{ color: '#9E5DAB99' }}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                        {message.role === 'user' && (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                          >
                            <Avatar className="w-9 h-9 flex-shrink-0 shadow-sm" style={{ 
                              background: 'linear-gradient(135deg, #8FD9FB 0%, #6BA3D1 100%)',
                              border: '2px solid #EBD7DC'
                            }}>
                              <AvatarFallback className="text-white" style={{ background: 'transparent' }}>
                                U
                              </AvatarFallback>
                            </Avatar>
                          </motion.div>
                        )}
                      </motion.div>

                      {/* AI Suggestion Buttons - appear after each assistant message */}
                      {message.role === 'assistant' && message.suggestions && message.suggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="ml-12 mt-2 flex flex-wrap gap-2"
                        >
                          {message.suggestions.map((suggestion, idx) => (
                            <motion.div
                              key={idx}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendMessage(suggestion)}
                                className="text-xs h-7 rounded-full shadow-sm"
                                style={{
                                  borderColor: '#EBD7DC',
                                  backgroundColor: '#FFFFFF',
                                  color: '#9E5DAB'
                                }}
                                disabled={!isPaidUser && questionsUsed >= maxFreeQuestions}
                              >
                                <Sparkles className="w-3 h-3 mr-1" />
                                {suggestion}
                              </Button>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  ))}

                      {/* Limit reached message */}
                      {!isPaidUser && questionsUsed >= maxFreeQuestions && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: "spring", bounce: 0.4 }}
                          className="p-5 rounded-3xl border-2 text-center"
                          style={{ 
                            borderColor: '#EBD7DC',
                            background: 'linear-gradient(135deg, #F8F3F9 0%, #FDF8FB 100%)'
                          }}
                        >
                          <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          >
                            <Sparkles className="w-10 h-10 mx-auto mb-3" style={{ color: '#9E5DAB' }} />
                          </motion.div>
                          <h4 className="mb-1.5" style={{ color: '#9E5DAB' }}>You've used your free questions!</h4>
                          <p className="text-sm mb-4" style={{ color: '#6b6b6b' }}>
                            Upgrade to AI Mentor for unlimited coaching + saved sessions
                          </p>
                          <motion.div
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            <Button 
                              size="sm"
                              className="text-white rounded-full shadow-md"
                              style={{ background: 'linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)' }}
                            >
                              ✨ Upgrade Now - $6/month
                            </Button>
                          </motion.div>
                        </motion.div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="pinned" className="flex-1 mt-0 min-h-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                      {pinnedMessages.length === 0 ? (
                        <div className="text-center py-12">
                          <Pin className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: '#9E5DAB' }} />
                          <p className="text-sm" style={{ color: '#6b6b6b' }}>No pinned advice yet</p>
                          <p className="text-xs mt-1" style={{ color: '#9E5DAB99' }}>
                            Pin important advice from Vee to save it here
                          </p>
                        </div>
                      ) : (
                        pinnedMessages.map((message) => (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-3xl border-2 relative group"
                            style={{ 
                              borderColor: '#EBD7DC',
                              background: '#F8F3F9'
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <Bot className="w-5 h-5 flex-shrink-0" style={{ color: '#9E5DAB' }} />
                              <div className="flex-1">
                                <p className="text-sm" style={{ color: '#2d2d2d' }}>{message.content}</p>
                                <p className="text-xs mt-2" style={{ color: '#9E5DAB99' }}>
                                  {message.timestamp.toLocaleDateString()}
                                </p>
                              </div>
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                title="Unpin this advice"
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => togglePin(message.id)}
                                  className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{
                                    backgroundColor: 'white',
                                    border: '2px solid #EBD7DC',
                                    color: '#9E5DAB'
                                  }}
                                >
                                  <Pin className="w-4 h-4 fill-current" />
                                </Button>
                              </motion.div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="history" className="flex-1 mt-0 min-h-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-3">
                      {sessions.length === 0 ? (
                        <div className="text-center py-12">
                          <History className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: '#9E5DAB' }} />
                          <p className="text-sm" style={{ color: '#6b6b6b' }}>No past conversations yet</p>
                          <p className="text-xs mt-1" style={{ color: '#9E5DAB99' }}>
                            Your chat history will appear here
                          </p>
                        </div>
                      ) : (
                        <>
                          {messages.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={startNewChat}
                              className="w-full rounded-full mb-3"
                              style={{
                                borderColor: '#9E5DAB',
                                color: '#9E5DAB'
                              }}
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              Start New Chat
                            </Button>
                          )}
                          {sessions.map((session) => (
                            <motion.button
                              key={session.id}
                              onClick={() => loadSession(session)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="w-full p-3 rounded-2xl border-2 text-left transition-all"
                              style={{
                                borderColor: session.id === currentSessionId ? '#9E5DAB' : '#EBD7DC',
                                background: session.id === currentSessionId ? '#F8F3F9' : '#FFFFFF'
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <MessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#9E5DAB' }} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm line-clamp-2" style={{ color: '#2d2d2d' }}>
                                    {session.title}
                                  </p>
                                  <p className="text-xs mt-1" style={{ color: '#9E5DAB99' }}>
                                    {session.timestamp.toLocaleDateString()} • {session.messages.length} messages
                                  </p>
                                </div>
                              </div>
                            </motion.button>
                          ))}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              {/* Input Area */}
              <div 
                className="p-4 border-t relative z-10 flex-shrink-0" 
                style={{ 
                  background: 'linear-gradient(to right, #F8F3F9, #FDF8FB)',
                  borderColor: '#EBD7DC',
                  borderBottomLeftRadius: '24px',
                  borderBottomRightRadius: '24px'
                }}
              >
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder={
                        !isPaidUser && questionsUsed >= maxFreeQuestions
                          ? "Upgrade to continue chatting..."
                          : "Ask Vee anything... ✨"
                      }
                      disabled={!isPaidUser && questionsUsed >= maxFreeQuestions}
                      className="pr-10 rounded-full border-2 shadow-sm"
                      style={{ 
                        borderColor: '#EBD7DC',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleVoiceInput}
                        disabled={!isPaidUser && questionsUsed >= maxFreeQuestions}
                        className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full ${isListening ? 'text-red-400' : 'text-muted-foreground'}`}
                        style={isListening ? { backgroundColor: '#FFE5E5' } : {}}
                      >
                        <Mic className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={() => handleSendMessage()}
                      disabled={!inputValue.trim() || (!isPaidUser && questionsUsed >= maxFreeQuestions)}
                      size="icon"
                      className="text-white shrink-0 rounded-full w-11 h-11 shadow-md"
                      style={{ background: 'linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)' }}
                    >
                      <Send className="w-4.5 h-4.5" />
                    </Button>
                  </motion.div>
                </div>
                {isListening && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs mt-2 flex items-center gap-1.5 justify-center"
                    style={{ color: '#9E5DAB' }}
                  >
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      🎤
                    </motion.span>
                    Listening...
                  </motion.p>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
