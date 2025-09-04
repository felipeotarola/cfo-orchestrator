import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Send, FileText, Calculator, TrendingUp, Receipt, DollarSign, BarChart3, LayoutDashboard } from 'lucide-react';
import { MultimodalInput } from '@/components/multimodal-input';
import { Messages } from '@/components/messages';
import Link from 'next/link';

interface ChatProps {
  initialMessages?: any[];
  className?: string;
}

export function Chat({ initialMessages = [], className = '' }: ChatProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [input, setInput] = useState('');

  const {
    messages,
    status,
    error,
    sendMessage,
    stop,
    addToolResult,
  } = useChat();

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    if (status === 'streaming') {
      setIsGenerating(true);
    } else {
      setIsGenerating(false);
    }
  }, [status]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: input }],
      });
      setInput('');
    }
  };

  const handleQuickAction = (prompt: string) => {
    sendMessage({
      role: 'user',
      parts: [{ type: 'text', text: prompt }],
    });
  };

  // CFO-specific quick actions
  const quickActions = [
    {
      icon: Calculator,
      label: 'Skapa faktura',
      description: 'Generera en ny faktura',
      prompt: 'Hjälp mig skapa en ny faktura. Vad behöver du veta?',
      color: 'bg-gray-500 hover:bg-gray-600',
    },
    {
      icon: Receipt,
      label: 'Registrera utgift',
      description: 'Lägg till kvitto eller utgift',
      prompt: 'Jag vill registrera en ny utgift. Kan du hjälpa mig?',
      color: 'bg-gray-600 hover:bg-gray-700',
    },
    {
      icon: BarChart3,
      label: 'Finansiell översikt',
      description: 'Visa aktuell ekonomisk status',
      prompt: 'Visa mig en finansiell översikt för denna månad',
      color: 'bg-slate-500 hover:bg-slate-600',
    },
    {
      icon: TrendingUp,
      label: 'Kassaflödesanalys',
      description: 'Analysera kassaflödet',
      prompt: 'Analysera vårt kassaflöde och ge mig insikter om trender',
      color: 'bg-slate-600 hover:bg-slate-700',
    },
    {
      icon: FileText,
      label: 'Månadsrapport',
      description: 'Generera månadsrapport',
      prompt: 'Skapa en detaljerad månadsrapport med alla nyckeltal',
      color: 'bg-gray-700 hover:bg-gray-800',
    },
    {
      icon: DollarSign,
      label: 'Försenade betalningar',
      description: 'Visa förfallna fakturor',
      prompt: 'Visa mig alla förfallna fakturor och föreslå åtgärder',
      color: 'bg-slate-700 hover:bg-slate-800',
    },
  ];

  const showQuickActions = messages.length === 0 || (messages.length === 1 && messages[0].role === 'system');

  return (
    <div className={`flex flex-col h-screen ${className}`}>
      {/* Header with neutral gradient */}
      <div className="gradient-primary text-white p-6 flex-shrink-0 soft-shadow">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 glass-effect border-2 border-white/30">
            <AvatarFallback className="text-gray-600 font-semibold text-lg bg-white">AI</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">CFO AI Assistant</h1>
            <p className="text-gray-200 text-sm font-medium">Din personliga finansiella rådgivare</p>
          </div>
          <div className="flex items-center gap-3">
            {isLoading && (
              <Badge variant="secondary" className="glass-effect text-white border-white/30 smooth-border">
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Tänker...
              </Badge>
            )}
            <Link href="/dashboard">
              <Button variant="secondary" size="sm" className="glass-effect hover-lift text-white border-white/30 hover:bg-white/20 smooth-border font-medium">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Messages area - takes remaining space */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="h-full p-4">
        {showQuickActions ? (
          <div className="space-y-8">
            {/* Welcome message */}
            <Card className="p-8 gradient-card soft-shadow-lg smooth-border hover-lift">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto gradient-primary ultra-smooth flex items-center justify-center soft-shadow">
                  <Calculator className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Välkommen till CFO AI</h2>
                <p className="text-gray-600 max-w-lg mx-auto text-lg leading-relaxed">
                  Jag är din AI-driven CFO-assistent. Jag kan hjälpa dig med fakturering, 
                  utgiftshantering, finansiell analys och mycket mer.
                </p>
              </div>
            </Card>

            {/* Quick actions */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-gray-600" />
                Vad kan jag hjälpa dig med idag?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quickActions.map((action, index) => (
                  <Card 
                    key={index}
                    className="p-6 gradient-card soft-shadow hover-lift transition-all duration-200 cursor-pointer border hover:border-gray-300 smooth-border"
                    onClick={() => handleQuickAction(action.prompt)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 smooth-border text-white soft-shadow ${action.color}`}>
                        <action.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2 text-lg">{action.label}</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">{action.description}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Features highlight */}
            <Card className="p-8 gradient-secondary soft-shadow smooth-border">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Avancerade funktioner</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-green-500 ultra-smooth"></div>
                  <span className="font-medium text-gray-700">Realtids finansiell data</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-gradient-to-r from-gray-400 to-gray-500 ultra-smooth"></div>
                  <span className="font-medium text-gray-700">Automatisk kategorisering</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-gradient-to-r from-slate-400 to-slate-500 ultra-smooth"></div>
                  <span className="font-medium text-gray-700">Intelligent prognostisering</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-gradient-to-r from-gray-600 to-gray-700 ultra-smooth"></div>
                  <span className="font-medium text-gray-700">Multimodal filanalys</span>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <Messages messages={messages} isLoading={isLoading} />
        )}
        </ScrollArea>
      </div>

      {/* Input area - fixed at bottom */}
      <div className="glass-effect border-t border-white/20 p-6 flex-shrink-0 backdrop-blur-lg">
        <MultimodalInput
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          stop={stop}
          messages={messages}
          sendMessage={sendMessage}
          className="max-w-none"
        />
        
        {/* Status indicator */}
        {status === 'ready' && (
          <div className="mt-3 text-sm text-gray-600 flex items-center gap-3">
            <div className="w-2 h-2 bg-gray-400 smooth-border animate-pulse"></div>
            <span className="font-medium">Ansluten till CFO-systemet</span>
          </div>
        )}
      </div>
    </div>
  );
}
