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
    participantId: string
  }>
}

export async function DELETE(request: Request, context: RouteParams) {
  try {
    const { id: tournamentId, participantId } = await context.params

    console.log("Unregistering participant:", { tournamentId, participantId })

    // Get participant info before deletion
    const { data: participant, error: fetchError } = await supabaseAdmin
      .from("tournament_registrations")
      .select("user_email, user_name")
      .eq("id", participantId)
      .eq("tournament_id", tournamentId)
      .single()

    if (fetchError) {
      console.error("Error fetching participant:", fetchError)
      return NextResponse.json(
        {
          success: false,
          error: "Participant not found",
        },
        { status: 404 },
      )
    }

    // Delete the registration
    const { error: deleteError } = await supabaseAdmin
      .from("tournament_registrations")
      .delete()
      .eq("id", participantId)
      .eq("tournament_id", tournamentId)

    if (deleteError) {
      console.error("Error deleting registration:", deleteError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to unregister participant",
          details: deleteError.message,
        },
        { status: 500 },
      )
    }

    // Update tournament participant count
    const { error: updateError } = await supabaseAdmin.rpc("update_tournament_participants", {
      tournament_id: tournamentId,
      participant_change: -1,
    })

    if (updateError) {
      console.error("Error updating participant count:", updateError)
      // Don't fail the request if count update fails, just log it
    }

    console.log(`Successfully unregistered ${participant.user_email} from tournament ${tournamentId}`)

    return NextResponse.json({
      success: true,
      message: `Successfully unregistered ${participant.user_name}`,
    })
  } catch (error) {
    console.error("Participant unregister error:", error)
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
