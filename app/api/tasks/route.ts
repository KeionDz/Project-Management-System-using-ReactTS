import { type NextRequest, NextResponse } from "next/server"

// Simulate database
let tasks = [
  {
    id: "1",
    title: "Design System Setup",
    description: "Create a comprehensive design system with components and tokens",
    assignee: "Sarah Chen",
    dueDate: "2024-02-15",
    status: "todo",
    priority: "high",
    tags: ["design", "frontend"],
    githubStatus: {
      type: "pr",
      url: "https://github.com/company/project/pull/123",
      status: "open",
      title: "feat: add design system components",
    },
  },
]

export async function GET() {
  return NextResponse.json({ tasks })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const newTask = {
    id: Date.now().toString(),
    ...body,
  }
  tasks.push(newTask)
  return NextResponse.json({ task: newTask })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const index = tasks.findIndex((task) => task.id === body.id)
  if (index !== -1) {
    tasks[index] = body
    return NextResponse.json({ task: body })
  }
  return NextResponse.json({ error: "Task not found" }, { status: 404 })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Task ID required" }, { status: 400 })
  }

  tasks = tasks.filter((task) => task.id !== id)
  return NextResponse.json({ success: true })
}
