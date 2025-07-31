import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const projectId = context.params.id

    console.log("🗑️ Deleting project:", projectId)

    await prisma.project.delete({
      where: { id: projectId }, // If your ID is an Int, use: id: parseInt(projectId)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("❌ Error deleting project:", error)
    return NextResponse.json({ error: "Failed to delete project." }, { status: 500 })
  }
}
export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const projectId = context.params.id
    const body = await req.json()
    const { name, description } = body

    // Build dynamic update data object
    const updateData: { name?: string; description?: string } = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields provided for update." }, { status: 400 })
    }

    console.log("✏️ Updating project:", projectId, "→", updateData)

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("❌ Error updating project:", error)
    return NextResponse.json(
      { error: "Failed to update project." },
      { status: 500 }
    )
  }
}