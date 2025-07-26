import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { compare } from "bcryptjs"

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable")
}

// Create admin client for user authentication
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
  console.log("=== LOGIN REQUEST START ===")

  try {
    // Parse request body
    let body
    try {
      body = await req.json()
      console.log("Request body parsed successfully")
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError)
      return NextResponse.json(
        {
          user: null,
          message: "Invalid request body",
          error: "Failed to parse JSON",
        },
        { status: 400 },
      )
    }

    console.log("Login attempt with data:", {
      email: body?.email,
      hasPassword: !!body?.password,
      bodyKeys: Object.keys(body || {}),
    })

    const { email, password } = body

    // Validate required fields
    if (!email) {
      console.log("Missing email field")
      return NextResponse.json(
        {
          user: null,
          message: "Email is required",
          field: "email",
        },
        { status: 400 },
      )
    }

    if (!password) {
      console.log("Missing password field")
      return NextResponse.json(
        {
          user: null,
          message: "Password is required",
          field: "password",
        },
        { status: 400 },
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log("Invalid email format:", email)
      return NextResponse.json(
        {
          user: null,
          message: "Invalid email format",
          field: "email",
        },
        { status: 400 },
      )
    }

    console.log("Validation passed, checking for admin user first...")

    // Check if this is an admin user first
    const { data: adminUser, error: adminFetchError } = await supabaseAdmin
      .from("admin_users")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("is_active", true)
      .maybeSingle()

    if (adminFetchError) {
      console.error("Error fetching admin user:", adminFetchError)
    }

    if (adminUser) {
      console.log("Admin user found:", {
        id: adminUser.id,
        email: adminUser.email,
        username: adminUser.username,
        role: adminUser.role,
      })

      // Verify admin password
      let passwordMatch = false
      try {
        passwordMatch = await compare(password, adminUser.password)
        console.log("Admin password verification result:", passwordMatch)
      } catch (compareError) {
        console.error("Admin password comparison error:", compareError)
        return NextResponse.json(
          {
            message: "Password verification failed",
            error: compareError instanceof Error ? compareError.message : "Unknown error",
          },
          { status: 500 },
        )
      }

      if (passwordMatch) {
        // Update admin last login
        try {
          await supabaseAdmin.rpc("update_admin_last_login", {
            admin_email: email.toLowerCase(),
          })
        } catch (updateError) {
          console.error("Failed to update admin last login:", updateError)
        }

        console.log("Admin login successful for:", adminUser.email)

        // Return admin user data in the format expected by the frontend
        const adminData = {
          id: adminUser.id,
          email: adminUser.email,
          username: adminUser.username,
          role: adminUser.role,
          isAdmin: true,
          trophies: 1000, // Default admin trophies
          lastLogin: adminUser.last_login,
          createdAt: adminUser.created_at,
        }

        return NextResponse.json(
          {
            user: adminData,
            message: "Admin login successful",
            redirectTo: "/admin",
          },
          { status: 200 },
        )
      }
    }

    console.log("Not an admin user, checking regular users...")

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

    // Find regular user by email using admin client
    const { data: user, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase())
      .maybeSingle()

    if (fetchError) {
      console.error("Error fetching user:", {
        message: fetchError.message,
        code: fetchError.code,
        details: fetchError.details,
        hint: fetchError.hint,
      })
      return NextResponse.json(
        {
          message: "Database error occurred",
          error: fetchError.message,
          code: fetchError.code,
        },
        { status: 500 },
      )
    }

    if (!user) {
      console.log("User not found for email:", email)
      return NextResponse.json(
        {
          user: null,
          message: "Invalid email or password",
          field: "credentials",
        },
        { status: 401 },
      )
    }

    console.log("Regular user found:", {
      id: user.id,
      email: user.email,
      username: user.username,
      hasPassword: !!user.password,
    })

    // Check if user has a password
    if (!user.password) {
      console.log("User has no password set")
      return NextResponse.json(
        {
          user: null,
          message: "Account exists but no password is set. Please contact support.",
          field: "password",
        },
        { status: 400 },
      )
    }

    console.log("Verifying regular user password...")

    // Verify password
    let passwordMatch = false
    try {
      passwordMatch = await compare(password, user.password)
      console.log("Password verification result:", passwordMatch)
    } catch (compareError) {
      console.error("Password comparison error:", compareError)
      return NextResponse.json(
        {
          message: "Password verification failed",
          error: compareError instanceof Error ? compareError.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    if (!passwordMatch) {
      console.log("Password mismatch for user:", email)
      return NextResponse.json(
        {
          user: null,
          message: "Invalid email or password",
          field: "credentials",
        },
        { status: 401 },
      )
    }

    console.log("Regular user login successful for:", user.email)

    // Return user data in the format expected by the frontend
    const userData = {
      id: user.id,
      email: user.email,
      username: user.username,
      trophies: user.classicalRating || 200,
      gamesPlayed: user.games_played || 0,
      gamesWon: user.games_won || 0,
      gamesLost: user.games_lost || 0,
      gamesDrawn: user.games_drawn || 0,
      isAdmin: false,
      createdAt: user.created_at,
    }

    console.log("Returning regular user data:", userData)

    return NextResponse.json(
      {
        user: userData,
        message: "Login successful",
        redirectTo: "/Dashboard",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("=== LOGIN ERROR ===")
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
