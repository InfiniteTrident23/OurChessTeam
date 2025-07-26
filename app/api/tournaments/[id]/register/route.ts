import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const tournamentId = params.id
    const body = await req.json()
    const { userEmail, userName } = body

    console.log("Tournament registration attempt:", { tournamentId, userEmail })

    if (!userEmail || !userName) {
      return NextResponse.json(
        {
          success: false,
          error: "User email and name are required",
        },
        { status: 400 },
      )
    }

    // Check if tournament exists and is open
    const { data: tournament, error: tournamentError } = await supabaseAdmin
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single()

    if (tournamentError || !tournament) {
      return NextResponse.json(
        {
          success: false,
          error: "Tournament not found",
        },
        { status: 404 },
      )
    }

    if (tournament.status !== "open") {
      return NextResponse.json(
        {
          success: false,
          error: "Tournament is not open for registration",
        },
        { status: 400 },
      )
    }

    if (tournament.current_participants >= tournament.max_participants) {
      return NextResponse.json(
        {
          success: false,
          error: "Tournament is full",
        },
        { status: 400 },
      )
    }

    // Update participant count
    const { error: updateError } = await supabaseAdmin.rpc("update_tournament_participants", {
      tournament_id: tournamentId,
      participant_change: 1,
    })

    if (updateError) {
      console.error("Error updating tournament participants:", updateError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to register for tournament",
        },
        { status: 500 },
      )
    }

    console.log("Tournament registration successful")

    return NextResponse.json({
      success: true,
      message: "Successfully registered for tournament",
    })
  } catch (error) {
    console.error("Tournament registration API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
