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
      where: { id: projectId },
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

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        name,
        description,
      },
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