"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Calendar, MapPin, Trophy, Users, Clock, DollarSign, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  created_by: string | null
  created_at: string
  updated_at: string
}

export default function HomePage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  // Fetch tournaments on component mount
  const fetchTournaments = async (isRetry = false) => {
    try {
      if (isRetry) {
        setRetrying(true)
      } else {
        setLoading(true)
      }
      setError(null)

      console.log("Fetching tournaments from API...")

      const response = await fetch("/api/tournaments?limit=6", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("API Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API Error response:", errorText)
        throw new Error(`API Error ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log("API Response data:", data)

      if (data.success) {
        setTournaments(data.tournaments || [])
        console.log("Tournaments loaded successfully:", data.tournaments?.length || 0)
      } else {
        throw new Error(data.error || "Failed to fetch tournaments")
      }
    } catch (err) {
      console.error("Error fetching tournaments:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to load tournaments"
      setError(errorMessage)
    } finally {
      setLoading(false)
      setRetrying(false)
    }
  }

  useEffect(() => {
    fetchTournaments()
  }, [])

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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return dateString
    }
  }

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(":")
      const date = new Date()
      date.setHours(Number.parseInt(hours), Number.parseInt(minutes))
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    } catch {
      return timeString
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                <span className="text-slate-900 font-bold text-lg">♔</span>
              </div>
              <h1 className="text-2xl font-bold text-white">ChessMaster</h1>
            </div>
            <nav className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="outline" className="bg-transparent border-slate-600 text-white hover:bg-slate-800">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-amber-600 hover:bg-amber-700 text-slate-900">Sign Up</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-5xl font-bold text-white mb-6">
            Master the Game of <span className="text-amber-400">Kings</span>
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Join tournaments, play online matches, and compete with chess players from around the world
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/login">
              <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-slate-900">
                Start Playing
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="bg-transparent border-slate-600 text-white hover:bg-slate-800"
              onClick={() => {
                document.getElementById("tournaments")?.scrollIntoView({ behavior: "smooth" })
              }}
            >
              View Tournaments
            </Button>
          </div>
        </div>
      </section>

      {/* Tournaments Section */}
      <section id="tournaments" className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-white mb-4">Upcoming Tournaments</h3>
            <p className="text-slate-300">Compete in prestigious chess tournaments and win amazing prizes</p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="mb-6 bg-red-900/50 border-red-700">
              <AlertDescription className="text-red-200">
                <div className="font-semibold mb-2">Failed to load tournaments</div>
                <div className="text-sm mb-3">{error}</div>
                <Button
                  onClick={() => fetchTournaments(true)}
                  disabled={retrying}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {retrying ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    "Try Again"
                  )}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="text-white text-xl mb-4">Loading tournaments...</div>
              <div className="text-slate-400">Fetching the latest tournament information</div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && tournaments.length === 0 && (
            <div className="text-center py-12">
              <div className="text-slate-400 text-xl mb-2">No tournaments available at the moment</div>
              <p className="text-slate-500 mb-4">Check back soon for exciting tournaments!</p>
              <Button
                onClick={() => fetchTournaments(true)}
                variant="outline"
                className="bg-transparent border-slate-600 text-white hover:bg-slate-800"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          )}

          {/* Tournaments Grid */}
          {!loading && !error && tournaments.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((tournament) => (
                <Card
                  key={tournament.id}
                  className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-all duration-300 hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-white text-lg mb-2">{tournament.name}</CardTitle>
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="secondary" className={`${getStatusColor(tournament.status)} text-white`}>
                            {tournament.status.replace("_", " ").toUpperCase()}
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
                    <CardDescription className="text-slate-300 line-clamp-2">
                      {tournament.description ||
                        "Join this exciting chess tournament and compete with players worldwide!"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Prize Pool */}
                    <div className="flex items-center justify-between bg-gradient-to-r from-amber-900/20 to-amber-800/20 rounded-lg p-3">
                      <div className="flex items-center text-amber-400">
                        <Trophy className="w-4 h-4 mr-2" />
                        <span className="font-semibold">Prize Pool</span>
                      </div>
                      <span className="text-amber-300 font-bold">{tournament.prize_pool}</span>
                    </div>

                    {/* Tournament Details */}
                    <div className="space-y-3">
                      <div className="flex items-center text-slate-300">
                        <Calendar className="w-4 h-4 mr-3 text-slate-400" />
                        <div>
                          <div className="font-medium">{formatDate(tournament.date)}</div>
                          <div className="text-sm text-slate-400">{formatTime(tournament.time)}</div>
                        </div>
                      </div>

                      <div className="flex items-center text-slate-300">
                        <MapPin className="w-4 h-4 mr-3 text-slate-400" />
                        <span>{tournament.location}</span>
                      </div>

                      <div className="flex items-center text-slate-300">
                        <Users className="w-4 h-4 mr-3 text-slate-400" />
                        <span>
                          {tournament.current_participants}/{tournament.max_participants} players
                        </span>
                        <div className="ml-auto">
                          <div className="w-16 bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-amber-500 h-2 rounded-full transition-all duration-300"
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

                      <div className="flex items-center text-slate-300">
                        <Clock className="w-4 h-4 mr-3 text-slate-400" />
                        <span>Time Control: {tournament.time_control}</span>
                      </div>

                      {tournament.entry_fee > 0 && (
                        <div className="flex items-center text-slate-300">
                          <DollarSign className="w-4 h-4 mr-3 text-slate-400" />
                          <span>Entry Fee: ${tournament.entry_fee}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      {tournament.status === "open" ? (
                        <Link href="/Login">
                          <Button className="w-full bg-amber-600 hover:bg-amber-700 text-slate-900">
                            Register Now
                          </Button>
                        </Link>
                      ) : tournament.status === "full" ? (
                        <Button disabled className="w-full" variant="secondary">
                          Tournament Full
                        </Button>
                      ) : tournament.status === "in_progress" ? (
                        <Button disabled className="w-full" variant="secondary">
                          In Progress
                        </Button>
                      ) : tournament.status === "completed" ? (
                        <Button disabled className="w-full" variant="secondary">
                          Completed
                        </Button>
                      ) : (
                        <Button disabled className="w-full" variant="secondary">
                          Cancelled
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* View All Tournaments Link */}
          {!loading && !error && tournaments.length > 0 && (
            <div className="text-center mt-12">
              <Link href="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-800"
                >
                  View All Tournaments
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-slate-800/50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-white mb-4">Why Choose ChessMaster?</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-slate-900" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Tournaments</h4>
              <p className="text-slate-300">Participate in regular tournaments with cash prizes and rankings</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-slate-900" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Online Rooms</h4>
              <p className="text-slate-300">Create or join game rooms to play with friends or strangers</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-slate-900">♔</span>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Skill Building</h4>
              <p className="text-slate-300">Improve your game with analysis tools and practice modes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <h3 className="text-3xl font-bold text-white mb-4">Ready to Start Playing?</h3>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Join thousands of chess players and start your journey to becoming a chess master
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/register">
              <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-slate-900">
                Create Free Account
              </Button>
            </Link>
            <Link href="/Login">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-slate-600 text-white hover:bg-slate-800"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
