"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Users, Clock, LogOut, X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Updated Room interface without isLive
interface Room {
  id: string
  name: string
  players: number
  maxPlayers: number
  timeControl: string
  status: string
  host: string
}

const DashboardPage = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newRoomName, setNewRoomName] = useState("")
  const [timeControl, setTimeControl] = useState("10+5")
  const [userEmail, setUserEmail] = useState("")
  const [activeGames, setActiveGames] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

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
    }
  }, [router])

  // Fetch active games from Socket.IO server
  useEffect(() => {
    const fetchActiveGames = async () => {
      try {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"
        const response = await fetch(`${socketUrl}/games`)
        if (response.ok) {
          const games = await response.json()
          // Filter out finished games
          const activeOnlyGames = games.filter((game: any) => game.status !== "finished")
          setActiveGames(activeOnlyGames)
          console.log("Active games:", activeOnlyGames)
        }
      } catch (error) {
        console.log("Could not fetch active games:", error)
        // This is fine - server might not be running yet
      }
    }

    if (mounted) {
      fetchActiveGames()
      // Refresh every 5 seconds to get real-time updates
      const interval = setInterval(fetchActiveGames, 5000)
      return () => clearInterval(interval)
    }
  }, [mounted])

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("userEmail")
    router.push("/")
  }

  const handleCreateRoom = () => {
    if (newRoomName.trim()) {
      // Generate a unique room ID
      const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Navigate to the room - the Socket.IO server will create the game
      setNewRoomName("")
      setIsCreateDialogOpen(false)
      router.push(`/game/${roomId}`)
    }
  }

  const handleJoinRoom = (roomId: string) => {
    router.push(`/game/${roomId}`)
  }

  // Convert active games to Room format (no mock data)
  const allRooms: Room[] = activeGames.map(
    (game): Room => ({
      id: game.roomId,
      name: `Game ${game.roomId.slice(-8)}`,
      players: (game.whitePlayer ? 1 : 0) + (game.blackPlayer ? 1 : 0),
      maxPlayers: 2,
      timeControl: "10+5",
      status: game.status,
      host: game.whitePlayer?.split("@")[0] || "Unknown",
    }),
  )

  // Filter rooms based on search query
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
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                <span className="text-slate-900 font-bold text-lg">♔</span>
              </div>
              <h1 className="text-2xl font-bold text-white">ChessMaster</h1>
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-slate-300">Welcome, {userEmail.split("@")[0]}</span>
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
        {/* Dashboard Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Game Rooms</h2>
            <p className="text-slate-300">Create a new room or join an existing one to start playing</p>
            {activeGames.length > 0 && (
              <p className="text-green-400 text-sm mt-1">
                {activeGames.length} active game{activeGames.length !== 1 ? "s" : ""} available
              </p>
            )}
          </div>

          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-slate-900"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Room
          </Button>
        </div>

        {/* Search Bar */}
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

        {/* Create Room Modal */}
        {isCreateDialogOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Create New Room</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-slate-300 mb-6">Set up a new chess room for others to join</p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roomName" className="text-white">
                    Room Name
                  </Label>
                  <Input
                    id="roomName"
                    placeholder="Enter room name"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeControl" className="text-white">
                    Time Control
                  </Label>
                  <select
                    id="timeControl"
                    value={timeControl}
                    onChange={(e) => setTimeControl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                  >
                    <option value="5+3">5+3 (Blitz)</option>
                    <option value="10+5">10+5 (Rapid)</option>
                    <option value="15+10">15+10 (Classical)</option>
                    <option value="30+0">30+0 (Classical)</option>
                  </select>
                </div>
                <Button onClick={handleCreateRoom} className="w-full bg-amber-600 hover:bg-amber-700 text-slate-900">
                  Create Room
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Rooms Grid */}
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
                  variant={room.status === "waiting" ? "default" : "secondary"}
                >
                  {room.status === "waiting" ? "Join Room" : room.status === "playing" ? "Spectate" : "View Game"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {allRooms.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No active rooms</h3>
            <p className="text-slate-300 mb-4">Be the first to create a room and start playing!</p>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-slate-900"
            >
              Create First Room
            </Button>
          </div>
        )}

        {/* No Search Results */}
        {allRooms.length > 0 && filteredRooms.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No rooms found</h3>
            <p className="text-slate-300 mb-4">Try searching with different keywords or create a new room</p>
            <div className="flex justify-center space-x-4">
              <Button
                onClick={() => setSearchQuery("")}
                variant="outline"
                className="bg-transparent border-slate-600 text-white hover:bg-slate-800"
              >
                Clear Search
              </Button>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-slate-900"
              >
                Create Room
              </Button>
            </div>
          </div>
        )}

        {/* Server Status */}
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
