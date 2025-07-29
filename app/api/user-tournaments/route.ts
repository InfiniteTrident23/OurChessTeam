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
    const userEmail = searchParams.get("email")

    if (!userEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "User email is required",
        },
        { status: 400 },
      )
    }

    console.log("Fetching tournaments for user:", userEmail)

    // Get all tournaments
    const { data: allTournaments, error: tournamentsError } = await supabaseAdmin
      .from("tournaments")
      .select("*")
      .order("date", { ascending: true })

    if (tournamentsError) {
      console.error("Error fetching tournaments:", tournamentsError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch tournaments",
        },
        { status: 500 },
      )
    }

    // Try to get user registrations
    let userRegistrations: any[] = []
    try {
      const { data: registrations, error: registrationsError } = await supabaseAdmin
        .from("tournament_registrations")
        .select("tournament_id, registered_at")
        .eq("user_email", userEmail)

      if (registrationsError) {
        // If table doesn't exist or permission denied, continue without registrations
        if (registrationsError.code === "42501" || registrationsError.code === "42P01") {
          console.log("Tournament registrations table not set up yet")
        } else {
          console.error("Error fetching user registrations:", registrationsError)
        }
      } else {
        userRegistrations = registrations || []
      }
    } catch (error) {
      console.log("Could not fetch user registrations:", error)
    }

    // Separate tournaments into registered and available
    const registeredTournamentIds = new Set(userRegistrations.map((reg) => reg.tournament_id))

    const registeredTournaments = allTournaments
      .filter((tournament) => registeredTournamentIds.has(tournament.id))
      .map((tournament) => {
        const registration = userRegistrations.find((reg) => reg.tournament_id === tournament.id)
        return {
          ...tournament,
          registeredAt: registration?.registered_at,
        }
      })

    const availableTournaments = allTournaments.filter(
      (tournament) =>
        !registeredTournamentIds.has(tournament.id) &&
        tournament.status === "open" &&
        tournament.current_participants < tournament.max_participants,
    )

    return NextResponse.json({
      success: true,
      registeredTournaments,
      availableTournaments,
    })
  } catch (error) {
    console.error("User tournaments API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
