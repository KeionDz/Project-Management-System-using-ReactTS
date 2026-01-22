// app/api/login/route.ts
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import prisma from "@/lib/db"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // ✅ Validate body
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 })
    }

    const { email, password } = parsed.data

    // ✅ Include role for AuthProvider
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, password: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // ✅ Return user without password
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role, // ✅ Fallback to USER if somehow null
      },
    })
  } catch (error) {
    console.error("❌ Login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}

// Optional GET handler to avoid 405 errors
export async function GET() {
  return NextResponse.json({ message: "Use POST to log in." }, { status: 405 })
}
