import { NextResponse } from "next/server"
import prisma from "@/lib/db"

export async function GET(req: Request, { params }: { params: { projectId: string } }) {
  const { projectId } = params

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      statuses: { orderBy: { order: "asc" } },
      tasks: { orderBy: { order: "asc" } },
    },
  })

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  return NextResponse.json(project)
}
