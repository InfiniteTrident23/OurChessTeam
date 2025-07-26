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

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT - Update tournament
export async function PUT(req: Request, context: RouteParams) {
  try {
    const { id: tournamentId } = await context.params
    console.log("Admin tournament PUT request for ID:", tournamentId)

    // Parse request body
    let body
    try {
      body = await req.json()
      console.log("Tournament update data:", body)
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

    // Check if tournament exists
    const { data: existingTournament, error: fetchError } = await supabaseAdmin
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single()

    if (fetchError || !existingTournament) {
      console.error("Tournament not found:", fetchError)
      return NextResponse.json(
        {
          message: "Tournament not found",
          error: fetchError?.message || "Tournament does not exist",
        },
        { status: 404 },
      )
    }

    // Update tournament in database
    const { data: tournament, error } = await supabaseAdmin
      .from("tournaments")
      .update({
        name,
        description,
        date,
        time,
        location,
        max_participants: Number.parseInt(max_participants),
        prize_pool,
        entry_fee: Number.parseFloat(entry_fee),
        status: status || "open",
        tournament_type: tournament_type || "classical",
        time_control: time_control || "90+30",
        updated_at: new Date().toISOString(),
      })
      .eq("id", tournamentId)
      .select()
      .single()

    if (error) {
      console.error("Error updating tournament:", error)
      return NextResponse.json(
        {
          message: "Failed to update tournament",
          error: error.message,
          code: error.code,
        },
        { status: 500 },
      )
    }

    console.log("Tournament updated successfully:", tournament.id)

    return NextResponse.json(
      {
        tournament,
        message: "Tournament updated successfully",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Admin tournament PUT error:", error)
    return NextResponse.json(
      {
        message: "Something went wrong!",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// DELETE - Delete tournament
export async function DELETE(req: Request, context: RouteParams) {
  try {
    const { id: tournamentId } = await context.params
    console.log("Admin tournament DELETE request for ID:", tournamentId)

    // Check if tournament exists
    const { data: existingTournament, error: fetchError } = await supabaseAdmin
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single()

    if (fetchError || !existingTournament) {
      console.error("Tournament not found:", fetchError)
      return NextResponse.json(
        {
          message: "Tournament not found",
          error: fetchError?.message || "Tournament does not exist",
        },
        { status: 404 },
      )
    }

    // Delete tournament from database (no participant validation)
    const { error } = await supabaseAdmin.from("tournaments").delete().eq("id", tournamentId)

    if (error) {
      console.error("Error deleting tournament:", error)
      return NextResponse.json(
        {
          message: "Failed to delete tournament",
          error: error.message,
          code: error.code,
        },
        { status: 500 },
      )
    }

    console.log("Tournament deleted successfully:", tournamentId)

    return NextResponse.json(
      {
        message: "Tournament deleted successfully",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Admin tournament DELETE error:", error)
    return NextResponse.json(
      {
        message: "Something went wrong!",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
