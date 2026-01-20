import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { pusherServer } from "@/lib/pusher"

// -----------------------
// GET: Fetch tasks by projectId
// -----------------------
// -----------------------
// GET: Fetch tasks by projectId (with assignee avatar)
// -----------------------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("projectId")

    if (!projectId) return NextResponse.json([])

    // Fetch tasks with their assignee relation
    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
      include: {
        // assuming your Task model has assigneeId -> User relation
        assigneeUser: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
      },
    })

    // Map tasks to include assignee name + avatar
    const tasksWithAvatar = tasks.map((t) => ({
      ...t,
      assignee: t.assigneeUser?.name || null,
      assigneeAvatarUrl: t.assigneeUser?.avatarUrl || null,
    }))

    return NextResponse.json(tasksWithAvatar)
  } catch (err) {
    console.error("Error fetching tasks:", err)
    return NextResponse.json([], { status: 500 })
  }
}


// -----------------------
// POST: Create task
// -----------------------
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

    // 🔹 Broadcast updated tasks
    const tasks = await prisma.task.findMany({ where: { projectId } })
    await pusherServer.trigger(`project-${projectId}`, "tasks-updated", tasks)

    return NextResponse.json({ task })
  } catch (error) {
    console.error("POST /api/tasks Error:", error)
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}

// -----------------------
// PUT: Update task
// -----------------------
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

    // 🔹 Broadcast updated tasks
    const tasks = await prisma.task.findMany({ where: { projectId: task.projectId } })
    await pusherServer.trigger(`project-${task.projectId}`, "tasks-updated", tasks)

    return NextResponse.json({ task })
  } catch (error) {
    console.error("PUT /api/tasks Error:", error)
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
  }
}

// -----------------------
// DELETE: Delete task
// -----------------------
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Task ID required" }, { status: 400 })

    const task = await prisma.task.delete({ where: { id } })

    // 🔹 Broadcast updated tasks
    const tasks = await prisma.task.findMany({ where: { projectId: task.projectId } })
    await pusherServer.trigger(`project-${task.projectId}`, "tasks-updated", tasks)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/tasks Error:", error)
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
  }
}

