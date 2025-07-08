import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET() {
  try {
    console.log("Fetching leaderboard data...")

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("username, email, classicalrating, games_played, games_won, games_lost, games_drawn")
      .order("classicalrating", { ascending: false })
      .limit(10)

    if (error) {
      console.error("Leaderboard query error:", error)
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

    console.log(`Leaderboard data fetched: ${data?.length || 0} players`)

    return NextResponse.json({
      success: true,
      leaderboard: data || [],
      count: data?.length || 0,
    })
  } catch (error) {
    console.error("Leaderboard API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
