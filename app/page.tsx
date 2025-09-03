"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Send, TrendingUp, DollarSign, FileText, Calculator } from "lucide-react"

interface Message {
  id: string
  content: string
  sender: "user" | "cfo"
  timestamp: Date
  agentAction?: {
    agent: string
    action: string
    status: "processing" | "completed"
    result?: any
  }
}

export default function CFOPlatform() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hello! I'm your AI CFO. I can help you with bookkeeping, invoicing, financial reporting, and strategic insights. What would you like to work on today?",
      sender: "cfo",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [agentStatuses, setAgentStatuses] = useState<
    Array<{ name: string; isActive: boolean; capabilities: string[] }>
  >([
    { name: "Bookkeeping Agent", isActive: true, capabilities: ["Transaction categorization", "Expense tracking"] },
    { name: "Invoicing Agent", isActive: true, capabilities: ["Invoice generation", "Payment tracking"] },
    { name: "Reporting Agent", isActive: true, capabilities: ["Financial reports", "Analytics"] },
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = inputValue
    setInputValue("")
    setIsProcessing(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: currentInput }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response from CFO")
      }

      const data = await response.json()

      const cfoMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        sender: "cfo",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, cfoMessage])

      if (data.agentActivities && data.agentActivities.length > 0) {
        data.agentActivities.forEach((activity: any, index: number) => {
          setTimeout(
            () => {
              const actionMessage: Message = {
                id: `${Date.now() + index + 2}`,
                content: `${activity.agent}: ${activity.action}`,
                sender: "cfo",
                timestamp: new Date(),
                agentAction: {
                  agent: activity.agent,
                  action: activity.action,
                  status: activity.status === "completed" ? "completed" : "processing",
                  result: activity.result,
                },
              }
              setMessages((prev) => [...prev, actionMessage])
            },
            (index + 1) * 800,
          )
        })
      }

      if (data.insights && data.insights.length > 0) {
        setTimeout(
          () => {
            const insightsMessage: Message = {
              id: `${Date.now() + 100}`,
              content: "Key insights: " + data.insights.join(". "),
              sender: "cfo",
              timestamp: new Date(),
            }
            setMessages((prev) => [...prev, insightsMessage])
          },
          (data.agentActivities?.length || 0) * 800 + 1000,
        )
      }
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I encountered an issue processing your request. Please try again.",
        sender: "cfo",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  const quickActions = [
    { icon: Calculator, label: "Categorize recent transactions", action: "categorize" },
    { icon: FileText, label: "Show invoice status", action: "invoices" },
    { icon: TrendingUp, label: "Generate financial report", action: "report" },
    { icon: DollarSign, label: "Analyze cash flow", action: "cashflow" },
  ]

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="flex-shrink-0 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <DollarSign className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">AI CFO Platform</h1>
                <p className="text-xs text-muted-foreground font-medium">Your intelligent financial orchestrator</p>
              </div>
            </div>
            <Badge
              variant="secondary"
              className="bg-accent/10 text-accent border-accent/20 px-3 py-1 font-semibold text-xs"
            >
              ● Connected
            </Badge>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 flex-shrink-0 border-r border-border/50 bg-card/30 backdrop-blur-sm">
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-border/50">
              <h3 className="font-bold text-foreground mb-4 text-base">Quick Actions</h3>
              <div className="space-y-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.action}
                    variant="ghost"
                    className="w-full justify-start gap-3 h-auto p-3 rounded-lg hover:bg-accent/10 hover:text-accent transition-all duration-200"
                    onClick={() => setInputValue(action.label)}
                  >
                    {action.icon && <action.icon className="w-4 h-4 text-accent" />}
                    <span className="text-sm font-medium">{action.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex-1 p-6">
              <h4 className="font-bold text-foreground mb-4 text-base">Active Agents</h4>
              <div className="space-y-3">
                {agentStatuses.map((agent) => (
                  <div key={agent.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
                    <div
                      className={`w-2 h-2 rounded-full ${agent.isActive ? "bg-accent animate-pulse shadow-sm" : "bg-muted-foreground/50"}`}
                    ></div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-foreground block">{agent.name}</span>
                      <span className="text-xs text-muted-foreground">{agent.capabilities.join(", ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-background min-h-0">
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-4 ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {message.sender === "cfo" && (
                        <Avatar className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 shadow-sm flex-shrink-0">
                          <AvatarFallback className="bg-transparent text-primary-foreground text-sm font-bold">
                            CFO
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className={`max-w-[75%] ${message.sender === "user" ? "order-first" : ""}`}>
                        <div
                          className={`rounded-2xl px-5 py-4 shadow-sm ${
                            message.sender === "user"
                              ? "bg-primary text-primary-foreground ml-auto"
                              : "bg-card/80 text-foreground border border-border/50 backdrop-blur-sm"
                          }`}
                        >
                          <p className="text-sm leading-relaxed font-medium">{message.content}</p>
                        </div>

                        {message.agentAction && (
                          <div className="mt-3 p-4 bg-accent/5 border border-accent/20 rounded-xl backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-2 h-2 rounded-full ${message.agentAction.status === "completed" ? "bg-green-500" : "bg-accent animate-pulse"}`}
                              ></div>
                              <span className="text-sm font-bold text-accent">{message.agentAction.agent}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2 font-medium">
                              {message.agentAction.action}
                            </p>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground mt-2 font-medium">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>

                      {message.sender === "user" && (
                        <Avatar className="w-10 h-10 bg-secondary shadow-sm flex-shrink-0">
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-bold">
                            You
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </ScrollArea>
          </div>

          <div className="flex-shrink-0 border-t border-border/50 bg-card/50 backdrop-blur-xl">
            <div className="max-w-4xl mx-auto p-6">
              <div className="flex gap-4">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask your CFO anything about your finances..."
                  className="flex-1 h-12 px-4 rounded-xl border-border/50 bg-background/80 backdrop-blur-sm font-medium placeholder:text-muted-foreground/70"
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  disabled={isProcessing}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isProcessing || !inputValue.trim()}
                  size="icon"
                  className="h-12 w-12 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3 font-medium text-center">
                Your CFO orchestrates specialized agents for bookkeeping, invoicing, and reporting
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
