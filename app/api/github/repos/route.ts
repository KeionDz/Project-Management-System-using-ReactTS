import { NextResponse } from "next/server"

export async function GET() {
  // Simulate GitHub API response
  const repos = [
    {
      id: "1",
      name: "project-management-app",
      description: "Modern project management system with Kanban boards",
      stars: 42,
      watchers: 12,
      language: "TypeScript",
      isPrivate: false,
    },
    {
      id: "2",
      name: "design-system",
      description: "Comprehensive design system for web applications",
      stars: 28,
      watchers: 8,
      language: "CSS",
      isPrivate: true,
    },
  ]

  return NextResponse.json({ repos })
}
