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

// Function to update user trophies via API
async function updateUserTrophies(whitePlayerEmail, blackPlayerEmail, winner, reason) {
  try {
    console.log("=== UPDATING TROPHIES VIA API ===")
    console.log("White player:", whitePlayerEmail)
    console.log("Black player:", blackPlayerEmail)
    console.log("Winner:", winner)
    console.log("Reason:", reason)

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000"
    const response = await fetch(`${clientUrl}/api/update-trophies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        whitePlayerEmail,
        blackPlayerEmail,
        winner,
        reason,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Trophy update API error:", errorData)
      throw new Error(`API error: ${response.status} - ${errorData.error}`)
    }

    const result = await response.json()
    console.log("Trophy update successful:", result)
    return result
  } catch (error) {
    console.error("Error updating user trophies:", error)
    throw error
  }
}

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
    // Draw offer system
    this.drawOffers = new Map() // player -> timestamp
    this.drawOfferedBy = null // which player offered draw
    // Track if trophies have been updated to prevent duplicates
    this.trophiesUpdated = false
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

    // Clear any pending draw offers when a move is made
    this.drawOffers.clear()
    this.drawOfferedBy = null

    return true
  }

  offerDraw(playerEmail) {
    const playerColor = this.whitePlayer === playerEmail ? "white" : "black"

    // Can't offer draw if it's not your turn or game isn't playing
    if (this.status !== "playing") return false

    // Check if this player already offered a draw
    if (this.drawOfferedBy === playerColor) return false

    this.drawOffers.set(playerColor, new Date())
    this.drawOfferedBy = playerColor
    return true
  }

  acceptDraw(playerEmail) {
    const playerColor = this.whitePlayer === playerEmail ? "white" : "black"
    const opponentColor = playerColor === "white" ? "black" : "white"

    // Can only accept if opponent offered draw
    if (this.drawOfferedBy !== opponentColor) return false

    this.endGame(null, "draw by agreement")
    return true
  }

  declineDraw(playerEmail) {
    const playerColor = this.whitePlayer === playerEmail ? "white" : "black"
    const opponentColor = playerColor === "white" ? "black" : "white"

    // Can only decline if opponent offered draw
    if (this.drawOfferedBy !== opponentColor) return false

    this.drawOffers.clear()
    this.drawOfferedBy = null
    return true
  }

  async endGame(winner, reason) {
    console.log("=== ENDING GAME ===")
    console.log("Winner:", winner)
    console.log("Reason:", reason)
    console.log("White player:", this.whitePlayer)
    console.log("Black player:", this.blackPlayer)
    console.log("Game status:", this.status)
    console.log("Trophies already updated:", this.trophiesUpdated)

    // Prevent duplicate game endings
    if (this.status === "finished") {
      console.log("Game already finished, skipping duplicate end game call")
      return
    }

    this.status = "finished"
    this.winner = winner
    this.endReason = reason
    this.endedAt = new Date()

    // Clear any pending draw offers
    this.drawOffers.clear()
    this.drawOfferedBy = null

    // Update player trophies if both players exist and not already updated
    if (this.whitePlayer && this.blackPlayer && !this.trophiesUpdated) {
      try {
        console.log("Updating trophies for completed game...")
        this.trophiesUpdated = true // Mark as updating to prevent duplicates
        await updateUserTrophies(this.whitePlayer, this.blackPlayer, winner, reason)
        console.log("Trophy update completed successfully")
      } catch (error) {
        console.error("Failed to update trophies:", error)
        this.trophiesUpdated = false // Reset flag if update failed
        // Don't throw error - game should still end even if trophy update fails
      }
    } else {
      if (!this.whitePlayer || !this.blackPlayer) {
        console.log("Skipping trophy update - missing player(s)")
      } else if (this.trophiesUpdated) {
        console.log("Skipping trophy update - already updated")
      }
    }
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
      drawOfferedBy: this.drawOfferedBy, // Add draw offer info
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

      // Check if this is a special game-end move (checkmate/stalemate)
      if (from === "game-end") {
        console.log(`Game ending detected in room ${roomId}: ${to} by ${userEmail}`)
        console.log(`Current game status: ${game.status}`)

        // Prevent duplicate game endings
        if (game.status === "finished") {
          console.log("Game already finished, ignoring duplicate game-end signal")
          return
        }

        if (to === "checkmate") {
          const winner = moveData.winner
          console.log(`Ending game by checkmate, winner: ${winner}`)
          await game.endGame(winner, "checkmate")
        } else if (to === "stalemate") {
          console.log(`Ending game by stalemate (draw)`)
          await game.endGame(null, "stalemate")
        }

        // Broadcast game end to all players
        io.to(roomId).emit("game-ended", {
          winner: game.winner,
          reason: game.endReason,
          gameState: game.getGameState(),
        })

        console.log(`Game ${roomId} ended successfully. Winner: ${game.winner}, Reason: ${game.endReason}`)
        return
      }

      // Validate it's the player's turn for normal moves
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
    } catch (error) {
      console.error("Error making move:", error)
      socket.emit("error", { message: "Failed to make move" })
    }
  })

  // Handle draw offers
  socket.on("offer-draw", async (data) => {
    const { roomId } = data
    const userEmail = socket.userEmail

    try {
      const game = activeGames.get(roomId)

      if (!game) {
        socket.emit("error", { message: "Game not found" })
        return
      }

      const success = game.offerDraw(userEmail)

      if (!success) {
        socket.emit("error", { message: "Cannot offer draw at this time" })
        return
      }

      const playerColor = game.whitePlayer === userEmail ? "white" : "black"
      console.log(`Draw offered in room ${roomId} by ${userEmail} (${playerColor})`)

      // Notify all players about the draw offer
      io.to(roomId).emit("draw-offered", {
        offeredBy: playerColor,
        gameState: game.getGameState(),
      })
    } catch (error) {
      console.error("Error offering draw:", error)
      socket.emit("error", { message: "Failed to offer draw" })
    }
  })

  // Handle draw responses
  socket.on("respond-to-draw", async (data) => {
    const { roomId, accept } = data
    const userEmail = socket.userEmail

    try {
      const game = activeGames.get(roomId)

      if (!game) {
        socket.emit("error", { message: "Game not found" })
        return
      }

      let success = false
      if (accept) {
        success = game.acceptDraw(userEmail)
      } else {
        success = game.declineDraw(userEmail)
      }

      if (!success) {
        socket.emit("error", { message: "Cannot respond to draw offer" })
        return
      }

      const playerColor = game.whitePlayer === userEmail ? "white" : "black"
      console.log(`Draw ${accept ? "accepted" : "declined"} in room ${roomId} by ${userEmail} (${playerColor})`)

      if (accept) {
        // Game ended in draw
        io.to(roomId).emit("game-ended", {
          winner: null,
          reason: "draw by agreement",
          gameState: game.getGameState(),
        })
      } else {
        // Draw declined, continue game
        io.to(roomId).emit("draw-declined", {
          declinedBy: playerColor,
          gameState: game.getGameState(),
        })
      }
    } catch (error) {
      console.error("Error responding to draw:", error)
      socket.emit("error", { message: "Failed to respond to draw" })
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

      console.log(`Game resignation in room ${roomId} by ${userEmail} (${playerColor}), winner: ${winner}`)

      await game.endGame(winner, "resignation")

      // Notify all players
      io.to(roomId).emit("game-ended", {
        winner,
        reason: "resignation",
        gameState: game.getGameState(),
      })
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
