import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { pusherServer } from "@/lib/pusher"
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params

  try {
    const { adminName } = await req.json() // 🔹 get admin from client

    // 🔹 Delete child records first
    await prisma.task.deleteMany({ where: { projectId: id } })
    await prisma.statusColumn.deleteMany({ where: { projectId: id } })

    // 🔹 Delete project
    const project = await prisma.project.delete({ where: { id } })

    // 🔹 Notify via Pusher that the project is deleted
    await pusherServer.trigger("projects", "project-deleted", {
      projectId: id,
      adminName: adminName || "An admin",
      projectName: project.name,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ Failed to delete project:", err)
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
  }
}


export async function PUT(
  req: Request,
  context: { params: { id: string } } // ✅ no Promise
) {
  const { id: projectId } = context.params
  const body = await req.json()
  const { name, description } = body

  try {
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name && { name }),
        ...(description && { description }),
      },
    })

    const allProjects = await prisma.project.findMany({ orderBy: { createdAt: "desc" } })
    await pusherServer.trigger("projects", "projects-updated", allProjects)

    return NextResponse.json(updated)
  } catch (error) {
    console.error("❌ Error updating project:", error)
    return NextResponse.json({ error: "Failed to update project." }, { status: 500 })
  }
}

