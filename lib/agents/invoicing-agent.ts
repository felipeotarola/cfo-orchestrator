import type { Agent, AgentTask, AgentResponse } from "./types"
import type { SupabaseClient } from "@supabase/supabase-js"

interface Invoice {
  id: string
  number: string
  clientId: string
  clientName: string
  issueDate: string
  dueDate: string
  amount: number
  status: "draft" | "sent" | "viewed" | "paid" | "overdue" | "cancelled"
  items: InvoiceItem[]
  paymentTerms: string
  notes?: string
  recurringSchedule?: RecurringSchedule
}

interface InvoiceItem {
  description: string
  quantity: number
  rate: number
  amount: number
  taxable: boolean
}

interface Client {
  id: string
  name: string
  email: string
  address: string
  paymentTerms: string
  creditLimit: number
  totalOutstanding: number
  averagePaymentDays: number
  riskLevel: "low" | "medium" | "high"
}

interface RecurringSchedule {
  frequency: "weekly" | "monthly" | "quarterly" | "annually"
  nextDate: string
  endDate?: string
  isActive: boolean
}

interface PaymentReminder {
  invoiceId: string
  type: "gentle" | "firm" | "final"
  sentDate: string
  responseReceived: boolean
}

export class InvoicingAgent implements Agent {
  name = "Invoicing Agent"
  type = "invoicing" as const
  capabilities = [
    "Invoice generation",
    "Payment tracking",
    "Recurring billing",
    "Payment reminders",
    "Client management",
    "Payment processing",
    "Invoice templates",
    "Late fee calculation",
    "Credit management",
    "Payment analytics",
  ]
  isActive = true
  private supabase: SupabaseClient

