import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { userEmail, userName } = await request.json()
    const { id: tournamentId } = await context.params

    if (!userEmail || !userName) {
      return NextResponse.json(
        {
          success: false,
          error: "User email and name are required",
        },
        { status: 400 },
      )
    }

    console.log(`Registering user ${userEmail} for tournament ${tournamentId}`)

    // Check if tournament exists and is open
    const { data: tournament, error: tournamentError } = await supabaseAdmin
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single()

    if (tournamentError || !tournament) {
      console.error("Tournament not found:", tournamentError)
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

    // Check if user is already registered
    const { data: existingRegistration, error: checkError } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("user_email", userEmail)
      .maybeSingle()

    if (checkError && checkError.code !== "PGRST116" && checkError.code !== "42501" && checkError.code !== "42P01") {
      console.error("Error checking existing registration:", checkError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to check registration status",
        },
        { status: 500 },
      )
    }

    if (existingRegistration) {
      return NextResponse.json(
        {
          success: false,
          error: "Already registered for this tournament",
        },
        { status: 400 },
      )
    }

    // Register user for tournament
    const { error: registrationError } = await supabaseAdmin.from("tournament_registrations").insert({
      tournament_id: tournamentId,
      user_email: userEmail,
      user_name: userName,
    })

    if (registrationError) {
      console.error("Error registering for tournament:", registrationError)

      // If table doesn't exist, return a helpful error
      if (registrationError.code === "42501" || registrationError.code === "42P01") {
        return NextResponse.json(
          {
            success: false,
            error: "Tournament registration system is not set up yet. Please run the setup script first.",
          },
          { status: 500 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to register for tournament",
        },
        { status: 500 },
      )
    }

    // Update tournament participant count
    const { error: updateError } = await supabaseAdmin.rpc("update_tournament_participants", {
      tournament_id: tournamentId,
      participant_change: 1,
    })

    if (updateError) {
      console.error("Error updating participant count:", updateError)
      // Try to rollback the registration
      await supabaseAdmin
        .from("tournament_registrations")
        .delete()
        .eq("tournament_id", tournamentId)
        .eq("user_email", userEmail)

      return NextResponse.json(
        {
          success: false,
          error: "Failed to update tournament participant count",
        },
        { status: 500 },
      )
    }

    console.log(`Successfully registered ${userEmail} for tournament ${tournamentId}`)

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
