import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET(request: Request) {
  try {
    console.log("Tournaments API called")

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase environment variables")
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error",
          tournaments: [],
        },
        { status: 500 },
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const type = searchParams.get("type")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    console.log("Fetching tournaments with filters:", { status, type, limit })

    // Test database connection first
    try {
      const { data: connectionTest, error: connectionError } = await supabaseAdmin
        .from("tournaments")
        .select("count")
        .limit(1)

      if (connectionError) {
        console.error("Database connection test failed:", {
          code: connectionError.code,
          message: connectionError.message,
          details: connectionError.details,
          hint: connectionError.hint,
        })
        throw connectionError
      }
    } catch (dbError) {
      console.error("Database connection error:", dbError)
      return NextResponse.json(
        {
          success: false,
          error: "Database connection failed",
          tournaments: [],
          debug: process.env.NODE_ENV === "development" ? dbError : undefined,
        },
        { status: 500 },
      )
    }

    // Build query
    let query = supabaseAdmin.from("tournaments").select("*").order("date", { ascending: true }).limit(limit)

    // Apply filters
    if (status && status !== "null") {
      query = query.eq("status", status)
    }

    if (type && type !== "null") {
      query = query.eq("tournament_type", type)
    }

    // Execute query
    const { data: tournaments, error } = await query

    if (error) {
      console.error("Tournament query error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })

      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to fetch tournaments",
          tournaments: [],
          debug: process.env.NODE_ENV === "development" ? error : undefined,
        },
        { status: 500 },
      )
    }

    console.log(`Successfully fetched ${tournaments?.length || 0} tournaments`)

    return NextResponse.json({
      success: true,
      tournaments: tournaments || [],
      count: tournaments?.length || 0,
    })
  } catch (error) {
    console.error("Tournaments API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        tournaments: [],
        debug: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: 500 },
    )
  }
}
