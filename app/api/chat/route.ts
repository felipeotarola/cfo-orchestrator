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
      if (!message.id) {
        // Allow messages without IDs (they get auto-generated)
        return true;
      }
      if (seenIds.has(message.id)) {
        console.log(`Filtered duplicate message with ID: ${message.id}`);
        return false;
      }
      seenIds.add(message.id);
      return true;
    });

    console.log('Processing messages:', messages.length);

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

    // Initialize CFO Orchestrator
    const cfoOrchestrator = new CFOOrchestrator(supabase)

    // Get current date for system context
    const currentDate = new Date().toLocaleDateString('sv-SE', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    });

    // Add system message with context (only if not already present)
    const systemMessageId = `system-cfo-context`;
    const hasSystemMessage = messages.some((msg: any) => msg.id === systemMessageId);
    
    if (!hasSystemMessage) {
      messages.unshift({
        id: systemMessageId,
        role: 'system',
        content: `Du är en AI CFO-assistent för svenska företag. Dagens datum: ${currentDate}

Du har tillgång till specialiserade agenter och verktyg för:
- Bokföring och transaktionskategorisering
- Fakturering och betalningsuppföljning
- Finansiell rapportering och analys
- Kvittoskanning och utgiftshantering

När användare ställer en fråga som rör finansiell data eller en specifik uppgift:
1. Använd omedelbart verktyget processWithCFOOrchestrator för att hämta eller manipulera data innan du svarar
2. Delegera till lämpliga agenter när det behövs
3. Ge konkreta, handlingsbara råd baserat på verklig data

Svara alltid på svenska och fokusera på affärsnytta och konkreta rekommendationer.`
      });
    }

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
      maxSteps: 2,
      tools: {
        // Use CFO Orchestrator for complex requests
        processWithCFOOrchestrator: tool({
          description: 'Hantera komplexa finansiella förfrågningar genom att koordinera med specialiserade agenter',
          inputSchema: z.object({
            userRequest: z.string().describe('Användarens fullständiga förfrågan'),
            requestType: z.enum(['query', 'action', 'analysis']).describe('Typ av förfrågan'),
          }),
          execute: async ({ userRequest, requestType }) => {
            try {
              const result = await cfoOrchestrator.processMessage(userRequest);
              return {
                success: true,
                response: result.response,
                agentActivities: result.agentActivities,
                insights: result.insights,
                type: requestType
              };
            } catch (error) {
              console.error('CFO Orchestrator error:', error);
              return {
                success: false,
                error: 'Kunde inte behandla förfrågan med CFO-systemet',
                details: error instanceof Error ? error.message : 'Okänt fel'
              };
            }
          },
        }),

        // Get financial overview - direct database access for common queries
        getFinancialOverview: tool({
          description: 'Hämta finansiell översikt och statistik direkt från databasen',
          inputSchema: z.object({
            period: z.enum(['week', 'month', 'quarter', 'year']).describe('Tidsperiod för översikt'),
            includeDetails: z.boolean().optional().describe('Om detaljerad information ska inkluderas'),
          }),
          execute: async ({ period, includeDetails = false }) => {
            try {
              // Get real data from Supabase
              const [invoicesResult, receiptsResult, transactionsResult] = await Promise.all([
                supabase.from('invoices').select('*'),
                supabase.from('receipts').select('*'),
                supabase.from('transactions').select('*')
              ]);

              if (invoicesResult.error) throw invoicesResult.error;
              if (receiptsResult.error) throw receiptsResult.error;
              if (transactionsResult.error) throw transactionsResult.error;

              const invoices = invoicesResult.data || [];
              const receipts = receiptsResult.data || [];
              const transactions = transactionsResult.data || [];

              // Calculate totals
              const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
              const outstandingAmount = invoices
                .filter(inv => inv.status === 'pending')
                .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
              const overdueAmount = invoices
                .filter(inv => inv.status === 'pending' && new Date(inv.due_date) < new Date())
                .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

              const totalExpenses = receipts.reduce((sum, receipt) => sum + Number(receipt.amount || 0), 0);

              const result: any = {
                period,
                totalInvoices: invoices.length,
                totalRevenue: totalRevenue,
                outstandingAmount: outstandingAmount,
                overdueAmount: overdueAmount,
                totalExpenses: totalExpenses,
                totalReceipts: receipts.length,
                totalTransactions: transactions.length,
                insights: [
                  `📊 ${invoices.length} fakturor totalt`,
                  `💰 ${totalRevenue.toLocaleString('sv-SE')} SEK i omsättning`,
                  `⚠️ ${overdueAmount.toLocaleString('sv-SE')} SEK försenade betalningar`,
                  `🧾 ${receipts.length} kvitton registrerade`,
                  `💸 ${totalExpenses.toLocaleString('sv-SE')} SEK i utgifter`
                ]
              };

              if (includeDetails) {
                result.invoiceDetails = invoices.slice(0, 5).map(inv => ({
                  number: inv.invoice_number,
                  amount: inv.total_amount,
                  status: inv.status,
                  dueDate: inv.due_date
                }));
                result.recentReceipts = receipts.slice(0, 5).map(rec => ({
                  vendor: rec.vendor_name,
                  amount: rec.amount,
                  date: rec.receipt_date,
                  category: rec.category
                }));
              }

              return result;
            } catch (error) {
              console.error('Error fetching financial overview:', error);
              return {
                error: 'Kunde inte hämta finansiell översikt',
                details: error instanceof Error ? error.message : 'Okänt fel'
              };
            }
          },
        }),

        // List recent transactions - direct database access
        getRecentTransactions: tool({
          description: 'Hämta senaste transaktioner och finansiella händelser från databasen',
          inputSchema: z.object({
            limit: z.number().optional().describe('Antal transaktioner att hämta (standard: 10)'),
            type: z.enum(['all', 'invoices', 'receipts', 'transactions']).optional().describe('Typ av transaktioner'),
          }),
          execute: async ({ limit = 10, type = 'all' }) => {
            try {
              let results = [];

              if (type === 'all' || type === 'invoices') {
                const { data: invoices, error: invoicesError } = await supabase
                  .from('invoices')
                  .select('*, clients(name)')
                  .order('created_at', { ascending: false })
                  .limit(limit);

                if (!invoicesError && invoices) {
                  results.push(...invoices.map(inv => ({
                    type: 'invoice',
                    id: inv.invoice_number,
                    amount: inv.total_amount,
                    description: `Faktura till ${inv.clients?.name || 'Okänd kund'}`,
                    date: inv.issue_date,
                    status: inv.status
                  })));
                }
              }

              if (type === 'all' || type === 'receipts') {
                const { data: receipts, error: receiptsError } = await supabase
                  .from('receipts')
                  .select('*')
                  .order('created_at', { ascending: false })
                  .limit(limit);

                if (!receiptsError && receipts) {
                  results.push(...receipts.map(rec => ({
                    type: 'receipt',
                    id: rec.receipt_number,
                    amount: -rec.amount, // Negative for expenses
                    description: `Utgift hos ${rec.vendor_name}`,
                    date: rec.receipt_date,
                    status: rec.status,
                    category: rec.category
                  })));
                }
              }

              // Sort by date
              results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              results = results.slice(0, limit);

              return {
                success: true,
                transactions: results,
                summary: `Hämtade ${results.length} senaste transaktioner`,
                totalAmount: results.reduce((sum, t) => sum + Number(t.amount), 0)
              };
            } catch (error) {
              console.error('Error fetching transactions:', error);
              return {
                success: false,
                error: 'Kunde inte hämta transaktioner',
                details: error instanceof Error ? error.message : 'Okänt fel'
              };
            }
          },
        }),

        // Create invoice - database action
        createInvoice: tool({
          description: 'Skapa en ny faktura i systemet',
          inputSchema: z.object({
            clientName: z.string().describe('Kundnamn'),
            clientEmail: z.string().optional().describe('Kundens e-post'),
            amount: z.number().describe('Fakturabelopp (exkl. moms)'),
            description: z.string().describe('Beskrivning av tjänster/produkter'),
            dueDate: z.string().optional().describe('Förfallodatum (YYYY-MM-DD)'),
          }),
          execute: async ({ clientName, clientEmail, amount, description, dueDate }) => {
            try {
              const invoiceNumber = `INV-${Date.now()}`;
              const issueDate = new Date().toISOString().split('T')[0];
              const calculatedDueDate = dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
              
              // First, check if client exists or create new one
              const { data: existingClient } = await supabase
                .from('clients')
                .select('id')
                .eq('name', clientName)
                .single();

              let clientId = existingClient?.id;

              if (!clientId && clientEmail) {
                // Create new client
                const { data: newClient, error: clientError } = await supabase
                  .from('clients')
                  .insert({
                    name: clientName,
                    email: clientEmail,
                  })
                  .select('id')
                  .single();

                if (clientError) throw clientError;
                clientId = newClient.id;
              }

              // Create invoice
              const { data: invoice, error: invoiceError } = await supabase
                .from('invoices')
                .insert({
                  invoice_number: invoiceNumber,
                  client_id: clientId,
                  issue_date: issueDate,
                  due_date: calculatedDueDate,
                  subtotal: amount,
                  tax_amount: amount * 0.25, // 25% VAT
                  total_amount: amount * 1.25,
                  status: 'pending',
                  notes: description,
                })
                .select()
                .single();

              if (invoiceError) throw invoiceError;

              return {
                success: true,
                invoiceNumber,
                clientName,
                amount: amount * 1.25,
                description,
                dueDate: calculatedDueDate,
                message: `Faktura ${invoiceNumber} skapad för ${clientName} - ${(amount * 1.25).toLocaleString('sv-SE')} SEK (inkl. moms)`
              };
            } catch (error) {
              console.error('Error creating invoice:', error);
              return {
                success: false,
                error: 'Kunde inte skapa faktura',
                details: error instanceof Error ? error.message : 'Okänt fel'
              };
            }
          },
        }),

        // Create receipt/expense
        createReceipt: tool({
          description: 'Registrera ett kvitto eller en utgift i systemet',
          inputSchema: z.object({
            vendorName: z.string().describe('Leverantörens namn'),
            amount: z.number().describe('Beloppet'),
            description: z.string().describe('Beskrivning av köpet'),
            category: z.string().optional().describe('Kategori för utgiften'),
            receiptDate: z.string().optional().describe('Kvittodatum (YYYY-MM-DD)'),
          }),
          execute: async ({ vendorName, amount, description, category, receiptDate }) => {
            try {
              const receiptNumber = `REC-${Date.now()}`;
              const date = receiptDate || new Date().toISOString().split('T')[0];
              
              const { data: receipt, error } = await supabase
                .from('receipts')
                .insert({
                  receipt_number: receiptNumber,
                  vendor_name: vendorName,
                  amount: amount,
                  receipt_date: date,
                  category: category || 'Allmänna utgifter',
                  description: description,
                  currency: 'SEK',
                  tax_amount: amount * 0.2, // Estimate 20% VAT
                  status: 'pending',
                })
                .select()
                .single();

              if (error) throw error;

              return {
                success: true,
                receiptNumber,
                vendorName,
                amount,
                description,
                category: category || 'Allmänna utgifter',
                message: `Kvitto ${receiptNumber} registrerat för ${vendorName} - ${amount.toLocaleString('sv-SE')} SEK`
              };
            } catch (error) {
              console.error('Error creating receipt:', error);
              return {
                success: false,
                error: 'Kunde inte registrera kvitto',
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
