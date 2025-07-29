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

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: tournamentId } = await context.params

    console.log("Fetching participants for tournament:", tournamentId)

    // Fetch tournament participants
    const { data: participants, error } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id, user_name, user_email, registered_at")
      .eq("tournament_id", tournamentId)
      .order("registered_at", { ascending: true })

    if (error) {
      console.error("Error fetching participants:", error)

      // Handle case where table doesn't exist
      if (error.code === "42P01" || error.code === "42501") {
        return NextResponse.json({
          success: true,
          participants: [],
          message: "Tournament registration system not set up yet",
        })
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch participants",
          details: error.message,
        },
        { status: 500 },
      )
    }

    console.log(`Found ${participants?.length || 0} participants`)

    return NextResponse.json({
      success: true,
      participants: participants || [],
    })
  } catch (error) {
    console.error("Participants fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
