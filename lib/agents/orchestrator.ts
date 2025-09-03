import type { Agent, AgentTask, CFORequest } from "./types"
import { BookkeepingAgent } from "./bookkeeping-agent"
import { InvoicingAgent } from "./invoicing-agent"
import { ReportingAgent } from "./reporting-agent"
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
    const reportingAgent = new ReportingAgent(this.supabase)

    this.registerAgent(bookkeepingAgent)
    this.registerAgent(invoicingAgent)
    this.registerAgent(reportingAgent)
  }

  registerAgent(agent: Agent) {
    this.agents.set(agent.name, agent)
  }

  async processMessage(userMessage: string): Promise<{
    response: string
    agentActivities: Array<{ agent: string; action: string; status: string; result?: any }>
    insights: string[]
  }> {
    const request = this.analyzeUserIntent(userMessage)
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
            result: result.data,
          })

          if (result.success && result.insights) {
            insights.push(...result.insights)
          }
        } catch (error) {
          agentActivities.push({
            agent: agent.name,
            action: task.description,
            status: "failed",
            result: { error: error.message },
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

  private analyzeUserIntent(userMessage: string): CFORequest {
    const message = userMessage.toLowerCase()

    // Simple intent recognition (in production, this would use NLP)
    let intent = "general"
    const requiredAgents: string[] = []
    const entities: Record<string, any> = {}

    if (message.includes("transaction") || message.includes("expense") || message.includes("categorize")) {
      intent = "bookkeeping"
      requiredAgents.push("Bookkeeping Agent")
    }

    if (message.includes("invoice") || message.includes("bill") || message.includes("payment")) {
      intent = "invoicing"
      requiredAgents.push("Invoicing Agent")
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
    }
  }

  private generateTaskDescription(request: CFORequest, agentType: string): string {
    const descriptions = {
      bookkeeping: `Analyzing ${request.intent} request: "${request.userMessage}"`,
      invoicing: `Processing invoice-related request: "${request.userMessage}"`,
      reporting: `Generating financial insights for: "${request.userMessage}"`,
    }

    return descriptions[agentType] || `Processing ${agentType} task`
  }

  private generateCFOResponse(request: CFORequest, agentActions: any[]): string {
    const responses = {
      bookkeeping: "I've analyzed your bookkeeping data and found some key insights.",
      invoicing: "I've reviewed your invoicing and payment information.",
      reporting: "I've generated comprehensive financial reports and analysis.",
      analysis: "I've performed a detailed financial analysis across multiple areas.",
      general: "I've coordinated with my specialized agents to address your request.",
    }

    return responses[request.intent] || responses.general
  }

  private generateSuggestions(request: CFORequest): string[] {
    const suggestions = {
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
