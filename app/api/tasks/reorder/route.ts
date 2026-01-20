import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { pusherServer } from "@/lib/pusher"

interface TaskUpdate {
  id: string
  statusId: string
  order: number
  projectId?: string
}

export async function PUT(req: Request) {
  try {
    const updates: TaskUpdate[] = await req.json()

    if (!Array.isArray(updates) || updates.some((t) => !t.id || !t.statusId)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    // ✅ Atomic update of all tasks
    const updatedTasks = await prisma.$transaction(
      updates.map((task) =>
        prisma.task.update({
          where: { id: task.id },
          data: { statusId: task.statusId, order: task.order },
        })
      )
    )

    // ✅ Extract projectId from the first task (assumes all same project)
    const projectId = updatedTasks[0]?.projectId
    if (projectId) {
      // ✅ Trigger Pusher event for live update
      await pusherServer.trigger(`project-${projectId}`, "tasks-updated", updatedTasks)
    }

    return NextResponse.json({ success: true, updatedTasks })
  } catch (error) {
    console.error("Failed to reorder tasks:", error)
    return NextResponse.json({ error: "Failed to reorder tasks" }, { status: 500 })
  }
}
