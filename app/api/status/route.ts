import prisma from "@/lib/db"
import { NextResponse } from "next/server"
import { pusherServer } from "@/lib/pusher"

// -----------------------
// GET: Fetch statuses by projectId
// -----------------------
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("projectId")
    if (!projectId) return NextResponse.json([])

    const statuses = await prisma.statusColumn.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    })

    return NextResponse.json(statuses)
  } catch (err) {
    console.error("Error fetching statuses:", err)
    return NextResponse.json([], { status: 500 })
  }
}

// -----------------------
// POST: Create new status column
// -----------------------
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, projectId, color } = body

    if (!name || !projectId)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })

    const maxOrderStatus = await prisma.statusColumn.findFirst({
      where: { projectId },
      orderBy: { order: "desc" },
    })

    const nextOrder = maxOrderStatus ? maxOrderStatus.order + 1 : 0

    await prisma.statusColumn.create({
      data: {
        name,
        projectId,
        order: nextOrder,
      },
    })

    // ✅ Fetch full updated list
    const statuses = await prisma.statusColumn.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    })

    // ✅ Broadcast full list
    await pusherServer.trigger(`project-${projectId}`, "columns-updated", statuses)

    return NextResponse.json(statuses)
  } catch (error) {
    console.error("Error creating status:", error)
    return NextResponse.json({ error: "Failed to create status" }, { status: 500 })
  }
}

// -----------------------
// PUT: Update status column
// -----------------------
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, name, order, color } = body

    if (!id)
      return NextResponse.json({ error: "Missing ID" }, { status: 400 })

    const updated = await prisma.statusColumn.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(order !== undefined && { order }),
        ...(color && { color }),
      },
    })

    // ✅ Fetch full updated list
    const statuses = await prisma.statusColumn.findMany({
      where: { projectId: updated.projectId },
      orderBy: { order: "asc" },
    })

    // ✅ Broadcast full list
    await pusherServer.trigger(`project-${updated.projectId}`, "columns-updated", statuses)

    return NextResponse.json(statuses)
  } catch (error) {
    console.error("Error updating status:", error)
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
  }
}

// -----------------------
// DELETE: Delete status column safely
// -----------------------
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

    const status = await prisma.statusColumn.findUnique({ where: { id } })
    if (!status) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Delete tasks first to avoid FK constraint
    await prisma.task.deleteMany({ where: { statusId: id } })
    await prisma.statusColumn.delete({ where: { id } })

    // ✅ Fetch full updated list
    const statuses = await prisma.statusColumn.findMany({
      where: { projectId: status.projectId },
      orderBy: { order: "asc" },
    })

    // ✅ Broadcast full list
    await pusherServer.trigger(`project-${status.projectId}`, "columns-updated", statuses)

    return NextResponse.json(statuses)
  } catch (error) {
    console.error("Error deleting status:", error)
    return NextResponse.json({ error: "Failed to delete status" }, { status: 500 })
  }
}
