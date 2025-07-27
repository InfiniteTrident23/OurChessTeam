import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client for browser operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Admin client for server operations (if needed)
export const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Types for our database
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          classicalRating: number
          games_played: number
          games_won: number
          games_lost: number
          games_drawn: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          username: string
          classicalRating?: number
          games_played?: number
          games_won?: number
          games_lost?: number
          games_drawn?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          classicalRating?: number
          games_played?: number
          games_won?: number
          games_lost?: number
          games_drawn?: number
          created_at?: string
          updated_at?: string
        }
      }
      tournaments: {
        Row: {
          id: string
          name: string
          description: string | null
          date: string
          time: string
          location: string
          max_participants: number
          current_participants: number
          prize_pool: string
          entry_fee: number
          status: "open" | "full" | "in_progress" | "completed" | "cancelled"
          tournament_type: "classical" | "rapid" | "blitz" | "bullet"
          time_control: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          date: string
          time: string
          location: string
          max_participants?: number
          current_participants?: number
          prize_pool: string
          entry_fee?: number
          status?: "open" | "full" | "in_progress" | "completed" | "cancelled"
          tournament_type?: "classical" | "rapid" | "blitz" | "bullet"
          time_control?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          date?: string
          time?: string
          location?: string
          max_participants?: number
          current_participants?: number
          prize_pool?: string
          entry_fee?: number
          status?: "open" | "full" | "in_progress" | "completed" | "cancelled"
          tournament_type?: "classical" | "rapid" | "blitz" | "bullet"
          time_control?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      games: {
        Row: {
          id: string
          room_id: string
          white_player_id: string | null
          black_player_id: string | null
          white_player_email: string | null
          black_player_email: string | null
          current_turn: "white" | "black"
          board_state: string
          game_status: "waiting" | "playing" | "finished"
          winner: string | null
          moves: any[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          room_id: string
          white_player_id?: string | null
          black_player_id?: string | null
          white_player_email?: string | null
          black_player_email?: string | null
          current_turn?: "white" | "black"
          board_state?: string
          game_status?: "waiting" | "playing" | "finished"
          winner?: string | null
          moves?: any[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          white_player_id?: string | null
          black_player_id?: string | null
          white_player_email?: string | null
          black_player_email?: string | null
          current_turn?: "white" | "black"
          board_state?: string
          game_status?: "waiting" | "playing" | "finished"
          winner?: string | null
          moves?: any[]
          created_at?: string
          updated_at?: string
        }
      }
      rooms: {
        Row: {
          id: string
          name: string
          host_email: string
          max_players: number
          current_players: number
          time_control: string
          status: "waiting" | "playing" | "finished"
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          host_email: string
          max_players?: number
          current_players?: number
          time_control?: string
          status?: "waiting" | "playing" | "finished"
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          host_email?: string
          max_players?: number
          current_players?: number
          time_control?: string
          status?: "waiting" | "playing" | "finished"
          created_at?: string
        }
      }
    }
  }
}

// Helper functions for user management
export async function getOrCreateUser(email: string) {
  const username = email.split("@")[0]

  // Try to get existing user
  const { data: existingUser, error: fetchError } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle()

  if (fetchError && fetchError.code !== "PGRST116") {
    throw fetchError
  }

  if (existingUser) {
    return existingUser
  }

  // Create new user with 200 starting trophies
  const { data: newUser, error: createError } = await supabase
    .from("users")
    .insert({
      email,
      username,
      classicalRating: 200,
    })
    .select()
    .single()

  if (createError) {
    throw createError
  }

  return newUser
}

export async function updateUserGameResult(email: string, result: "win" | "loss" | "draw") {
  let ratingChange = 0

  switch (result) {
    case "win":
      ratingChange = 100
      break
    case "loss":
      ratingChange = -50
      break
    case "draw":
      ratingChange = 0
      break
  }

  // Use the database function to update user stats
  const { error } = await supabase.rpc("update_user_game_stats", {
    user_email: email,
    result: result,
    rating_change: ratingChange,
  })

  if (error) {
    console.error("Error updating user game stats:", error)
    throw error
  }
}

export async function getLeaderboard(limit = 10) {
  const { data, error } = await supabase
    .from("users")
    .select("username, email, classicalRating, games_played, games_won, games_lost, games_drawn")
    .order("classicalRating", { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return data
}

export async function getUserStats(email: string) {
  const { data, error } = await supabase.from("users").select("*").eq("email", email).maybeSingle()

  if (error && error.code !== "PGRST116") {
    throw error
  }

  return data
}

// Tournament helper functions
export async function getTournaments(filters?: {
  status?: string
  type?: string
  limit?: number
}) {
  let query = supabase
    .from("tournaments")
    .select("*")
    .order("date", { ascending: true })
    .order("time", { ascending: true })

  if (filters?.status) {
    query = query.eq("status", filters.status)
  }

  if (filters?.type) {
    query = query.eq("tournament_type", filters.type)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data
}

export async function registerForTournament(tournamentId: string, userEmail: string) {
  const { error } = await supabase.rpc("update_tournament_participants", {
    tournament_id: tournamentId,
    participant_change: 1,
  })

  if (error) {
    throw error
  }

  return true
}
