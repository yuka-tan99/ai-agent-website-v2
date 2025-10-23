import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ChevronLeft, X } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { BecomeFamousLogo } from './BecomeFamousLogo';

interface OnboardingAnswer {
  questionId: number;
  answer: string | string[];
}

interface OnboardingFlowProps {
  onComplete: (answers: OnboardingAnswer[]) => void;
  onBack: () => void;
}

interface Question {
  id: number;
  category: string;
  question: string;
  type: 'single' | 'multiple' | 'text';
  options?: string[];
}

const questions: Question[] = [
  // Entry & Motivation (Q1-3)
  {
    id: 1,
    category: "Entry & Motivation",
    question: "What's bringing you here today?",
    type: "multiple",
    options: [
      "I want to build my personal brand from scratch",
      "I need to market my business or product",
      "I'm an artist/creator seeking more visibility",
      "I have followers but want to monetize better",
      "I feel stuck despite consistent posting",
      "Just exploring what's possible for me",
      "Something else"
    ]
  },
  {
    id: 2,
    category: "Entry & Motivation",
    question: "How would you describe where you are right now?",
    type: "multiple",
    options: [
      "Haven't started yet but ready to begin",
      "Started recently, still finding my way",
      "Been at it for months, seeing some growth",
      "Established presence but hit a plateau",
      "Successful before, now starting something new",
      "Burned out and need a fresh approach"
    ]
  },
  {
    id: 3,
    category: "Entry & Motivation",
    question: "What's the ONE thing holding you back most? (Select only one - your biggest blocker)",
    type: "single",
    options: [
      "I don't know what to post about",
      "I can't stay consistent",
      "My content gets no engagement",
      "Fear of judgment stops me from posting",
      "No time to create quality content",
      "I feel fake/inauthentic online",
      "Too much contradicting advice online",
      "Technical aspects overwhelm me",
      "I compare myself to others constantly",
      "My growth has completely stalled"
    ]
  },
  // Vision & Purpose (Q4-6)
  {
    id: 4,
    category: "Vision & Purpose",
    question: "Imagine you've succeeded. What does that look like?",
    type: "multiple",
    options: [
      "Posting regularly without anxiety or overthinking",
      "Having a recognizable brand/style",
      "Engaged community that values my content",
      "Steady stream of clients/customers",
      "Brand partnerships and sponsorships",
      "Selling my own products/services successfully",
      "Just feeling authentic and confident online",
      "Other (describe below)"
    ]
  },
  {
    id: 5,
    category: "Vision & Purpose",
    question: "What's really driving you to do this? (Select all that resonate)",
    type: "multiple",
    options: [
      "Financial independence",
      "Creative expression and fulfillment",
      "Sharing my knowledge to help others",
      "Building something meaningful",
      "Escaping the 9-5 grind",
      "Finding my people/community",
      "Proving I can do this",
      "Having fun and exploring creativity",
      "Building a business asset",
      "Leaving a legacy"
    ]
  },
  {
    id: 6,
    category: "Vision & Purpose",
    question: "When someone finishes consuming your content, how do you want them to feel?",
    type: "multiple",
    options: [
      "Inspired to take action",
      "Smarter/more informed",
      "Entertained and lighter",
      "Seen and understood",
      "Challenged to think differently",
      "Aesthetically satisfied",
      "Part of something bigger",
      "Excited about possibilities"
    ]
  },
  // Natural Strengths & Style (Q7-10)
  {
    id: 7,
    category: "Natural Strengths & Style",
    question: "What type of content would you create even if no one was watching?",
    type: "multiple",
    options: [
      "Teaching what I know",
      "Documenting my life/journey",
      "Making people laugh",
      "Creating beautiful visuals",
      "Having deep discussions",
      "Showing my creative process",
      "Commenting on trends/culture",
      "Building/making things",
      "Sharing my opinions/thoughts"
    ]
  },
  {
    id: 8,
    category: "Natural Strengths & Style",
    question: "How comfortable are you with visibility?",
    type: "multiple",
    options: [
      "Love the camera, natural performer",
      "Fine on camera with preparation",
      "Prefer voice with visuals (faceless)",
      "Want to stay behind the scenes",
      "Depends on my energy that day",
      "Working up to showing my face",
      "Comfortable in my own unique way"
    ]
  },
  {
    id: 9,
    category: "Natural Strengths & Style",
    question: "What's your realistic capacity for content creation?",
    type: "multiple",
    options: [
      "I can batch create on weekends",
      "I have 15-30 minutes daily",
      "I can dedicate 2+ hours daily",
      "My schedule is chaotic but I find time",
      "I have team/help available",
      "Time exists, I need motivation/clarity",
      "I can make time for what matters"
    ]
  },
  {
    id: 10,
    category: "Natural Strengths & Style",
    question: "What could you talk about endlessly without notes? Think about what friends ask your advice on, what you research for fun, or what you're known for",
    type: "text",
    options: []
  },
  // Platform & Community (Q11-13)
  {
    id: 11,
    category: "Platform & Community",
    question: "Where do you actually spend time online? (Not where you think you should be)",
    type: "multiple",
    options: [
      "TikTok - I get lost in short videos",
      "Instagram - I love visual storytelling",
      "YouTube - I watch long-form content",
      "Twitter/X - Quick thoughts and discussions",
      "LinkedIn - Professional networking",
      "Pinterest - Visual inspiration",
      "Multiple platforms equally",
      "I mostly consume, don't create yet"
    ]
  },
  {
    id: 12,
    category: "Platform & Community",
    question: "Who actually needs what you have?",
    type: "multiple",
    options: [
      "People facing challenges I've overcome",
      "Professionals in my industry",
      "Hobbyists who share my interests",
      "Local community members",
      "Gen Z generation",
      "Millennials generation",
      "Gen X generation",
      "Boomers generation",
      "Still figuring this out"
    ]
  },
  {
    id: 13,
    category: "Platform & Community",
    question: "How do you relate to metrics and data?",
    type: "multiple",
    options: [
      "Check obsessively, affects my mood",
      "Check regularly but stay detached",
      "Avoid them, they stress me out",
      "Don't understand what to track",
      "Want to learn to use them strategically",
      "Care more about comments than numbers"
    ]
  },
  // Reality Check (Q14-17)
  {
    id: 14,
    category: "Reality Check",
    question: "What specific fear is loudest in your head? (Select the main one)",
    type: "single",
    options: [
      "People will think I'm cringe",
      "My family/friends will judge me",
      "I'll get hate comments",
      "I'm not expert enough",
      "I'm just copying others",
      "I'll make mistakes publicly",
      "I'll say something wrong and get cancelled",
      "Success will change me negatively",
      "I'll fail and prove doubters right"
    ]
  },
  {
    id: 15,
    category: "Reality Check",
    question: "What have you actually tried that didn't work?",
    type: "multiple",
    options: [
      "Posted consistently but saw no growth",
      "Chased every trend",
      "Bought courses/coaching programs",
      "Tried different content styles",
      "Ran paid ads",
      "Haven't really tried anything substantial",
      "Tried everything, feeling exhausted"
    ]
  },
  {
    id: 16,
    category: "Reality Check",
    question: "When someone criticizes your content, you typically:",
    type: "multiple",
    options: [
      "Analyze it for valid feedback",
      "Feel hurt for days",
      "Get defensive and want to respond",
      "Ignore it completely",
      "Depends if I respect their opinion",
      "Haven't experienced this yet",
      "Learn from it but it still stings"
    ]
  },
  {
    id: 17,
    category: "Reality Check",
    question: "What's your relationship with perfectionism?",
    type: "multiple",
    options: [
      "I delete more than I post",
      "I overthink every caption",
      "I'm getting better at 'good enough'",
      "I post without much thought",
      "Depends on my mood",
      "Perfectionism has killed my consistency"
    ]
  },
  // Business & Growth (Q18-20)
  {
    id: 18,
    category: "Business & Growth",
    question: "Regarding monetization:",
    type: "multiple",
    options: [
      "I need income from this ASAP",
      "Building long-term, patient with monetization",
      "Want diverse revenue streams",
      "Just want to cover my costs",
      "Money isn't the primary goal",
      "Already earning, want to scale",
      "Not sure if I want to monetize"
    ]
  },
  {
    id: 19,
    category: "Business & Growth",
    question: "How central is social media success to your life vision?",
    type: "multiple",
    options: [
      "It's everything - my main path forward",
      "It's major - enables other dreams",
      "It's important but not everything",
      "It's supplementary to other goals",
      "Just exploring if this is for me"
    ]
  },
  {
    id: 20,
    category: "Business & Growth",
    question: "What would you need to believe to take action today? What permission, belief, or clarity would unlock your ability to start?",
    type: "text",
    options: []
  }
];

