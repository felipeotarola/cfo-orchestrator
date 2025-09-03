import type { Agent, AgentTask, AgentResponse } from "./types"

interface FinancialStatement {
  period: string
  type: "income_statement" | "balance_sheet" | "cash_flow"
  data: Record<string, number>
  metadata: {
    currency: string
    prepared_date: string
    period_start: string
    period_end: string
  }
}

interface KPIMetric {
  name: string
  value: number
  unit: string
  trend: "up" | "down" | "stable"
  benchmark: number
  status: "good" | "warning" | "critical"
}

interface BusinessInsight {
  category: "revenue" | "expenses" | "profitability" | "cash_flow" | "growth"
  insight: string
  impact: "high" | "medium" | "low"
  recommendation: string
  priority: number
}

interface TaxReport {
  period: string
  taxableIncome: number
  estimatedTax: number
  deductions: Record<string, number>
  credits: Record<string, number>
  quarterlyPayments: number[]
  complianceStatus: "compliant" | "needs_attention" | "overdue"
}

interface Forecast {
  period: string
  revenue: { optimistic: number; realistic: number; pessimistic: number }
  expenses: { optimistic: number; realistic: number; pessimistic: number }
  cashFlow: { optimistic: number; realistic: number; pessimistic: number }
  confidence: number
  assumptions: string[]
}

export class ReportingAgent implements Agent {
  name = "Reporting Agent"
  type = "reporting" as const
  capabilities = [
    "Financial reporting",
    "Cash flow analysis",
    "Profit & loss statements",
    "Balance sheet generation",
    "Tax preparation",
    "Business insights",
    "KPI tracking",
    "Financial forecasting",
    "Budget variance analysis",
    "Custom report generation",
    "Compliance monitoring",
    "Trend analysis",
  ]
  isActive = true

  private reportTemplates = {
    executive_summary: ["revenue", "profit", "cash_flow", "key_metrics"],
    detailed_financial: ["income_statement", "balance_sheet", "cash_flow_statement"],
    tax_preparation: ["taxable_income", "deductions", "credits", "quarterly_estimates"],
    performance_dashboard: ["kpis", "trends", "benchmarks", "alerts"],
  }

  async processTask(task: AgentTask): Promise<AgentResponse> {
    const taskType = this.determineTaskType(task.description)

    switch (taskType) {
      case "financial_statements":
        return await this.generateFinancialStatements(task)
      case "kpi_dashboard":
        return await this.generateKPIDashboard(task)
      case "business_insights":
        return await this.generateBusinessInsights(task)
      case "tax_report":
        return await this.generateTaxReport(task)
      case "forecast":
        return await this.generateForecast(task)
      case "cash_flow":
        return await this.analyzeCashFlow(task)
      case "budget_variance":
        return await this.analyzeBudgetVariance(task)
      default:
        return await this.generateExecutiveSummary(task)
    }
  }

  private determineTaskType(description: string): string {
    const desc = description.toLowerCase()
    if (desc.includes("financial statement") || desc.includes("balance sheet") || desc.includes("income statement"))
      return "financial_statements"
    if (desc.includes("kpi") || desc.includes("dashboard") || desc.includes("metrics")) return "kpi_dashboard"
    if (desc.includes("insight") || desc.includes("analysis") || desc.includes("recommendation"))
      return "business_insights"
    if (desc.includes("tax") || desc.includes("compliance") || desc.includes("deduction")) return "tax_report"
    if (desc.includes("forecast") || desc.includes("projection") || desc.includes("predict")) return "forecast"
    if (desc.includes("cash flow") || desc.includes("liquidity")) return "cash_flow"
    if (desc.includes("budget") || desc.includes("variance") || desc.includes("actual vs budget"))
      return "budget_variance"
    return "executive_summary"
  }

