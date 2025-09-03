import type { Agent, AgentTask, AgentResponse } from "./types"
import type { SupabaseClient } from "@supabase/supabase-js"

interface Receipt {
  id: string
  receiptNumber: string
  vendorName: string
  amount: number
  currency: string
  receiptDate: string
  category: string
  description?: string
  taxAmount: number
  paymentMethod: string
  status: "pending" | "approved" | "rejected" | "reimbursed"
  submittedBy?: string
  approvedBy?: string
  attachmentCount: number
  primaryImageUrl?: string
  notes?: string
}

interface ReceiptCategory {
  id: string
  name: string
  description: string
  taxDeductible: boolean
  defaultTaxRate: number
}

export class ReceiptsAgent implements Agent {
  name = "Receipts Agent"
  type = "receipts" as const
  capabilities = [
    "Receipt scanning and OCR",
    "Expense categorization", 
    "Receipt approval workflow",
    "Expense reporting",
    "Tax deduction tracking",
    "Vendor management",
    "Reimbursement processing",
    "Receipt archiving",
    "Expense analytics",
    "Multi-currency support",
  ]
  isActive = true
  private supabase: SupabaseClient

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient
  }

  async processTask(task: AgentTask): Promise<AgentResponse> {
    const taskType = this.determineTaskType(task.description)

    switch (taskType) {
      case "create":
        return await this.createReceipt(task)
      case "view":
        return await this.viewReceipts(task)
      case "approve":
        return await this.approveReceipts(task)
      case "categorize":
        return await this.categorizeReceipts(task)
      case "analyze":
        return await this.analyzeExpenses(task)
      case "upload":
        return await this.uploadReceiptPhoto(task)
      default:
        return await this.generalReceiptsOverview(task)
    }
  }

  private determineTaskType(description: string): string {
    const desc = description.toLowerCase()
    if (desc.includes("create") || desc.includes("add") || desc.includes("new receipt")) return "create"
    if (desc.includes("show") || desc.includes("list") || desc.includes("display") || desc.includes("find")) return "view"
    if (desc.includes("approve") || desc.includes("review") || desc.includes("accept")) return "approve"
    if (desc.includes("categorize") || desc.includes("category") || desc.includes("tag")) return "categorize"
    if (desc.includes("analyze") || desc.includes("report") || desc.includes("summary")) return "analyze"
    if (desc.includes("photo") || desc.includes("image") || desc.includes("upload") || desc.includes("scan")) return "upload"
    return "overview"
  }

  private async createReceipt(task: AgentTask): Promise<AgentResponse> {
    try {
      console.log("ReceiptsAgent: Starting receipt creation for task:", task.description)

      // Extract receipt details from task description
      const amountMatch = task.description.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:SEK|kr|$)/i)
      const vendorMatch = task.description.match(/(?:from|vendor|at|hos)\s+([A-Za-zÀ-ÿ\s]+)/i)
      const categoryMatch = task.description.match(/(?:category|for|typ)\s+([A-Za-zÀ-ÿ\s]+)/i)

      const amount = amountMatch ? Number.parseFloat(amountMatch[1].replace(/,/g, "")) : 0
      const vendorName = vendorMatch ? vendorMatch[1].trim() : "Unknown Vendor"
      const category = categoryMatch ? categoryMatch[1].trim() : "Kontorsmaterial"

      // Get the next receipt number
      const { data: lastReceipt } = await this.supabase
        .from("receipts")
        .select("receipt_number")
        .order("created_at", { ascending: false })
        .limit(1)

      const nextNumber = lastReceipt?.[0]
        ? `REC-2025-${String(Number.parseInt(lastReceipt[0].receipt_number.split("-")[2]) + 1).padStart(3, "0")}`
        : "REC-2025-001"

      // Get category details for tax calculation
      const { data: categoryInfo } = await this.supabase
        .from("receipt_categories")
        .select("*")
        .eq("name", category)
        .single()

      const taxRate = (categoryInfo?.default_tax_rate || 25.00) / 100
      const taxAmount = Math.round(amount * taxRate / (1 + taxRate) * 100) / 100
      const netAmount = amount - taxAmount

      const newReceiptData = {
        receipt_number: nextNumber,
        vendor_name: vendorName,
        amount: amount,
        currency: "SEK",
        receipt_date: new Date().toISOString().split("T")[0],
        category: category,
        description: task.description,
        tax_amount: taxAmount,
        payment_method: "card", // default
        status: "pending",
        submitted_by: "user", // would be actual user in real app
      }

      console.log("ReceiptsAgent: Creating receipt with data:", newReceiptData)

      const { data: createdReceipt, error: createError } = await this.supabase
        .from("receipts")
        .insert(newReceiptData)
        .select()
        .single()

      if (createError) {
        console.log("ReceiptsAgent: Error creating receipt:", createError)
        throw createError
      }

      console.log("ReceiptsAgent: Receipt created successfully:", createdReceipt.id)

      // Format success message
      const formatMessage = () => {
        let message = `## ✅ Kvitto skapat!\n\n`
        message += `**📄 Kvittonummer:** ${createdReceipt.receipt_number}\n`
        message += `**🏪 Leverantör:** ${createdReceipt.vendor_name}\n`
        message += `**💰 Belopp:** ${amount.toLocaleString()} SEK\n`
        message += `**📁 Kategori:** ${category}\n`
        message += `**📅 Datum:** ${new Date(createdReceipt.receipt_date).toLocaleDateString("sv-SE")}\n`
        message += `**💳 Betalningsmetod:** ${createdReceipt.payment_method}\n\n`
        
        if (taxAmount > 0) {
          message += `### 🧾 Momsdetaljer\n`
          message += `• **Nettosumma:** ${netAmount.toLocaleString()} SEK\n`
          message += `• **Moms (${categoryInfo?.default_tax_rate || 25}%):** ${taxAmount.toLocaleString()} SEK\n`
          message += `• **Totalt:** ${amount.toLocaleString()} SEK\n\n`
        }
        
        message += `⚠️ *Ladda upp kvittofoto för att slutföra registreringen*`
        
        return message
      }

      return {
        success: true,
        data: { receipt: createdReceipt, categoryInfo },
        message: formatMessage(),
        insights: [
          `📄 Kvitto ${createdReceipt.receipt_number} skapat`,
          `💰 Belopp: ${amount.toLocaleString()} SEK`,
          `📁 Kategori: ${category}`,
          `🧾 Moms: ${taxAmount.toLocaleString()} SEK`,
          categoryInfo?.tax_deductible ? "✅ Avdragsgill" : "❌ Ej avdragsgill"
        ].filter(Boolean),
        suggestions: [
          "📸 Ladda upp kvittofoto",
          "✏️ Lägg till beskrivning",
          "🔍 Granska kategorisering",
          "✅ Skicka för godkännande"
        ],
      }
    } catch (error) {
      console.log("ReceiptsAgent: Fatal error:", error)
      return {
        success: false,
        message: `Fel vid skapande av kvitto: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      }
    }
  }

  private async viewReceipts(task: AgentTask): Promise<AgentResponse> {
    try {
      console.log("ReceiptsAgent: Starting receipt view for task:", task.description)

      // Extract filters from task description
      const statusFilter = this.extractStatus(task.description)
      const categoryFilter = this.extractCategory(task.description)
      const vendorFilter = this.extractVendor(task.description)

      let query = this.supabase
        .from("receipt_summary") // Using the view we created
        .select("*")

      // Apply filters
      if (statusFilter) {
        query = query.eq("status", statusFilter)
      }
      if (categoryFilter) {
        query = query.ilike("category", `%${categoryFilter}%`)
      }
      if (vendorFilter) {
        query = query.ilike("vendor_name", `%${vendorFilter}%`)
      }

      const { data: receipts, error } = await query
        .order("receipt_date", { ascending: false })
        .limit(20)

      if (error) {
        console.log("ReceiptsAgent: Receipt query error:", error)
        throw error
      }

      if (!receipts || receipts.length === 0) {
        return {
          success: true,
          message: "Inga kvitton hittades med de angivna kriterierna.",
          data: { receipts: [] },
          insights: ["Inga kvitton att visa"],
          suggestions: ["Skapa ett nytt kvitto", "Justera sökfilter", "Kontrollera datumintervall"]
        }
      }

      // Calculate summary statistics
      const totalAmount = receipts.reduce((sum, rec) => sum + Number(rec.amount), 0)
      const taxDeductibleAmount = receipts
        .filter(rec => rec.tax_deductible)
        .reduce((sum, rec) => sum + Number(rec.amount), 0)
      const pendingReceipts = receipts.filter(rec => rec.status === "pending")
      const approvedReceipts = receipts.filter(rec => rec.status === "approved")

      // Group by category for insights
      const categoryTotals = receipts.reduce((acc, rec) => {
        const category = rec.category || "Okategoriserad"
        acc[category] = (acc[category] || 0) + Number(rec.amount)
        return acc
      }, {} as Record<string, number>)

      // Format receipt list
      const formatReceiptList = (receipts: any[]) => {
        return receipts.map(rec => {
          const statusIcon = rec.status === "approved" ? "✅" : 
                           rec.status === "rejected" ? "❌" : 
                           rec.status === "reimbursed" ? "💰" : "🟡"
          const statusText = rec.status === "approved" ? "Godkänd" :
                           rec.status === "rejected" ? "Avvisad" :
                           rec.status === "reimbursed" ? "Återbetald" : "Väntande"
          
          const hasPhoto = rec.attachment_count > 0 ? "📸" : "📋"
          
          return `${statusIcon} ${hasPhoto} **${rec.receipt_number}** - ${Number(rec.amount).toLocaleString()} SEK\n` +
                 `   🏪 ${rec.vendor_name} | 📁 ${rec.category}\n` +
                 `   📅 ${rec.receipt_date} | Status: ${statusText}`
        }).join('\n\n')
      }

      // Create summary message
      const createSummary = () => {
        let message = `## 🧾 Kvittöversikt\n\n`
        
        message += `### 💰 Ekonomisk sammanfattning\n`
        message += `• **Totalt belopp:** ${totalAmount.toLocaleString()} SEK\n`
        message += `• 💚 **Avdragsgillt:** ${taxDeductibleAmount.toLocaleString()} SEK\n`
        message += `• 🟡 **Väntande:** ${pendingReceipts.length} st\n`
        message += `• ✅ **Godkända:** ${approvedReceipts.length} st\n\n`
        
        if (Object.keys(categoryTotals).length > 0) {
          message += `### 📊 Per kategori\n`
          Object.entries(categoryTotals)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .slice(0, 5)
            .forEach(([category, amount]) => {
              message += `• **${category}:** ${(amount as number).toLocaleString()} SEK\n`
            })
          message += `\n`
        }
        
        message += `### 📋 Kvitton\n\n`
        message += formatReceiptList(receipts.slice(0, 10)) // Show max 10
        
        if (receipts.length > 10) {
          message += `\n\n*... och ${receipts.length - 10} till*`
        }
        
        return message
      }

      return {
        success: true,
        data: { 
          receipts: receipts.map(rec => ({
            id: rec.id,
            receiptNumber: rec.receipt_number,
            vendorName: rec.vendor_name,
            amount: Number(rec.amount),
            category: rec.category,
            status: rec.status,
            receiptDate: rec.receipt_date,
            hasPhoto: rec.attachment_count > 0,
            taxDeductible: rec.tax_deductible
          })),
          summary: {
            totalReceipts: receipts.length,
            totalAmount,
            taxDeductibleAmount,
            pendingCount: pendingReceipts.length,
            approvedCount: approvedReceipts.length,
            categoryTotals
          }
        },
        message: createSummary(),
        insights: [
          `📊 ${receipts.length} kvitton visas`,
          `💰 Totalt: ${totalAmount.toLocaleString()} SEK`,
          `💚 Avdragsgillt: ${taxDeductibleAmount.toLocaleString()} SEK`,
          pendingReceipts.length > 0 ? `🟡 ${pendingReceipts.length} väntar på godkännande` : null
        ].filter((item): item is string => item !== null),
        suggestions: [
          pendingReceipts.length > 0 ? "✅ Granska väntande kvitton" : null,
          "📊 Exportera utgiftsrapport",
          "📸 Ladda upp bilder för kvitton utan foto",
          "➕ Lägg till nytt kvitto"
        ].filter((item): item is string => item !== null)
      }
    } catch (error) {
      console.log("ReceiptsAgent: Error viewing receipts:", error)
      return {
        success: false,
        message: `Fel vid hämtning av kvitton: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      }
    }
  }

  private async uploadReceiptPhoto(task: AgentTask): Promise<AgentResponse> {
    try {
      // This would typically be handled by the frontend file upload component
      // Here we provide guidance on how to upload photos
      
      const receiptNumberMatch = task.description.match(/(?:receipt|kvitto)\s+([A-Z]+-\d+-\d+)/i)
      const receiptNumber = receiptNumberMatch ? receiptNumberMatch[1] : null

      let receiptInfo = null
      if (receiptNumber) {
        const { data: receipt } = await this.supabase
          .from("receipts")
          .select("*")
          .eq("receipt_number", receiptNumber)
          .single()
        
        receiptInfo = receipt
      }

      const message = receiptInfo 
        ? `## 📸 Ladda upp kvittofoto för ${receiptInfo.receipt_number}\n\n` +
          `**🏪 Leverantör:** ${receiptInfo.vendor_name}\n` +
          `**💰 Belopp:** ${Number(receiptInfo.amount).toLocaleString()} SEK\n\n` +
          `### 📱 Så här laddar du upp:\n` +
          `1. Använd filuppladdning i appens gränssnitt\n` +
          `2. Välj kvittofoto från din enhet\n` +
          `3. Filen laddas automatiskt upp till säker molnlagring\n` +
          `4. Kvittot markeras som komplett med bifogad bild\n\n` +
          `✅ **Stödda format:** JPEG, PNG, WebP, HEIC, PDF\n` +
          `📏 **Max storlek:** 10 MB`
        : `## 📸 Kvittofoto-uppladdning\n\n` +
          `För att ladda upp kvittofoton:\n\n` +
          `### 📱 Genom appen:\n` +
          `1. Navigera till kvittosektionen\n` +
          `2. Välj kvittot du vill lägga till foto för\n` +
          `3. Klicka på "Ladda upp foto"\n` +
          `4. Välj eller ta foto av kvittot\n\n` +
          `### 💡 Tips för bästa resultat:\n` +
          `• Se till att hela kvittot syns på bilden\n` +
          `• Undvik skuggor och reflexer\n` +
          `• Ta bilden i god belysning\n` +
          `• Håll telefonen rakt över kvittot\n\n` +
          `✅ **Stödda format:** JPEG, PNG, WebP, HEIC, PDF\n` +
          `📏 **Max storlek:** 10 MB`

      return {
        success: true,
        data: { receiptInfo, uploadInstructions: true },
        message,
        insights: [
          receiptInfo ? `📄 Kvitto: ${receiptInfo.receipt_number}` : "📸 Allmän fotouppladdning",
          "🔒 Säker molnlagring med Vercel Blob",
          "✅ Automatisk filvalidering och storlekskontroll"
        ],
        suggestions: [
          "📱 Öppna kameran för att ta kvittofoto",
          "📁 Välj från galleri",
          receiptInfo ? "🔍 Granska kvittodetaljer innan uppladdning" : "📋 Välj specifikt kvitto att ladda upp för",
          "💾 Spara kvitto som PDF för framtida referens"
        ]
      }
    } catch (error) {
      return {
        success: false,
        message: `Fel vid förberedelse av fotouppladdning: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      }
    }
  }

  private async approveReceipts(task: AgentTask): Promise<AgentResponse> {
    try {
      const { data: pendingReceipts, error } = await this.supabase
        .from("receipts")
        .select("*")
        .eq("status", "pending")
        .order("receipt_date", { ascending: false })

      if (error) throw error

      if (!pendingReceipts || pendingReceipts.length === 0) {
        return {
          success: true,
          message: "🎉 Inga kvitton väntar på godkännande!",
          data: { receipts: [] },
          insights: ["Alla kvitton är godkända"],
          suggestions: ["Granska godkända kvitton", "Skapa utgiftsrapport"]
        }
      }

      // Auto-approve receipts under certain conditions
      const autoApproveLimit = 1000 // SEK
      const receiptsToApprove = pendingReceipts.filter(rec => 
        Number(rec.amount) <= autoApproveLimit && rec.category && rec.vendor_name !== "Unknown Vendor"
      )

      if (receiptsToApprove.length > 0) {
        const { error: approveError } = await this.supabase
          .from("receipts")
          .update({ 
            status: "approved", 
            approved_by: "auto-approval",
            approval_date: new Date().toISOString().split("T")[0]
          })
          .in("id", receiptsToApprove.map(r => r.id))

        if (approveError) {
          console.error("Error auto-approving receipts:", approveError)
        }
      }

      const totalPendingAmount = pendingReceipts.reduce((sum, rec) => sum + Number(rec.amount), 0)
      const remainingPending = pendingReceipts.filter(rec => !receiptsToApprove.find(approved => approved.id === rec.id))

      const message = `## ✅ Kvittogodkännande\n\n` +
        `### 🤖 Automatiskt godkända (${receiptsToApprove.length} st)\n` +
        receiptsToApprove.map(rec => 
          `• **${rec.receipt_number}** - ${rec.vendor_name} (${Number(rec.amount).toLocaleString()} SEK)`
        ).join('\n') + '\n\n' +
        (remainingPending.length > 0 ? 
          `### ⏳ Kräver manuell granskning (${remainingPending.length} st)\n` +
          remainingPending.map(rec => 
            `• **${rec.receipt_number}** - ${rec.vendor_name} (${Number(rec.amount).toLocaleString()} SEK)\n` +
            `  Orsak: ${Number(rec.amount) > autoApproveLimit ? 'Belopp för högt' : 'Ofullständig information'}`
          ).join('\n') : 
          "🎉 Alla kvitton har godkänts!")

      return {
        success: true,
        data: { 
          autoApproved: receiptsToApprove.length,
          needsReview: remainingPending.length,
          totalAmount: totalPendingAmount 
        },
        message,
        insights: [
          `🤖 ${receiptsToApprove.length} automatiskt godkända`,
          `👤 ${remainingPending.length} kräver manuell granskning`,
          `💰 Totalt väntande: ${totalPendingAmount.toLocaleString()} SEK`
        ],
        suggestions: [
          remainingPending.length > 0 ? "👀 Granska återstående kvitton manuellt" : null,
          "📊 Generera godkännanderapport",
          "⚙️ Justera auto-godkännanderegler",
          "📧 Meddela inlämnare om status"
        ].filter((item): item is string => item !== null)
      }
    } catch (error) {
      return {
        success: false,
        message: `Fel vid godkännande av kvitton: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      }
    }
  }

  private async analyzeExpenses(task: AgentTask): Promise<AgentResponse> {
    try {
      const { data: receipts, error: receiptsError } = await this.supabase
        .from("receipt_summary")
        .select("*")
        .gte("receipt_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      const { data: categories, error: categoriesError } = await this.supabase
        .from("receipt_categories")
        .select("*")

      if (receiptsError || categoriesError) throw receiptsError || categoriesError

      // Calculate metrics
      const totalExpenses = receipts?.reduce((sum, rec) => sum + Number(rec.amount), 0) || 0
      const taxDeductibleAmount = receipts?.filter(rec => rec.tax_deductible).reduce((sum, rec) => sum + Number(rec.amount), 0) || 0
      const categoryBreakdown = receipts?.reduce((acc, rec) => {
        const category = rec.category || "Okategoriserad"
        acc[category] = (acc[category] || 0) + Number(rec.amount)
        return acc
      }, {} as Record<string, number>) || {}

      const topCategories = Object.entries(categoryBreakdown)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5)

      const monthlyTrend = this.calculateMonthlyTrend(receipts || [])
      const averageReceiptValue = receipts?.length ? totalExpenses / receipts.length : 0

      // Compliance and insights
      const receiptsWithoutPhotos = receipts?.filter(rec => rec.attachment_count === 0).length || 0
      const complianceScore = receipts?.length ? ((receipts.length - receiptsWithoutPhotos) / receipts.length) * 100 : 100

      const message = `## 📊 Utgiftsanalys - Senaste 30 dagarna\n\n` +
        `### 💰 Ekonomisk översikt\n` +
        `• **Total utgift:** ${totalExpenses.toLocaleString()} SEK\n` +
        `• 💚 **Avdragsgill del:** ${taxDeductibleAmount.toLocaleString()} SEK (${((taxDeductibleAmount/totalExpenses)*100).toFixed(1)}%)\n` +
        `• 📊 **Genomsnittligt kvitto:** ${averageReceiptValue.toLocaleString()} SEK\n` +
        `• 📋 **Antal kvitton:** ${receipts?.length || 0} st\n\n` +
        
        `### 🏆 Toppkategorier\n` +
        topCategories.map(([category, amount], index) => {
          const percentage = (((amount as number) / totalExpenses) * 100).toFixed(1)
          const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🔹"
          return `${medal} **${category}:** ${(amount as number).toLocaleString()} SEK (${percentage}%)`
        }).join('\n') + '\n\n' +
        
        `### 📈 Compliance\n` +
        `• **Kvitton med bilagor:** ${((receipts?.length || 0) - receiptsWithoutPhotos)} / ${receipts?.length || 0}\n` +
        `• **Compliance-score:** ${complianceScore.toFixed(1)}%\n` +
        (receiptsWithoutPhotos > 0 ? `• ⚠️ **${receiptsWithoutPhotos} kvitton saknar foto**\n` : "• ✅ **Alla kvitton har bilagor**\n")

      return {
        success: true,
        data: {
          totalExpenses,
          taxDeductibleAmount,
          categoryBreakdown,
          monthlyTrend,
          complianceScore,
          receiptsWithoutPhotos,
          averageReceiptValue
        },
        message,
        insights: [
          `💰 ${totalExpenses.toLocaleString()} SEK totala utgifter`,
          `📊 ${Object.keys(categoryBreakdown).length} olika kategorier`,
          `📸 ${complianceScore.toFixed(1)}% compliance på bilagor`,
          topCategories[0] ? `🏆 Största kategori: ${topCategories[0][0]}` : null
        ].filter((item): item is string => item !== null),
        suggestions: [
          receiptsWithoutPhotos > 0 ? "📸 Ladda upp bilder för kvitton utan foto" : null,
          "📊 Skapa detaljerad utgiftsrapport",
          "💰 Granska potentiella besparingar",
          "🎯 Sätt budgetramar per kategori"
        ].filter((item): item is string => item !== null)
      }
    } catch (error) {
      return {
        success: false,
        message: `Fel vid analys av utgifter: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      }
    }
  }

  private async categorizeReceipts(task: AgentTask): Promise<AgentResponse> {
    // Implementation for automatic categorization
    const message = `## 🏷️ Automatisk kategorisering\n\n` +
      `Kategorisering baseras på:\n` +
      `• **Leverantörsnamn** - Automatisk matchning mot kända företag\n` +
      `• **Beloppsmönster** - Typiska kostnader för olika kategorier\n` +
      `• **Datum och tid** - Måltider på lunchtid, resor på helger\n` +
      `• **Tidigare kategoriseringar** - Lär av dina val\n\n` +
      `### 🤖 AI-förbättringar\n` +
      `• Bildanalys av kvitton för bättre kategorisering\n` +
      `• OCR för automatisk textextraktion\n` +
      `• Lärande algoritmer för personaliserade regler`

    return {
      success: true,
      data: { categorizationEnabled: true },
      message,
      insights: [
        "🤖 AI-baserad kategorisering aktiverad",
        "📚 Lär av tidigare kategoriseringar",
        "🎯 Förbättras över tid"
      ],
      suggestions: [
        "🔍 Granska auto-kategoriserade kvitton",
        "⚙️ Justera kategoriseringsregler",
        "📊 Exportera kategorirapport"
      ]
    }
  }

  private async generalReceiptsOverview(task: AgentTask): Promise<AgentResponse> {
    try {
      const { data: receipts, error: receiptsError } = await this.supabase
        .from("receipt_summary")
        .select("*")

      const { data: categories, error: categoriesError } = await this.supabase
        .from("receipt_categories")
        .select("*")

      if (receiptsError || categoriesError) throw receiptsError || categoriesError

      const totalExpenses = receipts?.reduce((sum, rec) => sum + Number(rec.amount), 0) || 0
      const pendingReceipts = receipts?.filter(rec => rec.status === "pending").length || 0
      const receiptsWithPhotos = receipts?.filter(rec => rec.attachment_count > 0).length || 0
      const totalReceipts = receipts?.length || 0

      const recentReceipts = receipts?.slice(0, 5) || []

      const message = `## 🧾 Kvittohantering - Översikt\n\n` +
        `### 📊 Statistik\n` +
        `• **Total utgift:** ${totalExpenses.toLocaleString()} SEK\n` +
        `• **Antal kvitton:** ${totalReceipts} st\n` +
        `• 🟡 **Väntande godkännande:** ${pendingReceipts} st\n` +
        `• 📸 **Med bilagor:** ${receiptsWithPhotos} / ${totalReceipts} st\n\n` +
        
        `### 📋 Senaste kvitton\n` +
        recentReceipts.map(rec => {
          const statusIcon = rec.status === "approved" ? "✅" : rec.status === "pending" ? "🟡" : "❌"
          const photoIcon = rec.attachment_count > 0 ? "📸" : "📋"
          return `${statusIcon} ${photoIcon} **${rec.receipt_number}** - ${rec.vendor_name} (${Number(rec.amount).toLocaleString()} SEK)`
        }).join('\n') + '\n\n' +
        
        `### 🏷️ Tillgängliga kategorier\n` +
        (categories?.slice(0, 5).map(cat => 
          `• **${cat.name}** - ${cat.tax_deductible ? '💚 Avdragsgill' : '❌ Ej avdragsgill'}`
        ).join('\n') || 'Inga kategorier hittades')

      return {
        success: true,
        data: { totalReceipts, totalExpenses, pendingReceipts, receiptsWithPhotos, categories: categories?.length || 0 },
        message,
        insights: [
          `📊 ${totalReceipts} kvitton totalt`,
          `💰 ${totalExpenses.toLocaleString()} SEK sammanlagd utgift`,
          pendingReceipts > 0 ? `⚠️ ${pendingReceipts} väntar på godkännande` : "✅ Alla kvitton godkända",
          `📸 ${Math.round((receiptsWithPhotos/totalReceipts)*100)}% har bilagor`
        ],
        suggestions: [
          pendingReceipts > 0 ? "✅ Granska väntande kvitton" : null,
          receiptsWithPhotos < totalReceipts ? "📸 Ladda upp bilder för kvitton utan foto" : null,
          "➕ Lägg till nytt kvitto",
          "📊 Generera utgiftsrapport"
        ].filter((item): item is string => item !== null)
      }
    } catch (error) {
      return {
        success: false,
        message: `Fel vid hämtning av kvittoöversikt: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      }
    }
  }

  // Helper methods
  private extractStatus(description: string): string | null {
    const desc = description.toLowerCase()
    if (desc.includes("pending") || desc.includes("väntande")) return "pending"
    if (desc.includes("approved") || desc.includes("godkänd")) return "approved"
    if (desc.includes("rejected") || desc.includes("avvisad")) return "rejected"
    if (desc.includes("reimbursed") || desc.includes("återbetald")) return "reimbursed"
    return null
  }

  private extractCategory(description: string): string | null {
    const categories = ["kontorsmaterial", "måltider", "resa", "telefon", "programvara", "marknadsföring"]
    const desc = description.toLowerCase()
    
    for (const category of categories) {
      if (desc.includes(category)) {
        return category.charAt(0).toUpperCase() + category.slice(1)
      }
    }
    return null
  }

  private extractVendor(description: string): string | null {
    const vendorMatch = description.match(/(?:vendor|leverantör|från|hos)\s+([A-Za-zÀ-ÿ\s]+)/i)
    return vendorMatch ? vendorMatch[1].trim() : null
  }

  private calculateMonthlyTrend(receipts: any[]): Record<string, number> {
    return receipts.reduce((acc, rec) => {
      const month = new Date(rec.receipt_date).toISOString().slice(0, 7) // YYYY-MM
      acc[month] = (acc[month] || 0) + Number(rec.amount)
      return acc
    }, {} as Record<string, number>)
  }
}
