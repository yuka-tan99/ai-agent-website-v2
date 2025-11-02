import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  ChevronLeft,
  Sparkles,
  Target,
  Heart,
  Zap,
  TrendingUp,
  Users,
  Flower2,
} from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { BecomeFamousLogo } from "./BecomeFamousLogo";

interface OnboardingAnswer {
  questionId: number;
  answer: string | string[];
}

interface OnboardingFlowProps {
  onComplete: (answers: OnboardingAnswer[]) => void;
  onBack: () => void;
}

interface Option {
  id: string;
  label: string;
  subOptions?: Option[];
  textInput?: boolean;
}

interface Question {
  id: number;
  question: string;
  type: "multiple";
  options: Option[];
}

const contentTips = [
  {
    text: "Pro tip: Your niche doesn't need to be perfect from day one. The best creators discover their niche through experimentation, not overthinking.",
    icon: Sparkles,
    gradient: "from-purple-200 to-pink-200",
  },
  {
    text: "Quick insight: Consistency beats perfection every time. A 'good enough' post today is worth more than a perfect post next week.",
    icon: Target,
    gradient: "from-sky-200 to-blue-200",
  },
  {
    text: "Creator secret: Your most engaged followers care more about authenticity than production quality. Show up as yourself!",
    icon: Heart,
    gradient: "from-rose-200 to-pink-200",
  },
  {
    text: "Growth hack: The algorithm loves engagement velocity. Posts that get early comments and saves get pushed to more people.",
    icon: Zap,
    gradient: "from-amber-200 to-yellow-200",
  },
  {
    text: "Hidden truth: 80% of your growth comes from 20% of your content. Track what resonates and double down on those topics.",
    icon: TrendingUp,
    gradient: "from-emerald-200 to-teal-200",
  },
  {
    text: "Monetization tip: Your first 1,000 true fans can support you better than 100,000 passive followers. Build community, not just audience.",
    icon: Users,
    gradient: "from-violet-200 to-purple-200",
  },
  {
    text: "Burnout prevention: Schedule rest weeks just like you schedule content. Sustainable creators outlast passionate ones who burn out.",
    icon: Flower2,
    gradient: "from-cyan-200 to-teal-200",
  },
];

