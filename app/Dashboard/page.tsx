"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Users, Clock, LogOut, X, Search, Trophy, Gamepad2, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Leaderboard from "@/components/leaderboard"
import { getOrCreateUser } from "@/lib/supabase"

interface Room {
  id: string
  name: string
  players: number
  maxPlayers: number
  timeControl: string
  status: string
  host: string
  hostTrophies: number // Added to enable trophy-based matching
}

interface UserStats {
  username: string
  classicalrating: number
}

const DashboardPage = () => {
  const [showStartPlayingModal, setShowStartPlayingModal] = useState(false)
  const [roomName, setRoomName] = useState("")
  const [timeControl, setTimeControl] = useState("10+5")
  const [userEmail, setUserEmail] = useState("")
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [activeGames, setActiveGames] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchingMatch, setSearchingMatch] = useState(false)
  const [activeTab, setActiveTab] = useState("games")
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const isLoggedIn = localStorage.getItem("isLoggedIn")
    const email = localStorage.getItem("userEmail")

    if (!isLoggedIn) {
      router.push("/login")
      return
    }

    if (email) {
      setUserEmail(email)
      getOrCreateUser(email).catch(console.error)
    }
  }, [router])

  useEffect(() => {
    const fetchUserStats = async () => {
      if (userEmail) {
        try {
          const response = await fetch(`/api/user-stats?email=${encodeURIComponent(userEmail)}`)
          if (response.ok) {
            const data = await response.json()
            setUserStats(data.user)
          } else {
            console.warn("Failed to fetch user stats for dashboard:", response.status)
          }
        } catch (error) {
          console.error("Error fetching user stats for dashboard:", error)
        }
      }
    }

    if (mounted) {
      fetchUserStats()
    }
  }, [userEmail, mounted])

  useEffect(() => {
    const fetchActiveGames = async () => {
      try {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"
        const response = await fetch(`${socketUrl}/games`)
        if (response.ok) {
          const games = await response.json()
          const activeOnlyGames = games.filter((game: any) => game.status !== "finished")
          setActiveGames(activeOnlyGames)
        }
      } catch (error) {
        console.log("Could not fetch active games:", error)
      }
    }

    if (mounted) {
      fetchActiveGames()
      const interval = setInterval(fetchActiveGames, 5000)
      return () => clearInterval(interval)
    }
  }, [mounted])

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("userEmail")
    router.push("/")
  }

  const createRoom = () => {
    if (roomName.trim()) {
      const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      setRoomName("")
      setShowStartPlayingModal(false)
      router.push(`/game/${roomId}?timeControl=${timeControl}`)
    }
  }

  const findMatchByTrophies = () => {
    console.log("Finding match by trophies...")
    setSearchingMatch(true)

    if (!userStats) {
      alert("Your stats are not loaded yet. Please wait a moment.")
      setSearchingMatch(false)
      return
    }

    const currentUserTrophies = userStats.classicalrating
    const waitingRooms = allRooms.filter(
      (room) => room.status === "waiting" && room.players < 2,
    )

    if (waitingRooms.length === 0) {
      setTimeout(() => {
        alert("No waiting rooms available. Try creating a room!")
        setSearchingMatch(false)
      }, 1000)
      return
    }

    // Find opponents with a higher trophy count
    const strongerOpponents = waitingRooms.filter(
      (room) => room.hostTrophies >= currentUserTrophies,
    )

    let bestMatch: Room | null = null

    if (strongerOpponents.length > 0) {
      // If there are stronger opponents, find the one with the closest (lowest) trophy count among them
      strongerOpponents.sort((a, b) => a.hostTrophies - b.hostTrophies)
      bestMatch = strongerOpponents[0]
    } else if (waitingRooms.length > 0) {
      // Fallback: If no one is ranked higher, match with the highest-ranked available player (closest below)
      waitingRooms.sort((a, b) => b.hostTrophies - a.hostTrophies)
      bestMatch = waitingRooms[0]
    }

    setTimeout(() => {
      if (bestMatch) {
        console.log(
          `Match found! Joining room ${bestMatch.id} with host ${bestMatch.host} (${bestMatch.hostTrophies} trophies).`,
        )
        handleJoinRoom(bestMatch.id)
      } else {
        // This case should ideally not be reached if there are waiting rooms, but it's a safe fallback.
        alert("No suitable match found. Try creating a room instead!")
      }
      setSearchingMatch(false)
    }, 2000)
  }

  const handleJoinRoom = (roomId: string) => {
    router.push(`/game/${roomId}`)
  }

  const allRooms: Room[] = activeGames.map(
    (game): Room => ({
      id: game.roomId,
      name: game.roomName || `Game ${game.roomId.slice(-8)}`,
      players: (game.whitePlayer ? 1 : 0) + (game.blackPlayer ? 1 : 0),
      maxPlayers: 2,
      timeControl: game.timeControl || "10+5",
      status: game.status,
      host: game.whitePlayer?.split("@")[0] || "Unknown",
      hostTrophies: game.hostTrophies || 0,
    }),
  )

  const filteredRooms = allRooms.filter((room) => {
    const query = searchQuery.toLowerCase()
    return (
      room.name.toLowerCase().includes(query) ||
      room.host.toLowerCase().includes(query) ||
      room.id.toLowerCase().includes(query) ||
      room.status.toLowerCase().includes(query)
    )
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                <span className="text-slate-900 font-bold text-lg">♔</span>
              </div>
              <h1 className="text-2xl font-bold text-white">ChessMaster</h1>
            </Link>
            <div className="flex items-center space-x-4">
              {userStats ? (
                <>
                  <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1">
                    <div className="flex items-center space-x-2 text-amber-400">
                      <Trophy className="w-4 h-4" />
                      <span className="font-semibold">{userStats.classicalrating}</span>
                    </div>
                  </div>
                  <span className="text-slate-300">Welcome, {userStats.username}</span>
                </>
              ) : (
                <span className="text-slate-400">Loading user...</span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="bg-transparent border-slate-600 text-white hover:bg-slate-800"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Dashboard</h2>
            <p className="text-slate-300">Play games and climb the leaderboard</p>
          </div>

          <Button
            onClick={() => setShowStartPlayingModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-slate-900"
          >
            <Gamepad2 className="w-4 h-4 mr-2" />
            Start Playing
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="games" className="data-[state=active]:bg-slate-700">
              <Gamepad2 className="w-4 h-4 mr-2" />
              Game Rooms
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-slate-700">
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="games" className="space-y-6">
            {allRooms.length > 0 && (
              <div className="mb-6">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search rooms by name, host, or room ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
                {searchQuery && (
                  <p className="text-slate-400 text-sm mt-2">
                    {filteredRooms.length} room{filteredRooms.length !== 1 ? "s" : ""} found
                  </p>
                )}
              </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRooms.map((room) => (
                <Card key={room.id} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white">{room.name}</CardTitle>
                      <Badge
                        variant={room.status === "waiting" ? "default" : "secondary"}
                        className={
                          room.status === "waiting"
                            ? "bg-green-600"
                            : room.status === "playing"
                            ? "bg-blue-600"
                            : "bg-yellow-600"
                        }
                      >
                        {room.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-slate-300">Host: {room.host}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-slate-300">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        <span>
                          {room.players}/{room.maxPlayers} players
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>{room.timeControl}</span>
                      </div>
                    </div>
                    <div className="text-slate-400 text-xs">Room ID: {room.id.slice(-12)}</div>
                    <Button
                      onClick={() => handleJoinRoom(room.id)}
                      className="w-full"
                      variant={room.players < 2 ? "default" : "secondary"}
                      disabled={room.players >= 2}
                    >
                      {room.players < 2 ? "Join Room" : "Spectate"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {allRooms.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No active rooms</h3>
                <p className="text-slate-300 mb-4">Be the first to create a room and start playing!</p>
                <Button
                  onClick={() => setShowStartPlayingModal(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-slate-900"
                >
                  Start Playing
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="leaderboard">
            <Leaderboard userEmail={userEmail} />
          </TabsContent>
        </Tabs>

        {/* Start Playing Modal */}
        {showStartPlayingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Start Playing</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStartPlayingModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-slate-300 mb-6">Choose how you want to start your game</p>

              <div className="space-y-4">
                <Card className="bg-slate-700 border-slate-600 hover:border-slate-500 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Zap className="w-5 h-5 text-amber-400 mr-3" />
                        <div>
                          <h4 className="text-white font-medium">Join Game</h4>
                          <p className="text-slate-400 text-sm">Match with similar skill level</p>
                        </div>
                      </div>
                      <div className="flex items-center text-slate-400 text-sm">
                        <Trophy className="w-4 h-4 mr-1" />
                        {userStats ? userStats.classicalrating : "..."}
                      </div>
                    </div>
                    <Button
                      onClick={findMatchByTrophies}
                      disabled={searchingMatch || allRooms.filter(r => r.status === 'waiting').length === 0}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      {searchingMatch ? "Finding Match..." : allRooms.filter(r => r.status === 'waiting').length === 0 ? "No Games Available" : "Join Game"}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-slate-700 border-slate-600">
                  <CardContent className="p-4">
                    <div className="flex items-center mb-3">
                      <Plus className="w-5 h-5 text-amber-400 mr-3" />
                      <div>
                        <h4 className="text-white font-medium">Create Room</h4>
                        <p className="text-slate-400 text-sm">Set up a custom game</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="roomName" className="text-white text-sm">
                          Room Name
                        </Label>
                        <Input
                          id="roomName"
                          placeholder="Enter room name"
                          value={roomName}
                          onChange={(e) => setRoomName(e.target.value)}
                          className="bg-slate-600 border-slate-500 text-white text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timeControl" className="text-white text-sm">
                          Time Control
                        </Label>
                        <select
                          id="timeControl"
                          value={timeControl}
                          onChange={(e) => setTimeControl(e.target.value)}
                          className="w-full p-2 bg-slate-600 border border-slate-500 rounded-md text-white text-sm"
                        >
                          <option value="3+2">3 + 2 (Blitz)</option>
                          <option value="5+3">5 + 3 (Blitz)</option>
                          <option value="10+5">10 + 5 (Rapid)</option>
                          <option value="15+10">15 + 10 (Rapid)</option>
                          <option value="30+0">30 + 0 (Classical)</option>
                        </select>
                      </div>
                      <Button
                        onClick={createRoom}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-slate-900"
                        disabled={!roomName.trim()}
                      >
                        Create Room
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-2 text-slate-400 text-sm">
            <div className={`w-2 h-2 rounded-full ${activeGames.length >= 0 ? "bg-green-500" : "bg-red-500"}`} />
            <span>
              Game server: {activeGames.length >= 0 ? "Connected" : "Disconnected"}
              {activeGames.length > 0 && ` • ${activeGames.length} active games`}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
