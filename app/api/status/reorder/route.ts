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

    // 1️⃣ Get existing orders to avoid unnecessary updates
    const existing = await prisma.statusColumn.findMany({
      where: { id: { in: body.map((c) => c.id) } },
      select: { id: true, order: true, projectId: true },
    })

    // 2️⃣ Filter only columns that actually changed
    const updatesNeeded = body.filter((col) => {
      const current = existing.find((e) => e.id === col.id)
      return current && current.order !== col.order
    })

    if (updatesNeeded.length === 0) {
      return NextResponse.json({ success: true, updatedColumns: existing }) // ✅ nothing changed
    }

    // 3️⃣ Perform atomic update only for changed columns
    const updatedColumns = await prisma.$transaction(
      updatesNeeded.map((col) =>
        prisma.statusColumn.update({
          where: { id: col.id },
          data: { order: col.order },
        })
      )
    )

    // 4️⃣ Broadcast once via Pusher
    const projectId = updatedColumns[0]?.projectId
    if (projectId && pusherServer) {
      await pusherServer.trigger(
        `project-${projectId}`,
        "columns-updated",
        await prisma.statusColumn.findMany({ where: { projectId } }) // ✅ send full fresh list
      )
    }

    return NextResponse.json({ success: true, updatedColumns })
  } catch (err) {
    console.error("Error reordering columns:", err)
    return NextResponse.json({ error: "Failed to reorder columns" }, { status: 500 })
  }
}