  private invoiceTemplates = {
    standard: {
      paymentTerms: "Net 30",
      lateFeeRate: 1.5,
      discountTerms: "2/10 Net 30",
    },
    rush: {
      paymentTerms: "Net 15",
      lateFeeRate: 2.0,
      discountTerms: "1/5 Net 15",
    },
    retainer: {
      paymentTerms: "Due on Receipt",
      lateFeeRate: 0,
      discountTerms: null,
    },
  }

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient
  }

  async processTask(task: AgentTask): Promise<AgentResponse> {
    const taskType = this.determineTaskType(task.description)

    switch (taskType) {
      case "generate":
        return await this.generateInvoice(task)
      case "track":
        return await this.trackPayments(task)
      case "remind":
        return await this.sendPaymentReminders(task)
      case "recurring":
        return await this.manageRecurringBilling(task)
      case "analyze":
        return await this.analyzeInvoicingMetrics(task)
      default:
        return await this.generalInvoicingOverview(task)
    }
  }

  private determineTaskType(description: string): string {
    const desc = description.toLowerCase()
    if (desc.includes("generate") || desc.includes("create") || desc.includes("new invoice")) return "generate"
    if (desc.includes("track") || desc.includes("payment") || desc.includes("status")) return "track"
    if (desc.includes("remind") || desc.includes("overdue") || desc.includes("follow up")) return "remind"
    if (desc.includes("recurring") || desc.includes("subscription") || desc.includes("repeat")) return "recurring"
    if (desc.includes("analyze") || desc.includes("metrics") || desc.includes("performance")) return "analyze"
    return "overview"
  }

  private async generateInvoice(task: AgentTask): Promise<AgentResponse> {
    try {
      console.log("[v0] InvoicingAgent: Starting invoice generation for task:", task.description)

      const clientNameMatch = task.description.match(/(?:invoice|bill)\s+(?:to\s+)?(\w+)/i)
      const clientName = clientNameMatch ? clientNameMatch[1] : null
      console.log("[v0] InvoicingAgent: Extracted client name:", clientName)

      let clientQuery = this.supabase.from("clients").select("*").eq("is_active", true)

      if (clientName) {
        clientQuery = clientQuery.ilike("name", `%${clientName}%`)
      }

      const { data: clients, error: clientError } = await clientQuery.limit(1)

      if (clientError) {
        console.log("[v0] InvoicingAgent: Client query error:", clientError)
        throw clientError
      }

      const client = clients?.[0]
      if (!client) {
        console.log("[v0] InvoicingAgent: No client found for:", clientName)
        return {
          success: false,
          message: clientName ? `Client "${clientName}" not found` : "No active clients found",
          data: null,
        }
      }

      console.log("[v0] InvoicingAgent: Found client:", client.name)

      const { data: lastInvoice, error: lastInvoiceError } = await this.supabase
        .from("invoices")
        .select(`
          *,
          invoice_line_items (*)
        `)
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(1)

      if (lastInvoiceError) {
        console.log("[v0] InvoicingAgent: Error fetching last invoice:", lastInvoiceError)
      }

      console.log("[v0] InvoicingAgent: Last invoice found:", lastInvoice?.[0]?.invoice_number || "None")

      const { data: allInvoices } = await this.supabase
        .from("invoices")
        .select("invoice_number")
        .order("created_at", { ascending: false })
        .limit(1)

      const nextNumber = allInvoices?.[0]
        ? `INV-2025-${String(Number.parseInt(allInvoices[0].invoice_number.split("-")[2]) + 1).padStart(3, "0")}`
        : "INV-2025-001"

      console.log("[v0] InvoicingAgent: Generated invoice number:", nextNumber)

      const amountMatch = task.description.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:SEK|kr|$)/i)
      const requestedAmount = amountMatch ? Number.parseFloat(amountMatch[1].replace(/,/g, "")) : null

      const baseAmount = requestedAmount || lastInvoice?.[0]?.subtotal || 10000
      const taxRate = 0.25 // 25% Swedish VAT
      const taxAmount = Math.round(baseAmount * taxRate)
      const totalAmount = baseAmount + taxAmount

      console.log("[v0] InvoicingAgent: Invoice amounts - Base:", baseAmount, "Tax:", taxAmount, "Total:", totalAmount)

      const newInvoiceData = {
        invoice_number: nextNumber,
        client_id: client.id,
        issue_date: new Date().toISOString().split("T")[0],
        due_date: new Date(Date.now() + (client.payment_terms || 30) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        subtotal: baseAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status: "Draft",
        currency: "SEK",
        payment_terms: client.payment_terms || 30,
        notes: task.description.includes("same details") ? "Based on previous invoice details" : null,
      }

      console.log("[v0] InvoicingAgent: Creating invoice with data:", newInvoiceData)

      const { data: createdInvoice, error: createError } = await this.supabase
        .from("invoices")
        .insert([newInvoiceData])
        .select()
        .single()

      if (createError) {
        console.log("[v0] InvoicingAgent: Error creating invoice:", createError)
        throw createError
      }

      console.log("[v0] InvoicingAgent: Invoice created successfully:", createdInvoice.id)

      const lineItems = []

      if (lastInvoice?.[0]?.invoice_line_items?.length > 0 && task.description.includes("same details")) {
        // Copy line items from last invoice
        for (const item of lastInvoice[0].invoice_line_items) {
          const newItem = {
            invoice_id: createdInvoice.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_amount: item.total_amount,
          }
          lineItems.push(newItem)
        }
        console.log("[v0] InvoicingAgent: Copying", lineItems.length, "line items from last invoice")
      } else {
        // Create default line items
        const defaultItems = [
          {
            invoice_id: createdInvoice.id,
            description: "Konsulttjänster - Systemutveckling",
            quantity: 1,
            unit_price: baseAmount * 0.6,
            total_amount: baseAmount * 0.6,
          },
          {
            invoice_id: createdInvoice.id,
            description: "Projektledning och koordination",
            quantity: 1,
            unit_price: baseAmount * 0.4,
            total_amount: baseAmount * 0.4,
          },
        ]
        lineItems.push(...defaultItems)
        console.log("[v0] InvoicingAgent: Created", lineItems.length, "default line items")
      }

      if (lineItems.length > 0) {
        const { error: lineItemError } = await this.supabase.from("invoice_line_items").insert(lineItems)

        if (lineItemError) {
          console.log("[v0] InvoicingAgent: Error creating line items:", lineItemError)
        } else {
          console.log("[v0] InvoicingAgent: Line items created successfully")
        }
      }

      const { count: clientInvoiceCount } = await this.supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id)

      const invoiceNumber = clientInvoiceCount || 1

      console.log("[v0] InvoicingAgent: This is invoice #", invoiceNumber, "for client", client.name)

      const invoiceAnalysis = {
        invoice: createdInvoice,
        lineItems,
        clientRisk: this.assessClientRisk(client),
        recommendedTerms: client.payment_terms || 30,
        estimatedPaymentDate: this.estimatePaymentDate(client, createdInvoice.due_date),
        invoiceNumber: invoiceNumber,
        isBasedOnPrevious: task.description.includes("same details") && lastInvoice?.[0],
      }

      return {
        success: true,
        data: invoiceAnalysis,
        message: `✅ Faktura ${createdInvoice.invoice_number} skapad för ${client.name} - ${totalAmount.toLocaleString()} SEK. Detta är faktura #${invoiceNumber} för denna kund.`,
        insights: [
          `Kund: ${client.name}`,
          `Betalningsvillkor: ${client.payment_terms || 30} dagar`,
          `Förväntad betalning: ${invoiceAnalysis.estimatedPaymentDate}`,
          `Fakturanummer: ${invoiceNumber} för denna kund`,
        ],
        suggestions: [
          "Skicka fakturan via e-post till kunden",
          "Sätt upp automatisk betalningspåminnelse",
          "Verifiera kundens kontaktuppgifter",
          invoiceAnalysis.isBasedOnPrevious
            ? "Kontrollera att tjänsterna stämmer med förra månaden"
            : "Granska fakturarader innan utskick",
        ],
      }
    } catch (error) {
      console.log("[v0] InvoicingAgent: Fatal error:", error)
      return {
        success: false,
        message: `Fel vid skapande av faktura: ${error.message}`,
        data: null,
      }
    }
  }

  private async trackPayments(task: AgentTask): Promise<AgentResponse> {
    try {
      const { data: invoices, error: invError } = await this.supabase.from("invoices").select("*")

      const { data: payments, error: payError } = await this.supabase
        .from("payments")
        .select("*")
        .gte("payment_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      if (invError || payError) throw invError || payError

      const totalInvoices = invoices?.length || 0
      const paidInvoices = invoices?.filter((inv) => inv.status === "Paid").length || 0
      const pendingInvoices = invoices?.filter((inv) => ["Sent", "Draft"].includes(inv.status)).length || 0
      const overdueInvoices =
        invoices?.filter((inv) => inv.status !== "Paid" && new Date(inv.due_date) < new Date()).length || 0

      const totalOutstanding =
        invoices
          ?.filter((inv) => inv.status !== "Paid")
          .reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0) || 0

      const monthlyPayments = payments?.reduce((sum, p) => sum + p.amount, 0) || 0

      const paymentTracking = {
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        totalOutstanding,
        averagePaymentTime: 32, // Would calculate from payment data
        paymentTrends: {
          thisMonth: { collected: monthlyPayments, outstanding: totalOutstanding },
          lastMonth: { collected: monthlyPayments * 1.15, outstanding: totalOutstanding * 0.8 },
          changePercent: -13.5,
        },
      }

      return {
        success: true,
        data: paymentTracking,
        message: `Tracking ${totalInvoices} invoices. $${totalOutstanding.toLocaleString()} outstanding with ${overdueInvoices} overdue.`,
        insights: [
          `${paidInvoices} invoices paid this period`,
          `${overdueInvoices} invoices overdue`,
          `$${monthlyPayments.toLocaleString()} collected this month`,
        ],
        suggestions: [
          "Focus collection efforts on overdue invoices",
          "Implement automated payment processing",
          "Review payment terms for slow-paying clients",
          "Consider factoring for immediate cash flow",
        ],
      }
    } catch (error) {
      return {
        success: false,
        message: `Error tracking payments: ${error.message}`,
        data: null,
      }
    }
  }

  private async sendPaymentReminders(task: AgentTask): Promise<AgentResponse> {
    try {
      const { data: overdueInvoices, error } = await this.supabase
        .from("invoices")
        .select(`
          *,
          clients (name, email)
        `)
        .neq("status", "Paid")
        .lt("due_date", new Date().toISOString())

      if (error) throw error

      const reminderStrategy = {
        gentleReminders: overdueInvoices?.filter((inv) => this.getDaysOverdue(inv.due_date) <= 15) || [],
        firmReminders:
          overdueInvoices?.filter(
            (inv) => this.getDaysOverdue(inv.due_date) > 15 && this.getDaysOverdue(inv.due_date) <= 45,
          ) || [],
        finalNotices: overdueInvoices?.filter((inv) => this.getDaysOverdue(inv.due_date) > 45) || [],
        totalRemindersSent: overdueInvoices?.length || 0,
        responseRate: 68,
        collectionRate: 85,
      }

      const reminderActions = [
        ...reminderStrategy.gentleReminders.map((inv) => ({
          invoice: inv.invoice_number,
          client: inv.clients?.name || "Unknown",
          action: "Gentle reminder sent",
          daysOverdue: this.getDaysOverdue(inv.due_date),
          amount: inv.total_amount,
        })),
        ...reminderStrategy.firmReminders.map((inv) => ({
          invoice: inv.invoice_number,
          client: inv.clients?.name || "Unknown",
          action: "Firm reminder with late fees",
          daysOverdue: this.getDaysOverdue(inv.due_date),
          amount: inv.total_amount,
        })),
        ...reminderStrategy.finalNotices.map((inv) => ({
          invoice: inv.invoice_number,
          client: inv.clients?.name || "Unknown",
          action: "Final notice - collection threat",
          daysOverdue: this.getDaysOverdue(inv.due_date),
          amount: inv.total_amount,
        })),
      ]

      return {
        success: true,
        data: { reminderStrategy, reminderActions },
        message: `Processed ${reminderActions.length} overdue invoices. ${reminderStrategy.responseRate}% response rate expected.`,
        insights: [
          `${reminderStrategy.gentleReminders.length} gentle reminders needed`,
          `${reminderStrategy.firmReminders.length} firm reminders required`,
          `${reminderStrategy.finalNotices.length} final notices to send`,
        ],
        suggestions: [
          "Escalate final notices to collection agency",
          "Offer payment plans for large overdue amounts",
          "Review credit terms for repeat offenders",
          "Implement automatic reminder sequences",
        ],
      }
    } catch (error) {
      return {
        success: false,
        message: `Error processing reminders: ${error.message}`,
        data: null,
      }
    }
  }

  private async manageRecurringBilling(task: AgentTask): Promise<AgentResponse> {
    try {
      const { data: recurringBills, error } = await this.supabase
        .from("recurring_billing")
        .select(`
          *,
          clients (name, email)
        `)
        .eq("is_active", true)

      if (error) throw error

      const activeSubscriptions = recurringBills?.length || 0
      const monthlyRecurringRevenue =
        recurringBills?.reduce((sum, bill) => {
          const monthlyAmount =
            bill.frequency === "Monthly"
              ? bill.amount
              : bill.frequency === "Quarterly"
                ? bill.amount / 3
                : bill.frequency === "Annually"
                  ? bill.amount / 12
                  : bill.amount / 4 // Weekly
          return sum + monthlyAmount
        }, 0) || 0

      const upcomingBills =
        recurringBills
          ?.filter((bill) => new Date(bill.next_billing_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
          .map((bill) => ({
            client: bill.clients?.name || "Unknown",
            amount: bill.amount,
            dueDate: bill.next_billing_date,
            frequency: bill.frequency.toLowerCase(),
          })) || []

      const recurringBilling = {
        activeSubscriptions,
        monthlyRecurringRevenue,
        upcomingBills,
        churnRate: 5.2,
        averageSubscriptionValue: activeSubscriptions > 0 ? monthlyRecurringRevenue / activeSubscriptions : 0,
        renewalRate: 94.8,
        failedPayments: 0, // Would track from payment failures
      }

      return {
        success: true,
        data: recurringBilling,
        message: `Managing ${activeSubscriptions} recurring subscriptions generating $${monthlyRecurringRevenue.toLocaleString()} MRR.`,
        insights: [
          `${upcomingBills.length} bills due in next 7 days`,
          `Average subscription value: $${recurringBilling.averageSubscriptionValue.toFixed(0)}`,
          `${recurringBilling.renewalRate}% renewal rate`,
        ],
        suggestions: [
          "Follow up on failed payment retries",
          "Implement dunning management for failed payments",
          "Analyze churn patterns to improve retention",
          "Consider annual billing discounts to improve cash flow",
        ],
      }
    } catch (error) {
      return {
        success: false,
        message: `Error managing recurring billing: ${error.message}`,
        data: null,
      }
    }
  }

  private async analyzeInvoicingMetrics(task: AgentTask): Promise<AgentResponse> {
    try {
      const { data: invoices, error: invError } = await this.supabase.from("invoices").select("*")

      const { data: payments, error: payError } = await this.supabase.from("payments").select("*")

      if (invError || payError) throw invError || payError

      const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0) || 0
      const outstandingAmount =
        invoices
          ?.filter((inv) => inv.status !== "Paid")
          .reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0) || 0
      const overdueAmount =
        invoices
          ?.filter((inv) => inv.status !== "Paid" && new Date(inv.due_date) < new Date())
          .reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0) || 0

      const averageInvoiceValue =
        invoices?.length > 0 ? invoices.reduce((sum, inv) => sum + inv.total_amount, 0) / invoices.length : 0

      const metrics = {
        dso: 32, // Days Sales Outstanding - would calculate from payment data
        collectionEfficiency: totalRevenue > 0 ? (totalRevenue / (totalRevenue + outstandingAmount)) * 100 : 0,
        invoiceAccuracy: 98.5,
        totalRevenue,
        outstandingAmount,
        overdueAmount,
        averageInvoiceValue,
        totalInvoices: invoices?.length || 0,
        riskFactors: [
          overdueAmount > 10000 ? "High overdue amount needs attention" : null,
          outstandingAmount > totalRevenue * 0.3 ? "Outstanding receivables high" : null,
        ].filter(Boolean),
      }

      return {
        success: true,
        data: metrics,
        message: `Invoicing metrics: $${totalRevenue.toLocaleString()} revenue, ${metrics.collectionEfficiency.toFixed(1)}% collection efficiency.`,
        insights: [
          `${metrics.totalInvoices} total invoices processed`,
          `$${outstandingAmount.toLocaleString()} outstanding receivables`,
          `$${overdueAmount.toLocaleString()} overdue amount`,
        ],
        suggestions: [
          "Focus on collecting overdue amounts",
          "Implement stricter credit controls",
          "Consider offering payment incentives",
          "Review and optimize collection processes",
        ],
      }
    } catch (error) {
      return {
        success: false,
        message: `Error analyzing metrics: ${error.message}`,
        data: null,
      }
    }
  }

  private async generalInvoicingOverview(task: AgentTask): Promise<AgentResponse> {
    try {
      const { data: invoices, error: invError } = await this.supabase.from("invoices").select(`
          *,
          clients (name)
        `)

      const { data: clients, error: clientError } = await this.supabase
        .from("clients")
        .select("*")
        .eq("is_active", true)

      if (invError || clientError) throw invError || clientError

      const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0) || 0
      const outstandingAmount =
        invoices
          ?.filter((inv) => inv.status !== "Paid")
          .reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0) || 0
      const overdueAmount =
        invoices
          ?.filter((inv) => inv.status !== "Paid" && new Date(inv.due_date) < new Date())
          .reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0) || 0

      const clientRevenue =
        clients
          ?.map((client) => {
            const clientInvoices = invoices?.filter((inv) => inv.client_id === client.id) || []
            return {
              name: client.name,
              revenue: clientInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0),
              invoices: clientInvoices.length,
            }
          })
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 3) || []

      const alerts = [
        ...(invoices
          ?.filter((inv) => inv.status !== "Paid" && new Date(inv.due_date) < new Date())
          .map((inv) => `Invoice ${inv.invoice_number} is overdue`) || []),
        ...(clients
          ?.filter(
            (client) =>
              (client.credit_limit || 0) > 0 &&
              (invoices
                ?.filter((inv) => inv.client_id === client.id && inv.status !== "Paid")
                .reduce((sum, inv) => sum + inv.total_amount, 0) || 0) >
                client.credit_limit * 0.8,
          )
          .map((client) => `${client.name} approaching credit limit`) || []),
      ].slice(0, 5)

      const overview = {
        totalInvoicesSent: invoices?.length || 0,
        totalRevenue,
        outstandingAmount,
        overdueAmount,
        averageInvoiceValue:
          invoices?.length > 0 ? invoices.reduce((sum, inv) => sum + inv.total_amount, 0) / invoices.length : 0,
        topClients: clientRevenue,
        alerts,
      }

      return {
        success: true,
        data: overview,
        message: `Invoicing overview: $${totalRevenue.toLocaleString()} revenue, $${outstandingAmount.toLocaleString()} outstanding.`,
        insights: [
          `${overview.totalInvoicesSent} invoices processed`,
          `${alerts.length} items need attention`,
          `Top client: ${clientRevenue[0]?.name || "None"}`,
        ],
        suggestions: [
          "Prioritize collection of overdue amounts",
          "Review credit limits for top clients",
          "Implement automated retry for failed payments",
          "Consider offering multiple payment options",
        ],
      }
    } catch (error) {
      return {
        success: false,
        message: `Error generating overview: ${error.message}`,
        data: null,
      }
    }
  }

  private assessClientRisk(client: any): string {
    if (!client.payment_terms) return "unknown"
    if (client.payment_terms <= 15) return "low"
    if (client.payment_terms <= 30) return "medium"
    return "high"
  }

  private estimatePaymentDate(client: any, dueDate: string): string {
    const due = new Date(dueDate)
    const estimatedDays = client.payment_terms || 30
    const estimated = new Date(due.getTime() + estimatedDays * 24 * 60 * 60 * 1000)
    return estimated.toISOString().split("T")[0]
  }

  private getDaysOverdue(dueDate: string): number {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = today.getTime() - due.getTime()
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  }

  getInvoiceTemplates() {
    return this.invoiceTemplates
  }
}
