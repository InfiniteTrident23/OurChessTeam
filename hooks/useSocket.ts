"use client"

import { useEffect, useState, useCallback } from "react"
import { io, type Socket } from "socket.io-client"

interface UseSocketProps {
  serverUrl?: string
  userEmail: string
  userName: string
}

interface GameState {
  roomId: string
  roomName?: string
  whitePlayer: string | null
  blackPlayer: string | null
  currentTurn: "white" | "black"
  boardState: string
  status: "waiting" | "playing" | "finished"
  moves: any[]
  spectatorCount: number
  winner?: string
  endReason?: string
  drawOfferedBy?: "white" | "black" | null
  isPrivate?: boolean
  hasPassword?: boolean
  timeControl?: string
}

interface ChatMessage {
  id: number
  userEmail: string
  userName: string
  message: string
  timestamp: string
}

export function useSocket({ serverUrl, userEmail, userName }: UseSocketProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [drawOfferReceived, setDrawOfferReceived] = useState<string | null>(null)

  // Initialize socket connection
  useEffect(() => {
    if (!userEmail || !userName) return

    const socketUrl = serverUrl || process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"

    console.log("Connecting to Socket.IO server:", socketUrl)

    const newSocket = io(socketUrl, {
      transports: ["websocket", "polling"],
      timeout: 20000,
    })

    newSocket.on("connect", () => {
      console.log("Connected to Socket.IO server")
      setConnected(true)
      setError(null)
    })

    newSocket.on("disconnect", () => {
      console.log("Disconnected from Socket.IO server")
      setConnected(false)
    })

    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err)
      setError("Failed to connect to game server")
      setConnected(false)
    })

    // Game event listeners
    newSocket.on("game-state", (state: GameState) => {
      console.log("Received game state:", state)
      setGameState(state)

      // Check for existing draw offers when receiving game state
      if (state.drawOfferedBy) {
        const userColor = state.whitePlayer === userEmail ? "white" : state.blackPlayer === userEmail ? "black" : null
        if (state.drawOfferedBy !== userColor) {
          console.log("Draw offer detected in game state from:", state.drawOfferedBy)
          setDrawOfferReceived(state.drawOfferedBy)
        }
      }
    })

    newSocket.on("game-updated", (state: GameState) => {
      console.log("Game updated:", state)
      setGameState(state)

      // Check for draw offers in updated game state
      if (state.drawOfferedBy) {
        const userColor = state.whitePlayer === userEmail ? "white" : state.blackPlayer === userEmail ? "black" : null
        if (state.drawOfferedBy !== userColor) {
          console.log("Draw offer detected in game update from:", state.drawOfferedBy)
          setDrawOfferReceived(state.drawOfferedBy)
        }
      } else {
        // Clear draw offer if it's no longer in the game state
        setDrawOfferReceived(null)
      }
    })

    newSocket.on("move-made", (data) => {
      console.log("Move made:", data)
      setGameState(data.gameState)
      // Clear any draw offers when a move is made
      setDrawOfferReceived(null)
    })

    newSocket.on("game-ended", (data) => {
      console.log("Game ended:", data)
      setGameState(data.gameState)
      setDrawOfferReceived(null)
    })

    newSocket.on("player-joined", (data) => {
      console.log("Player joined:", data)
      setGameState(data.gameState)
    })

    newSocket.on("player-disconnected", (data) => {
      console.log("Player disconnected:", data)
      setGameState(data.gameState)
    })

    newSocket.on("player-reconnected", (data) => {
      console.log("Player reconnected:", data)
      setGameState(data.gameState)
    })

    // Draw offer event listeners
    newSocket.on("draw-offered", (data) => {
      console.log("Draw offered event received:", data)
      setGameState(data.gameState)

      // Determine user's color from current game state or the updated state
      const currentGameState = gameState || data.gameState
      const userColor =
        currentGameState.whitePlayer === userEmail
          ? "white"
          : currentGameState.blackPlayer === userEmail
            ? "black"
            : null

      console.log("User color:", userColor, "Draw offered by:", data.offeredBy)

      // Show draw offer notification if it's not from the current user
      if (data.offeredBy !== userColor && userColor) {
        console.log("Setting draw offer received from:", data.offeredBy)
        setDrawOfferReceived(data.offeredBy)
      }
    })

    newSocket.on("draw-declined", (data) => {
      console.log("Draw declined:", data)
      setGameState(data.gameState)
      setDrawOfferReceived(null)
    })

    // Chat event listeners
    newSocket.on("new-message", (message: ChatMessage) => {
      console.log("New message:", message)
      setMessages((prev) => [...prev, message])
    })

    // Error handling
    newSocket.on("error", (data) => {
      console.error("Socket error:", data)
      setError(data.message)
    })

    setSocket(newSocket)

    return () => {
      console.log("Cleaning up socket connection")
      newSocket.disconnect()
    }
  }, [serverUrl, userEmail, userName]) // Remove gameState from dependencies to avoid infinite loop

  // Join a game room with optional password and room data
  const joinRoom = useCallback(
    (roomId: string, options?: { password?: string; roomName?: string; timeControl?: string; isPrivate?: boolean }) => {
      if (!socket || !connected) {
        console.error("Socket not connected")
        return
      }

      console.log("Joining room:", roomId, "with options:", options)
      socket.emit("join-room", {
        roomId,
        userEmail,
        userName,
        password: options?.password,
        roomName: options?.roomName,
        timeControl: options?.timeControl,
        isPrivate: options?.isPrivate,
      })
    },
    [socket, connected, userEmail, userName],
  )

  // Make a chess move
  const makeMove = useCallback(
    (roomId: string, from: string, to: string, newBoardState: string, moveData: any) => {
      if (!socket || !connected) {
        console.error("Socket not connected")
        return Promise.resolve(false)
      }

      return new Promise<boolean>((resolve) => {
        socket.emit("make-move", {
          roomId,
          from,
          to,
          newBoardState,
          moveData,
        })

        // Listen for success/error response
        const timeout = setTimeout(() => {
          resolve(false)
        }, 5000)

        socket.once("move-made", () => {
          clearTimeout(timeout)
          resolve(true)
        })

        socket.once("error", () => {
          clearTimeout(timeout)
          resolve(false)
        })
      })
    },
    [socket, connected],
  )

  // Offer draw
  const offerDraw = useCallback(
    (roomId: string) => {
      if (!socket || !connected) {
        console.error("Socket not connected")
        return
      }

      console.log("Offering draw for room:", roomId)
      socket.emit("offer-draw", { roomId })
    },
    [socket, connected],
  )

  // Respond to draw offer
  const respondToDraw = useCallback(
    (roomId: string, accept: boolean) => {
      if (!socket || !connected) {
        console.error("Socket not connected")
        return
      }

      console.log("Responding to draw:", accept ? "accept" : "decline")
      socket.emit("respond-to-draw", { roomId, accept })
      setDrawOfferReceived(null)
    },
    [socket, connected],
  )

  // Resign game
  const resignGame = useCallback(
    (roomId: string) => {
      if (!socket || !connected) {
        console.error("Socket not connected")
        return
      }

      socket.emit("resign-game", { roomId })
    },
    [socket, connected],
  )

  // Send chat message
  const sendMessage = useCallback(
    (roomId: string, message: string) => {
      if (!socket || !connected) {
        console.error("Socket not connected")
        return
      }

      socket.emit("send-message", {
        roomId,
        message,
      })
    },
    [socket, connected],
  )

  // Reconnect to room (useful for page refreshes)
  const reconnectToRoom = useCallback(
    (roomId: string) => {
      if (!socket || !connected) {
        console.error("Socket not connected")
        return
      }

      socket.emit("reconnect-to-room", {
        roomId,
        userEmail,
      })
    },
    [socket, connected, userEmail],
  )

  return {
    socket,
    connected,
    gameState,
    messages,
    error,
    drawOfferReceived,
    joinRoom,
    makeMove,
    offerDraw,
    respondToDraw,
    resignGame,
    sendMessage,
    reconnectToRoom,
  }
}
