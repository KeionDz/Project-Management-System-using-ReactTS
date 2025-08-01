import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await context.params

  try {
    // ✅ Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!existingProject) {
      // ✅ Return 200 so DELETE is idempotent
      return NextResponse.json({ success: true, message: "Project already deleted." })
    }

    console.log(`🗑️ Deleting project ${projectId} and all related data...`)

    // ✅ Atomic delete (transaction)
    await prisma.$transaction([
      prisma.task.deleteMany({ where: { projectId } }),
      prisma.statusColumn.deleteMany({ where: { projectId } }),
      prisma.project.delete({ where: { id: projectId } }),
    ])

    return NextResponse.json({ success: true, message: "Project deleted successfully." })
  } catch (error) {
    console.error("❌ Error deleting project:", error)
    return NextResponse.json({ error: "Failed to delete project." }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await context.params
  const body = await req.json()
  const { name, description } = body

  try {
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("❌ Error updating project:", error)
    return NextResponse.json({ error: "Failed to update project." }, { status: 500 })
  }
}
