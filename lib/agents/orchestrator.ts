import type { Agent, AgentTask, CFORequest } from "./types"
import { BookkeepingAgent } from "./bookkeeping-agent"
import { InvoicingAgent } from "./invoicing-agent"
import { ReportingAgent } from "./reporting-agent"
import { ReceiptsAgent } from "./receipts-agent"
import type { SupabaseClient } from "@supabase/supabase-js"

export class CFOOrchestrator {
  private agents: Map<string, Agent> = new Map()
  private activeTasks: Map<string, AgentTask> = new Map()
  private supabase: SupabaseClient

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient
    this.initializeAgents()
  }

  private initializeAgents() {
    const bookkeepingAgent = new BookkeepingAgent(this.supabase)
    const invoicingAgent = new InvoicingAgent(this.supabase)
    const reportingAgent = new ReportingAgent()
    const receiptsAgent = new ReceiptsAgent(this.supabase)

    this.registerAgent(bookkeepingAgent)
    this.registerAgent(invoicingAgent)
    this.registerAgent(reportingAgent)
    this.registerAgent(receiptsAgent)
  }

  registerAgent(agent: Agent) {
    this.agents.set(agent.name, agent)
  }

  async processMessage(userMessage: string): Promise<{
    response: string
    agentActivities: Array<{ agent: string; action: string; status: string; result?: any }>
    insights: string[]
  }> {
    const request = await this.analyzeUserIntent(userMessage)
    const agentActivities = []
    const insights = []

    // Process tasks with real agents
    for (const agentName of request.requiredAgents) {
      const agent = this.agents.get(agentName)
      if (agent && agent.isActive) {
        const task: AgentTask = {
          id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: agent.type,
          description: this.generateTaskDescription(request, agent.type),
          input: { userMessage, ...request.entities },
          status: "processing",
          createdAt: new Date(),
        }

        try {
          const result = await agent.processTask(task)

          agentActivities.push({
            agent: agent.name,
            action: task.description,
            status: result.success ? "completed" : "failed",
            result: result.success ? result.data : { error: result.message },
          })

          if (result.success && result.insights) {
            insights.push(...result.insights)
          }
        } catch (error) {
          agentActivities.push({
            agent: agent.name,
            action: task.description,
            status: "failed",
            result: { error: error instanceof Error ? error.message : String(error) },
          })
        }
      }
    }

    return {
      response: this.generateCFOResponse(request, agentActivities),
      agentActivities,
      insights,
    }
  }

  private async analyzeUserIntent(userMessage: string): Promise<CFORequest> {
    const { openai } = await import('@ai-sdk/openai')
    const { generateObject } = await import('ai')
    const { z } = await import('zod')

    try {
      const { object: analysis } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: z.object({
          intent: z.enum(['invoicing', 'bookkeeping', 'reporting', 'receipts', 'general']),
          requiredAgents: z.array(z.enum(['Invoicing Agent', 'Bookkeeping Agent', 'Reporting Agent', 'Receipts Agent'])),
          reasoning: z.string(),
          entities: z.object({
            clientName: z.string().optional(),
            amount: z.number().optional(),
            invoiceNumber: z.string().optional(),
            action: z.enum(['create', 'view', 'update', 'delete', 'analyze']).optional(),
          }),
          confidence: z.number().min(0).max(1),
        }),
        prompt: `Analyze this user message and determine what financial task they want to perform:
        "${userMessage}"

        Consider these patterns:
        - Invoicing: creating invoices, viewing invoices, payment tracking, client billing
        - Bookkeeping: expense categorization, transaction analysis, account reconciliation
        - Reporting: financial reports, summaries, insights, analytics
        - Receipts: receipt management, expense tracking, receipt photos, expense approval
        
        Look for:
        - Client names (like "Joakim", "Joakim Svensson")
        - Action words (create, show, view, generate, analyze, upload, scan)
        - Financial terms (invoice, payment, expense, report, receipt, kvitto)
        - Amounts or numbers (120000, SEK)
        
        Examples:
        - "create a new for him Joakim Svensson" → invoicing (create invoice for Joakim)
        - "show Joakim's invoices" → invoicing (view invoices)
        - "categorize expenses" → bookkeeping
        - "generate financial report" → reporting
        - "add a new receipt" → receipts (create receipt)
        - "upload receipt photo" → receipts (upload photo)`,
      })

      return {
        userMessage,
        intent: analysis.intent,
        entities: analysis.entities,
        requiredAgents: analysis.requiredAgents,
        reasoning: analysis.reasoning,
        confidence: analysis.confidence,
      }
    } catch (error) {
      console.log('AI intent analysis failed, falling back to keyword matching:', error)
      // Fallback to simple keyword matching if AI fails
      return this.fallbackIntentAnalysis(userMessage)
    }
  }

  private fallbackIntentAnalysis(userMessage: string): CFORequest {
    const message = userMessage.toLowerCase()

    // Simple intent recognition fallback
    let intent = "general"
    const requiredAgents: string[] = []
    const entities: Record<string, any> = {}

    if (message.includes("transaction") || message.includes("expense") || message.includes("categorize")) {
      intent = "bookkeeping"
      requiredAgents.push("Bookkeeping Agent")
    }

    if (message.includes("invoice") || message.includes("bill") || message.includes("payment") || message.includes("create") && (message.includes("joakim") || message.includes("client"))) {
      intent = "invoicing"
      requiredAgents.push("Invoicing Agent")
    }

    if (message.includes("receipt") || message.includes("kvitto") || message.includes("expense photo") || message.includes("upload photo") || message.includes("scan receipt")) {
      intent = "receipts"
      requiredAgents.push("Receipts Agent")
    }

    if (message.includes("report") || message.includes("analysis") || message.includes("summary")) {
      intent = "reporting"
      requiredAgents.push("Reporting Agent")
    }

    if (message.includes("cash flow") || message.includes("profit") || message.includes("revenue")) {
      intent = "analysis"
      requiredAgents.push("Reporting Agent", "Bookkeeping Agent")
    }

    // If no specific intent, default to bookkeeping for financial queries
    if (requiredAgents.length === 0) {
      requiredAgents.push("Bookkeeping Agent")
    }

    return {
      userMessage,
      intent,
      entities,
      requiredAgents,
      reasoning: "Fallback keyword matching",
      confidence: 0.5,
    }
  }

  private generateTaskDescription(request: CFORequest, agentType: string): string {
    const descriptions: Record<string, string> = {
      bookkeeping: `Analyzing ${request.intent} request: "${request.userMessage}"`,
      invoicing: `Processing invoice-related request: "${request.userMessage}"`,
      receipts: `Processing receipt-related request: "${request.userMessage}"`,
      reporting: `Generating financial insights for: "${request.userMessage}"`,
    }

    return descriptions[agentType] || `Processing ${agentType} task`
  }

  private generateCFOResponse(request: CFORequest, agentActions: any[]): string {
    const responses: Record<string, string> = {
      bookkeeping: "I've analyzed your bookkeeping data and found some key insights.",
      invoicing: "I've reviewed your invoicing and payment information.",
      receipts: "I've processed your receipt and expense information.",
      reporting: "I've generated comprehensive financial reports and analysis.",
      analysis: "I've performed a detailed financial analysis across multiple areas.",
      general: "I've coordinated with my specialized agents to address your request.",
    }

    return responses[request.intent] || responses.general
  }

  private generateSuggestions(request: CFORequest): string[] {
    const suggestions: Record<string, string[]> = {
      bookkeeping: [
        "Would you like me to categorize recent transactions?",
        "Should I flag any unusual expenses for review?",
        "Want to set up automatic categorization rules?",
      ],
      invoicing: [
        "Shall I create a recurring invoice template?",
        "Would you like payment reminders set up?",
        "Should I analyze payment patterns?",
      ],
      reporting: [
        "Want me to schedule monthly financial summaries?",
        "Should I create a cash flow forecast?",
        "Would you like tax preparation insights?",
      ],
    }

    return (
      suggestions[request.intent] || [
        "How else can I help with your financial management?",
        "Would you like me to provide more specific insights?",
      ]
    )
  }

  private async processAgentTask(agent: Agent, task: AgentTask) {
    try {
      // Simulate agent processing time
      await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 3000))

      const result = await agent.processTask(task)

      task.status = result.success ? "completed" : "failed"
      task.result = result
      task.completedAt = new Date()

      this.activeTasks.set(task.id, task)
    } catch (error) {
      task.status = "failed"
      task.completedAt = new Date()
      this.activeTasks.set(task.id, task)
    }
  }

  getActiveTasks(): AgentTask[] {
    return Array.from(this.activeTasks.values())
  }

  getAgentStatus(): Array<{ name: string; isActive: boolean; capabilities: string[] }> {
    return Array.from(this.agents.values()).map((agent) => ({
      name: agent.name,
      isActive: agent.isActive,
      capabilities: agent.capabilities,
    }))
  }
}

// Singleton instance
// export const cfoOrchestrator = new CFOOrchestrator()
