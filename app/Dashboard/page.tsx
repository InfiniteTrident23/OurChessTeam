"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Users, Clock, LogOut, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Mock room data
const mockRooms = [
  {
    id: "room-1",
    name: "Beginner's Paradise",
    players: 1,
    maxPlayers: 2,
    timeControl: "10+5",
    status: "waiting",
    host: "ChessLover123",
  },
  {
    id: "room-2",
    name: "Rapid Fire Challenge",
    players: 2,
    maxPlayers: 2,
    timeControl: "5+3",
    status: "playing",
    host: "GrandMaster99",
  },
  {
    id: "room-3",
    name: "Casual Friday",
    players: 1,
    maxPlayers: 2,
    timeControl: "15+10",
    status: "waiting",
    host: "PawnPusher",
  },
]

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [rooms, setRooms] = useState(mockRooms)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newRoomName, setNewRoomName] = useState("")
  const [timeControl, setTimeControl] = useState("10+5")
  const [userEmail, setUserEmail] = useState("")
  const router = useRouter()

  useEffect(() => {
    setMounted(true)

    // Check if user is logged in
    const isLoggedIn = localStorage.getItem("isLoggedIn")
    const email = localStorage.getItem("userEmail")

    //if (!isLoggedIn) {
      //router.push("/login")
      //return
    //}

    if (email) {
      setUserEmail(email)
    }
  }, [router])

  if (!mounted) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
  }

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("userEmail")
    router.push("/")
  }

  const handleCreateRoom = () => {
    if (newRoomName.trim()) {
      const newRoom = {
        id: `room-${Date.now()}`,
        name: newRoomName,
        players: 1,
        maxPlayers: 2,
        timeControl,
        status: "waiting" as const,
        host: userEmail.split("@")[0],
      }
      setRooms([newRoom, ...rooms])
      setNewRoomName("")
      setIsCreateDialogOpen(false)
      // Navigate to the new room
      router.push(`/game/${newRoom.id}`)
    }
  }

  const handleJoinRoom = (roomId: string) => {
    router.push(`/game/${roomId}`)
  }

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
              <h1 className="text-2xl font-bold text-white">OurChessTeam</h1>
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
          </div>

          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-slate-900"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Room
          </Button>
        </div>

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
          {rooms.map((room) => (
            <Card key={room.id} className="bg-slate-800 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">{room.name}</CardTitle>
                  <Badge
                    variant={room.status === "waiting" ? "default" : "secondary"}
                    className={room.status === "waiting" ? "bg-green-600" : "bg-yellow-600"}
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
                <Button
                  onClick={() => handleJoinRoom(room.id)}
                  className="w-full"
                  disabled={room.status === "playing" && room.players >= room.maxPlayers}
                  variant={room.status === "waiting" ? "default" : "secondary"}
                >
                  {room.status === "waiting" ? "Join Room" : "Spectate"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {rooms.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No rooms available</h3>
            <p className="text-slate-300 mb-4">Be the first to create a room and start playing!</p>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-slate-900"
            >
              Create First Room
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
