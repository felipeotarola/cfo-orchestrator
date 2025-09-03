export interface AgentTask {
  id: string
  type: "bookkeeping" | "invoicing" | "reporting" | "analysis"
  description: string
  input: any
  status: "pending" | "processing" | "completed" | "failed"
  result?: any
  createdAt: Date
  completedAt?: Date
}

export interface AgentResponse {
  success: boolean
  data?: any
  message: string
  suggestions?: string[]
  insights?: string[]
}

export interface Agent {
  name: string
  type: "bookkeeping" | "invoicing" | "reporting"
  capabilities: string[]
  isActive: boolean
  processTask(task: AgentTask): Promise<AgentResponse>
}

export interface CFORequest {
  userMessage: string
  intent: string
  entities: Record<string, any>
  requiredAgents: string[]
  reasoning?: string
  confidence?: number
}

export interface CFOResponse {
  message: string
  agentActions: Array<{
    agent: string
    action: string
    status: "processing" | "completed" | "failed"
    result?: any
  }>
  suggestions?: string[]
}