const questions: Question[] = [
  {
    id: 1,
    question: "who are you creating as?",
    type: "multiple",
    options: [
      { id: "personal", label: "personal brand or influencer" },
      {
        id: "artist",
        label: "artist or creative",
        subOptions: [
          { id: "musician", label: "musician" },
          { id: "singer", label: "singer or vocalist" },
          { id: "rapper", label: "rapper" },
          { id: "producer", label: "producer or beatmaker" },
          {
            id: "visual-artist",
            label: "visual artist (painter, illustrator, designer)",
          },
          { id: "photographer", label: "photographer" },
          { id: "writer", label: "writer or poet" },
          { id: "dancer", label: "dancer or choreographer" },
          { id: "filmmaker", label: "filmmaker or director" },
          { id: "other-creative", label: "other creative", textInput: true },
        ],
      },
      {
        id: "entrepreneur",
        label: "entrepreneur or business owner",
        subOptions: [
          { id: "b2b", label: "running a b2b business" },
          { id: "b2c", label: "running a b2c business" },
          { id: "c2c", label: "running a c2c marketplace or platform" },
          { id: "startup", label: "startup founder" },
          { id: "solopreneur", label: "solopreneur or freelancer" },
        ],
      },
      {
        id: "selling",
        label: "selling a product or service",
        subOptions: [
          { id: "physical", label: "physical products (merch, goods, inventory)" },
          { id: "digital", label: "digital products (templates, presets, downloads)" },
          { id: "handmade", label: "handmade or craft items" },
          { id: "fashion", label: "clothing or fashion brand" },
          {
            id: "service",
            label: "service provider (coaching, consulting, freelancing)",
          },
          { id: "software", label: "software or app creator" },
          { id: "info", label: "info products or online courses" },
          { id: "other-selling", label: "other", textInput: true },
        ],
      },
      {
        id: "professional",
        label: "professional or expert",
        subOptions: [
          { id: "coach", label: "coach or consultant" },
          { id: "teacher", label: "teacher or educator" },
          { id: "trainer", label: "trainer (fitness, sports, life)" },
          { id: "therapist", label: "therapist or counselor" },
          { id: "industry-expert", label: "industry expert or specialist" },
          { id: "licensed", label: "doctor, lawyer, or licensed professional" },
          { id: "other-professional", label: "other", textInput: true },
        ],
      },
      {
        id: "model",
        label: "model or performer",
        subOptions: [
          { id: "fashion-model", label: "fashion or commercial model" },
          { id: "fitness-model", label: "fitness or athletic model" },
          {
            id: "content-model",
            label: "content creator model (instagram, onlyfans, etc.)",
          },
          { id: "actor", label: "actor or actress" },
          { id: "performer", label: "performer or entertainer" },
        ],
      },
      {
        id: "public-figure",
        label: "public figure or advocate",
        subOptions: [
          { id: "activist", label: "activist or social justice advocate" },
          {
            id: "community-leader",
            label: "community leader or organizer",
          },
          { id: "speaker", label: "public speaker" },
          { id: "politician", label: "politician or running for office" },
          { id: "nonprofit", label: "nonprofit or charity founder" },
        ],
      },
      { id: "just-me", label: "just me - no specific role" },
      { id: "figuring-out", label: "still figuring it out" },
    ],
  },
  {
    id: 2,
    question:
      "what's your current follower count across all platforms combined?",
    type: "multiple",
    options: [
      { id: "0-1k", label: "0-1,000 (building from zero)" },
      { id: "1k-10k", label: "1,000-10,000 (early growth phase)" },
      { id: "10k-50k", label: "10,000-50,000 (established small following)" },
      { id: "50k-250k", label: "50,000-250,000 (mid-tier creator)" },
      { id: "250k-1m", label: "250,000-1m (major creator)" },
      { id: "1m+", label: "1m+ (influencer/celebrity tier)" },
      { id: "custom", label: "or enter custom", textInput: true },
    ],
  },
  {
    id: 3,
    question: "what are you passionate about? what do you love?",
    type: "multiple",
    options: [
      {
        id: "creative",
        label: "creative pursuits",
        subOptions: [
          { id: "music", label: "music (listening, discovering, appreciating)" },
          { id: "art", label: "art and design" },
          { id: "photography", label: "photography or videography" },
          { id: "writing", label: "writing or storytelling" },
          { id: "fashion", label: "fashion and style" },
          { id: "film", label: "film and cinema" },
          { id: "theater", label: "theater and performing arts" },
          { id: "crafts", label: "crafts and diy projects" },
          { id: "interior", label: "interior design or home decor" },
        ],
      },
      {
        id: "physical",
        label: "physical activities",
        subOptions: [
          { id: "fitness", label: "fitness and working out" },
          { id: "sports", label: "sports (playing or watching)" },
          { id: "yoga", label: "yoga or pilates" },
          { id: "running", label: "running or cycling" },
          { id: "martial-arts", label: "martial arts or combat sports" },
          { id: "dance", label: "dance" },
          {
            id: "outdoor",
            label: "outdoor adventures (hiking, camping, etc.)",
          },
          { id: "extreme", label: "extreme sports" },
        ],
      },
      {
        id: "learning",
        label: "learning and growth",
        subOptions: [
          {
            id: "personal-dev",
            label: "personal development and self-improvement",
          },
          { id: "reading", label: "reading and books" },
          { id: "psychology", label: "psychology and understanding people" },
          { id: "philosophy", label: "philosophy and big ideas" },
          { id: "science", label: "science and discovery" },
          { id: "history", label: "history and culture" },
          { id: "languages", label: "languages" },
          { id: "spirituality", label: "spirituality or meditation" },
        ],
      },
      {
        id: "tech",
        label: "technology and digital",
        subOptions: [
          { id: "gaming", label: "gaming and esports" },
          { id: "gadgets", label: "tech and gadgets" },
          { id: "software", label: "software and apps" },
          { id: "coding", label: "coding or programming" },
          { id: "crypto", label: "crypto and web3" },
          { id: "ai", label: "ai and emerging tech" },
          {
            id: "social-media",
            label: "social media and internet culture",
          },
        ],
      },
      {
        id: "wellness",
        label: "lifestyle and wellness",
        subOptions: [
          { id: "health", label: "health and nutrition" },
          { id: "beauty", label: "beauty and skincare" },
          { id: "selfcare", label: "wellness and self-care" },
          { id: "cooking", label: "cooking and food" },
          { id: "coffee", label: "coffee or tea culture" },
          { id: "sustainable", label: "sustainable living" },
          { id: "minimalism", label: "minimalism" },
          { id: "luxury", label: "luxury lifestyle" },
        ],
      },
      {
        id: "entertainment",
        label: "entertainment, comedy, pop culture",
        subOptions: [
          { id: "movies", label: "movies and tv shows" },
          { id: "anime", label: "anime or manga" },
          { id: "memes", label: "memes and internet humor" },
          { id: "celebrity", label: "celebrity gossip and pop culture" },
          { id: "music-industry", label: "music industry and artists" },
          { id: "comedy", label: "comedy and funny videos" },
          { id: "standup", label: "stand-up" },
          { id: "podcasts", label: "podcasts" },
        ],
      },
      {
        id: "collecting",
        label: "collecting and hobbies",
        subOptions: [
          { id: "sneakers", label: "sneakers or streetwear" },
          { id: "vintage", label: "vintage or thrift finds" },
          { id: "toys", label: "toys or collectibles" },
          { id: "cards", label: "cards (trading, sports, pokemon, etc.)" },
          { id: "vinyl", label: "vinyl records or cds" },
          { id: "books", label: "books or comics" },
          { id: "cars", label: "cars and automotive" },
          { id: "watches", label: "watches or accessories" },
        ],
      },
      {
        id: "nature",
        label: "nature and animals",
        subOptions: [
          { id: "pets", label: "pets and animal care" },
          { id: "plants", label: "plants and gardening" },
          {
            id: "conservation",
            label: "environmental conservation",
          },
          { id: "wildlife", label: "wildlife and nature" },
          { id: "aquariums", label: "aquariums or fish keeping" },
          { id: "birds", label: "birdwatching" },
        ],
      },
      {
        id: "social",
        label: "social and community",
        subOptions: [
          { id: "relationships", label: "relationships and dating" },
          { id: "parenting", label: "parenting and family life" },
          { id: "friendships", label: "friendships and connection" },
          { id: "nightlife", label: "nightlife and social scenes" },
          { id: "events", label: "events and festivals" },
          { id: "community", label: "community building" },
        ],
      },
      {
        id: "business",
        label: "business and money",
        subOptions: [
          {
            id: "entrepreneurship",
            label: "entrepreneurship and startups",
          },
          { id: "investing", label: "investing and finance" },
          { id: "real-estate", label: "real estate" },
          { id: "marketing", label: "marketing and branding" },
          { id: "hustles", label: "side hustles and making money" },
          { id: "economics", label: "economics and markets" },
          {
            id: "career",
            label: "career growth and professional development",
          },
        ],
      },
      {
        id: "current-events",
        label: "current events and society",
        subOptions: [
          { id: "news", label: "news and politics" },
          { id: "activism", label: "social justice and activism" },
          { id: "global", label: "global affairs" },
          {
            id: "local",
            label: "local community issues",
          },
          { id: "trends", label: "cultural trends" },
          {
            id: "debate",
            label: "controversial topics and debate",
          },
        ],
      },
      {
        id: "travel",
        label: "travel and exploration",
        subOptions: [
          { id: "travel", label: "travel and discovering new places" },
          { id: "food", label: "food and culinary experiences" },
          {
            id: "cultures",
            label: "different cultures and traditions",
          },
          { id: "adventure", label: "adventure and adrenaline" },
          { id: "luxury-travel", label: "luxury travel" },
          {
            id: "budget-travel",
            label: "budget travel and backpacking",
          },
        ],
      },
      { id: "other-interests", label: "other interests", textInput: true },
    ],
  },
  {
    id: 4,
    question:
      "how long have you been creating content or building your brand?",
    type: "multiple",
    options: [
      { id: "not-started", label: "haven't started yet" },
      { id: "less-3mo", label: "less than 3 months" },
      { id: "3-6mo", label: "3-6 months" },
      { id: "6mo-1yr", label: "6 months - 1 year" },
      { id: "1-2yr", label: "1-2 years" },
      { id: "2-5yr", label: "2-5 years" },
      { id: "5plus", label: "5+ years" },
      { id: "custom-time", label: "or enter custom", textInput: true },
    ],
  },
  {
    id: 5,
    question:
      "do you like planning things ahead or more posting in the moment?",
    type: "multiple",
    options: [
      { id: "plan", label: "i like to plan content in advance" },
      { id: "moment", label: "i prefer posting in the moment" },
      { id: "mix", label: "a mix of both" },
    ],
  },
  {
    id: 6,
    question: "what are your main goals?",
    type: "multiple",
    options: [
      {
        id: "community",
        label: "build community and express creativity",
        subOptions: [
          {
            id: "safe-space",
            label:
              "create a safe space where people genuinely connect with each other",
          },
          {
            id: "authentic",
            label: "express myself authentically without filtering who i am",
          },
          {
            id: "tribe",
            label: "build a tribe of people who truly 'get' me and my vision",
          },
          {
            id: "creative-freedom",
            label: "have creative freedom to experiment and share my art/ideas",
          },
        ],
      },
      {
        id: "reach",
        label: "grow my reach and influence",
        subOptions: [
          { id: "milestones", label: "hit specific follower milestones" },
          { id: "viral", label: "go viral and create breakthrough moments" },
          {
            id: "expand",
            label: "expand my influence beyond my current circle",
          },
          {
            id: "discovered",
            label: "get discovered by new audiences regularly",
          },
        ],
      },
      {
        id: "project",
        label: "launch or promote a specific project",
        subOptions: [
          { id: "launch-buzz", label: "build buzz for an upcoming launch or release" },
          { id: "campaign", label: "promote a time-sensitive campaign or event" },
          {
            id: "cause",
            label: "raise awareness for a cause or movement i care about",
          },
          {
            id: "business-momentum",
            label: "create momentum for a specific business initiative",
          },
        ],
      },
      {
        id: "monetize",
        label: "monetize my content and audience",
        subOptions: [
          { id: "brand-deals", label: "earn through brand deals and sponsorships" },
          {
            id: "platform-money",
            label:
              "make money from platform monetization (youtube ads, tiktok creator fund, etc.)",
          },
          {
            id: "collabs",
            label: "get paid collaborations and partnerships",
          },
          {
            id: "sustainable",
            label: "turn my following into sustainable income",
          },
        ],
      },
      {
        id: "music-art",
        label: "promote my music or art",
        subOptions: [
          {
            id: "music-heard",
            label: "get my music heard by more people and grow my fanbase",
          },
          {
            id: "art-promote",
            label: "promote my art and attract collectors or buyers",
          },
          { id: "releases", label: "build hype for upcoming releases or projects" },
          {
            id: "direct-fans",
            label: "connect directly with fans without relying on galleries/labels",
          },
        ],
      },
      {
        id: "sell",
        label: "sell a service or product",
        subOptions: [
          { id: "leads", label: "generate leads and clients for my service business" },
          { id: "physical-sales", label: "drive sales for my physical products" },
          { id: "digital-sales", label: "sell my digital products (courses, templates, ebooks, etc.)" },
          { id: "book-clients", label: "book more clients or customers consistently" },
        ],
      },
      {
        id: "expert",
        label: "become a recognized expert or authority",
        subOptions: [
          { id: "go-to", label: "be known as the go-to person in my niche" },
          { id: "speaking", label: "get speaking opportunities and media features" },
          {
            id: "credibility",
            label: "build credibility that opens professional doors",
          },
          {
            id: "thought-leader",
            label: "position myself as a thought leader in my industry",
          },
        ],
      },
      {
        id: "journey",
        label: "share my journey and life authentically",
        subOptions: [
          { id: "growth", label: "document my personal growth and transformation" },
          { id: "inspire", label: "inspire others by being vulnerable and real" },
          {
            id: "record",
            label: "create a public record of my life and experiences",
          },
          {
            id: "storytelling",
            label: "connect with people through honest storytelling",
          },
        ],
      },
      {
        id: "traffic",
        label: "drive traffic to my website or business",
        subOptions: [
          { id: "website", label: "increase website visitors and engagement" },
          { id: "email", label: "grow my email list or newsletter subscribers" },
          {
            id: "store",
            label: "drive people to my online store or booking page",
          },
          {
            id: "funnel",
            label: "funnel social audience into my main business platform",
          },
        ],
      },
      {
        id: "network",
        label: "network and build professional connections",
        subOptions: [
          { id: "creators", label: "connect with other creators and collaborators" },
          {
            id: "industry",
            label: "build relationships with industry leaders and brands",
          },
          { id: "partnerships", label: "create partnership opportunities" },
          {
            id: "noticed",
            label: "get noticed by people who can advance my career",
          },
        ],
      },
    ],
  },
  {
    id: 7,
    question: "what kind of content do you enjoy making (or think you'd enjoy)?",
    type: "multiple",
    options: [
      { id: "talking", label: "talking to the camera (vlogs, direct address)" },
      { id: "writing", label: "writing (captions, tweets, posts)" },
      { id: "visuals", label: "visuals (design, aesthetics, photos, graphics)" },
      { id: "funny", label: "funny or entertaining content (skits, memes)" },
      { id: "teaching", label: "teaching, giving tips or value" },
      { id: "music", label: "music or audio-based content" },
      { id: "bts", label: "behind-the-scenes or casual vibes" },
      { id: "live", label: "live streaming | interactive q&as" },
      { id: "storytelling", label: "storytelling | sharing personal journeys" },
    ],
  },
  {
    id: 8,
    question: "what are your main problems now?",
    type: "multiple",
    options: [
      { id: "anxiety", label: "anxiety posting" },
      { id: "creative-crisis", label: "creative crisis - don't know what to post" },
      { id: "judgment", label: "fear of judgment" },
      { id: "consistency", label: "consistency" },
      { id: "delete", label: "delete more than i post" },
      { id: "negative", label: "negative comments" },
      { id: "perfectionism", label: "perfectionism" },
      { id: "stuck", label: "feeling lost, stuck, or plateaued" },
      { id: "authentic", label: "don't feel authentic" },
      { id: "comparing", label: "constantly comparing myself to others" },
      { id: "time", label: "no time" },
      { id: "likes", label: "i care too much about likes and views" },
      { id: "burnout", label: "burned out" },
      { id: "strategy", label: "no clear content strategy" },
      { id: "engagement", label: "low engagement" },
      { id: "monetization", label: "monetization" },
      { id: "executing", label: "not executing" },
      { id: "other-problems", label: "other", textInput: true },
    ],
  },
  {
    id: 9,
    question: "what platforms do you use or want to grow on?",
    type: "multiple",
    options: [
      { id: "instagram", label: "instagram" },
      { id: "tiktok", label: "tiktok" },
      { id: "youtube", label: "youtube" },
      { id: "twitter", label: "twitter/x" },
      { id: "facebook", label: "facebook" },
      { id: "pinterest", label: "pinterest" },
      { id: "linkedin", label: "linkedin" },
      { id: "twitch", label: "twitch" },
      { id: "other-platform", label: "other", textInput: true },
    ],
  },
  {
    id: 10,
    question: "how would your friends describe your vibe?",
    type: "multiple",
    options: [
      { id: "loud", label: "loud | high energy" },
      { id: "chill", label: "chill and calm" },
      { id: "funny", label: "funny | witty" },
      { id: "deep", label: "deep | thoughtful" },
      { id: "inspiring", label: "inspiring | motivational" },
      { id: "creative", label: "creative | artsy" },
      { id: "professional", label: "professional | serious" },
      { id: "unique", label: "unique | edgy" },
      { id: "friendly", label: "approachable | friendly" },
    ],
  },
  {
    id: 11,
    question: "how do you feel about being on camera?",
    type: "multiple",
    options: [
      { id: "love-it", label: "love it - comfortable talking and performing" },
      { id: "okay", label: "it's okay - depends on the day or content type" },
      { id: "awkward", label: "kinda awkward - prefer voiceovers or edits" },
      { id: "no-thanks", label: "no thanks - rather stay off-camera" },
      {
        id: "eventually",
        label: "open to it eventually - just not ready yet",
      },
      {
        id: "voice-ok",
        label: "comfortable using my voice (voiceovers, talking)",
      },
      { id: "no-voice", label: "prefer not to use my voice either" },
      { id: "not-sure", label: "not sure yet" },
      { id: "privacy", label: "privacy reasons - need to stay anonymous" },
      {
        id: "restrictions",
        label: "professional restrictions (job, family, etc.)",
      },
      {
        id: "confidence",
        label: "just building confidence - willing to work on it",
      },
      { id: "faceless", label: "personal preference - want faceless content" },
    ],
  },
  {
    id: 12,
    question: "what kind of content do you love watching?",
    type: "multiple",
    options: [
      { id: "vlogs", label: "vlogs or day-in-the-life videos" },
      { id: "tips", label: "quick tips or how-tos" },
      { id: "entertaining", label: "entertaining | funny skits or memes" },
      { id: "aesthetic", label: "aesthetic visuals (design, fashion, photography)" },
      { id: "emotional", label: "deep or emotional content" },
      { id: "music", label: "music or performance content" },
      { id: "storytime", label: "storytime or personal shares" },
      { id: "live", label: "live content (streams, q&as)" },
      { id: "raw", label: "raw, uncut, or honest moments" },
      { id: "advice", label: "advice or motivational talk" },
      { id: "reviews", label: "reviews or unboxings" },
      { id: "educational", label: "educational or thought-provoking content" },
      { id: "trending", label: "trending or challenge content" },
      { id: "niche", label: "niche-specific content related to my interests" },
      { id: "other-watch", label: "other", textInput: true },
    ],
  },
  {
    id: 13,
    question: "what have you tried for growth that didn't work well?",
    type: "multiple",
    options: [
      { id: "posting-more", label: "posting more often" },
      { id: "engaging", label: "engaging with others in my niche" },
      { id: "trends", label: "following viral trends" },
      { id: "hashtags", label: "using specific hashtags | keywords" },
      { id: "ads", label: "running paid ads" },
      { id: "collaborating", label: "collaborating with others" },
      {
        id: "format",
        label: "changing my content format or style",
      },
      { id: "timing", label: "posting at specific times" },
      { id: "nothing", label: "i haven't tried anything specific yet" },
    ],
  },
  {
    id: 14,
    question: "realistically, how many hours per week can you dedicate to this?",
    type: "multiple",
    options: [
      { id: "1-3", label: "1-3 hours" },
      { id: "3-5", label: "3-5 hours" },
      { id: "5-10", label: "5-10 hours" },
      { id: "10-20", label: "10-20 hours" },
      { id: "20-40", label: "20-40 hours" },
      { id: "40plus", label: "40+ hours (this is my full-time focus)" },
    ],
  },
  {
    id: 15,
    question: "what makes you different from others in your niche?",
    type: "multiple",
    options: [
      { id: "background", label: "my unique background/story" },
      { id: "personality", label: "my personality and authenticity" },
      { id: "expertise", label: "my specific expertise or skill" },
      { id: "quality", label: "my production quality or aesthetics" },
      { id: "audience", label: "my audience connection and community" },
      { id: "not-sure", label: "I'm not sure yet" },
      { id: "other-different", label: "other", textInput: true },
    ],
  },
  {
    id: 16,
    question: "what does success look like for you in 6 months?",
    type: "multiple",
    options: [
      { id: "consistent", label: "consistent posting without anxiety" },
      { id: "identity", label: "a clear brand identity people recognize" },
      { id: "engagement", label: "regular engagement from my community" },
      { id: "clients", label: "first paying clients/customers" },
      { id: "deals", label: "brand deals and sponsorships" },
      { id: "selling", label: "selling my own products/services" },
      { id: "confident", label: "just feeling confident and authentic" },
      { id: "other-success", label: "other specific goal", textInput: true },
    ],
  },
  {
    id: 17,
    question: "what's driving you?",
    type: "multiple",
    options: [
      { id: "financial", label: "financial freedom" },
      { id: "creative", label: "creative expression" },
      { id: "helping", label: "helping others with my knowledge" },
      { id: "legacy", label: "building a legacy" },
      { id: "escape", label: "escaping traditional employment" },
      { id: "connecting", label: "connecting with like-minded people" },
      { id: "proving", label: "proving something to myself/others" },
      { id: "fun", label: "having fun and experimenting" },
      { id: "documenting", label: "documenting my process/journey" },
      { id: "trends", label: "reacting to trends/current events" },
      { id: "building", label: "building/making things" },
    ],
  },
  {
    id: 18,
    question: "what topics could you talk about for hours?",
    type: "multiple",
    options: [
      { id: "hobbies", label: "specific hobbies" },
      { id: "professional", label: "professional expertise" },
      { id: "life", label: "life experiences" },
      { id: "creative", label: "creative processes" },
      { id: "industry", label: "industry insights" },
      { id: "other-topics", label: "something else", textInput: true },
    ],
  },
];

