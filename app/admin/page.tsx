"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Users,
  Trophy,
  Calendar,
  Gamepad2Icon as GameController2,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Loader2,
  LogOut,
  BarChart3,
} from "lucide-react"

interface Tournament {
  id: string
  name: string
  description: string
  date: string
  time: string
  location: string
  max_participants: number
  current_participants: number
  prize_pool: string
  entry_fee: number
  status: "open" | "closed" | "completed"
  tournament_type: "classical" | "rapid" | "blitz"
  time_control: string
}

interface User {
  id: string
  username: string
  email: string
  classicalRating: number
  games_played: number
  games_won: number
  games_lost: number
  games_drawn: number
  created_at: string
}

interface AdminStats {
  totalUsers: number
  totalTournaments: number
  activeTournaments: number
  totalGames: number
  activeGames: number
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [leaderboard, setLeaderboard] = useState<User[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  // Form state for tournament creation/editing
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    date: "",
    time: "",
    location: "",
    max_participants: 32,
    prize_pool: "",
    entry_fee: 0,
    status: "open" as "open" | "closed" | "completed",
    tournament_type: "classical" as "classical" | "rapid" | "blitz",
    time_control: "90+30",
  })

  useEffect(() => {
    // Check if user is admin
    const storedUser = localStorage.getItem("user")
    const isAdmin = localStorage.getItem("isAdmin")

    if (!storedUser || !isAdmin) {
      router.push("/login")
      return
    }

    try {
      const userData = JSON.parse(storedUser)
      if (!userData.isAdmin) {
        router.push("/dashboard")
        return
      }
      setUser(userData)
    } catch (error) {
      console.error("Error parsing user data:", error)
      router.push("/login")
      return
    }

    // Load initial data
    loadDashboardData()
  }, [router])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      // Load tournaments, leaderboard, and stats in parallel
      const [tournamentsRes, leaderboardRes, statsRes] = await Promise.all([
        fetch("/api/admin/tournaments"),
        fetch("/api/leaderboard"),
        fetch("/api/admin/stats"),
      ])

      if (tournamentsRes.ok) {
        const tournamentsData = await tournamentsRes.json()
        setTournaments(tournamentsData.tournaments || [])
      }

      if (leaderboardRes.ok) {
        const leaderboardData = await leaderboardRes.json()
        setLeaderboard(leaderboardData.leaderboard || [])
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.stats)
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error)
      setError("Failed to load dashboard data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.clear()
    router.push("/login")
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      date: "",
      time: "",
      location: "",
      max_participants: 32,
      prize_pool: "",
      entry_fee: 0,
      status: "open",
      tournament_type: "classical",
      time_control: "90+30",
    })
  }

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const response = await fetch("/api/admin/tournaments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setTournaments([data.tournament, ...tournaments])
        setIsCreateDialogOpen(false)
        resetForm()
      } else {
        setError(data.message || "Failed to create tournament")
      }
    } catch (error) {
      console.error("Error creating tournament:", error)
      setError("Failed to create tournament")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditTournament = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTournament) return

    setIsSubmitting(true)
    setError("")

    try {
      const response = await fetch(`/api/admin/tournaments/${selectedTournament.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setTournaments(tournaments.map((t) => (t.id === selectedTournament.id ? data.tournament : t)))
        setIsEditDialogOpen(false)
        setSelectedTournament(null)
        resetForm()
      } else {
        setError(data.message || "Failed to update tournament")
      }
    } catch (error) {
      console.error("Error updating tournament:", error)
      setError("Failed to update tournament")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTournament = async (tournamentId: string) => {
    if (!confirm("Are you sure you want to delete this tournament?")) return

    try {
      const response = await fetch(`/api/admin/tournaments/${tournamentId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setTournaments(tournaments.filter((t) => t.id !== tournamentId))
      } else {
        const data = await response.json()
        setError(data.message || "Failed to delete tournament")
      }
    } catch (error) {
      console.error("Error deleting tournament:", error)
      setError("Failed to delete tournament")
    }
  }

  const openEditDialog = (tournament: Tournament) => {
    setSelectedTournament(tournament)
    setFormData({
      name: tournament.name,
      description: tournament.description,
      date: tournament.date,
      time: tournament.time,
      location: tournament.location,
      max_participants: tournament.max_participants,
      prize_pool: tournament.prize_pool,
      entry_fee: tournament.entry_fee,
      status: tournament.status,
      tournament_type: tournament.tournament_type,
      time_control: tournament.time_control,
    })
    setIsEditDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      open: "bg-green-900 text-green-300 border-green-700",
      closed: "bg-red-900 text-red-300 border-red-700",
      completed: "bg-blue-900 text-blue-300 border-blue-700",
    }
    return variants[status as keyof typeof variants] || variants.open
  }

  const getTypeBadge = (type: string) => {
    const variants = {
      classical: "bg-amber-900 text-amber-300 border-amber-700",
      rapid: "bg-orange-900 text-orange-300 border-orange-700",
      blitz: "bg-red-900 text-red-300 border-red-700",
    }
    return variants[type as keyof typeof variants] || variants.classical
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400 mx-auto mb-4" />
          <p className="text-slate-300">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-slate-900 font-bold">♔</span>
                </div>
                <h1 className="text-xl font-bold text-white">ChessMaster Admin</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-slate-300">Welcome, {user?.username}</span>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert className="mb-6 bg-red-900/50 border-red-700">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-amber-400" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">Total Users</p>
                    <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Trophy className="h-8 w-8 text-amber-400" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">Tournaments</p>
                    <p className="text-2xl font-bold text-white">{stats.totalTournaments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-amber-400" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">Active</p>
                    <p className="text-2xl font-bold text-white">{stats.activeTournaments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <GameController2 className="h-8 w-8 text-amber-400" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">Total Games</p>
                    <p className="text-2xl font-bold text-white">{stats.totalGames}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-amber-400" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">Active Games</p>
                    <p className="text-2xl font-bold text-white">{stats.activeGames}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="tournaments" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger
              value="tournaments"
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-slate-900"
            >
              Tournaments
            </TabsTrigger>
            <TabsTrigger
              value="leaderboard"
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-slate-900"
            >
              Leaderboard
            </TabsTrigger>
          </TabsList>

          {/* Tournaments Tab */}
          <TabsContent value="tournaments" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Tournament Management</h2>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-amber-600 hover:bg-amber-700 text-slate-900">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Tournament
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Tournament</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Fill in the details to create a new tournament.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateTournament} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-slate-300">
                          Tournament Name
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location" className="text-slate-300">
                          Location
                        </Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          required
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-slate-300">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        required
                        className="bg-slate-700 border-slate-600 text-white"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date" className="text-slate-300">
                          Date
                        </Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          required
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time" className="text-slate-300">
                          Time
                        </Label>
                        <Input
                          id="time"
                          type="time"
                          value={formData.time}
                          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                          required
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="max_participants" className="text-slate-300">
                          Max Participants
                        </Label>
                        <Input
                          id="max_participants"
                          type="number"
                          value={formData.max_participants}
                          onChange={(e) =>
                            setFormData({ ...formData, max_participants: Number.parseInt(e.target.value) })
                          }
                          required
                          min="8"
                          max="256"
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="entry_fee" className="text-slate-300">
                          Entry Fee ($)
                        </Label>
                        <Input
                          id="entry_fee"
                          type="number"
                          step="0.01"
                          value={formData.entry_fee}
                          onChange={(e) => setFormData({ ...formData, entry_fee: Number.parseFloat(e.target.value) })}
                          required
                          min="0"
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="prize_pool" className="text-slate-300">
                          Prize Pool
                        </Label>
                        <Input
                          id="prize_pool"
                          value={formData.prize_pool}
                          onChange={(e) => setFormData({ ...formData, prize_pool: e.target.value })}
                          required
                          placeholder="e.g., $1,000"
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tournament_type" className="text-slate-300">
                          Type
                        </Label>
                        <Select
                          value={formData.tournament_type}
                          onValueChange={(value: "classical" | "rapid" | "blitz") =>
                            setFormData({ ...formData, tournament_type: value })
                          }
                        >
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="classical">Classical</SelectItem>
                            <SelectItem value="rapid">Rapid</SelectItem>
                            <SelectItem value="blitz">Blitz</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time_control" className="text-slate-300">
                          Time Control
                        </Label>
                        <Input
                          id="time_control"
                          value={formData.time_control}
                          onChange={(e) => setFormData({ ...formData, time_control: e.target.value })}
                          required
                          placeholder="e.g., 90+30"
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status" className="text-slate-300">
                          Status
                        </Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value: "open" | "closed" | "completed") =>
                            setFormData({ ...formData, status: value })
                          }
                        >
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-amber-600 hover:bg-amber-700 text-slate-900"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Tournament"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Tournaments List */}
            <div className="grid gap-6">
              {tournaments.map((tournament) => (
                <Card key={tournament.id} className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-white">{tournament.name}</CardTitle>
                        <CardDescription className="text-slate-400 mt-1">{tournament.description}</CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Badge className={getStatusBadge(tournament.status)}>{tournament.status}</Badge>
                        <Badge className={getTypeBadge(tournament.tournament_type)}>{tournament.tournament_type}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-slate-400">Date & Time</p>
                        <p className="text-white">
                          {tournament.date} at {tournament.time}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Location</p>
                        <p className="text-white">{tournament.location}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Participants</p>
                        <p className="text-white">
                          {tournament.current_participants}/{tournament.max_participants}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Prize Pool</p>
                        <p className="text-white">{tournament.prize_pool}</p>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        onClick={() => openEditDialog(tournament)}
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteTournament(tournament.id)}
                        variant="outline"
                        size="sm"
                        className="border-red-600 text-red-400 hover:bg-red-900/50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Player Leaderboard</h2>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          Player
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          Rating
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          Games
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          W/L/D
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          Joined
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {leaderboard.map((player, index) => (
                        <tr key={player.id} className="hover:bg-slate-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-lg font-bold text-amber-400">#{index + 1}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-white">{player.username}</div>
                              <div className="text-sm text-slate-400">{player.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-lg font-bold text-amber-400">{player.classicalRating}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-white">{player.games_played}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-green-400">{player.games_won}</span>/
                            <span className="text-red-400">{player.games_lost}</span>/
                            <span className="text-yellow-400">{player.games_drawn}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                            {new Date(player.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Tournament Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Tournament</DialogTitle>
              <DialogDescription className="text-slate-400">Update the tournament details.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditTournament} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-slate-300">
                    Tournament Name
                  </Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-location" className="text-slate-300">
                    Location
                  </Label>
                  <Input
                    id="edit-location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-slate-300">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  className="bg-slate-700 border-slate-600 text-white"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-date" className="text-slate-300">
                    Date
                  </Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-time" className="text-slate-300">
                    Time
                  </Label>
                  <Input
                    id="edit-time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-max_participants" className="text-slate-300">
                    Max Participants
                  </Label>
                  <Input
                    id="edit-max_participants"
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) => setFormData({ ...formData, max_participants: Number.parseInt(e.target.value) })}
                    required
                    min="8"
                    max="256"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-entry_fee" className="text-slate-300">
                    Entry Fee ($)
                  </Label>
                  <Input
                    id="edit-entry_fee"
                    type="number"
                    step="0.01"
                    value={formData.entry_fee}
                    onChange={(e) => setFormData({ ...formData, entry_fee: Number.parseFloat(e.target.value) })}
                    required
                    min="0"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-prize_pool" className="text-slate-300">
                    Prize Pool
                  </Label>
                  <Input
                    id="edit-prize_pool"
                    value={formData.prize_pool}
                    onChange={(e) => setFormData({ ...formData, prize_pool: e.target.value })}
                    required
                    placeholder="e.g., $1,000"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-tournament_type" className="text-slate-300">
                    Type
                  </Label>
                  <Select
                    value={formData.tournament_type}
                    onValueChange={(value: "classical" | "rapid" | "blitz") =>
                      setFormData({ ...formData, tournament_type: value })
                    }
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="classical">Classical</SelectItem>
                      <SelectItem value="rapid">Rapid</SelectItem>
                      <SelectItem value="blitz">Blitz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-time_control" className="text-slate-300">
                    Time Control
                  </Label>
                  <Input
                    id="edit-time_control"
                    value={formData.time_control}
                    onChange={(e) => setFormData({ ...formData, time_control: e.target.value })}
                    required
                    placeholder="e.g., 90+30"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status" className="text-slate-300">
                    Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "open" | "closed" | "completed") =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-amber-600 hover:bg-amber-700 text-slate-900"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Tournament"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
