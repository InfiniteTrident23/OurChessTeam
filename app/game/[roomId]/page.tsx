"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Users, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import ChessBoard from "@/components/chess-board"

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const [userEmail, setUserEmail] = useState("")
  const [gameStatus, setGameStatus] = useState<"waiting" | "playing" | "finished">("waiting")
  const [players, setPlayers] = useState([
    { name: "You", color: "white", connected: true },
    { name: "Waiting for opponent...", color: "black", connected: false },
  ])

  useEffect(() => {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem("isLoggedIn")
    const email = localStorage.getItem("userEmail")

    if (!isLoggedIn) {
      router.push("/login")
      return
    }

    if (email) {
      setUserEmail(email)
    }

    // Simulate opponent joining after 3 seconds
    const timer = setTimeout(() => {
      setPlayers([
        { name: "You", color: "white", connected: true },
        { name: "ChessPlayer42", color: "black", connected: true },
      ])
      setGameStatus("playing")
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

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
                <span className="text-white font-semibold">Room: {roomId}</span>
              </div>
            </div>
            <Badge
              variant={gameStatus === "playing" ? "default" : "secondary"}
              className={gameStatus === "playing" ? "bg-green-600" : "bg-yellow-600"}
            >
              {gameStatus === "waiting" ? "Waiting for opponent" : "Game in progress"}
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Game Board */}
          <div className="lg:col-span-3">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <ChessBoard disabled={gameStatus !== "playing"} />
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
                        className={`w-4 h-4 rounded-full ${player.color === "white" ? "bg-white" : "bg-slate-900 border border-slate-600"}`}
                      />
                      <span className="text-white">{player.name}</span>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${player.connected ? "bg-green-500" : "bg-red-500"}`} />
                  </div>
                ))}
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
                  disabled={gameStatus !== "playing"}
                >
                  Offer Draw
                </Button>
                <Button
                  variant="outline"
                  className="w-full bg-transparent border-red-600 text-red-400 hover:bg-red-900/20"
                  disabled={gameStatus !== "playing"}
                >
                  Resign
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
