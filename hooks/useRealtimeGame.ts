"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase, type Database } from "@/lib/supabase"
import type { RealtimeChannel } from "@supabase/supabase-js"

type Game = Database["public"]["Tables"]["games"]["Row"]
type GameUpdate = Database["public"]["Tables"]["games"]["Update"]

export function useRealtimeGame(roomId: string, userEmail: string) {
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  // Get user's color in the game
  const getUserColor = useCallback(
    (game: Game | null): "white" | "black" | null => {
      if (!game) return null
      if (game.white_player_email === userEmail) return "white"
      if (game.black_player_email === userEmail) return "black"
      return null
    },
    [userEmail],
  )

  // Check if it's user's turn
  const isUserTurn = useCallback(
    (game: Game | null): boolean => {
      if (!game) return false
      const userColor = getUserColor(game)
      return userColor === game.current_turn
    },
    [getUserColor],
  )

  // Load initial game state with better error handling
  useEffect(() => {
    async function loadGame() {
      if (!userEmail || !roomId) {
        setError("Missing user email or room ID")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        console.log("Loading game for room:", roomId, "user:", userEmail)

        // First, try to find existing game for this room
        const { data: existingGame, error: gameError } = await supabase
          .from("games")
          .select("*")
          .eq("room_id", roomId)
          .maybeSingle()

        console.log("Existing game query result:", { existingGame, gameError })

        if (gameError && gameError.code !== "PGRST116") {
          console.error("Database error:", gameError)
          throw new Error(`Database error: ${gameError.message}`)
        }

        if (existingGame) {
          console.log("Found existing game:", existingGame)
          setGame(existingGame)
        } else {
          console.log("No existing game found, creating new one")
          // No game exists, create one
          const { data: newGame, error: createError } = await supabase
            .from("games")
            .insert({
              room_id: roomId,
              white_player_email: userEmail,
              white_player_id: userEmail.split("@")[0],
            })
            .select()
            .single()

          console.log("New game creation result:", { newGame, createError })

          if (createError) {
            console.error("Error creating game:", createError)
            throw new Error(`Failed to create game: ${createError.message}`)
          }

          setGame(newGame)
        }
      } catch (err) {
        console.error("Error in loadGame:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to load game"
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    if (userEmail && roomId) {
      loadGame()
    }
  }, [roomId, userEmail])

  // Set up real-time subscription
  useEffect(() => {
    if (!game) return

    console.log("Setting up real-time subscription for game:", game.id)

    const gameChannel = supabase
      .channel(`game-${game.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${game.id}`,
        },
        (payload) => {
          console.log("Game updated via real-time:", payload.new)
          setGame(payload.new as Game)
        },
      )
      .subscribe((status) => {
        console.log("Real-time subscription status:", status)
      })

    setChannel(gameChannel)

    return () => {
      console.log("Cleaning up real-time subscription")
      gameChannel.unsubscribe()
    }
  }, [game])

  // Join game as second player
  const joinGame = useCallback(async () => {
    if (!game || game.black_player_email) {
      console.log("Cannot join game:", { game: !!game, hasBlackPlayer: !!game?.black_player_email })
      return
    }

    try {
      console.log("Joining game as black player")

      const { error } = await supabase
        .from("games")
        .update({
          black_player_email: userEmail,
          black_player_id: userEmail.split("@")[0],
          game_status: "playing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", game.id)

      if (error) {
        console.error("Error joining game:", error)
        throw new Error(`Failed to join game: ${error.message}`)
      }

      // Update room status
      await supabase
        .from("rooms")
        .update({
          current_players: 2,
          status: "playing",
        })
        .eq("id", roomId)

      console.log("Successfully joined game")
    } catch (err) {
      console.error("Error in joinGame:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to join game"
      setError(errorMessage)
    }
  }, [game, userEmail, roomId])

  // Make a move
  const makeMove = useCallback(
    async (from: string, to: string, newBoardState: string, moveData: any) => {
      if (!game || !isUserTurn(game)) {
        console.log("Cannot make move:", { game: !!game, isUserTurn: isUserTurn(game) })
        return false
      }

      try {
        console.log("Making move:", { from, to, moveData })

        const newMoves = [...(game.moves || []), moveData]
        const nextTurn = game.current_turn === "white" ? "black" : "white"

        const { error } = await supabase
          .from("games")
          .update({
            board_state: newBoardState,
            current_turn: nextTurn,
            moves: newMoves,
            updated_at: new Date().toISOString(),
          })
          .eq("id", game.id)

        if (error) {
          console.error("Error making move:", error)
          throw new Error(`Failed to make move: ${error.message}`)
        }

        console.log("Move made successfully")
        return true
      } catch (err) {
        console.error("Error in makeMove:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to make move"
        setError(errorMessage)
        return false
      }
    },
    [game, isUserTurn],
  )

  // End game
  const endGame = useCallback(
    async (winner: string | null, reason: string) => {
      if (!game) return

      try {
        console.log("Ending game:", { winner, reason })

        const { error } = await supabase
          .from("games")
          .update({
            game_status: "finished",
            winner,
            updated_at: new Date().toISOString(),
          })
          .eq("id", game.id)

        if (error) {
          console.error("Error ending game:", error)
          throw new Error(`Failed to end game: ${error.message}`)
        }

        // Update room status
        await supabase.from("rooms").update({ status: "finished" }).eq("id", roomId)

        console.log("Game ended successfully")
      } catch (err) {
        console.error("Error in endGame:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to end game"
        setError(errorMessage)
      }
    },
    [game, roomId],
  )

  return {
    game,
    loading,
    error,
    userColor: getUserColor(game),
    isUserTurn: isUserTurn(game),
    joinGame,
    makeMove,
    endGame,
  }
}