type TextInputs = Record<string, string>;

export function OnboardingFlow({ onComplete, onBack }: OnboardingFlowProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswer[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [expandedOptions, setExpandedOptions] = useState<string[]>([]);
  const [textInputs, setTextInputs] = useState<TextInputs>({});
  const [showAdviceBox, setShowAdviceBox] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [tipSequenceCount, setTipSequenceCount] = useState(0);
  const [pendingNextIndex, setPendingNextIndex] = useState<number | null>(null);
  const [pendingAnswers, setPendingAnswers] = useState<OnboardingAnswer[] | null>(null);

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const normalizeSelection = (value: string): string => value.split(":")[0];

  const buildExpandedOptions = (
    q: Question,
    values: string[],
  ): string[] => {
    const expanded: string[] = [];
    if (!values.length) return expanded;

    for (const option of q.options) {
      if (!option.subOptions?.length) continue;
      const hasChild = values.some((entry) => {
        const base = normalizeSelection(entry);
        return base.startsWith(`${option.id}-`);
      });
      if (hasChild) {
        expanded.push(option.id);
      }
    }
    return expanded;
  };

  const rebuildStateFromAnswers = (q: Question, stored: string[]) => {
    const selections = Array.from(
      new Set(stored.map((value) => normalizeSelection(value))),
    );

    const text: TextInputs = {};
    stored.forEach((value) => {
      const [key, ...rest] = value.split(":");
      if (rest.length) {
        text[key] = rest.join(":").trim();
      }
    });

    setSelectedOptions(selections);
    setExpandedOptions(buildExpandedOptions(q, stored));
    setTextInputs(text);
  };

  const resetQuestionState = () => {
    setSelectedOptions([]);
    setExpandedOptions([]);
    setTextInputs({});
  };

  const handleCircleClick = (optionId: string, option: Option) => {
    const childSelections = selectedOptions.filter((id) =>
      id.startsWith(`${optionId}-`),
    );
    const hasChildSelected = childSelections.length > 0;
    const isDirectlySelected = selectedOptions.includes(optionId);

    if (isDirectlySelected || hasChildSelected) {
      const idsToRemove = new Set<string>([optionId, ...childSelections]);
      setSelectedOptions(selectedOptions.filter((id) => !idsToRemove.has(id)));

      if (option.subOptions?.length) {
        if (!expandedOptions.includes(optionId)) {
          setExpandedOptions([...expandedOptions, optionId]);
        }
      } else {
        setExpandedOptions(expandedOptions.filter((id) => id !== optionId));
      }

      setTextInputs((prev) => {
        let next = prev;
        for (const key of idsToRemove) {
          if (key in next) {
            if (next === prev) next = { ...prev };
            delete next[key];
          }
        }
        return next;
      });
      return;
    }

    setSelectedOptions((prev) =>
      prev.includes(optionId) ? prev : [...prev, optionId],
    );
    if (option.subOptions?.length && !expandedOptions.includes(optionId)) {
      setExpandedOptions([...expandedOptions, optionId]);
    }
  };

  const handleSubOptionClick = (parentId: string, subOptionId: string) => {
    const fullId = `${parentId}-${subOptionId}`;

    if (selectedOptions.includes(fullId)) {
      setSelectedOptions(selectedOptions.filter((id) => id !== fullId));
      setTextInputs((prev) => {
        if (!(fullId in prev)) return prev;
        const next = { ...prev };
        delete next[fullId];
        return next;
      });
    } else {
      const updatedSelections = selectedOptions.includes(parentId)
        ? [...selectedOptions, fullId]
        : [...selectedOptions, parentId, fullId];
      setSelectedOptions(Array.from(new Set(updatedSelections)));
      if (!expandedOptions.includes(parentId)) {
        setExpandedOptions([...expandedOptions, parentId]);
      }
    }
  };

  const activeTextInputs = useMemo(() => {
    const active = new Set(
      selectedOptions.map((selection) => normalizeSelection(selection)),
    );
    return Object.entries(textInputs).filter(([key]) => {
      return active.has(key) || selectedOptions.some((selection) => {
        const base = normalizeSelection(selection);
        return base.startsWith(`${key}-`) || key.startsWith(`${base}-`);
      });
    });
  }, [selectedOptions, textInputs]);

  const buildFinalAnswer = (): string[] => {
    const final = [...selectedOptions];
    for (const [key, value] of activeTextInputs) {
      const trimmed = value.trim();
      if (!trimmed) continue;
      final.push(`${key}:${trimmed}`);
    }
    return final;
  };

  const persistAnswerForQuestion = (
    q: Question,
    value: string[],
  ): OnboardingAnswer[] => {
    const filtered = answers.filter((entry) => entry.questionId !== q.id);
    const sanitized = value.length ? value : [];
    return [
      ...filtered,
      {
        questionId: q.id,
        answer: sanitized,
      },
    ];
  };

  const moveToQuestion = (
    index: number,
    datasetOverride: OnboardingAnswer[] | undefined = undefined,
  ) => {
    setCurrentQuestion(index);
    const dataset = datasetOverride ?? answers;
    const targetQuestion = questions[index];
    const storedEntry = dataset.find(
      (entry) => entry.questionId === targetQuestion.id,
    );
    const stored = Array.isArray(storedEntry?.answer)
      ? (storedEntry?.answer as string[])
      : typeof storedEntry?.answer === "string"
        ? [storedEntry.answer as string]
        : [];

    if (stored.length) {
      rebuildStateFromAnswers(targetQuestion, stored);
    } else {
      resetQuestionState();
    }
  };

  const handleNext = () => {
    const finalAnswer = buildFinalAnswer();
    const updatedAnswers = persistAnswerForQuestion(question, finalAnswer);
    setAnswers(updatedAnswers);

    if (currentQuestion === questions.length - 1) {
      onComplete(updatedAnswers);
      return;
    }

    const nextIndex = currentQuestion + 1;
    const adviceQuestions = [1, 4, 6, 9, 11, 14, 16];

    if (adviceQuestions.includes(currentQuestion)) {
      const nextTipIndex = tipSequenceCount % contentTips.length;
      setCurrentTipIndex(nextTipIndex);
      setTipSequenceCount((prev) => prev + 1);
      setShowAdviceBox(true);
      setPendingNextIndex(nextIndex);
      setPendingAnswers(updatedAnswers);
    } else {
      moveToQuestion(nextIndex, updatedAnswers);
    }
  };

  const handleBack = () => {
    if (currentQuestion === 0) {
      onBack();
      return;
    }

    const prevIndex = currentQuestion - 1;
    moveToQuestion(prevIndex);
  };

  const handleCloseAdviceBox = () => {
    setShowAdviceBox(false);
    const targetIndex = pendingNextIndex;
    const dataset = pendingAnswers ?? answers;

    setPendingNextIndex(null);
    setPendingAnswers(null);

    if (typeof targetIndex === "number") {
      moveToQuestion(targetIndex, dataset);
    }
  };

  const canProceed = () => {
    if (selectedOptions.length > 0) return true;
    return activeTextInputs.some(([, value]) => value.trim().length > 0);
  };

  const orbs = [
    { color: "#9E5DAB", size: 300, x: "10%", y: "20%", delay: 0 },
    { color: "#8FD9FB", size: 250, x: "80%", y: "60%", delay: 2 },
    { color: "#EBD7DC", size: 200, x: "60%", y: "10%", delay: 4 },
  ];

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #FDFBFD 0%, #F8F3F9 100%)" }}
    >
      {orbs.map((orb, idx) => (
        <motion.div
          key={idx}
          className="absolute rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{
            width: orb.size,
            height: orb.size,
            backgroundColor: orb.color,
            left: orb.x,
            top: orb.y,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 15, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            delay: orb.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      <AnimatePresence>
        {showAdviceBox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
            onClick={handleCloseAdviceBox}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(event) => event.stopPropagation()}
              className="relative max-w-md w-full p-8 rounded-3xl shadow-2xl backdrop-blur-lg"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(251, 245, 253, 0.95) 100%)",
                border: "2px solid rgba(158, 93, 171, 0.2)",
              }}
            >
              {(() => {
                const activeTip =
                  contentTips[currentTipIndex] ?? contentTips[0];
                const gradient = activeTip?.gradient ?? "from-purple-200 to-pink-200";
                const IconComponent = activeTip?.icon ?? Sparkles;
                const tipText = activeTip?.text ?? "";

                return (
                  <>
                    <motion.div
                      className="absolute -top-4 -right-4 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                      style={{
                        background:
                          "linear-gradient(135deg, #8FD9FB 0%, #B8E7FF 100%)",
                      }}
                      animate={{
                        scale: [1, 1.15, 1],
                        rotate: [0, 10, -10, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <Sparkles className="w-5 h-5 text-white" />
                    </motion.div>

                    <div className="text-center mb-6">
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          delay: 0.1,
                          type: "spring",
                          stiffness: 200,
                          damping: 15,
                        }}
                        className="inline-block mb-4 relative"
                      >
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-3xl blur-xl opacity-40`}
                        />
                        <div
                          className={`relative w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg bg-gradient-to-br ${gradient}`}
                        >
                          <motion.div
                            animate={{
                              rotate: [0, 5, -5, 0],
                              scale: [1, 1.05, 1],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                              repeatDelay: 1,
                            }}
                          >
                            <IconComponent
                              className="w-10 h-10"
                              style={{ color: "#9E5DAB" }}
                              strokeWidth={2.5}
                            />
                          </motion.div>
                        </div>
                      </motion.div>

                      <motion.h3
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-3"
                        style={{ color: "#9E5DAB" }}
                      >
                        Quick Creator Tip!
                      </motion.h3>

                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-foreground/80 leading-relaxed"
                      >
                        {tipText}
                      </motion.p>
                    </div>
                  </>
                );
              })()}

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={handleCloseAdviceBox}
                  className="w-full rounded-full shadow-lg"
                  style={{ backgroundColor: "#9E5DAB", color: "white" }}
                >
                  Got it! Let's continue
                </Button>
              </motion.div>

              <div
                className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full blur-2xl opacity-30 pointer-events-none"
                style={{ backgroundColor: "#EBD7DC" }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollArea className="h-screen">
        <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-8"
          >
            <BecomeFamousLogo size="md" />
          </motion.div>

          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <motion.div
                whileHover={{ scale: 1.1, rotate: -5 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  onClick={handleBack}
                  variant="outline"
                  size="icon"
                  className="rounded-full w-12 h-12 shadow-lg transition-all duration-300"
                  style={{
                    borderColor: "#EBD7DC",
                    backgroundColor: "white",
                  }}
                >
                  <ChevronLeft
                    className="w-6 h-6"
                    style={{ color: "#9E5DAB" }}
                  />
                </Button>
              </motion.div>
              <div className="flex-1 mx-4">
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: "#E8E8E8" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: "#9E5DAB" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
              <div
                className="text-sm whitespace-nowrap"
                style={{ color: "#9E5DAB" }}
              >
                {currentQuestion + 1} / {questions.length}
              </div>
            </div>
          </div>

          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16 text-center"
          >
            <h2
              className="mb-4 text-3xl md:text-4xl leading-relaxed"
              style={{ color: "#9E5DAB" }}
            >
              {question.question}
            </h2>
            <p className="text-sm" style={{ color: "#6b6b6b" }}>
              select all that apply
            </p>
          </motion.div>

          <div className="mb-8">
            <div className="flex flex-wrap justify-center gap-6 md:gap-8 mb-8">
              {question.options.map((option, index) => {
                const isSelected =
                  selectedOptions.includes(option.id) ||
                  selectedOptions.some((sel) =>
                    normalizeSelection(sel).startsWith(`${option.id}-`),
                  );
                const isExpanded = expandedOptions.includes(option.id);

                return (
                  <div
                    key={option.id}
                    className="flex flex-col items-center gap-3"
                  >
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        backgroundColor: isSelected ? "#9E5DAB" : "white",
                        borderColor: isSelected ? "#9E5DAB" : "#EBD7DC",
                      }}
                      transition={{
                        delay: index * 0.05,
                        backgroundColor: { duration: 0.3, ease: "easeInOut" },
                        borderColor: { duration: 0.3, ease: "easeInOut" },
                        scale: { type: "spring", stiffness: 300, damping: 20 },
                      }}
                      whileHover={{
                        scale: 1.08,
                        boxShadow: isSelected
                          ? "0 10px 40px rgba(158, 93, 171, 0.4)"
                          : "0 10px 30px rgba(235, 215, 220, 0.4)",
                      }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleCircleClick(option.id, option)}
                      className="relative flex items-center justify-center rounded-full transition-all group"
                      style={{
                        width: 150,
                        height: 150,
                        border: `3px solid ${
                          isSelected ? "#9E5DAB" : "#EBD7DC"
                        }`,
                        boxShadow: isSelected
                          ? "0 8px 25px rgba(158, 93, 171, 0.25)"
                          : "0 4px 15px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      <motion.span
                        className="text-sm text-center px-3 leading-snug break-words"
                        animate={{
                          color: isSelected ? "white" : "#2d2d2d",
                        }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        style={{
                          maxWidth: "130px",
                          display: "-webkit-box",
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          fontWeight: 500,
                        }}
                      >
                        {option.label}
                      </motion.span>

                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 25,
                            }}
                            className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: "#8FD9FB" }}
                          >
                            <svg
                              className="w-5 h-5 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>

                    {option.textInput && isSelected && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Input
                          value={textInputs[option.id] ?? ""}
                          onChange={(e) =>
                            setTextInputs((prev) => ({
                              ...prev,
                              [option.id]: e.target.value,
                            }))
                          }
                          placeholder="type here..."
                          className="w-48 h-10 text-sm rounded-full border-2 text-center"
                          style={{ borderColor: "#9E5DAB" }}
                        />
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {expandedOptions.length > 0 && (
                <motion.div
                  key={expandedOptions[0]}
                  initial={{ opacity: 0, height: 0, y: -20 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full overflow-hidden"
                >
                  {expandedOptions.map((expandedId) => {
                    const parentOption = question.options.find(
                      (opt) => opt.id === expandedId,
                    );
                    if (!parentOption?.subOptions) return null;

                    return (
                      <div key={expandedId} className="w-full">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 }}
                          className="text-center mb-6"
                        >
                          <p className="text-sm" style={{ color: "#9E5DAB" }}>
                            choose from: {parentOption.label}
                          </p>
                        </motion.div>

                        <div
                          className="flex flex-wrap justify-center gap-4 px-4 py-6 rounded-3xl"
                          style={{ backgroundColor: "#F8F3F9" }}
                        >
                          {parentOption.subOptions.map((subOption, subIndex) => {
                            const subId = `${expandedId}-${subOption.id}`;
                            const isSubSelected =
                              selectedOptions.includes(subId);

                            return (
                              <div
                                key={subOption.id}
                                className="flex flex-col items-center gap-2"
                              >
                                <motion.button
                                  initial={{ opacity: 0, scale: 0 }}
                                  animate={{
                                    opacity: 1,
                                    scale: 1,
                                    backgroundColor: isSubSelected
                                      ? "#EBD7DC"
                                      : "white",
                                    borderColor: isSubSelected
                                      ? "#9E5DAB"
                                      : "#EBD7DC80",
                                  }}
                                  transition={{
                                    delay: subIndex * 0.03,
                                    backgroundColor: {
                                      duration: 0.3,
                                      ease: "easeInOut",
                                    },
                                    borderColor: {
                                      duration: 0.3,
                                      ease: "easeInOut",
                                    },
                                    scale: {
                                      type: "spring",
                                      stiffness: 400,
                                      damping: 20,
                                    },
                                  }}
                                  whileHover={{
                                    scale: 1.05,
                                    y: -2,
                                    boxShadow: isSubSelected
                                      ? "0 8px 25px rgba(158, 93, 171, 0.3)"
                                      : "0 6px 20px rgba(235, 215, 220, 0.4)",
                                  }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() =>
                                    handleSubOptionClick(
                                      expandedId,
                                      subOption.id,
                                    )
                                  }
                                  className="relative flex items-center justify-center transition-all px-5 py-3 min-w-[120px] max-w-[200px]"
                                  style={{
                                    borderRadius: "50px",
                                    border: `2.5px solid ${
                                      isSubSelected ? "#9E5DAB" : "#EBD7DC80"
                                    }`,
                                    boxShadow: isSubSelected
                                      ? "0 6px 20px rgba(158, 93, 171, 0.2)"
                                      : "0 3px 10px rgba(0, 0, 0, 0.08)",
                                  }}
                                >
                                  <motion.span
                                    className="text-sm text-center leading-relaxed"
                                    animate={{
                                      color: isSubSelected
                                        ? "#9E5DAB"
                                        : "#2d2d2d",
                                    }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    style={{ fontWeight: 500 }}
                                  >
                                    {subOption.label}
                                  </motion.span>

                                  <AnimatePresence>
                                    {isSubSelected && (
                                      <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        transition={{
                                          type: "spring",
                                          stiffness: 500,
                                          damping: 25,
                                        }}
                                        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: "#9E5DAB" }}
                                      >
                                        <svg
                                          className="w-4 h-4 text-white"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={3}
                                            d="M5 13l4 4L19 7"
                                          />
                                        </svg>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </motion.button>

                                {subOption.textInput && isSubSelected && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                  >
                                    <Input
                                      value={textInputs[subId] ?? ""}
                                      onChange={(e) =>
                                        setTextInputs((prev) => ({
                                          ...prev,
                                          [subId]: e.target.value,
                                        }))
                                      }
                                      placeholder="type here..."
                                      className="w-40 h-9 text-sm rounded-full border-2 text-center"
                                      style={{ borderColor: "#9E5DAB" }}
                                    />
                                  </motion.div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.div
            className="flex justify-center pb-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              onClick={() => {
                void handleNext();
              }}
              disabled={!canProceed()}
              className="w-72 py-7 rounded-full text-lg shadow-xl transition-all duration-300"
              style={{
                backgroundColor: canProceed() ? "#9E5DAB" : "#E8E8E8",
                color: canProceed() ? "white" : "#6b6b6b",
                opacity: canProceed() ? 1 : 0.5,
              }}
            >
              {currentQuestion === questions.length - 1
                ? "finish & generate my report"
                : "next"}
            </Button>
          </motion.div>
        </div>
      </ScrollArea>
    </div>
  );
}
