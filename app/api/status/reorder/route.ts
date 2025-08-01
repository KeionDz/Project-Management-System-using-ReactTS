import prisma from "@/lib/db"
import { NextResponse } from "next/server"
import { pusherServer } from "@/lib/pusher"

interface ColumnUpdate {
  id: string
  order: number
  projectId?: string
}

export async function PUT(req: Request) {
  try {
    const body: ColumnUpdate[] = await req.json()

    if (!Array.isArray(body) || body.length === 0 || body.some((c) => !c.id)) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    // ✅ Update all columns atomically
    const updatedColumns = await prisma.$transaction(
      body.map((col) =>
        prisma.statusColumn.update({
          where: { id: col.id },
          data: { order: col.order },
        })
      )
    )

    // ✅ Broadcast via Pusher if projectId exists
    const projectId = updatedColumns[0]?.projectId
    if (projectId && pusherServer) {
      await pusherServer.trigger(
        `project-${projectId}`,
        "columns-updated",
        updatedColumns
      )
    }

    return NextResponse.json({ success: true, updatedColumns })
  } catch (err) {
    console.error("Error reordering columns:", err)
    return NextResponse.json({ error: "Failed to reorder columns" }, { status: 500 })
  }
}
