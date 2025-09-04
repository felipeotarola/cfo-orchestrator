import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    console.log("[TEST] Starting database connection test")
    
    const supabase = await createServerSupabaseClient()
    console.log("[TEST] Supabase client created successfully")
    
    // Test basic connection
    const { data: testQuery, error: testError } = await supabase
      .from("clients")
      .select("*")
      .limit(5)
    
    if (testError) {
      console.log("[TEST] Database query error:", testError)
      return NextResponse.json({ 
        success: false, 
        error: "Database query failed", 
        details: testError 
      }, { status: 500 })
    }
    
    console.log("[TEST] Database query successful. Found", testQuery?.length || 0, "clients")
    
    return NextResponse.json({ 
      success: true, 
      message: "Database connection test successful",
      clientCount: testQuery?.length || 0,
      clients: testQuery
    })
    
  } catch (error) {
    console.error("[TEST] Database connection test failed:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Database connection test failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[TEST] Starting database setup")
    
    const supabase = await createServerSupabaseClient()
    
    // Return mock data for now since we don't have proper Supabase setup
    const mockInvoices = [
      {
        id: '1',
        invoice_number: 'INV-2024-001',
        client_id: '1',
        issue_date: '2024-10-15',
        due_date: '2024-11-14',
        subtotal: 9600.00,
        tax_amount: 2400.00,
        total_amount: 12000.00,
        status: 'paid',
        notes: 'Webbutveckling för ny företagswebbsida',
        attachment_count: 0,
        clients: {
          name: 'Joakim Svensson',
          email: 'joakim.svensson@techab.se'
        }
      },
      {
        id: '2',
        invoice_number: 'INV-2024-002',
        client_id: '1',
        issue_date: '2024-11-15',
        due_date: '2024-12-15',
        subtotal: 4800.00,
        tax_amount: 1200.00,
        total_amount: 6000.00,
        status: 'sent',
        notes: 'Databasdesign och implementation',
        attachment_count: 0,
        clients: {
          name: 'Joakim Svensson',
          email: 'joakim.svensson@techab.se'
        }
      },
      {
        id: '3',
        invoice_number: 'INV-2024-003',
        client_id: '2',
        issue_date: '2024-11-01',
        due_date: '2024-11-15',
        subtotal: 7200.00,
        tax_amount: 1800.00,
        total_amount: 9000.00,
        status: 'paid',
        notes: 'Grafisk design och varumärkesarbete',
        attachment_count: 0,
        clients: {
          name: 'Anna Lindberg',
          email: 'anna.lindberg@designstudio.se'
        }
      }
    ];

    const mockReceipts = [
      {
        id: '1',
        receipt_number: 'KV-2024-001',
        vendor_name: 'Office Depot',
        amount: 1250.00,
        currency: 'SEK',
        receipt_date: '2024-11-01',
        category: 'Kontorsmaterial',
        status: 'approved',
        attachment_count: 0
      },
      {
        id: '2',
        receipt_number: 'KV-2024-002',
        vendor_name: 'ICA Maxi',
        amount: 680.00,
        currency: 'SEK',
        receipt_date: '2024-11-05',
        category: 'Måltider',
        status: 'pending',
        attachment_count: 0
      }
    ];

    // Store mock data for testing (instead of global)
    const mockData = {
      invoices: mockInvoices,
      receipts: mockReceipts,
      attachments: []
    };
    
    return NextResponse.json({
      success: true,
      message: 'Mock database setup completed',
      data: mockData
    })
    
  } catch (error) {
    console.error("[TEST] Database setup failed:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Database setup failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
