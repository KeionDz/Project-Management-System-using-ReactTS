import { NextResponse } from "next/server"
import prisma from "@/lib/db"

// GET: Fetch logged-in user's profile
export async function GET(req: Request) {
  try {
    // ✅ Extract user from localStorage on client via request headers
    // We'll expect the client to send the email in a header
    const email = req.headers.get("x-user-email")

    if (!email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    let user = await prisma.user.findUnique({
      where: { email },
    })

    // Optional: Auto-create user if not found
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: "New User",
          password: "placeholder", // required by Prisma schema
          avatarUrl: "/placeholder.svg?height=128&width=128",
        },
      })
    }

    return NextResponse.json(user)
  } catch (err) {
    console.error("Error fetching profile:", err)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

// PUT: Update user profile
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { name, email, avatarUrl } = body

    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 })

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { name, avatarUrl },
    })

    return NextResponse.json(updatedUser)
  } catch (err) {
    console.error("Error updating profile:", err)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
