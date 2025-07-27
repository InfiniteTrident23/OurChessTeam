import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable")
}

// Create admin client
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: "public",
  },
})

// GET - List all tournaments for admin
export async function GET(req: Request) {
  try {
    console.log("Admin tournaments GET request")

    // Test database connection
    const { data: testData, error: testError } = await supabaseAdmin.from("tournaments").select("count").limit(1)

    if (testError) {
      console.error("Database connection test failed:", testError)
      return NextResponse.json(
        {
          message: "Database connection failed",
          error: testError.message,
          code: testError.code,
        },
        { status: 500 },
      )
    }

    // Fetch all tournaments with full details
    const { data: tournaments, error } = await supabaseAdmin
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching tournaments:", error)
      return NextResponse.json(
        {
          message: "Failed to fetch tournaments",
          error: error.message,
          code: error.code,
        },
        { status: 500 },
      )
    }

    console.log(`Successfully fetched ${tournaments?.length || 0} tournaments`)

    return NextResponse.json(
      {
        tournaments: tournaments || [],
        count: tournaments?.length || 0,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Admin tournaments GET error:", error)
    return NextResponse.json(
      {
        message: "Something went wrong!",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// POST - Create new tournament
export async function POST(req: Request) {
  try {
    console.log("Admin tournaments POST request")

    // Parse request body
    let body
    try {
      body = await req.json()
      console.log("Tournament creation data:", body)
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError)
      return NextResponse.json(
        {
          message: "Invalid request body",
          error: "Failed to parse JSON",
        },
        { status: 400 },
      )
    }

    const {
      name,
      description,
      date,
      time,
      location,
      max_participants,
      prize_pool,
      entry_fee,
      status,
      tournament_type,
      time_control,
    } = body

    // Validate required fields
    if (!name || !description || !date || !time || !location) {
      return NextResponse.json(
        {
          message: "Missing required fields",
          error: "Name, description, date, time, and location are required",
        },
        { status: 400 },
      )
    }

    // Validate numeric fields
    if (isNaN(max_participants) || max_participants < 8 || max_participants > 256) {
      return NextResponse.json(
        {
          message: "Invalid max participants",
          error: "Max participants must be between 8 and 256",
        },
        { status: 400 },
      )
    }

    if (isNaN(entry_fee) || entry_fee < 0) {
      return NextResponse.json(
        {
          message: "Invalid entry fee",
          error: "Entry fee must be a non-negative number",
        },
        { status: 400 },
      )
    }

    // Insert tournament into database
    const { data: tournament, error } = await supabaseAdmin
      .from("tournaments")
      .insert({
        name,
        description,
        date,
        time,
        location,
        max_participants: Number.parseInt(max_participants),
        current_participants: 0,
        prize_pool,
        entry_fee: Number.parseFloat(entry_fee),
        status: status || "open",
        tournament_type: tournament_type || "classical",
        time_control: time_control || "90+30",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating tournament:", error)
      return NextResponse.json(
        {
          message: "Failed to create tournament",
          error: error.message,
          code: error.code,
        },
        { status: 500 },
      )
    }

    console.log("Tournament created successfully:", tournament.id)

    return NextResponse.json(
      {
        tournament,
        message: "Tournament created successfully",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Admin tournaments POST error:", error)
    return NextResponse.json(
      {
        message: "Something went wrong!",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
