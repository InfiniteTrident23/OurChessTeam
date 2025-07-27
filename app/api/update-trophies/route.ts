import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { whitePlayerEmail, blackPlayerEmail, winner, reason } = body

    console.log("=== TROPHY UPDATE REQUEST ===")
    console.log("White player:", whitePlayerEmail)
    console.log("Black player:", blackPlayerEmail)
    console.log("Winner:", winner)
    console.log("Reason:", reason)
    console.log("Request body:", body)

    if (!whitePlayerEmail || !blackPlayerEmail) {
      console.error("Missing player emails")
      return NextResponse.json(
        {
          success: false,
          error: "Both player emails are required",
        },
        { status: 400 },
      )
    }

    // Determine results for each player
    let whiteResult: "win" | "loss" | "draw"
    let blackResult: "win" | "loss" | "draw"

    if (winner === null || reason === "draw by agreement") {
      whiteResult = "draw"
      blackResult = "draw"
    } else if (winner === "white") {
      whiteResult = "win"
      blackResult = "loss"
    } else if (winner === "black") {
      whiteResult = "loss"
      blackResult = "win"
    } else {
      console.error("Invalid winner value:", winner)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid winner value",
        },
        { status: 400 },
      )
    }

    console.log("Results - White:", whiteResult, "Black:", blackResult)

    // Calculate trophy changes
    const getTrophyChange = (result: "win" | "loss" | "draw") => {
      switch (result) {
        case "win":
          return 100
        case "loss":
          return -50
        case "draw":
          return 0
      }
    }

    const whiteTrophyChange = getTrophyChange(whiteResult)
    const blackTrophyChange = getTrophyChange(blackResult)

    console.log("Trophy changes - White:", whiteTrophyChange, "Black:", blackTrophyChange)

    // Test database connection first
    try {
      const { data: testData, error: testError } = await supabaseAdmin.from("users").select("count").limit(1)
      if (testError) {
        console.error("Database connection test failed:", testError)
        throw new Error(`Database connection failed: ${testError.message}`)
      }
      console.log("Database connection test passed")
    } catch (connectionError) {
      console.error("Database connection error:", connectionError)
      return NextResponse.json(
        {
          success: false,
          error: "Database connection failed",
          details: connectionError instanceof Error ? connectionError.message : "Unknown connection error",
        },
        { status: 500 },
      )
    }

    // Get current user stats before update
    console.log("Getting current user stats...")
    const { data: whiteBefore, error: whiteBeforeError } = await supabaseAdmin
      .from("users")
      .select("id, username, classicalrating")
      .eq("email", whitePlayerEmail)
      .maybeSingle()

    const { data: blackBefore, error: blackBeforeError } = await supabaseAdmin
      .from("users")
      .select("id, username, classicalrating")
      .eq("email", blackPlayerEmail)
      .maybeSingle()

    console.log("White player before update:", whiteBefore)
    console.log("Black player before update:", blackBefore)

    // Update both players using the database function
    try {
      console.log("Updating white player trophies...")
      const { data: whiteUpdateData, error: whiteError } = await supabaseAdmin.rpc("update_user_game_stats", {
        user_email: whitePlayerEmail,
        result: whiteResult,
        rating_change: whiteTrophyChange,
      })

      console.log("White player update result:", { data: whiteUpdateData, error: whiteError })

      if (whiteError) {
        console.error("Error updating white player:", whiteError)
        throw whiteError
      }

      console.log("Updating black player trophies...")
      const { data: blackUpdateData, error: blackError } = await supabaseAdmin.rpc("update_user_game_stats", {
        user_email: blackPlayerEmail,
        result: blackResult,
        rating_change: blackTrophyChange,
      })

      console.log("Black player update result:", { data: blackUpdateData, error: blackError })

      if (blackError) {
        console.error("Error updating black player:", blackError)
        throw blackError
      }

      // Get updated user stats
      console.log("Getting updated user stats...")
      const { data: whiteAfter, error: whiteAfterError } = await supabaseAdmin
        .from("users")
        .select("id, username, classicalrating")
        .eq("email", whitePlayerEmail)
        .maybeSingle()

      const { data: blackAfter, error: blackAfterError } = await supabaseAdmin
        .from("users")
        .select("id, username, classicalrating")
        .eq("email", blackPlayerEmail)
        .maybeSingle()

      console.log("White player after update:", whiteAfter)
      console.log("Black player after update:", blackAfter)

      console.log("Trophy updates completed successfully")

      return NextResponse.json({
        success: true,
        message: "Trophies updated successfully",
        updates: {
          [whitePlayerEmail]: {
            result: whiteResult,
            change: whiteTrophyChange,
            before: whiteBefore,
            after: whiteAfter,
          },
          [blackPlayerEmail]: {
            result: blackResult,
            change: blackTrophyChange,
            before: blackBefore,
            after: blackAfter,
          },
        },
      })
    } catch (dbError) {
      console.error("Database error during trophy update:", dbError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update trophies in database",
          details: dbError instanceof Error ? dbError.message : "Unknown database error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Trophy update API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
