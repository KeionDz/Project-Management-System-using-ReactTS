"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDevTrack } from "@/components/devtrack-provider"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GitPullRequest, CheckCircle, XCircle, ListTodo, Hourglass, CheckSquare } from "lucide-react"

export default function DashboardPage() {
  const { state } = useDevTrack()
  const router = useRouter()

  // Redirect to projects page if no active project is selected
  useEffect(() => {
    if (!state.activeProjectId && state.projects.length > 0) {
      router.replace("/projects")
    } else if (state.projects.length === 0 && !state.loading) {
      // If no projects exist at all, ensure user can create one
      router.replace("/projects")
    }
  }, [state.activeProjectId, state.projects.length, state.loading, router])

  // Filter data based on the active project
  const currentProjectTasks = state.tasks.filter((task) => task.projectId === state.activeProjectId)
  const currentProjectColumns = state.statusColumns.filter((col) => col.projectId === state.activeProjectId)

  const openPRs = state.pullRequests.filter((pr) => pr.status === "Open").length
  const mergedPRs = state.pullRequests.filter((pr) => pr.status === "Merged").length
  const failedBuilds = state.pullRequests.filter((pr) => pr.buildStatus === "Failed").length

  const todoTasks = currentProjectTasks.filter((task) => task.status === "todo").length
  const inProgressTasks = currentProjectTasks.filter((task) => task.status === "in-progress").length
  const doneTasks = currentProjectTasks.filter((task) => task.status === "done").length

  // Render a loading state or redirect if no active project
  if (!state.activeProjectId && state.projects.length > 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Redirecting to projects...</p>
      </div>
    )
  }

  if (state.projects.length === 0 && !state.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No projects found. Please create a new project.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">
          Dashboard Overview for{" "}
          {state.projects.find((p) => p.id === state.activeProjectId)?.name || "Selected Project"}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="azure-bg-accent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Pull Requests</CardTitle>
              <GitPullRequest className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold azure-highlight">{openPRs}</div>
              <p className="text-xs text-muted-foreground">Currently awaiting review or merge</p>
            </CardContent>
          </Card>
          <Card className="azure-bg-accent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Merged Pull Requests</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold azure-highlight">{mergedPRs}</div>
              <p className="text-xs text-muted-foreground">Successfully integrated into main</p>
            </CardContent>
          </Card>
          <Card className="azure-bg-accent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Builds</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{failedBuilds}</div>
              <p className="text-xs text-muted-foreground">PRs with failing CI/CD checks</p>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-2xl font-bold mb-4">Task Status Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">To Do</CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todoTasks}</div>
              <p className="text-xs text-muted-foreground">Tasks not yet started</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Hourglass className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressTasks}</div>
              <p className="text-xs text-muted-foreground">Tasks currently being worked on</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Done</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{doneTasks}</div>
              <p className="text-xs text-muted-foreground">Completed tasks</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
