"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Send, TrendingUp, DollarSign, FileText, Calculator, Paperclip, X, Image, FileType } from "lucide-react"
import NextImage from 'next/image'

// Convert files to data URLs for AI SDK v5
async function convertFilesToDataURLs(files: FileList) {
  return Promise.all(
    Array.from(files).map(
      file =>
        new Promise<{
          type: 'file';
          mediaType: string;
          url: string;
        }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              type: 'file',
              mediaType: file.type,
              url: reader.result as string,
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }),
    ),
  );
}

export default function CFOPlatform() {
  const [input, setInput] = useState("")
  const [files, setFiles] = useState<FileList | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { messages, sendMessage, isLoading } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    initialMessages: [
      {
        id: "1",
        role: "assistant",
        parts: [
          { type: 'text', text: "Hello! I'm your AI CFO. I can help you with bookkeeping, invoicing, financial reporting, and strategic insights. What would you like to work on today?" }
        ],
      },
    ],
  })

  const [agentStatuses] = useState<
    Array<{ name: string; isActive: boolean; capabilities: string[] }>
  >([
    { name: "Bookkeeping Agent", isActive: true, capabilities: ["Transaction categorization", "Expense tracking"] },
    { name: "Invoicing Agent", isActive: true, capabilities: ["Invoice generation", "Payment tracking"] },
    { name: "Reporting Agent", isActive: true, capabilities: ["Financial reports", "Analytics"] },
    { name: "Receipts Agent", isActive: true, capabilities: ["Receipt scanning", "Expense management"] },
  ])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const quickActions = [
    { label: "Upload receipt", action: "upload_receipt", icon: Paperclip },
    { label: "Create new invoice", action: "create_invoice", icon: FileText },
    { label: "Generate financial report", action: "generate_report", icon: TrendingUp },
    { label: "Record expense", action: "record_expense", icon: Calculator },
  ]

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const removeFile = (index: number) => {
    if (!files) return
    const dt = new DataTransfer()
    Array.from(files).forEach((file, i) => {
      if (i !== index) dt.items.add(file)
    })
    setFiles(dt.files.length > 0 ? dt.files : undefined)
    if (fileInputRef.current) {
      fileInputRef.current.files = dt.files
    }
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const fileParts = files && files.length > 0 ? await convertFilesToDataURLs(files) : []

    await sendMessage({
      role: 'user',
      parts: [
        { type: 'text', text: input },
        ...fileParts,
      ],
    })

    setInput('')
    setFiles(undefined)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

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
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => window.open('/dashboard', '_blank')}
              >
                📊 Dashboard
              </Button>
              <Badge
                variant="secondary"
                className="bg-accent/10 text-accent border-accent/20 px-3 py-1 font-semibold text-xs"
              >
                ● Connected
              </Badge>
            </div>
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
                    onClick={() => setInput(action.label)}
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
                      className={`w-2 h-2 rounded-full ${
                        agent.isActive ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{agent.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {agent.capabilities.join(", ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <Avatar className="w-8 h-8 shadow-md">
                    <AvatarFallback
                      className={`text-xs font-bold ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent text-accent-foreground"
                      }`}
                    >
                      {message.role === "user" ? "U" : "AI"}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`flex-1 rounded-xl p-4 shadow-sm border ${
                      message.role === "user"
                        ? "bg-primary/10 border-primary/20 ml-12"
                        : "bg-card border-border/50 mr-12"
                    }`}
                  >
                    <div className="prose prose-sm max-w-none">
                      {/* Handle different content types */}
                      {typeof message.content === 'string' ? (
                        <p className="text-sm text-foreground whitespace-pre-wrap m-0">
                          {message.content}
                        </p>
                      ) : (
                        message.parts?.map((part: any, index: number) => {
                          if (part.type === 'text') {
                            return (
                              <p key={index} className="text-sm text-foreground whitespace-pre-wrap m-0">
                                {part.text}
                              </p>
                            )
                          }
                          if (part.type === 'file' && part.mediaType?.startsWith('image/')) {
                            return (
                              <div key={index} className="mt-2">
                                <NextImage
                                  src={part.url}
                                  width={300}
                                  height={200}
                                  alt="uploaded image"
                                  className="rounded-lg border"
                                />
                              </div>
                            )
                          }
                          if (part.type === 'file' && part.mediaType === 'application/pdf') {
                            return (
                              <div key={index} className="mt-2 p-2 bg-gray-100 rounded">
                                <p className="text-sm">📄 PDF Document</p>
                              </div>
                            )
                          }
                          return null
                        })
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-4">
                  <Avatar className="w-8 h-8 shadow-md">
                    <AvatarFallback className="bg-accent text-accent-foreground text-xs font-bold">
                      AI
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 rounded-xl p-4 shadow-sm border bg-card border-border/50 mr-12">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-accent rounded-full animate-pulse delay-75"></div>
                      <div className="w-2 h-2 bg-accent rounded-full animate-pulse delay-150"></div>
                      <span className="text-sm text-muted-foreground ml-2">AI CFO is analyzing...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="flex-shrink-0 p-6 border-t border-border/50 bg-card/50 backdrop-blur-sm">
            {files && files.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {Array.from(files).map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-accent/10 text-accent rounded-lg px-3 py-2 text-sm border border-accent/20"
                  >
                    {file.type.startsWith('image/') ? (
                      <Image className="w-4 h-4" />
                    ) : (
                      <FileType className="w-4 h-4" />
                    )}
                    <span className="font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">({formatFileSize(file.size)})</span>
                    <button
                      onClick={() => removeFile(index)}
                      className="ml-1 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="flex gap-3">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  ref={fileInputRef}
                  onChange={(e) => setFiles(e.target.files || undefined)}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-xs"
                >
                  <Paperclip className="w-4 h-4" />
                  Attach
                </Button>
              </div>
              
              <div className="flex gap-3">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask your AI CFO anything about your finances..."
                  className="flex-1 bg-background/80 backdrop-blur-sm border-border/50 focus:border-accent/50 focus:ring-accent/20"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  disabled={(!input.trim() && !files?.length) || isLoading}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground px-6"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
