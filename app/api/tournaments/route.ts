import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const type = searchParams.get("type")
    const limit = searchParams.get("limit")

    console.log("Fetching tournaments with filters:", { status, type, limit })

    let query = supabaseAdmin
      .from("tournaments")
      .select("*")
      .order("date", { ascending: true })
      .order("time", { ascending: true })

    // Apply filters
    if (status) {
      query = query.eq("status", status)
    }

    if (type) {
      query = query.eq("tournament_type", type)
    }

    if (limit) {
      query = query.limit(Number.parseInt(limit))
    }

    const { data: tournaments, error } = await query

    if (error) {
      console.error("Tournament query error:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: 500 },
      )
    }

    console.log(`Tournaments fetched: ${tournaments?.length || 0} tournaments`)

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
      },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      name,
      description,
      date,
      time,
      location,
      maxParticipants,
      prizePool,
      entryFee,
      tournamentType,
      timeControl,
      createdBy,
    } = body

    console.log("Creating new tournament:", { name, date, location })

    // Validate required fields
    if (!name || !date || !time || !location || !prizePool) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: name, date, time, location, prizePool",
        },
        { status: 400 },
      )
    }

    const { data: newTournament, error } = await supabaseAdmin
      .from("tournaments")
      .insert({
        name,
        description,
        date,
        time,
        location,
        max_participants: maxParticipants || 128,
        prize_pool: prizePool,
        entry_fee: entryFee || 0,
        tournament_type: tournamentType || "classical",
        time_control: timeControl || "10+5",
        created_by: createdBy,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating tournament:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        { status: 500 },
      )
    }

    console.log("Tournament created successfully:", newTournament.id)

    return NextResponse.json({
      success: true,
      tournament: newTournament,
      message: "Tournament created successfully",
    })
  } catch (error) {
    console.error("Create tournament API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
