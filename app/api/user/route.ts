import { NextResponse } from "next/server";
import { prisma } from "@/app/utils/db";
import { hash } from "bcryptjs";

export async function POST(req: Request) { //Registering new user 
    try {
        const body = await req.json();
        const { email, password, username } = body;

        // check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email },
        });
        if(existingUser) {
            return NextResponse.json({user: null, message: "Email already in use"}, {status: 409});
        }
        // check if email already exists
        const existingUsername = await prisma.user.findUnique({
            where: { username: username },
        });
        if(existingUsername) {
            return NextResponse.json({user: null, message: "Username already in use"}, {status: 409});
        }
        const hashedPassword = await hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword
            }
        });
        const {password: newUserPassword, ...rest} = newUser; // remove password from the response
        return NextResponse.json({user: rest, message: "User created successfully"}, {status: 201});
    } catch (error) {}

}