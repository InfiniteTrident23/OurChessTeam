const express = require("express")
const { createServer } = require("http")
const { Server } = require("socket.io")
const cors = require("cors")

const app = express()
const httpServer = createServer(app)

// Configure CORS for Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
})

app.use(cors())
app.use(express.json())

// Store active games and rooms in memory
const activeGames = new Map()
const activeRooms = new Map()
const playerSockets = new Map() // Track player socket connections

// Game state management
class ChessGame {
  constructor(roomId, whitePlayer) {
    this.roomId = roomId
    this.whitePlayer = whitePlayer
    this.blackPlayer = null
    this.currentTurn = "white"
    this.boardState = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    this.status = "waiting" // waiting, playing, finished
    this.moves = []
    this.spectators = new Set()
    this.createdAt = new Date()
  }

  addPlayer(playerEmail, color) {
    if (color === "black" && !this.blackPlayer) {
      this.blackPlayer = playerEmail
      this.status = "playing"
      return true
    }
    return false
  }

  addSpectator(playerEmail) {
    this.spectators.add(playerEmail)
  }

  removeSpectator(playerEmail) {
    this.spectators.delete(playerEmail)
  }

  makeMove(from, to, newBoardState, moveData) {
    this.moves.push({
      ...moveData,
      from,
      to,
      timestamp: new Date(),
    })
    this.boardState = newBoardState
    this.currentTurn = this.currentTurn === "white" ? "black" : "white"
    return true
  }

  endGame(winner, reason) {
    this.status = "finished"
    this.winner = winner
    this.endReason = reason
    this.endedAt = new Date()
  }

  getGameState() {
    return {
      roomId: this.roomId,
      whitePlayer: this.whitePlayer,
      blackPlayer: this.blackPlayer,
      currentTurn: this.currentTurn,
      boardState: this.boardState,
      status: this.status,
      moves: this.moves,
      spectatorCount: this.spectators.size,
      winner: this.winner,
      endReason: this.endReason,
    }
  }
}

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`)

  // Handle user joining a room
  socket.on("join-room", async (data) => {
    const { roomId, userEmail, userName } = data

    try {
      socket.join(roomId)
      socket.userEmail = userEmail
      socket.userName = userName
      socket.currentRoom = roomId

      // Track player socket
      playerSockets.set(userEmail, socket.id)

      let game = activeGames.get(roomId)

      if (!game) {
        // Create new game
        game = new ChessGame(roomId, userEmail)
        activeGames.set(roomId, game)
        console.log(`New game created for room ${roomId} by ${userEmail}`)
      } else if (game.whitePlayer !== userEmail && !game.blackPlayer) {
        // Join as black player
        game.addPlayer(userEmail, "black")
        console.log(`${userEmail} joined as black player in room ${roomId}`)
      } else {
        // Join as spectator
        game.addSpectator(userEmail)
        console.log(`${userEmail} joined as spectator in room ${roomId}`)
      }

      // Send current game state to the joining player
      socket.emit("game-state", game.getGameState())

      // Notify all players in the room about the update
      socket.to(roomId).emit("player-joined", {
        userEmail,
        userName,
        gameState: game.getGameState(),
      })

      // Send updated game state to all players
      io.to(roomId).emit("game-updated", game.getGameState())
    } catch (error) {
      console.error("Error joining room:", error)
      socket.emit("error", { message: "Failed to join room" })
    }
  })

  // Handle chess moves
  socket.on("make-move", async (data) => {
    const { roomId, from, to, newBoardState, moveData } = data
    const userEmail = socket.userEmail

    try {
      const game = activeGames.get(roomId)

      if (!game) {
        socket.emit("error", { message: "Game not found" })
        return
      }

      // Validate it's the player's turn
      const playerColor = game.whitePlayer === userEmail ? "white" : "black"
      if (game.currentTurn !== playerColor) {
        socket.emit("error", { message: "Not your turn" })
        return
      }

      if (game.status !== "playing") {
        socket.emit("error", { message: "Game is not active" })
        return
      }

      // Make the move
      game.makeMove(from, to, newBoardState, moveData)

      console.log(`Move made in room ${roomId}: ${from} to ${to} by ${userEmail}`)

      // Broadcast the move to all players in the room
      io.to(roomId).emit("move-made", {
        from,
        to,
        moveData,
        gameState: game.getGameState(),
      })

      // TODO: Save move to Supabase database here
      // await saveMoveToDB(game.getGameState());
    } catch (error) {
      console.error("Error making move:", error)
      socket.emit("error", { message: "Failed to make move" })
    }
  })

  // Handle game resignation
  socket.on("resign-game", async (data) => {
    const { roomId } = data
    const userEmail = socket.userEmail

    try {
      const game = activeGames.get(roomId)

      if (!game) {
        socket.emit("error", { message: "Game not found" })
        return
      }

      const playerColor = game.whitePlayer === userEmail ? "white" : "black"
      const winner = playerColor === "white" ? "black" : "white"

      game.endGame(winner, "resignation")

      console.log(`Game resigned in room ${roomId} by ${userEmail}`)

      // Notify all players
      io.to(roomId).emit("game-ended", {
        winner,
        reason: "resignation",
        gameState: game.getGameState(),
      })

      // TODO: Save final game state to Supabase
      // await saveGameToDB(game.getGameState());
    } catch (error) {
      console.error("Error resigning game:", error)
      socket.emit("error", { message: "Failed to resign game" })
    }
  })

  // Handle chat messages
  socket.on("send-message", (data) => {
    const { roomId, message } = data
    const userEmail = socket.userEmail
    const userName = socket.userName

    if (!roomId || !message || !userEmail) return

    const chatMessage = {
      id: Date.now(),
      userEmail,
      userName,
      message,
      timestamp: new Date(),
    }

    // Broadcast message to all players in the room
    io.to(roomId).emit("new-message", chatMessage)
  })

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`)

    if (socket.userEmail) {
      playerSockets.delete(socket.userEmail)

      // Remove from spectators if they were spectating
      if (socket.currentRoom) {
        const game = activeGames.get(socket.currentRoom)
        if (game) {
          game.removeSpectator(socket.userEmail)

          // Notify other players about disconnection
          socket.to(socket.currentRoom).emit("player-disconnected", {
            userEmail: socket.userEmail,
            gameState: game.getGameState(),
          })
        }
      }
    }
  })

  // Handle reconnection
  socket.on("reconnect-to-room", (data) => {
    const { roomId, userEmail } = data

    const game = activeGames.get(roomId)
    if (game) {
      socket.join(roomId)
      socket.userEmail = userEmail
      socket.currentRoom = roomId

      // Update socket mapping
      playerSockets.set(userEmail, socket.id)

      // Send current game state
      socket.emit("game-state", game.getGameState())

      // Notify others about reconnection
      socket.to(roomId).emit("player-reconnected", {
        userEmail,
        gameState: game.getGameState(),
      })
    }
  })
})

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    activeGames: activeGames.size,
    connectedPlayers: playerSockets.size,
    timestamp: new Date(),
  })
})

// Get active games endpoint
app.get("/games", (req, res) => {
  const games = Array.from(activeGames.values()).map((game) => game.getGameState())
  res.json(games)
})

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`)
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL || "http://localhost:3000"}`)
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully")
  httpServer.close(() => {
    console.log("Server closed")
    process.exit(0)
  })
})
