"use client"

import { useState, useEffect, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Users, Clock, Lock, MessageCircle, Send, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import RealtimeChessBoard from "@/components/realtime-chess-board"
import { useSocket } from "@/hooks/useSocket"

interface GamePageProps {
  params: Promise<{ roomId: string }>
}

export default function GamePage({ params }: GamePageProps) {
  const resolvedParams = use(params)
  const roomId = resolvedParams.roomId
  const searchParams = useSearchParams()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("")
  const [mounted, setMounted] = useState(false)
  const [chatMessage, setChatMessage] = useState("")
  const [showChat, setShowChat] = useState(false)
  const [passwordError, setPasswordError] = useState("")

  // Get password from URL params if joining a private room
  const urlPassword = searchParams.get("password")
  const isPrivate = searchParams.get("isPrivate") === "true"

  useEffect(() => {
    setMounted(true)

    // Check if user is logged in
    const isLoggedIn = localStorage.getItem("isLoggedIn")
    const email = localStorage.getItem("userEmail")

    if (!isLoggedIn) {
      router.push("/Login")
      return
    }

    if (email) {
      setUserEmail(email)
      setUserName(email.split("@")[0])
    }
  }, [router])

  const {
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
  } = useSocket({
    userEmail,
    userName,
  })

  // Join room when component mounts and user is authenticated
  useEffect(() => {
    if (mounted && userEmail && userName && connected && roomId) {
      console.log("Joining room:", roomId, "with password:", urlPassword ? "***" : "none")

      // Create join options with password and room data if provided
      const joinOptions = {
        password: urlPassword || undefined,
        roomName: searchParams.get("roomName") || undefined,
        timeControl: searchParams.get("timeControl") || undefined,
        isPrivate: isPrivate,
      }

      joinRoom(roomId, joinOptions)
    }
  }, [mounted, userEmail, userName, connected, roomId, joinRoom, urlPassword, isPrivate, searchParams])

  // Debug logging for draw offers
  useEffect(() => {
    console.log("Draw offer state changed:", {
      drawOfferReceived,
      gameStateDrawOffer: gameState?.drawOfferedBy,
      userEmail,
      gameState: gameState
        ? {
            whitePlayer: gameState.whitePlayer,
            blackPlayer: gameState.blackPlayer,
          }
        : null,
    })
  }, [drawOfferReceived, gameState?.drawOfferedBy, userEmail, gameState])

  // Handle password errors
  useEffect(() => {
    if (error === "Invalid password") {
      setPasswordError("Invalid password. Please check the password and try again.")
    }
  }, [error])

  if (!mounted) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
  }

  // Show password error screen
  if (passwordError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800 border-slate-700 w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-white text-xl">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-slate-300">{passwordError}</p>
            <div className="flex space-x-3">
              <Button
                onClick={() => router.push("/dashboard")}
                variant="outline"
                className="flex-1 bg-transparent border-slate-600 text-white hover:bg-slate-700"
              >
                Back to Dashboard
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-slate-900"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Connecting to game server...</div>
          <div className="text-slate-400">Make sure the Socket.IO server is running on port 3001</div>
        </div>
      </div>
    )
  }

  if (error && error !== "Invalid password") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Error: {error}</div>
          <Button onClick={() => window.location.reload()} className="bg-amber-600 hover:bg-amber-700 text-slate-900">
            Retry Connection
          </Button>
        </div>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    )
  }

  // Determine user's color and turn
  const userColor = gameState.whitePlayer === userEmail ? "white" : gameState.blackPlayer === userEmail ? "black" : null
  const isUserTurn = userColor === gameState.currentTurn

  const players = [
    {
      name: gameState.whitePlayer === userEmail ? "You" : gameState.whitePlayer?.split("@")[0] || "Waiting...",
      color: "white",
      connected: !!gameState.whitePlayer,
      email: gameState.whitePlayer,
    },
    {
      name: gameState.blackPlayer === userEmail ? "You" : gameState.blackPlayer?.split("@")[0] || "Waiting...",
      color: "black",
      connected: !!gameState.blackPlayer,
      email: gameState.blackPlayer,
    },
  ]

  const handleMakeMove = async (from: string, to: string, newBoardState: string, moveData: any) => {
    // Handle special game-end moves (checkmate/stalemate)
    if (from === "game-end") {
      console.log("Game ending detected:", to, moveData)
      return await makeMove(roomId, from, to, newBoardState, moveData)
    }

    // Handle normal moves
    return await makeMove(roomId, from, to, newBoardState, moveData)
  }

  const handleOfferDraw = () => {
    if (userColor && gameState.status === "playing") {
      console.log("Offering draw as", userColor)
      offerDraw(roomId)
    }
  }

  const handleRespondToDraw = (accept: boolean) => {
    console.log("Responding to draw:", accept)
    respondToDraw(roomId, accept)
  }

  const handleResign = () => {
    if (userColor && gameState.status === "playing") {
      resignGame(roomId)
    }
  }

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      sendMessage(roomId, chatMessage.trim())
      setChatMessage("")
    }
  }

  // Check if current user has offered draw
  const hasOfferedDraw = gameState.drawOfferedBy === userColor

  // Check if opponent has offered draw - use both sources for reliability
  const opponentOfferedDraw =
    (drawOfferReceived && drawOfferReceived !== userColor) ||
    (gameState.drawOfferedBy && gameState.drawOfferedBy !== userColor)

  console.log("Draw offer status:", {
    hasOfferedDraw,
    opponentOfferedDraw,
    drawOfferReceived,
    gameStateDrawOffer: gameState.drawOfferedBy,
    userColor,
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/Dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Rooms
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-amber-600 rounded flex items-center justify-center">
                  <span className="text-slate-900 font-bold text-sm">♔</span>
                </div>
                <span className="text-white font-semibold">{gameState?.roomName || `Room: ${roomId.slice(-8)}`}</span>
                {gameState?.isPrivate && (
                  <span title="Private Room">
                    <Lock className="w-4 h-4 text-amber-400" />
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-slate-300 text-sm">{connected ? "Connected" : "Disconnected"}</span>
              <Badge
                variant={gameState.status === "playing" ? "default" : "secondary"}
                className={gameState.status === "playing" ? "bg-green-600" : "bg-yellow-600"}
              >
                {gameState.status === "waiting"
                  ? "Waiting for opponent"
                  : gameState.status === "playing"
                    ? "Game in progress"
                    : "Game finished"}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Draw Offer Alert */}
        {opponentOfferedDraw && (
          <Alert className="mb-6 bg-blue-900/50 border-blue-700">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-blue-200">
              <div className="font-semibold mb-2">Your opponent has offered a draw!</div>
              <div className="text-sm mb-3">Do you want to accept the draw and end the game?</div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => handleRespondToDraw(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Accept Draw
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRespondToDraw(false)}
                  className="border-red-600 text-red-400 hover:bg-red-900/20"
                >
                  Decline Draw
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Draw Offered by User Alert */}
        {hasOfferedDraw && !opponentOfferedDraw && (
          <Alert className="mb-6 bg-yellow-900/50 border-yellow-700">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-yellow-200">
              <div className="font-semibold">Draw offer sent!</div>
              <div className="text-sm mt-1">Waiting for your opponent's response...</div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Game Board */}
          <div className="lg:col-span-3">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <RealtimeChessBoard
                  boardState={gameState.boardState}
                  currentTurn={gameState.currentTurn}
                  userColor={userColor}
                  isUserTurn={isUserTurn}
                  disabled={gameState.status !== "playing"}
                  gameState={gameState}
                  onMove={handleMakeMove}
                />
              </CardContent>
            </Card>
          </div>

          {/* Game Info Sidebar */}
          <div className="space-y-6">
            {/* Players */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Players
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {players.map((player, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-4 h-4 rounded-full ${
                          player.color === "white" ? "bg-white" : "bg-slate-900 border border-slate-600"
                        }`}
                      />
                      <span className="text-white">{player.name}</span>
                      {gameState.currentTurn === player.color && gameState.status === "playing" && (
                        <span className="text-amber-400 text-sm">●</span>
                      )}
                      {gameState.drawOfferedBy === player.color && (
                        <span className="text-blue-400 text-xs">(offered draw)</span>
                      )}
                    </div>
                    <div className={`w-2 h-2 rounded-full ${player.connected ? "bg-green-500" : "bg-red-500"}`} />
                  </div>
                ))}
                {gameState.spectatorCount > 0 && (
                  <div className="text-slate-400 text-sm">
                    {gameState.spectatorCount} spectator{gameState.spectatorCount !== 1 ? "s" : ""}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Game Timer */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Time Control
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-white">
                    <span>White:</span>
                    <span className="font-mono">10:00</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>Black:</span>
                    <span className="font-mono">10:00</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Game Actions */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 space-y-2">
                <Button
                  variant="outline"
                  className={`w-full bg-transparent border-slate-600 text-white hover:bg-slate-700 ${
                    hasOfferedDraw ? "border-yellow-600 text-yellow-400" : ""
                  }`}
                  disabled={gameState.status !== "playing" || !userColor || hasOfferedDraw}
                  onClick={handleOfferDraw}
                >
                  {hasOfferedDraw ? "Draw Offered - Waiting..." : "Offer Draw"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full bg-transparent border-red-600 text-red-400 hover:bg-red-900/20"
                  disabled={gameState.status !== "playing" || !userColor}
                  onClick={handleResign}
                >
                  Resign
                </Button>
              </CardContent>
            </Card>

            {/* Chat */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Chat
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChat(!showChat)}
                    className="text-slate-400 hover:text-white"
                  >
                    {showChat ? "Hide" : "Show"}
                  </Button>
                </CardTitle>
              </CardHeader>
              {showChat && (
                <CardContent className="space-y-4">
                  <div className="h-32 overflow-y-auto space-y-2 bg-slate-900 rounded p-2">
                    {messages.map((msg) => (
                      <div key={msg.id} className="text-sm">
                        <span className="text-amber-400">{msg.userName}:</span>
                        <span className="text-white ml-2">{msg.message}</span>
                      </div>
                    ))}
                    {messages.length === 0 && <div className="text-slate-500 text-sm">No messages yet...</div>}
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="bg-slate-700 border-slate-600 text-white"
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    />
                    <Button
                      onClick={handleSendMessage}
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-slate-900"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Game Status */}
            {gameState.winner !== undefined && (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 text-center">
                  <div className="text-amber-400 font-semibold text-lg">
                    {gameState.winner === null
                      ? "Game Drawn!"
                      : `${gameState.winner === "white" ? "White" : "Black"} Wins!`}
                  </div>
                  {gameState.endReason && <div className="text-slate-400 text-sm mt-1">by {gameState.endReason}</div>}
                </CardContent>
              </Card>
            )}

            {/* Room Info */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-sm">Room Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Room ID:</span>
                  <span className="text-slate-300 font-mono">{roomId.slice(-8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Time Control:</span>
                  <span className="text-slate-300">{gameState?.timeControl || "10+5"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-slate-300 capitalize">{gameState?.status}</span>
                </div>
                {gameState?.isPrivate && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Privacy:</span>
                    <span className="text-amber-400 flex items-center">
                      <Lock className="w-3 h-3 mr-1" />
                      Private
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Moves:</span>
                  <span className="text-slate-300">{gameState?.moves?.length || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
