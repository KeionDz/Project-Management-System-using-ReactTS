import prisma from "@/lib/db"
import { NextResponse } from "next/server"

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    // Update all orders in a transaction
    await prisma.$transaction(
      body.map((col: { id: string; order: number }) =>
        prisma.statusColumn.update({
          where: { id: col.id },
          data: { order: col.order },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error reordering columns:", err)
    return NextResponse.json({ error: "Failed to reorder columns" }, { status: 500 })
  }
}
