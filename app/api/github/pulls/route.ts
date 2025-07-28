import { NextResponse } from "next/server"

export async function GET() {
  // Simulate GitHub API response for pull requests
  const pullRequests = [
    {
      id: "1",
      title: "feat: add drag and drop functionality to kanban board",
      number: 123,
      status: "open",
      author: "Sarah Chen",
      createdAt: "2024-01-15T10:30:00Z",
      repository: "project-management-app",
      url: "https://github.com/company/project-management-app/pull/123",
    },
    {
      id: "2",
      title: "fix: resolve authentication token expiration issue",
      number: 124,
      status: "merged",
      author: "Mike Johnson",
      createdAt: "2024-01-14T15:45:00Z",
      repository: "api-gateway",
      url: "https://github.com/company/api-gateway/pull/124",
    },
  ]

  return NextResponse.json({ pullRequests })
}
