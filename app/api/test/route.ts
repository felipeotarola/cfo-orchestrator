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
