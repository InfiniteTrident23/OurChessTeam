"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Users, Clock, MessageCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import RealtimeChessBoard from "@/components/realtime-chess-board"
import { useSocket } from "@/hooks/useSocket"

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("")
  const [mounted, setMounted] = useState(false)
  const [chatMessage, setChatMessage] = useState("")
  const [showChat, setShowChat] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Check if user is logged in
    const isLoggedIn = localStorage.getItem("isLoggedIn")
    const email = localStorage.getItem("userEmail")

    if (!isLoggedIn) {
      router.push("/login")
      return
    }

    if (email) {
      setUserEmail(email)
      setUserName(email.split("@")[0])
    }
  }, [router])

  const { connected, gameState, messages, error, joinRoom, makeMove, resignGame, sendMessage } = useSocket({
    userEmail,
    userName,
  })

  // Join room when component mounts and user is authenticated
  useEffect(() => {
    if (mounted && userEmail && userName && connected && roomId) {
      console.log("Joining room:", roomId)
      joinRoom(roomId)
    }
  }, [mounted, userEmail, userName, connected, roomId, joinRoom])

  if (!mounted) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
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

  if (error) {
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
    return await makeMove(roomId, from, to, newBoardState, moveData)
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
                <span className="text-white font-semibold">Room: {roomId.slice(-8)}</span>
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
                  className="w-full bg-transparent border-slate-600 text-white hover:bg-slate-700"
                  disabled={gameState.status !== "playing" || !userColor}
                >
                  Offer Draw
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
            {gameState.winner && (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 text-center">
                  <div className="text-amber-400 font-semibold text-lg">
                    {gameState.winner === "white" ? "White" : "Black"} Wins!
                  </div>
                  {gameState.endReason && <div className="text-slate-400 text-sm mt-1">by {gameState.endReason}</div>}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
