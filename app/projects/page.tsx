"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { Navigation } from "@/components/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Plus,
  Folder,
  Edit,
  Trash2,
  ArrowRight,
  MoreHorizontal,
} from "lucide-react"
import { ProjectDialog } from "@/components/project-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDevTrack } from "@/components/devtrack-provider"
import { useAuth } from "@/components/auth-provider"

type Project = {
  id: string
  name: string
  description: string
  createdAt: string
}

export default function ProjectsPage() {
  const {
    state,
    addProject,
    updateProject,
    deleteProject,
    setActiveProject,
    dispatch,
  } = useDevTrack()
  const {
    state: { user },
  } = useAuth() // ✅ get logged-in user

  const [loading, setLoading] = useState(true)
  const [showProjectDialog, setShowProjectDialog] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const router = useRouter()

  // Initial fetch
  useEffect(() => {
    const fetchProjects = async () => {
      const res = await fetch("/api/projects")
      const data: Project[] = await res.json()
      dispatch({ type: "SET_PROJECTS", payload: data })
      setLoading(false)
    }
    fetchProjects()
  }, [dispatch])

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
    setShowProjectDialog(true)
  }

  const handleSelectProject = (projectId: string) => {
    setActiveProject(projectId)
    router.push(`/board/${projectId}`)
  }

  // ✅ Live delete with optimistic UI
  // Replace handleDeleteProject with:
const handleDeleteProject = async (projectId: string) => {
  await deleteProject(projectId) // ✅ provider handles UI + toast
}



  const handleCreateProject = async (projectData: Partial<Project>) => {
    // ✅ Only admins can create
    if (!user || user.role !== "ADMIN") {
      toast({
        title: "Permission Denied",
        description: "Only admins can create projects.",
        variant: "destructive",
      })
      return
    }

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...projectData, userId: user.id }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error?.error || "Failed to create project.")
      }

      const savedProject: Project = await res.json()
      addProject(savedProject)

      toast({
        title: "Project Created",
        description: `“${projectData.name}” has been added.`,
      })

      setShowProjectDialog(false)
    } catch (err) {
      console.error("❌ Create error:", err)
      toast({
        title: "Error creating project",
        description: (err as Error).message || "Something went wrong.",
        variant: "destructive",
      })
    }
  }

 const handleUpdateProject = async (projectData: Partial<Project>) => {
  if (!projectData.id) return
  await updateProject(projectData as Project) // ✅ delegate to provider
  setEditingProject(null)
  setShowProjectDialog(false)
}


  const handleSaveProject = async (projectData: Partial<Project>) => {
  if (projectData.id) {
    await handleUpdateProject(projectData)
  } else {
    await handleCreateProject(projectData)
  }
}


  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Team Projects</h1>
              <p className="text-muted-foreground">
                Select a project to view its Kanban board and tasks.
              </p>
            </div>

            {/* ✅ Button always visible */}
            <Button
              onClick={() => {
                setEditingProject(null)
                setShowProjectDialog(true)
              }}
              className={`shadow-lg ${
                user?.role !== "ADMIN"
                  ? "bg-transparent hover:bg-white/10 text-muted-foreground shadow-none border border-white/20"
                  : ""
              }`}
              disabled={user?.role !== "ADMIN"} // ✅ Disable for normal users
            >
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>

          {loading ? (
            <div className="min-h-[40vh] flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading projects...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {state.projects.map((project: Project) => ( // ✅ typed
                <Card
                  key={project.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Folder className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditProject(project)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {user?.role === "ADMIN" && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteProject(project.id)}
                              className="text-red-600 dark:text-red-400"
                              disabled={state.projects.length <= 1}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {project.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-between items-center pt-0">
                    <span className="text-sm text-muted-foreground">
                      Created:{" "}
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectProject(project.id)}
                    >
                      Open Board
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <ProjectDialog
            open={showProjectDialog}
            onOpenChange={setShowProjectDialog}
            project={editingProject}
            onSave={handleSaveProject}
          />
        </main>
      </div>
    </ProtectedRoute>
  )
}
