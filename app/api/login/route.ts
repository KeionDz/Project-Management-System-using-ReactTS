// app/api/login/route.ts
import { NextResponse } from "next/server"
import { compare } from "bcryptjs"
import prisma from "@/lib/db"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = loginSchema.parse(body)

    // Find user in database
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Compare password hash
    const passwordMatch = await compare(password, user.password)
    if (!passwordMatch) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 })
    }

    // ✅ Return wrapped in `user` object to match your AuthProvider
    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 200 }
    )
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

// Optional: Handle GET to prevent 405 spam
export async function GET() {
  return NextResponse.json(
    { message: "Use POST to log in." },
    { status: 405 }
  )
}
