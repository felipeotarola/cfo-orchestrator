import { convertToModelMessages, streamText } from 'ai';
import { NextRequest } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { CFOOrchestrator } from '@/lib/agents/orchestrator';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { messages, selectedChatModel = 'gpt-4o', selectedVisibilityType = 'private' } = await request.json();

    // Get the latest user message
    const latestMessage = messages[messages.length - 1];
    const userMessage = latestMessage?.parts?.[0]?.text || latestMessage?.content || '';

    // Check if there are any uploaded files in the message
    const hasParts = latestMessage?.parts && Array.isArray(latestMessage.parts);
    const hasImages = hasParts && latestMessage.parts.some((part: any) => part.type === 'image');
    
    // Initialize Supabase client and CFO orchestrator
    const supabase = await createServerSupabaseClient();
    const orchestrator = new CFOOrchestrator(supabase);

    // Process the message with the orchestrator to get database insights
    let agentResponse: string | null = null;
    let agentInsights: string[] = [];
    
    try {
      const agentResult = await orchestrator.processMessage(userMessage);
      agentResponse = agentResult.response;
      agentInsights = agentResult.insights;
    } catch (error) {
      console.error('Agent processing error:', error);
      // Continue with basic AI response if agent processing fails
    }

    // Prepare enhanced system prompt with agent context
    let systemPrompt = `Du är en erfaren CFO (Chief Financial Officer) AI-assistent som specialiserar sig på svensk företagsekonomi. 

Du hjälper med:
- Fakturering och kundreskontra
- Utgiftshantering och kvitton
- Finansiell analys och rapportering
- Kassaflödesplanering
- Budgetering och prognoser
- Efterlevnad av svenska redovisningsregler

Du har tillgång till en databas med verklig finansiell data och specialiserade agenter som kan:
- Skapa och hantera fakturor
- Registrera och godkänna kvitton
- Analysera finansiella transaktioner
- Generera rapporter och insikter`;

    if (agentInsights.length > 0) {
      systemPrompt += `\n\nBaserat på den senaste databasanalysen:\n${agentInsights.join('\n')}`;
    }

    if (hasImages) {
      systemPrompt += `\n\nAnvändaren har laddat upp bilder. Analysera bilderna noggrant för att:
- Identifiera kvitton, fakturor eller andra finansiella dokument
- Extrahera viktiga data som belopp, datum, leverantör, kategori
- Föreslå registrering i rätt kategori
- Hjälpa med bokföring och redovisning av transaktionen`;
    }

    systemPrompt += `\n\nKommunicera alltid på svenska och var professionell men tillgänglig. Ge konkreta, handlingsbara råd baserat på svenska företagsekonomiska best practices och den verkliga datan från databasen.`;

    // Use GPT-4o for image analysis if images are present, otherwise use the cheaper model
    const modelToUse = hasImages ? 'gpt-4o' : selectedChatModel;

    const result = await streamText({
      model: openai(modelToUse),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}