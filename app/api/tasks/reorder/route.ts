import { NextResponse } from "next/server"
import prisma from "@/lib/db"

interface TaskUpdate {
  id: string
  statusId: string
  order: number
}

export async function PUT(req: Request) {
  try {
    const updates: TaskUpdate[] = await req.json()

    if (!Array.isArray(updates) || updates.some((t) => !t.id || !t.statusId)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    // ✅ Use transaction for atomic updates
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

    return NextResponse.json({ success: true, updatedTasks })
  } catch (error) {
    console.error("Failed to reorder tasks:", error)
    return NextResponse.json({ error: "Failed to reorder tasks" }, { status: 500 })
  }
}