  private async generateFinancialStatements(task: AgentTask): Promise<AgentResponse> {
    await new Promise((resolve) => setTimeout(resolve, 3000))

    const incomeStatement: FinancialStatement = {
      period: "2025-01",
      type: "income_statement",
      data: {
        revenue: 485000,
        cost_of_goods_sold: 145500,
        gross_profit: 339500,
        operating_expenses: 245000,
        ebitda: 94500,
        depreciation: 12000,
        ebit: 82500,
        interest_expense: 3500,
        tax_expense: 19750,
        net_income: 59250,
      },
      metadata: {
        currency: "USD",
        prepared_date: new Date().toISOString().split("T")[0],
        period_start: "2025-01-01",
        period_end: "2025-01-31",
      },
    }

    const balanceSheet: FinancialStatement = {
      period: "2025-01",
      type: "balance_sheet",
      data: {
        // Assets
        cash: 125000,
        accounts_receivable: 85000,
        inventory: 45000,
        current_assets: 255000,
        fixed_assets: 180000,
        total_assets: 435000,
        // Liabilities
        accounts_payable: 35000,
        short_term_debt: 25000,
        current_liabilities: 60000,
        long_term_debt: 120000,
        total_liabilities: 180000,
        // Equity
        retained_earnings: 195000,
        owner_equity: 60000,
        total_equity: 255000,
      },
      metadata: {
        currency: "USD",
        prepared_date: new Date().toISOString().split("T")[0],
        period_start: "2025-01-01",
        period_end: "2025-01-31",
      },
    }

    const cashFlowStatement: FinancialStatement = {
      period: "2025-01",
      type: "cash_flow",
      data: {
        // Operating Activities
        net_income: 59250,
        depreciation: 12000,
        accounts_receivable_change: -15000,
        accounts_payable_change: 8000,
        operating_cash_flow: 64250,
        // Investing Activities
        equipment_purchase: -25000,
        investing_cash_flow: -25000,
        // Financing Activities
        loan_payment: -12000,
        owner_draw: -15000,
        financing_cash_flow: -27000,
        // Net Change
        net_cash_change: 12250,
        beginning_cash: 112750,
        ending_cash: 125000,
      },
      metadata: {
        currency: "USD",
        prepared_date: new Date().toISOString().split("T")[0],
        period_start: "2025-01-01",
        period_end: "2025-01-31",
      },
    }

    const financialRatios = {
      liquidity: {
        current_ratio: 4.25,
        quick_ratio: 3.5,
        cash_ratio: 2.08,
      },
      profitability: {
        gross_margin: 70.0,
        operating_margin: 19.5,
        net_margin: 12.2,
        roe: 23.2,
        roa: 13.6,
      },
      efficiency: {
        asset_turnover: 1.11,
        receivables_turnover: 5.7,
        inventory_turnover: 3.2,
      },
      leverage: {
        debt_to_equity: 0.71,
        debt_to_assets: 0.41,
        interest_coverage: 23.6,
      },
    }

    return {
      success: true,
      data: {
        statements: [incomeStatement, balanceSheet, cashFlowStatement],
        ratios: financialRatios,
        summary: {
          revenue_growth: 15.2,
          profit_margin: 12.2,
          financial_health: "strong",
          key_strengths: ["Strong liquidity position", "Healthy profit margins", "Low debt burden"],
          areas_of_concern: ["Increasing receivables", "Inventory management"],
        },
      },
      message: `Generated complete financial statements for January 2025. Net income: $59,250 (12.2% margin), Strong liquidity with 4.25 current ratio.`,
      suggestions: [
        "Monitor accounts receivable aging to improve cash conversion",
        "Consider inventory optimization to free up working capital",
        "Evaluate opportunities for profitable growth given strong financial position",
        "Review debt structure for potential refinancing opportunities",
      ],
    }
  }

