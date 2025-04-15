import { NextResponse } from "next/server";

export async function POST(req: Request) { //Registering new user 
    try {
        const body = await req.json();
        return NextResponse.json(body);
    } catch (error) {}

}