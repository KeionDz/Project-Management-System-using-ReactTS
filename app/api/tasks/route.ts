import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"

// Fetch tasks
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("projectId")

    if (!projectId) return NextResponse.json([])

    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    })

    return NextResponse.json(tasks)
  } catch (err) {
    console.error("Error fetching tasks:", err)
    return NextResponse.json([], { status: 500 })
  }
}

// Create task
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, description, assignee, dueDate, statusId, projectId, priority, tags = [], githubLink } = body

    if (!title || !assignee || !statusId || !projectId || !priority) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const order = await prisma.task.count({ where: { statusId } })

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        assignee,
        dueDate: dueDate ? new Date(dueDate) : null,
        statusId,
        projectId,
        priority,
        tags: Array.isArray(tags)
          ? tags
          : typeof tags === "string"
          ? tags.split(",").map((t) => t.trim())
          : [],
        githubLink: githubLink || null,
        order,
      },
    })

    return NextResponse.json({ task })
  } catch (error) {
    console.error("POST /api/tasks Error:", error)
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}

// Update task
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...data } = body

    if (!id) return NextResponse.json({ error: "Task ID required" }, { status: 400 })

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        description: data.description || null,
        githubLink: data.githubLink || null,
        tags: Array.isArray(data.tags)
          ? data.tags
          : typeof data.tags === "string"
          ? data.tags.split(",").map((t: string) => t.trim())
          : [],
      },
    })

    return NextResponse.json({ task })
  } catch (error) {
    console.error("PUT /api/tasks Error:", error)
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
  }
}

// Delete task
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Task ID required" }, { status: 400 })

    await prisma.task.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/tasks Error:", error)
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
  }
}
