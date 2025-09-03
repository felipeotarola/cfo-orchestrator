import { openai } from '@ai-sdk/openai';
import {
  streamText,
  convertToModelMessages,
  tool,
} from 'ai';
import { z } from 'zod';
import { type NextRequest } from "next/server"
import { CFOOrchestrator } from "@/lib/agents/orchestrator"
import { createServerSupabaseClient } from "@/lib/supabase/server"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    console.log("Chat API: Starting request processing")
    const body = await request.json()
    let { messages } = body
    
    console.log('Received messages:', messages?.length || 0, 'messages');

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'Messages array required' }, { status: 400 });
    }

    // Remove duplicate messages by ID to prevent AI SDK errors
    const seenIds = new Set();
    messages = messages.filter((message: any) => {
      if (!message.id || seenIds.has(message.id)) {
        console.log(`Filtered duplicate message with ID: ${message.id}`);
        return false;
      }
      seenIds.add(message.id);
      return true;
    });

    if (!process.env.OPENAI_API_KEY) {
      console.error("Chat API: Missing OPENAI_API_KEY environment variable")
      return Response.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    // Initialize Supabase client
    let supabase
    try {
      console.log("Chat API: Initializing Supabase client")
      supabase = await createServerSupabaseClient()
      console.log("Chat API: Supabase client initialized successfully")
    } catch (error) {
      console.error("Chat API: Supabase initialization error:", error)
      return Response.json({ error: "Database connection failed" }, { status: 500 })
    }

    // Get current date for system context
    const currentDate = new Date().toLocaleDateString('sv-SE', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    });

    // Add system message with context
    const systemMessageId = `system-cfo-context`;
    messages = messages.filter((msg: any) => msg.id !== systemMessageId);
    
    messages.unshift({
      id: systemMessageId,
      role: 'system',
      content: `Du är en AI CFO-assistent för svenska företag. Dagens datum: ${currentDate}

Du har tillgång till specialiserade agenter för:
- Bokföring och transaktionskategorisering  
- Fakturering och betalningsuppföljning
- Finansiell rapportering och analys
- Kvittoskanning och utgiftshantering

När användare laddar upp dokument (PDF, bilder):
- Analysera automatiskt innehållet för finansiell information
- Extrahera leverantör/klient, belopp, datum, artiklar/tjänster
- Föreslå lämpliga åtgärder baserat på dokumenttypen

Svara alltid på svenska och fokusera på affärsnytta och konkreta rekommendationer.`
    });

    // Normalize to parts-based UI messages to avoid convertToModelMessages errors
    messages = messages.map((m: any) => {
      if (!m?.parts) {
        if (typeof m?.content === 'string') {
          return { ...m, parts: [{ type: 'text', text: m.content }] };
        }
      }
      return m;
    });

    const result = streamText({
      model: openai('gpt-4o'),
      messages: convertToModelMessages(messages),
      tools: {
        // Analyze financial documents
        analyzeDocument: tool({
          description: 'Analysera uppladdade finansiella dokument (fakturor, kvitton, etc.)',
          inputSchema: z.object({
            documentType: z.enum(['invoice', 'receipt', 'expense', 'other']).describe('Typ av dokument'),
            extractData: z.boolean().describe('Om finansiell data ska extraheras'),
          }),
          execute: async ({ documentType, extractData }) => {
            return {
              documentType,
              status: 'analyzed',
              message: `Dokument av typ ${documentType} har analyserats${extractData ? ' och data extraherades' : ''}.`
            };
          },
        }),
        
        // Create invoice
        createInvoice: tool({
          description: 'Skapa en ny faktura i systemet',
          inputSchema: z.object({
            clientName: z.string().describe('Kundnamn'),
            amount: z.number().describe('Fakturabelopp'),
            description: z.string().describe('Beskrivning av tjänster/produkter'),
            dueDate: z.string().optional().describe('Förfallodatum (YYYY-MM-DD)'),
          }),
          execute: async ({ clientName, amount, description, dueDate }) => {
            try {
              const invoiceNumber = `INV-${Date.now()}`;
              
              // Here you could save to Supabase
              // const { data, error } = await supabase.from('invoices').insert({...})
              
              return {
                success: true,
                invoiceNumber,
                clientName,
                amount,
                description,
                dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                message: `Faktura ${invoiceNumber} skapad för ${clientName} - ${amount} SEK`
              };
            } catch (error) {
              return {
                success: false,
                error: 'Kunde inte skapa faktura',
                details: error instanceof Error ? error.message : 'Okänt fel'
              };
            }
          },
        }),

        // Get financial overview
        getFinancialOverview: tool({
          description: 'Hämta finansiell översikt och statistik',
          inputSchema: z.object({
            period: z.enum(['week', 'month', 'quarter', 'year']).describe('Tidsperiod för översikt'),
          }),
          execute: async ({ period }) => {
            try {
              // Here you could query Supabase for real data
              return {
                period,
                totalInvoices: 6,
                totalRevenue: 450000,
                outstandingAmount: 125000,
                overdueAmount: 50000,
                insights: [
                  '📊 6 fakturor denna månad',
                  '💰 450,000 SEK i omsättning',
                  '⚠️ 50,000 SEK försenade betalningar'
                ]
              };
            } catch (error) {
              return {
                error: 'Kunde inte hämta finansiell översikt',
                details: error instanceof Error ? error.message : 'Okänt fel'
              };
            }
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API: Error occurred:", error)
    return Response.json(
      {
        error: "Failed to process message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
