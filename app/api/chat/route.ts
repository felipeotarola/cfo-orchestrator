import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { type NextRequest, NextResponse } from "next/server"
import { CFOOrchestrator } from "@/lib/agents/orchestrator"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Chat API: Starting request processing")
    const { message } = await request.json()
    console.log("[v0] Chat API: Received message:", message)

    if (!message) {
      console.log("[v0] Chat API: No message provided")
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("[v0] Chat API: Missing OPENAI_API_KEY environment variable")
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    // Initialize Supabase client with better error handling
    let supabase
    try {
      console.log("[v0] Chat API: Initializing Supabase client")
      supabase = await createServerSupabaseClient()
      console.log("[v0] Chat API: Supabase client initialized successfully")
    } catch (error) {
      console.error("[v0] Chat API: Supabase initialization error:", error)
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    // Initialize CFO Orchestrator with database access
    console.log("[v0] Chat API: Initializing CFO Orchestrator")
    const orchestrator = new CFOOrchestrator(supabase)

    // Process the message through the orchestrator
    console.log("[v0] Chat API: Processing message through orchestrator")
    const orchestrationResult = await orchestrator.processMessage(message)
    console.log("[v0] Chat API: Orchestration result:", JSON.stringify(orchestrationResult, null, 2))

    // Generate AI response using OpenAI
    const { text } = await generateText({
      model: openai("gpt-4o"),
      system: `You are an AI CFO assistant. You have access to specialized agents for bookkeeping, invoicing, and reporting.
      
      Based on the orchestration result, provide a natural, conversational response that:
      1. Acknowledges what the user asked for
      2. If an invoice was created, confirm it with details (invoice number, client, amount)
      3. Summarizes the key findings from the agents
      4. Provides actionable insights and recommendations
      5. Maintains a professional but friendly CFO tone
      
      If the user requested invoice creation and it was successful, start your response with confirmation like:
      "Great! I've successfully created invoice #[number] for [client] in the amount of [amount] SEK."
      
      Agent Results: ${JSON.stringify(orchestrationResult, null, 2)}
      
      Keep responses concise but comprehensive. Focus on business value and actionable insights.`,
      prompt: `User message: "${message}"
      
      Please provide a CFO-level response based on the agent analysis above.`,
    })

    console.log("[v0] Chat API: Generated AI response:", text)

    const response = {
      response: text,
      agentActivities: orchestrationResult.agentActivities,
      insights: orchestrationResult.insights,
    }

    console.log("[v0] Chat API: Sending response:", JSON.stringify(response, null, 2))
    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Chat API: Error occurred:", error)
    return NextResponse.json(
      {
        error: "Failed to process message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