  private async generateKPIDashboard(task: AgentTask): Promise<AgentResponse> {
    await new Promise((resolve) => setTimeout(resolve, 2200))

    const kpis: KPIMetric[] = [
      {
        name: "Monthly Recurring Revenue",
        value: 285000,
        unit: "USD",
        trend: "up",
        benchmark: 250000,
        status: "good",
      },
      {
        name: "Customer Acquisition Cost",
        value: 125,
        unit: "USD",
        trend: "down",
        benchmark: 150,
        status: "good",
      },
      {
        name: "Customer Lifetime Value",
        value: 2850,
        unit: "USD",
        trend: "up",
        benchmark: 2500,
        status: "good",
      },
      {
        name: "Gross Margin",
        value: 70.0,
        unit: "%",
        trend: "stable",
        benchmark: 65.0,
        status: "good",
      },
      {
        name: "Days Sales Outstanding",
        value: 35,
        unit: "days",
        trend: "up",
        benchmark: 30,
        status: "warning",
      },
      {
        name: "Cash Burn Rate",
        value: 45000,
        unit: "USD/month",
        trend: "down",
        benchmark: 50000,
        status: "good",
      },
      {
        name: "Employee Productivity",
        value: 125000,
        unit: "USD/employee",
        trend: "up",
        benchmark: 115000,
        status: "good",
      },
    ]

    const dashboard = {
      kpis,
      alerts: [
        "DSO trending upward - review collection processes",
        "Marketing ROI exceeding targets by 25%",
        "Cash runway extended to 18 months",
      ],
      trends: {
        revenue: { direction: "up", percentage: 15.2, period: "month_over_month" },
        expenses: { direction: "up", percentage: 8.5, period: "month_over_month" },
        profit: { direction: "up", percentage: 28.3, period: "month_over_month" },
      },
      benchmarks: {
        industry_comparison: "outperforming",
        peer_ranking: "top_quartile",
        historical_performance: "above_average",
      },
    }

    return {
      success: true,
      data: dashboard,
      message: `KPI Dashboard: 6/7 metrics performing well. Revenue up 15.2% MoM, DSO needs attention at 35 days.`,
      suggestions: [
        "Implement automated invoicing to reduce DSO",
        "Increase marketing spend given strong ROI performance",
        "Monitor employee productivity trends for scaling decisions",
        "Set up automated KPI alerts for proactive management",
      ],
    }
  }

  private async generateBusinessInsights(task: AgentTask): Promise<AgentResponse> {
    await new Promise((resolve) => setTimeout(resolve, 2800))

    const insights: BusinessInsight[] = [
      {
        category: "revenue",
        insight: "Revenue growth accelerating with 15.2% month-over-month increase driven by new customer acquisition",
        impact: "high",
        recommendation: "Scale successful marketing channels and consider expanding sales team",
        priority: 1,
      },
      {
        category: "expenses",
        insight:
          "Operating expenses growing at 8.5% while revenue grows at 15.2%, indicating improving operational efficiency",
        impact: "medium",
        recommendation: "Maintain current expense discipline while investing in growth opportunities",
        priority: 3,
      },
      {
        category: "profitability",
        insight: "Gross margin stable at 70% despite increased volume, showing strong pricing power",
        impact: "high",
        recommendation: "Consider strategic price increases in high-value segments",
        priority: 2,
      },
      {
        category: "cash_flow",
        insight: "Cash conversion cycle lengthening due to increased receivables, impacting working capital",
        impact: "medium",
        recommendation: "Implement stricter credit terms and automated collection processes",
        priority: 4,
      },
      {
        category: "growth",
        insight:
          "Customer acquisition cost decreasing while lifetime value increases, indicating strong unit economics",
        impact: "high",
        recommendation: "Accelerate customer acquisition investments given favorable economics",
        priority: 1,
      },
    ]

    const marketAnalysis = {
      competitive_position: "strong",
      market_share_trend: "growing",
      pricing_power: "high",
      customer_satisfaction: 4.7,
      churn_rate: 3.2,
      expansion_opportunities: [
        "Geographic expansion to West Coast markets",
        "Product line extension based on customer feedback",
        "Strategic partnerships with complementary services",
      ],
      risk_factors: [
        "Increasing competition in core market",
        "Potential economic downturn impact",
        "Key customer concentration risk",
      ],
    }

    return {
      success: true,
      data: { insights, marketAnalysis },
      message: `Generated 5 key business insights. Top priority: Scale marketing and sales given strong unit economics and growth trajectory.`,
      suggestions: [
        "Prioritize revenue growth initiatives given strong fundamentals",
        "Address cash conversion cycle to optimize working capital",
        "Develop competitive moats to protect market position",
        "Create contingency plans for identified risk factors",
      ],
    }
  }

