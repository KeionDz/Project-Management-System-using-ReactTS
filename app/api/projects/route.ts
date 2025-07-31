import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(projects)
  } catch (error) {
    console.error("❌ Error fetching projects:", error)
    return NextResponse.json({ error: "Failed to fetch projects." }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, description, userId } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "Project name is required." }, { status: 400 })
    }

    // ✅ Check if the user is admin
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can create projects." }, { status: 403 })
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || "",
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error("❌ Error creating project:", error)
    return NextResponse.json({ error: "Failed to create project." }, { status: 500 })
  }
}
