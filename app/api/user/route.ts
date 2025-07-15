import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { hash } from "bcryptjs"
import Email from "next-auth/providers/email"

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable")
}

// Create admin client for user management operations
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: "public",
  },
})

export async function POST(req: Request) {
  console.log("=== USER REGISTRATION START ===")

  try {
    const body = await req.json()
    const { email, password, username } = body

    console.log("Registration attempt for:", { email, username })

    // Validate required fields
    if (!email || !password || !username) {
      console.log("Missing required fields")
      return NextResponse.json({ user: null, message: "Email, password, and username are required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log("Invalid email format")
      return NextResponse.json({ user: null, message: "Invalid email format" }, { status: 400 })
    }

    // Validate username
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    if (!usernameRegex.test(username)) {
      console.log("Invalid username format")
      return NextResponse.json(
        {
          user: null,
          message: "Username must be 3-20 characters and contain only letters, numbers, and underscores",
        },
        { status: 400 },
      )
    }

    // Validate password length
    if (password.length < 6) {
      console.log("Password too short")
      return NextResponse.json({ user: null, message: "Password must be at least 6 characters long" }, { status: 400 })
    }

    console.log("Validation passed, checking for existing users...")

    // Test database connection first
    try {
      const { data: testData, error: testError } = await supabaseAdmin.from("users").select("count").limit(1)

      if (testError) {
        console.error("Database connection test failed:", testError)
        return NextResponse.json(
          {
            message: "Database connection failed",
            error: testError.message,
            code: testError.code,
            details: testError.details,
          },
          { status: 500 },
        )
      }
      console.log("Database connection test passed")
    } catch (connectionError) {
      console.error("Database connection error:", connectionError)
      return NextResponse.json(
        {
          message: "Database connection error",
          error: connectionError instanceof Error ? connectionError.message : "Unknown connection error",
        },
        { status: 500 },
      )
    }

    // Check for existing email
    console.log("Checking for existing email...")
    const { data: existingUserByEmail, error: emailCheckError } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("email", email)
      .maybeSingle()

    if (emailCheckError) {
      console.error("Error checking existing email:", {
        message: emailCheckError.message,
        code: emailCheckError.code,
        details: emailCheckError.details,
        hint: emailCheckError.hint,
      })
      return NextResponse.json(
        {
          message: "Database error occurred while checking email",
          error: emailCheckError.message,
          code: emailCheckError.code,
        },
        { status: 500 },
      )
    }

    if (existingUserByEmail) {
      console.log("Email already exists")
      return NextResponse.json({ user: null, message: "Email already in use" }, { status: 409 })
    }

    // Check for existing username
    console.log("Checking for existing username...")
    const { data: existingUserByUsername, error: usernameCheckError } = await supabaseAdmin
      .from("users")
      .select("id, username")
      .eq("username", username)
      .maybeSingle()

    if (usernameCheckError) {
      console.error("Error checking existing username:", {
        message: usernameCheckError.message,
        code: usernameCheckError.code,
        details: usernameCheckError.details,
      })
      return NextResponse.json(
        {
          message: "Database error occurred while checking username",
          error: usernameCheckError.message,
          code: usernameCheckError.code,
        },
        { status: 500 },
      )
    }

    if (existingUserByUsername) {
      console.log("Username already exists")
      return NextResponse.json({ user: null, message: "Username already in use" }, { status: 409 })
    }

    console.log("No existing users found, hashing password...")
    const hashedPassword = await hash(password, 10)

    console.log("Creating new user...")
    const { data: newUser, error: createError } = await supabaseAdmin
      .from("users")
      .insert({
        email: email,
        username: username,
        password: hashedPassword,
        classicalrating: 200,
        games_played: 0,
        games_won: 0,
        games_lost: 0,
        games_drawn: 0,
      })
      .select("id, email, username, classicalrating, games_played, games_won, games_lost, games_drawn, created_at")
      .single()

    if (createError) {
      console.error("Error creating user:", {
        message: createError.message,
        code: createError.code,
        details: createError.details,
        hint: createError.hint,
      })
      return NextResponse.json(
        {
          message: "Failed to create user",
          error: createError.message,
          code: createError.code,
          details: createError.details,
        },
        { status: 500 },
      )
    }

    console.log("User created successfully:", newUser.email)

    return NextResponse.json(
      {
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          trophies: newUser.classicalrating,
          gamesPlayed: newUser.games_played,
          gamesWon: newUser.games_won,
          gamesLost: newUser.games_lost,
          gamesDrawn: newUser.games_drawn,
          createdAt: newUser.created_at,
        },
        message: "User created successfully",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("=== REGISTRATION ERROR ===")
    console.error("Error details:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return NextResponse.json(
      {
        message: "Something went wrong!",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    const username = searchParams.get("username")

    if (!email && !username) {
      return NextResponse.json({ message: "Email or username is required" }, { status: 400 })
    }

    let query = supabaseAdmin
      .from("users")
      .select("id, email, username, classicalrating, games_played, games_won, games_lost, games_drawn, created_at")

    if (email) {
      query = query.eq("email", Email)
    } else if (username) {
      query = query.eq("username", username)
    }

    const { data: user, error } = await query.maybeSingle()

    if (error) {
      console.error("Error fetching user:", error)
      return NextResponse.json(
        {
          message: "Database error occurred",
          error: error.message,
        },
        { status: 500 },
      )
    }

    if (!user) {
      return NextResponse.json({ user: null, message: "User not found" }, { status: 404 })
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          trophies: user.classicalrating,
          gamesPlayed: user.games_played,
          gamesWon: user.games_won,
          gamesLost: user.games_lost,
          gamesDrawn: user.games_drawn,
          createdAt: user.created_at,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json(
      {
        message: "Something went wrong!",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