  private async generateTaxReport(task: AgentTask): Promise<AgentResponse> {
    await new Promise((resolve) => setTimeout(resolve, 2500))

    const taxReport: TaxReport = {
      period: "2024",
      taxableIncome: 237000,
      estimatedTax: 59250,
      deductions: {
        business_expenses: 185000,
        depreciation: 48000,
        professional_services: 15000,
        office_expenses: 12000,
        travel_entertainment: 8500,
      },
      credits: {
        research_development: 5000,
        small_business: 2500,
      },
      quarterlyPayments: [14812, 14812, 14812, 14814],
      complianceStatus: "compliant",
    }

    const taxOptimization = {
      potential_savings: 12500,
      strategies: [
        "Accelerate equipment purchases for Section 179 deduction",
        "Maximize retirement plan contributions",
        "Consider R&D credit opportunities",
        "Optimize business structure for tax efficiency",
      ],
      upcoming_deadlines: [
        { description: "Q1 2025 estimated payment", date: "2025-01-15", amount: 15500 },
        { description: "2024 tax return filing", date: "2025-03-15", status: "preparation_needed" },
        { description: "Annual depreciation schedule update", date: "2025-02-28", status: "pending" },
      ],
      compliance_checklist: [
        { item: "Quarterly payments current", status: "complete" },
        { item: "Expense documentation", status: "complete" },
        { item: "Depreciation schedules", status: "in_progress" },
        { item: "1099 forms issued", status: "pending" },
      ],
    }

    return {
      success: true,
      data: { taxReport, taxOptimization },
      message: `Tax analysis complete. Estimated tax liability: $59,250. Identified $12,500 in potential savings through optimization strategies.`,
      suggestions: [
        "Execute equipment purchases before year-end for maximum deduction",
        "Review retirement plan contribution limits and maximize contributions",
        "Ensure all 1099 forms are issued by January 31st deadline",
        "Schedule tax planning session for 2025 strategy development",
      ],
    }
  }

  private async generateForecast(task: AgentTask): Promise<AgentResponse> {
    await new Promise((resolve) => setTimeout(resolve, 3200))

    const forecast: Forecast = {
      period: "Q2 2025",
      revenue: {
        optimistic: 165000,
        realistic: 145000,
        pessimistic: 125000,
      },
      expenses: {
        optimistic: 98000,
        realistic: 105000,
        pessimistic: 115000,
      },
      cashFlow: {
        optimistic: 67000,
        realistic: 40000,
        pessimistic: 10000,
      },
      confidence: 78,
      assumptions: [
        "Current growth rate continues at 12-18% monthly",
        "No major economic disruptions",
        "Successful launch of new product line",
        "Retention rate maintains at 95%+",
        "Marketing efficiency remains stable",
      ],
    }

    const scenarioAnalysis = {
      base_case: {
        probability: 60,
        revenue: 145000,
        profit: 40000,
        key_drivers: ["Steady customer growth", "Stable pricing", "Controlled expenses"],
      },
      upside_case: {
        probability: 25,
        revenue: 165000,
        profit: 67000,
        key_drivers: ["Accelerated growth", "Premium pricing success", "Operational leverage"],
      },
      downside_case: {
        probability: 15,
        revenue: 125000,
        profit: 10000,
        key_drivers: ["Market slowdown", "Increased competition", "Higher costs"],
      },
      sensitivity_analysis: {
        revenue_impact: {
          "10% price increase": 14500,
          "5% volume decrease": -7250,
          "New product success": 25000,
        },
        cost_impact: {
          "Staff addition": -15000,
          "Marketing increase": -8000,
          "Efficiency gains": 5000,
        },
      },
    }

    return {
      success: true,
      data: { forecast, scenarioAnalysis },
      message: `Q2 2025 forecast: $145K revenue (realistic case), $40K cash flow. 78% confidence based on current trends and market conditions.`,
      suggestions: [
        "Prepare contingency plans for downside scenario",
        "Invest in growth initiatives given upside potential",
        "Monitor key leading indicators for early trend detection",
        "Update forecast monthly as new data becomes available",
      ],
    }
  }

