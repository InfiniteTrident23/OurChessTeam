"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase, type Database } from "@/lib/supabase"

type Game = Database["public"]["Tables"]["games"]["Row"]

export function usePollingGame(roomId: string, userEmail: string) {
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

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

  // Poll for game updates
  const pollGameState = useCallback(async () => {
    if (!roomId) return

    try {
      const { data: gameData, error: gameError } = await supabase
        .from("games")
        .select("*")
        .eq("room_id", roomId)
        .maybeSingle()

      if (gameError && gameError.code !== "PGRST116") {
        console.error("Error polling game:", gameError)
        return
      }

      if (gameData) {
        setGame(gameData)
      }
    } catch (err) {
      console.error("Error in pollGameState:", err)
    }
  }, [roomId])

  // Load initial game state
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

        // Try to find existing game for this room
        const { data: existingGame, error: gameError } = await supabase
          .from("games")
          .select("*")
          .eq("room_id", roomId)
          .maybeSingle()

        if (gameError && gameError.code !== "PGRST116") {
          console.error("Database error:", gameError)
          throw new Error(`Database error: ${gameError.message}`)
        }

        if (existingGame) {
          console.log("Found existing game:", existingGame)
          setGame(existingGame)
        } else {
          console.log("No existing game found, creating new one")
          // Create new game
          const { data: newGame, error: createError } = await supabase
            .from("games")
            .insert({
              room_id: roomId,
              white_player_email: userEmail,
              white_player_id: userEmail.split("@")[0],
            })
            .select()
            .single()

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

  // Set up polling instead of real-time
  useEffect(() => {
    if (!game) return

    console.log("Setting up polling for game:", game.id)

    // Poll every 2 seconds
    intervalRef.current = setInterval(pollGameState, 2000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [game, pollGameState])

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

      // Immediately poll for updated state
      await pollGameState()

      console.log("Successfully joined game")
    } catch (err) {
      console.error("Error in joinGame:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to join game"
      setError(errorMessage)
    }
  }, [game, userEmail, pollGameState])

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

        // Immediately poll for updated state
        await pollGameState()

        console.log("Move made successfully")
        return true
      } catch (err) {
        console.error("Error in makeMove:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to make move"
        setError(errorMessage)
        return false
      }
    },
    [game, isUserTurn, pollGameState],
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

        // Immediately poll for updated state
        await pollGameState()

        console.log("Game ended successfully")
      } catch (err) {
        console.error("Error in endGame:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to end game"
        setError(errorMessage)
      }
    },
    [game, pollGameState],
  )

  // Manual refresh function
  const refreshGame = useCallback(async () => {
    await pollGameState()
  }, [pollGameState])

  return {
    game,
    loading,
    error,
    userColor: getUserColor(game),
    isUserTurn: isUserTurn(game),
    joinGame,
    makeMove,
    endGame,
    refreshGame, // Add manual refresh option
  }
}
