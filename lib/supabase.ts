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
