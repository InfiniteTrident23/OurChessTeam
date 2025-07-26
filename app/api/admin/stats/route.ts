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

export async function GET() {
  try {
    console.log("Admin stats GET request")

    // Initialize stats
    let totalUsers = 0
    let totalTournaments = 0
    let activeTournaments = 0
    let totalGames = 0

    // Get total users count
    const { count: usersCount, error: usersError } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })

    if (!usersError && usersCount !== null) {
      totalUsers = usersCount
    }

    // Get total tournaments count
    const { count: tournamentsCount, error: tournamentsError } = await supabaseAdmin
      .from("tournaments")
      .select("*", { count: "exact", head: true })

    if (!tournamentsError && tournamentsCount !== null) {
      totalTournaments = tournamentsCount
    }

    // Get active tournaments count
    const { count: activeCount, error: activeError } = await supabaseAdmin
      .from("tournaments")
      .select("*", { count: "exact", head: true })
      .eq("status", "open")

    if (!activeError && activeCount !== null) {
      activeTournaments = activeCount
    }

    // Get total games count
    const { count: gamesCount, error: gamesError } = await supabaseAdmin
      .from("games")
      .select("*", { count: "exact", head: true })

    if (!gamesError && gamesCount !== null) {
      totalGames = gamesCount
    }

    const stats = {
      totalUsers,
      totalTournaments,
      activeTournaments,
      totalGames,
    }

    console.log("Admin stats retrieved:", stats)

    return NextResponse.json({
      stats,
      message: "Stats retrieved successfully",
    })
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json(
      {
        message: "Failed to retrieve stats",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
