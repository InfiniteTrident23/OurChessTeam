"use client"

import Link from "next/link"
import { Calendar, MapPin, Trophy, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Mock tournament data
const tournaments = [
  {
    id: 1,
    name: "Spring Championship 2024",
    date: "2024-03-15",
    time: "14:00",
    location: "Chess Center Downtown",
    participants: 64,
    maxParticipants: 128,
    prizePool: "$5,000",
    status: "open",
  },
  {
    id: 2,
    name: "Rapid Fire Tournament",
    date: "2024-03-22",
    time: "18:00",
    location: "Online",
    participants: 32,
    maxParticipants: 64,
    prizePool: "$1,500",
    status: "open",
  },
  {
    id: 3,
    name: "Masters Invitational",
    date: "2024-04-05",
    time: "10:00",
    location: "Grand Chess Hall",
    participants: 16,
    maxParticipants: 16,
    prizePool: "$10,000",
    status: "full",
  },
]

export default function HomePage() {
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
              <h1 className="text-2xl font-bold text-white">OurChessTeam</h1>
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
            >
              View Tournaments
            </Button>
          </div>
        </div>
      </section>

      {/* Tournaments Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-white mb-4">Upcoming Tournaments</h3>
            <p className="text-slate-300">Compete in prestigious chess tournaments and win amazing prizes</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <Card key={tournament.id} className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">{tournament.name}</CardTitle>
                    <Badge
                      variant={tournament.status === "open" ? "default" : "secondary"}
                      className={tournament.status === "open" ? "bg-green-600" : "bg-red-600"}
                    >
                      {tournament.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-slate-300">Prize Pool: {tournament.prizePool}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center text-slate-300">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>
                      {tournament.date} at {tournament.time}
                    </span>
                  </div>
                  <div className="flex items-center text-slate-300">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{tournament.location}</span>
                  </div>
                  <div className="flex items-center text-slate-300">
                    <Users className="w-4 h-4 mr-2" />
                    <span>
                      {tournament.participants}/{tournament.maxParticipants} players
                    </span>
                  </div>
                  <Button
                    className="w-full"
                    disabled={tournament.status === "full"}
                    variant={tournament.status === "open" ? "default" : "secondary"}
                  >
                    {tournament.status === "open" ? "Register Now" : "Tournament Full"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-slate-800/50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-white mb-4">Why Choose OurChessTeam?</h3>
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
    </div>
  )
}
