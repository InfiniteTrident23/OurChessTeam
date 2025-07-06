// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/app/utils/db";
import { compare } from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // 1. Input validation
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    // 2. Find user (case-insensitive email)
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    // 3. Verify user exists and password matches
    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" }, // Generic message
        { status: 401 }
      );
    }

    const passwordValid = await compare(password, user.password);
    if (!passwordValid) {
      return NextResponse.json(
        { message: "Invalid credentials" }, // Same generic message
        { status: 401 }
      );
    }

    // 4. Return user data without password
    const { password: _, ...safeUser } = user;
    return NextResponse.json(
      {
        user: safeUser,
        message: "Login successful",
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}