export function OnboardingFlow({ onComplete, onBack }: OnboardingFlowProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string | string[]>([]);
  const [textInput, setTextInput] = useState("");
  const [textTags, setTextTags] = useState<string[]>([]);

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleOptionClick = (option: string) => {
    if (question.type === 'single') {
      setCurrentAnswer([option]);
    } else if (question.type === 'multiple') {
      const selected = currentAnswer as string[];
      if (selected.includes(option)) {
        setCurrentAnswer(selected.filter(o => o !== option));
      } else {
        setCurrentAnswer([...selected, option]);
      }
    }
  };

  const handleAddTag = () => {
    if (textInput.trim()) {
      setTextTags([...textTags, textInput.trim()]);
      setTextInput("");
    }
  };

  const handleRemoveTag = (index: number) => {
    setTextTags(textTags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleNext = () => {
    const answerValue = question.type === 'text' ? textTags : currentAnswer;
    
    const newAnswers = [...answers.filter(a => a.questionId !== question.id), {
      questionId: question.id,
      answer: answerValue
    }];
    
    setAnswers(newAnswers);

    if (currentQuestion === questions.length - 1) {
      onComplete(newAnswers);
    } else {
      setCurrentQuestion(currentQuestion + 1);
      
      // Load previous answer if exists
      const nextQuestion = questions[currentQuestion + 1];
      const previousAnswer = newAnswers.find(a => a.questionId === nextQuestion.id);
      
      if (previousAnswer) {
        if (nextQuestion.type === 'text') {
          setTextTags(Array.isArray(previousAnswer.answer) ? previousAnswer.answer : [previousAnswer.answer]);
          setTextInput("");
          setCurrentAnswer([]);
        } else {
          setCurrentAnswer(previousAnswer.answer as string[]);
          setTextInput("");
          setTextTags([]);
        }
      } else {
        setCurrentAnswer([]);
        setTextInput("");
        setTextTags([]);
      }
    }
  };

  const handleBack = () => {
    if (currentQuestion === 0) {
      onBack();
    } else {
      setCurrentQuestion(currentQuestion - 1);
      
      // Load previous answer
      const prevQuestion = questions[currentQuestion - 1];
      const previousAnswer = answers.find(a => a.questionId === prevQuestion.id);
      
      if (previousAnswer) {
        if (prevQuestion.type === 'text') {
          setTextTags(Array.isArray(previousAnswer.answer) ? previousAnswer.answer : [previousAnswer.answer]);
          setTextInput("");
          setCurrentAnswer([]);
        } else {
          setCurrentAnswer(previousAnswer.answer as string[]);
          setTextInput("");
          setTextTags([]);
        }
      } else {
        setCurrentAnswer([]);
        setTextInput("");
        setTextTags([]);
      }
    }
  };

  const canProceed = () => {
    if (question.type === 'text') {
      return textTags.length > 0;
    }
    return (currentAnswer as string[]).length > 0;
  };

  return (
    <div className="min-h-screen bg-white">
      <ScrollArea className="h-screen">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <BecomeFamousLogo size="md" />
          </div>

          {/* Header with Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Button
                onClick={handleBack}
                variant="outline"
                size="icon"
                className="rounded-full w-12 h-12"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <div className="flex-1 mx-4">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%`, backgroundColor: '#9E5DAB' }}
                  />
                </div>
              </div>
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {currentQuestion + 1} / {questions.length}
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="mb-12">
            <h2 
              className="mb-3 text-2xl leading-relaxed"
              style={{ color: '#9E5DAB' }}
            >
              {question.question}
            </h2>
            {question.type === 'single' && (
              <p className="text-sm text-muted-foreground">Select one option</p>
            )}
            {question.type === 'multiple' && (
              <p className="text-sm text-muted-foreground">Select all that apply (minimum one)</p>
            )}
          </div>

          {/* Answer Options */}
          {question.type === 'text' ? (
            <div className="mb-12">
              {/* Tags Display */}
              {textTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {textTags.map((tag, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all"
                      style={{ 
                        backgroundColor: '#EBD7DC',
                        color: '#9E5DAB'
                      }}
                    >
                      <span>{tag}</span>
                      <button
                        onClick={() => handleRemoveTag(index)}
                        className="hover:opacity-70 transition-opacity"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Input Field */}
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a phrase or word and press Enter..."
                className="h-14 text-base px-4 rounded-xl border-2"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Press Enter to add each item
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 mb-12">
              {question.options?.map((option, index) => {
                const isSelected = (currentAnswer as string[]).includes(option);
                return (
                  <button
                    key={index}
                    onClick={() => handleOptionClick(option)}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${
                      isSelected 
                        ? 'border-primary shadow-md'
                        : 'border-border hover:border-primary/50'
                    }`}
                    style={{
                      backgroundColor: isSelected ? '#EBD7DC20' : 'white',
                      borderColor: isSelected ? '#9E5DAB' : undefined
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                          isSelected ? 'border-primary' : 'border-gray-300'
                        }`}
                        style={{
                          backgroundColor: isSelected ? '#9E5DAB' : 'white',
                          borderColor: isSelected ? '#9E5DAB' : undefined
                        }}
                      >
                        {isSelected && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <span className={isSelected ? '' : 'text-foreground'}>
                        {option}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Next Button */}
          <div className="flex justify-center pb-12">
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-12 py-6 rounded-full"
              style={{ 
                backgroundColor: canProceed() ? '#9E5DAB' : '#E8E8E8',
                color: canProceed() ? 'white' : '#6b6b6b'
              }}
            >
              {currentQuestion === questions.length - 1 ? 'Finish & Generate My Result' : 'Next'}
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
