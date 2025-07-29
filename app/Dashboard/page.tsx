"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Plus,
  Users,
  Clock,
  LogOut,
  X,
  Search,
  Trophy,
  Gamepad2,
  Zap,
  Lock,
  Copy,
  Eye,
  EyeOff,
  Calendar,
  MapPin,
  DollarSign,
} from "lucide-react"
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
  hostTrophies: number
  isPrivate: boolean
  hasPassword: boolean
}

interface UserStats {
  username: string
  classicalrating: number
}

interface Tournament {
  id: string
  name: string
  description: string | null
  date: string
  time: string
  location: string
  max_participants: number
  current_participants: number
  prize_pool: string
  entry_fee: number
  status: "open" | "full" | "in_progress" | "completed" | "cancelled"
  tournament_type: "classical" | "rapid" | "blitz" | "bullet"
  time_control: string
  registeredAt?: string
}

const DashboardPage = () => {
  const [showStartPlayingModal, setShowStartPlayingModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState("")
  const [roomPassword, setRoomPassword] = useState("")
  const [roomName, setRoomName] = useState("")
  const [timeControl, setTimeControl] = useState("10+5")
  const [roomPrivacy, setRoomPrivacy] = useState("open")
  const [generatedPassword, setGeneratedPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [activeGames, setActiveGames] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchingMatch, setSearchingMatch] = useState(false)
  const [activeTab, setActiveTab] = useState("games")
  const [registeredTournaments, setRegisteredTournaments] = useState<Tournament[]>([])
  const [availableTournaments, setAvailableTournaments] = useState<Tournament[]>([])
  const [tournamentsLoading, setTournamentsLoading] = useState(false)
  const [registering, setRegistering] = useState<string | null>(null)
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

  // Fetch tournaments when the tournaments tab is active
  useEffect(() => {
    if (activeTab === "tournaments" && userEmail && mounted) {
      fetchTournaments()
    }
  }, [activeTab, userEmail, mounted])

  const fetchTournaments = async () => {
    if (!userEmail) return

    setTournamentsLoading(true)
    try {
      const response = await fetch(`/api/user-tournaments?email=${encodeURIComponent(userEmail)}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRegisteredTournaments(data.registeredTournaments || [])
          setAvailableTournaments(data.availableTournaments || [])
        }
      }
    } catch (error) {
      console.error("Error fetching tournaments:", error)
    } finally {
      setTournamentsLoading(false)
    }
  }

  const handleTournamentRegister = async (tournamentId: string) => {
    if (!userEmail || !userStats) return

    setRegistering(tournamentId)
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail,
          userName: userStats.username,
        }),
      })

      const data = await response.json()
      if (data.success) {
        // Refresh tournaments to show updated lists
        await fetchTournaments()
      } else {
        alert(data.error || "Failed to register for tournament")
      }
    } catch (error) {
      console.error("Registration error:", error)
      alert("Network error. Please try again.")
    } finally {
      setRegistering(null)
    }
  }

  // Generate a random 6-character password
  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // Handle privacy selection change
  const handlePrivacyChange = (value: string) => {
    setRoomPrivacy(value)
    if (value === "closed") {
      const password = generatePassword()
      setGeneratedPassword(password)
    } else {
      setGeneratedPassword("")
    }
  }

  const copyPasswordToClipboard = () => {
    navigator.clipboard.writeText(generatedPassword)
    // You could add a toast notification here
  }

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("userEmail")
    router.push("/")
  }

  const createRoom = () => {
    if (roomName.trim()) {
      const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const roomData = {
        roomId,
        roomName: roomName.trim(),
        timeControl,
        isPrivate: roomPrivacy === "closed",
        password: roomPrivacy === "closed" ? generatedPassword : null,
      }

      // Store room data in localStorage for the game page to access
      localStorage.setItem(`room_${roomId}`, JSON.stringify(roomData))

      setRoomName("")
      setRoomPrivacy("open")
      setGeneratedPassword("")
      setShowStartPlayingModal(false)
      router.push(
        `/game/${roomId}?timeControl=${timeControl}&isPrivate=${roomPrivacy === "closed"}&password=${generatedPassword}`,
      )
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
    const waitingRooms = allRooms.filter((room) => room.status === "waiting" && room.players < 2 && !room.isPrivate)

    if (waitingRooms.length === 0) {
      setTimeout(() => {
        alert("No public waiting rooms available. Try creating a room!")
        setSearchingMatch(false)
      }, 1000)
      return
    }

    const strongerOpponents = waitingRooms.filter((room) => room.hostTrophies >= currentUserTrophies)

    let bestMatch: Room | null = null

    if (strongerOpponents.length > 0) {
      strongerOpponents.sort((a, b) => a.hostTrophies - b.hostTrophies)
      bestMatch = strongerOpponents[0]
    } else if (waitingRooms.length > 0) {
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
        alert("No suitable match found. Try creating a room instead!")
      }
      setSearchingMatch(false)
    }, 2000)
  }

  const handleJoinRoom = (roomId: string, requiresPassword = false) => {
    if (requiresPassword) {
      setSelectedRoomId(roomId)
      setShowPasswordModal(true)
    } else {
      router.push(`/game/${roomId}`)
    }
  }

  const joinPrivateRoom = () => {
    if (roomPassword.trim()) {
      router.push(`/game/${selectedRoomId}?password=${encodeURIComponent(roomPassword)}`)
      setShowPasswordModal(false)
      setRoomPassword("")
      setSelectedRoomId("")
    }
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
      isPrivate: game.isPrivate || false,
      hasPassword: game.hasPassword || false,
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":")
    const date = new Date()
    date.setHours(Number.parseInt(hours), Number.parseInt(minutes))
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-600"
      case "full":
        return "bg-red-600"
      case "in_progress":
        return "bg-blue-600"
      case "completed":
        return "bg-gray-600"
      case "cancelled":
        return "bg-yellow-600"
      default:
        return "bg-gray-600"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "classical":
        return "text-blue-400"
      case "rapid":
        return "text-green-400"
      case "blitz":
        return "text-yellow-400"
      case "bullet":
        return "text-red-400"
      default:
        return "text-gray-400"
    }
  }

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
            <TabsTrigger value="tournaments" className="data-[state=active]:bg-slate-700">
              <Calendar className="w-4 h-4 mr-2" />
              Tournaments
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
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-white">{room.name}</CardTitle>
                        {room.isPrivate && (
                          <div className="relative group">
                            <Lock className="w-4 h-4 text-amber-400" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              Private Room
                            </div>
                          </div>
                        )}
                      </div>
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
                      onClick={() => handleJoinRoom(room.id, room.isPrivate && room.players < 2)}
                      className="w-full"
                      variant={room.players < 2 ? "default" : "secondary"}
                      disabled={room.players >= 2}
                    >
                      {room.players < 2 ? (room.isPrivate ? "Join Private Room" : "Join Room") : "Spectate"}
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

          <TabsContent value="tournaments" className="space-y-6">
            {tournamentsLoading ? (
              <div className="text-center py-12">
                <div className="text-white text-xl">Loading tournaments...</div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Registered Tournaments Section */}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-4">Registered Tournaments</h3>
                  {registeredTournaments.length === 0 ? (
                    <Card className="bg-slate-800 border-slate-700">
                      <CardContent className="p-8 text-center">
                        <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-400">You haven't registered for any tournaments yet.</p>
                        <p className="text-slate-500 text-sm mt-2">Check out the available tournaments below!</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {registeredTournaments.map((tournament) => (
                        <Card key={tournament.id} className="bg-slate-800 border-slate-700">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-white text-lg mb-2">{tournament.name}</CardTitle>
                                <div className="flex items-center space-x-2 mb-2">
                                  <Badge variant="secondary" className="bg-green-600 text-white">
                                    REGISTERED
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`border-slate-600 ${getTypeColor(tournament.tournament_type)}`}
                                  >
                                    {tournament.tournament_type.toUpperCase()}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center text-slate-300">
                              <Calendar className="w-4 h-4 mr-3 text-slate-400" />
                              <div>
                                <div className="font-medium">{formatDate(tournament.date)}</div>
                                <div className="text-sm text-slate-400">{formatTime(tournament.time)}</div>
                              </div>
                            </div>
                            <div className="flex items-center text-slate-300">
                              <MapPin className="w-4 h-4 mr-3 text-slate-400" />
                              <span className="text-sm">{tournament.location}</span>
                            </div>
                            <div className="flex items-center text-slate-300">
                              <Users className="w-4 h-4 mr-3 text-slate-400" />
                              <span className="text-sm">
                                {tournament.current_participants}/{tournament.max_participants} players
                              </span>
                            </div>
                            <div className="flex items-center text-amber-400">
                              <Trophy className="w-4 h-4 mr-3" />
                              <span className="font-semibold">{tournament.prize_pool}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Available Tournaments Section */}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-4">Available Tournaments</h3>
                  {availableTournaments.length === 0 ? (
                    <Card className="bg-slate-800 border-slate-700">
                      <CardContent className="p-8 text-center">
                        <Trophy className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-400">No tournaments available for registration at the moment.</p>
                        <p className="text-slate-500 text-sm mt-2">Check back soon for exciting tournaments!</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {availableTournaments.map((tournament) => (
                        <Card
                          key={tournament.id}
                          className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors"
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-white text-lg mb-2">{tournament.name}</CardTitle>
                                <div className="flex items-center space-x-2 mb-2">
                                  <Badge
                                    variant="secondary"
                                    className={`${getStatusColor(tournament.status)} text-white`}
                                  >
                                    {tournament.status.toUpperCase()}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`border-slate-600 ${getTypeColor(tournament.tournament_type)}`}
                                  >
                                    {tournament.tournament_type.toUpperCase()}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center text-slate-300">
                              <Calendar className="w-4 h-4 mr-3 text-slate-400" />
                              <div>
                                <div className="font-medium">{formatDate(tournament.date)}</div>
                                <div className="text-sm text-slate-400">{formatTime(tournament.time)}</div>
                              </div>
                            </div>
                            <div className="flex items-center text-slate-300">
                              <MapPin className="w-4 h-4 mr-3 text-slate-400" />
                              <span className="text-sm">{tournament.location}</span>
                            </div>
                            <div className="flex items-center text-slate-300">
                              <Users className="w-4 h-4 mr-3 text-slate-400" />
                              <span className="text-sm">
                                {tournament.current_participants}/{tournament.max_participants} players
                              </span>
                              <div className="ml-auto">
                                <div className="w-12 bg-slate-700 rounded-full h-1.5">
                                  <div
                                    className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                                    style={{
                                      width: `${Math.min(
                                        (tournament.current_participants / tournament.max_participants) * 100,
                                        100,
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center text-amber-400">
                              <Trophy className="w-4 h-4 mr-3" />
                              <span className="font-semibold">{tournament.prize_pool}</span>
                            </div>
                            {tournament.entry_fee > 0 && (
                              <div className="flex items-center text-slate-300">
                                <DollarSign className="w-4 h-4 mr-3 text-slate-400" />
                                <span className="text-sm">Entry Fee: ${tournament.entry_fee}</span>
                              </div>
                            )}
                            <Button
                              onClick={() => handleTournamentRegister(tournament.id)}
                              disabled={
                                registering === tournament.id ||
                                tournament.current_participants >= tournament.max_participants
                              }
                              className="w-full bg-amber-600 hover:bg-amber-700 text-slate-900"
                            >
                              {registering === tournament.id
                                ? "Registering..."
                                : tournament.current_participants >= tournament.max_participants
                                  ? "Tournament Full"
                                  : "Register"}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
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
                      disabled={
                        searchingMatch || allRooms.filter((r) => r.status === "waiting" && !r.isPrivate).length === 0
                      }
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      {searchingMatch
                        ? "Finding Match..."
                        : allRooms.filter((r) => r.status === "waiting" && !r.isPrivate).length === 0
                          ? "No Public Games Available"
                          : "Join Game"}
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
                        <Label htmlFor="roomPrivacy" className="text-white text-sm">
                          Room Privacy
                        </Label>
                        <select
                          id="roomPrivacy"
                          value={roomPrivacy}
                          onChange={(e) => handlePrivacyChange(e.target.value)}
                          className="w-full p-2 bg-slate-600 border border-slate-500 rounded-md text-white text-sm"
                        >
                          <option value="open">Open - Anyone can join</option>
                          <option value="closed">Closed - Password required</option>
                        </select>
                      </div>
                      {roomPrivacy === "closed" && generatedPassword && (
                        <div className="space-y-2">
                          <Label className="text-white text-sm">Room Password</Label>
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-slate-600 border border-slate-500 rounded-md p-2 text-white text-sm font-mono">
                              {showPassword ? generatedPassword : "••••••"}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowPassword(!showPassword)}
                              className="text-slate-400 hover:text-white"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={copyPasswordToClipboard}
                              className="text-slate-400 hover:text-white"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-slate-400 text-xs">Share this password with players you want to invite</p>
                        </div>
                      )}
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

        {/* Password Modal for Joining Private Rooms */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <Lock className="w-5 h-5 mr-2 text-amber-400" />
                  Private Room
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setRoomPassword("")
                    setSelectedRoomId("")
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-slate-300 mb-6">This room requires a password to join</p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roomPassword" className="text-white text-sm">
                    Room Password
                  </Label>
                  <Input
                    id="roomPassword"
                    type="password"
                    placeholder="Enter room password"
                    value={roomPassword}
                    onChange={(e) => setRoomPassword(e.target.value)}
                    className="bg-slate-600 border-slate-500 text-white text-sm"
                    onKeyPress={(e) => e.key === "Enter" && joinPrivateRoom()}
                  />
                </div>
                <div className="flex space-x-3">
                  <Button
                    onClick={() => {
                      setShowPasswordModal(false)
                      setRoomPassword("")
                      setSelectedRoomId("")
                    }}
                    variant="outline"
                    className="flex-1 bg-transparent border-slate-600 text-white hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={joinPrivateRoom}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-slate-900"
                    disabled={!roomPassword.trim()}
                  >
                    Join Room
                  </Button>
                </div>
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
