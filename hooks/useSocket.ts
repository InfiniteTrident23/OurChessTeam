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
  whitePlayer: string | null
  blackPlayer: string | null
  currentTurn: "white" | "black"
  boardState: string
  status: "waiting" | "playing" | "finished"
  moves: any[]
  spectatorCount: number
  winner?: string
  endReason?: string
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
    })

    newSocket.on("game-updated", (state: GameState) => {
      console.log("Game updated:", state)
      setGameState(state)
    })

    newSocket.on("move-made", (data) => {
      console.log("Move made:", data)
      setGameState(data.gameState)
    })

    newSocket.on("game-ended", (data) => {
      console.log("Game ended:", data)
      setGameState(data.gameState)
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
  }, [serverUrl, userEmail, userName])

  // Join a game room
  const joinRoom = useCallback(
    (roomId: string) => {
      if (!socket || !connected) {
        console.error("Socket not connected")
        return
      }

      console.log("Joining room:", roomId)
      socket.emit("join-room", {
        roomId,
        userEmail,
        userName,
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
    joinRoom,
    makeMove,
    resignGame,
    sendMessage,
    reconnectToRoom,
  }
}
