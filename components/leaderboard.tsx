"use client"

import { useState, useEffect } from "react"
import { Trophy, Medal, Award, TrendingUp, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface LeaderboardEntry {
  username: string
  email: string
  classicalrating: number
  games_played: number
  games_won: number
  games_lost: number
  games_drawn: number
}

interface UserStats {
  id: string
  email: string
  username: string
  classicalrating: number
  games_played: number
  games_won: number
  games_lost: number
  games_drawn: number
  created_at: string
  updated_at: string
}

interface LeaderboardProps {
  userEmail: string
}

export default function Leaderboard({ userEmail }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      setDebugInfo("")

      console.log("Fetching leaderboard data for user:", userEmail)

      // Fetch leaderboard data via API
      const leaderboardResponse = await fetch("/api/leaderboard")
      console.log("Leaderboard response status:", leaderboardResponse.status)

      if (!leaderboardResponse.ok) {
        const errorText = await leaderboardResponse.text()
        console.error("Leaderboard API error:", errorText)
        throw new Error(`Failed to fetch leaderboard: ${leaderboardResponse.status} ${errorText}`)
      }

      const leaderboardData = await leaderboardResponse.json()
      console.log("Leaderboard data received:", leaderboardData)

      // Fetch user stats via API
      const userResponse = await fetch(`/api/user-stats?email=${encodeURIComponent(userEmail)}`)
      console.log("User stats response status:", userResponse.status)

      let userData = null
      if (userResponse.ok) {
        userData = await userResponse.json()
        console.log("User stats data received:", userData)
      } else {
        console.warn("Failed to fetch user stats:", userResponse.status)
      }

      setLeaderboard(leaderboardData.leaderboard || [])
      setUserStats(userData?.user || null)
    } catch (err) {
      console.error("Error fetching leaderboard:", err)
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      setError(errorMessage)
      setDebugInfo(`Error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userEmail) {
      fetchLeaderboardData()
    }
  }, [userEmail])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />
      default:
        return (
          <span className="w-5 h-5 flex items-center justify-center text-slate-400 font-bold text-sm">#{rank}</span>
        )
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-500/30"
      case 2:
        return "bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30"
      case 3:
        return "bg-gradient-to-r from-amber-600/20 to-amber-700/20 border-amber-600/30"
      default:
        return "bg-slate-800 border-slate-700"
    }
  }

  const getTrophyColor = (trophies: number) => {
    if (trophies >= 1000) return "text-purple-400"
    if (trophies >= 800) return "text-blue-400"
    if (trophies >= 600) return "text-green-400"
    if (trophies >= 400) return "text-yellow-400"
    if (trophies >= 200) return "text-orange-400"
    return "text-red-400"
  }

  const getWinRate = (won: number, total: number) => {
    if (total === 0) return 0
    return Math.round((won / total) * 100)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="text-center text-slate-400">Loading leaderboard...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="text-red-400">Failed to load leaderboard</div>
              <div className="text-slate-400 text-sm">{error}</div>
              {debugInfo && <div className="text-slate-500 text-xs font-mono">{debugInfo}</div>}
              <Button onClick={fetchLeaderboardData} className="bg-amber-600 hover:bg-amber-700 text-slate-900">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Find user's rank in leaderboard
  const userRank = leaderboard.findIndex((entry) => entry.email === userEmail) + 1

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      {process.env.NODE_ENV === "development" && debugInfo && (
        <Card className="bg-slate-900 border-slate-600">
          <CardContent className="p-4">
            <div className="text-slate-400 text-xs font-mono">{debugInfo}</div>
          </CardContent>
        </Card>
      )}

      {/* User Stats Card */}
      {userStats && (
        <Card className="bg-gradient-to-r from-amber-900/20 to-amber-800/20 border-amber-700/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <User className="w-5 h-5 mr-2" />
              Your Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getTrophyColor(userStats.classicalrating)}`}>
                  {userStats.classicalrating}
                </div>
                <div className="text-slate-400 text-sm">Trophies</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{userStats.games_played}</div>
                <div className="text-slate-400 text-sm">Games</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{userStats.games_won}</div>
                <div className="text-slate-400 text-sm">Wins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {getWinRate(userStats.games_won, userStats.games_played)}%
                </div>
                <div className="text-slate-400 text-sm">Win Rate</div>
              </div>
            </div>
            {userRank > 0 && (
              <div className="text-center">
                <Badge variant="outline" className="border-amber-600 text-amber-400">
                  Rank #{userRank}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Top Players
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {leaderboard.length === 0 ? (
            <div className="text-center text-slate-400 py-8">No players found. Be the first to play a game!</div>
          ) : (
            leaderboard.map((player, index) => {
              const rank = index + 1
              const isCurrentUser = player.email === userEmail

              return (
                <div
                  key={player.email}
                  className={`p-4 rounded-lg border transition-colors ${getRankColor(rank)} ${
                    isCurrentUser ? "ring-2 ring-amber-500/50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getRankIcon(rank)}
                      <div>
                        <div className="text-white font-semibold flex items-center space-x-2">
                          <span>{player.username}</span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="border-amber-600 text-amber-400 text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="text-slate-400 text-sm">
                          {player.games_played} games • {getWinRate(player.games_won, player.games_played)}% win rate
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${getTrophyColor(player.classicalrating)}`}>
                        {player.classicalrating}
                      </div>
                      <div className="text-slate-400 text-sm">trophies</div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Trophy System Info */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-sm">Trophy System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-slate-300 text-sm space-y-1">
            <div className="flex justify-between">
              <span>Win a game:</span>
              <span className="text-green-400">+100 trophies</span>
            </div>
            <div className="flex justify-between">
              <span>Lose a game:</span>
              <span className="text-red-400">-50 trophies</span>
            </div>
            <div className="flex justify-between">
              <span>Draw a game:</span>
              <span className="text-blue-400">+0 trophies</span>
            </div>
            <div className="flex justify-between">
              <span>Starting trophies:</span>
              <span className="text-amber-400">200 trophies</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
