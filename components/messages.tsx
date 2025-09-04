import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Bot, 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calculator,
  FileText,
  BarChart3,
  Receipt,
  TrendingUp,
  DollarSign,
  Image as ImageIcon,
  FileIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UIMessage } from 'ai';

interface MessagesProps {
  messages: UIMessage[];
  isLoading?: boolean;
}

// Helper function to format message content
const formatMessageContent = (message: UIMessage) => {
  // Handle parts-based messages (AI SDK v5 format)
  return message.parts.map((part: any, index: number) => {
    if (part.type === 'text') {
      return (
        <div key={index} className="prose prose-sm max-w-none">
          <MessageText content={part.text || ''} />
        </div>
      );
    } else if (part.type === 'image') {
      return (
        <div key={index} className="mt-2">
          <img 
            src={part.url} 
            alt="Bifogad bild"
            className="max-w-sm rounded-lg border"
          />
        </div>
      );
    } else if (part.type === 'file') {
      return (
        <div key={index} className="mt-2 flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
          <FileIcon className="w-4 h-4" />
          <span className="text-sm">{part.name || 'Bifogad fil'}</span>
        </div>
      );
    }
    return null;
  });
};

export function Messages({ messages, isLoading = false }: MessagesProps) {
  // Filter out system messages from display
  const displayMessages = messages.filter(msg => msg.role !== 'system');

  const renderToolInvocations = (toolInvocations: any[]) => {
    return toolInvocations.map((invocation, index) => (
      <ToolInvocationCard key={index} invocation={invocation} />
    ));
  };

  return (
    <div className="space-y-6">
      {displayMessages.map((message, index) => (
        <div key={message.id || index} className="space-y-3">
          <MessageCard message={message} />
          
          {/* Render tool invocations if present (check for experimental property) */}
          {(message as any).toolInvocations && (message as any).toolInvocations.length > 0 && (
            <div className="space-y-2">
              {renderToolInvocations((message as any).toolInvocations)}
            </div>
          )}
        </div>
      ))}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center gap-3 p-4">
          <Avatar className="h-8 w-8 gradient-primary">
            <AvatarFallback className="text-white">
              <Bot className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">CFO AI tänker...</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageCard({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <Avatar className="h-8 w-8 gradient-primary flex-shrink-0">
          <AvatarFallback className="text-white">
            <Bot className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        'max-w-[80%] space-y-2',
        isUser ? 'order-first' : ''
      )}>
        <Card className={cn(
          'p-4',
          isUser 
            ? 'gradient-primary text-white border-gray-600' 
            : 'bg-white border-gray-200'
        )}>
          <div className={cn(
            'text-sm',
            isUser ? 'text-white' : 'text-gray-600'
          )}>
            {formatMessageContent(message)}
          </div>
        </Card>
        
        {!isUser && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
              <Copy className="w-3 h-3 mr-1" />
              Kopiera
            </Button>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
              <ThumbsUp className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
              <ThumbsDown className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
      
      {isUser && (
        <Avatar className="h-8 w-8 bg-gray-100 flex-shrink-0">
          <AvatarFallback>
            <User className="w-4 h-4 text-gray-600" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

function ToolInvocationCard({ invocation }: { invocation: any }) {
  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case 'processWithCFOOrchestrator':
        return Calculator;
      case 'getFinancialOverview':
        return BarChart3;
      case 'createInvoice':
        return FileText;
      case 'createReceipt':
        return Receipt;
      case 'getRecentTransactions':
        return TrendingUp;
      default:
        return Bot;
    }
  };

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'call':
        return <Loader2 className="w-4 h-4 animate-spin text-gray-500" />;
      case 'result':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getToolDisplayName = (toolName: string) => {
    const names: Record<string, string> = {
      processWithCFOOrchestrator: 'CFO Orchestrator',
      getFinancialOverview: 'Finansiell översikt',
      createInvoice: 'Skapa faktura',
      createReceipt: 'Registrera kvitto',
      getRecentTransactions: 'Hämta transaktioner',
    };
    return names[toolName] || toolName;
  };

  const ToolIcon = getToolIcon(invocation.toolName);

  return (
    <Card className="p-3 bg-gray-50 border-gray-200">
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2 flex-1">
          <ToolIcon className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium">
            {getToolDisplayName(invocation.toolName)}
          </span>
          {getStatusIcon(invocation.state)}
        </div>
        
        <Badge variant="secondary" className="text-xs">
          {invocation.state === 'call' ? 'Kör...' : 
           invocation.state === 'result' ? 'Klar' : 
           invocation.state === 'error' ? 'Fel' : 'Väntar'}
        </Badge>
      </div>
      
      {invocation.state === 'result' && invocation.result && (
        <div className="mt-3 p-3 bg-white rounded border">
          <ToolResult result={invocation.result} toolName={invocation.toolName} />
        </div>
      )}
      
      {invocation.state === 'error' && (
        <div className="mt-2 text-sm text-red-600">
          <strong>Fel:</strong> {invocation.error || 'Okänt fel uppstod'}
        </div>
      )}
    </Card>
  );
}

function ToolResult({ result, toolName }: { result: any; toolName: string }) {
  if (typeof result === 'string') {
    return <div className="text-sm">{result}</div>;
  }

  if (result.success === false) {
    return (
      <div className="text-sm text-red-600">
        <strong>Fel:</strong> {result.error || 'Okänt fel'}
        {result.details && <div className="mt-1 text-xs">{result.details}</div>}
      </div>
    );
  }

  // Handle specific tool results
  switch (toolName) {
    case 'getFinancialOverview':
      return <FinancialOverviewResult result={result} />;
    case 'createInvoice':
      return <InvoiceResult result={result} />;
    case 'createReceipt':
      return <ReceiptResult result={result} />;
    case 'getRecentTransactions':
      return <TransactionsResult result={result} />;
    default:
      return <div className="text-sm">{JSON.stringify(result, null, 2)}</div>;
  }
}

function FinancialOverviewResult({ result }: { result: any }) {
  if (!result.summary) return null;

  const { summary, insights } = result;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-600">Omsättning:</span>
          <div className="font-semibold text-green-600">
            {summary.totalRevenue?.toLocaleString('sv-SE')} SEK
          </div>
        </div>
        <div>
          <span className="text-gray-600">Utgifter:</span>
          <div className="font-semibold text-red-600">
            {summary.totalExpenses?.toLocaleString('sv-SE')} SEK
          </div>
        </div>
        <div>
          <span className="text-gray-600">Utestående:</span>
          <div className="font-semibold text-orange-600">
            {summary.outstandingAmount?.toLocaleString('sv-SE')} SEK
          </div>
        </div>
        <div>
          <span className="text-gray-600">Kassaflöde:</span>
          <div className={cn(
            'font-semibold',
            summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {summary.netCashFlow?.toLocaleString('sv-SE')} SEK
          </div>
        </div>
      </div>
      
      {insights && insights.length > 0 && (
        <div className="pt-2 border-t">
          <div className="text-xs text-gray-600 mb-1">Insikter:</div>
          <div className="space-y-1">
            {insights.slice(0, 3).map((insight: string, index: number) => (
              <div key={index} className="text-xs text-gray-700">{insight}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InvoiceResult({ result }: { result: any }) {
  if (!result.invoice) return null;

  const { invoice, message } = result;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-green-600">{message}</div>
      <div className="text-xs space-y-1">
        <div><strong>Nummer:</strong> {invoice.number}</div>
        <div><strong>Kund:</strong> {invoice.clientName}</div>
        <div><strong>Belopp:</strong> {invoice.totalAmount?.toLocaleString('sv-SE')} {invoice.currency}</div>
        <div><strong>Förfallodatum:</strong> {invoice.dueDate}</div>
      </div>
    </div>
  );
}

function ReceiptResult({ result }: { result: any }) {
  if (!result.receipt) return null;

  const { receipt, message } = result;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-green-600">{message}</div>
      <div className="text-xs space-y-1">
        <div><strong>Nummer:</strong> {receipt.number}</div>
        <div><strong>Leverantör:</strong> {receipt.vendorName}</div>
        <div><strong>Belopp:</strong> {receipt.amount?.toLocaleString('sv-SE')} SEK</div>
        <div><strong>Kategori:</strong> {receipt.category}</div>
      </div>
    </div>
  );
}

function TransactionsResult({ result }: { result: any }) {
  if (!result.transactions) return null;

  const { transactions, summary } = result;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{summary}</div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {transactions.slice(0, 5).map((transaction: any, index: number) => (
          <div key={index} className="text-xs flex justify-between items-center py-1 border-b last:border-b-0">
            <div className="flex-1">
              <div className="font-medium">{transaction.description}</div>
              <div className="text-gray-500">{transaction.date}</div>
            </div>
            <div className={cn(
              'font-medium',
              transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {transaction.amount?.toLocaleString('sv-SE')} SEK
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageText({ content }: { content: string }) {
  // Simple markdown-like formatting
  const formatText = (text: string) => {
    return text
      .split('\n')
      .map((line, index) => {
        // Headers
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-lg font-bold mt-4 mb-2">{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-base font-bold mt-3 mb-2">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-sm font-bold mt-2 mb-1">{line.slice(4)}</h3>;
        }
        
        // Lists
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <li key={index} className="ml-4">{line.slice(2)}</li>;
        }
        
        // Bold text
        const boldFormatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        return (
          <p 
            key={index} 
            className="mb-2 last:mb-0"
            dangerouslySetInnerHTML={{ __html: boldFormatted }}
          />
        );
      });
  };

  return <div>{formatText(content)}</div>;
}
