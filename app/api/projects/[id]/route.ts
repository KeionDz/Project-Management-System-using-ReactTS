import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { pusherServer } from "@/lib/pusher"

export async function DELETE(
  req: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params

  try {
    // 1️⃣ Delete all tasks for this project
    await prisma.task.deleteMany({ where: { projectId: id } })

    // 2️⃣ Delete all status columns for this project
    await prisma.statusColumn.deleteMany({ where: { projectId: id } })

    // 3️⃣ Delete the project
    await prisma.project.delete({ where: { id } })

    // 4️⃣ Broadcast updated projects
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
    })

    await pusherServer.trigger("projects", "projects-updated", projects)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ Failed to delete project", err)
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