  private async analyzeCashFlow(task: AgentTask): Promise<AgentResponse> {
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const cashFlowAnalysis = {
      current_position: {
        cash_balance: 125000,
        monthly_inflow: 145000,
        monthly_outflow: 105000,
        net_monthly_flow: 40000,
        runway_months: 18.5,
      },
      flow_breakdown: {
        operating_activities: 64250,
        investing_activities: -25000,
        financing_activities: -27000,
        net_change: 12250,
      },
      working_capital: {
        accounts_receivable: 85000,
        inventory: 45000,
        accounts_payable: -35000,
        net_working_capital: 95000,
        days_working_capital: 28,
      },
      projections: {
        next_3_months: [52000, 48000, 45000],
        next_6_months: [52000, 48000, 45000, 42000, 40000, 38000],
        cash_low_point: { month: "July 2025", amount: 98000 },
      },
      optimization_opportunities: [
        { action: "Accelerate collections", impact: 25000, timeframe: "30 days" },
        { action: "Negotiate extended payment terms", impact: 15000, timeframe: "immediate" },
        { action: "Optimize inventory levels", impact: 20000, timeframe: "60 days" },
        { action: "Implement early payment discounts", impact: -5000, timeframe: "ongoing" },
      ],
    }

    return {
      success: true,
      data: cashFlowAnalysis,
      message: `Cash flow analysis: $125K current balance, $40K monthly net flow, 18.5 months runway. Strong liquidity position with optimization opportunities.`,
      suggestions: [
        "Implement collection acceleration strategies for immediate impact",
        "Negotiate 60-day payment terms with key suppliers",
        "Consider line of credit for seasonal fluctuations",
        "Monitor cash flow weekly during growth phase",
      ],
    }
  }

