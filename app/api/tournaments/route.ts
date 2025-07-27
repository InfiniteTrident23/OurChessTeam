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
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const type = searchParams.get("type")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    console.log("Fetching tournaments with filters:", { status, type, limit })

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

    // Build query
    let query = supabaseAdmin.from("tournaments").select("*")

    // Apply filters
    if (status && status !== "null") {
      query = query.eq("status", status)
    }

    if (type && type !== "null") {
      query = query.eq("tournament_type", type)
    }

    // Apply limit and ordering
    query = query.order("date", { ascending: true }).order("time", { ascending: true }).limit(limit)

    const { data: tournaments, error } = await query

    if (error) {
      console.error("Tournament query error:", error)
      return NextResponse.json(
        {
          success: false,
          error: `Database error: ${error.message}`,
          tournaments: [],
          details: {
            code: error.code,
            hint: error.hint,
            details: error.details,
          },
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
        error: error instanceof Error ? error.message : "Unknown error occurred",
        tournaments: [],
      },
      { status: 500 },
    )
  }
}
