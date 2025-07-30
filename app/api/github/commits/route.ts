import { NextResponse } from "next/server"

export async function GET() {
  // Simulate GitHub API response for commits
  const commits = [
    {
      id: "1",
      message: "refactor: optimize database queries for better performance",
      author: "Emma Davis",
      timestamp: "2024-01-15T14:22:00Z",
      repository: "api-gateway",
      sha: "a1b2c3d",
      url: "https://github.com/company/api-gateway/commit/a1b2c3d",
    },
    {
      id: "2",
      message: "feat: implement dark mode toggle",
      author: "James Wilson",
      timestamp: "2024-01-15T11:15:00Z",
      repository: "project-management-app",
      sha: "e4f5g6h",
      url: "https://github.com/company/project-management-app/commit/e4f5g6h",
    },
  ]

  return NextResponse.json({ commits })
}
