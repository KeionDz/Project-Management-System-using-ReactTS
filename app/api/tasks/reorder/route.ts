import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { pusherServer } from "@/lib/pusher-server"

export async function PUT(req: Request) {
  try {
    const updates: { id: string; statusId: string; order: number }[] = await req.json()

    // Update all tasks in transaction
    const updatedTasks = await prisma.$transaction(
      updates.map((task) =>
        prisma.task.update({
          where: { id: task.id },
          data: {
            statusId: task.statusId,
            order: task.order,
          },
        })
      )
    )

    // Broadcast to all clients
    const projectId = updatedTasks[0]?.projectId
    if (projectId) {
      await pusherServer.trigger(
        `project-${projectId}`,
        "tasks-updated",
        updatedTasks
      )
    }

    return NextResponse.json({ success: true, updatedTasks })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to reorder tasks" }, { status: 500 })
  }
}