  private async analyzeBudgetVariance(task: AgentTask): Promise<AgentResponse> {
    await new Promise((resolve) => setTimeout(resolve, 1800))

    const budgetVariance = {
      period: "January 2025",
      overall_variance: {
        budget_revenue: 425000,
        actual_revenue: 485000,
        revenue_variance: 60000,
        revenue_variance_percent: 14.1,
        budget_expenses: 315000,
        actual_expenses: 350000,
        expense_variance: 35000,
        expense_variance_percent: 11.1,
        net_variance: 25000,
      },
      category_variances: [
        {
          category: "Sales Revenue",
          budget: 400000,
          actual: 460000,
          variance: 60000,
          variance_percent: 15.0,
          status: "favorable",
        },
        {
          category: "Service Revenue",
          budget: 25000,
          actual: 25000,
          variance: 0,
          variance_percent: 0.0,
          status: "on_target",
        },
        {
          category: "Marketing",
          budget: 45000,
          actual: 52000,
          variance: 7000,
          variance_percent: 15.6,
          status: "unfavorable",
        },
        {
          category: "Salaries",
          budget: 180000,
          actual: 175000,
          variance: -5000,
          variance_percent: -2.8,
          status: "favorable",
        },
        {
          category: "Office Expenses",
          budget: 15000,
          actual: 18500,
          variance: 3500,
          variance_percent: 23.3,
          status: "unfavorable",
        },
        {
          category: "Technology",
          budget: 25000,
          actual: 28000,
          variance: 3000,
          variance_percent: 12.0,
          status: "unfavorable",
        },
      ],
      variance_analysis: {
        significant_variances: [
          {
            category: "Sales Revenue",
            reason: "New client acquisition exceeded projections",
            action: "Update Q2 revenue targets",
          },
          {
            category: "Marketing",
            reason: "Additional digital advertising spend",
            action: "Evaluate ROI and adjust budget",
          },
          {
            category: "Office Expenses",
            reason: "One-time equipment purchases",
            action: "Categorize as capital expenditure",
          },
        ],
        trends: {
          revenue_trend: "consistently_exceeding",
          expense_trend: "controlled_growth",
          variance_trend: "improving",
        },
      },
      recommendations: {
        budget_adjustments: [
          "Increase Q2 revenue budget by 12% based on current trajectory",
          "Reallocate marketing budget to highest-performing channels",
          "Create separate capital expenditure budget category",
        ],
        process_improvements: [
          "Implement monthly budget reviews instead of quarterly",
          "Create variance alert thresholds at 10% deviation",
          "Develop rolling 12-month budget forecasts",
        ],
      },
    }

    return {
      success: true,
      data: budgetVariance,
      message: `Budget variance analysis: Revenue exceeded budget by 14.1% ($60K), expenses over by 11.1% ($35K). Net favorable variance of $25K.`,
      suggestions: [
        "Revise revenue projections upward based on strong performance",
        "Investigate marketing spend efficiency and ROI",
        "Implement tighter controls on discretionary expenses",
        "Update budget model with current growth assumptions",
      ],
    }
  }

  private async generateExecutiveSummary(task: AgentTask): Promise<AgentResponse> {
    await new Promise((resolve) => setTimeout(resolve, 2500))

    const executiveSummary = {
      period: "January 2025",
      financial_highlights: {
        revenue: 485000,
        revenue_growth: 15.2,
        net_profit: 59250,
        profit_margin: 12.2,
        cash_position: 125000,
        runway_months: 18.5,
      },
      key_achievements: [
        "Revenue exceeded budget by 14.1% driven by new customer acquisition",
        "Maintained healthy 70% gross margin despite volume increases",
        "Improved operational efficiency with expense growth below revenue growth",
        "Strengthened cash position with positive operating cash flow",
      ],
      areas_of_focus: [
        "Accounts receivable management - DSO increased to 35 days",
        "Marketing ROI optimization - spend increased 15.6% over budget",
        "Inventory management - opportunity to optimize working capital",
        "Tax planning - maximize deductions for upcoming filing",
      ],
      strategic_priorities: [
        "Scale successful growth initiatives given strong unit economics",
        "Implement automated financial processes for operational efficiency",
        "Develop competitive moats to protect market position",
        "Optimize capital structure for continued growth",
      ],
      risk_assessment: {
        financial_risk: "low",
        operational_risk: "medium",
        market_risk: "medium",
        key_risks: [
          "Customer concentration in top 3 clients",
          "Increasing competition in core market",
          "Potential economic downturn impact on demand",
        ],
      },
      outlook: {
        next_quarter: "positive",
        confidence_level: 85,
        key_metrics_to_watch: ["Customer acquisition cost", "Churn rate", "Cash conversion cycle"],
      },
    }

    return {
      success: true,
      data: executiveSummary,
      message: `Executive Summary: Strong financial performance with $485K revenue (15.2% growth), $59K profit (12.2% margin). Positive outlook with focus areas identified.`,
      suggestions: [
        "Capitalize on growth momentum with strategic investments",
        "Address working capital optimization opportunities",
        "Develop risk mitigation strategies for identified concerns",
        "Establish monthly executive dashboard for ongoing monitoring",
      ],
    }
  }

  getReportTemplates() {
    return this.reportTemplates
  }

  generateCustomReport(template: string, parameters: Record<string, any>) {
    // Custom report generation logic would go here
    return {
      template,
      parameters,
      generated_at: new Date().toISOString(),
    }
  }
}
