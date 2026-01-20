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
  } = useDevTrack()
  const {
    state: { user },
  } = useAuth()

  const [loading, setLoading] = useState(true)
  const [showProjectDialog, setShowProjectDialog] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const router = useRouter()

  // ✅ Provider already fetches projects on mount
  useEffect(() => {
    setLoading(false)
  }, [])

  // -----------------------
  // Project Handlers
  // -----------------------
  const handleEditProject = (project: Project) => {
    setEditingProject(project)
    setShowProjectDialog(true)
  }

  const handleSelectProject = (projectId: string) => {
    setActiveProject(projectId)
    router.push(`/board/${projectId}`)
  }

  const handleDeleteProject = async (projectId: string) => {
  if (state.projects.length <= 1) {
    toast({
      title: "Cannot Delete",
      description: "You must keep at least one project.",
      variant: "destructive",
    })
    return
  }

  const confirmed = confirm("Are you sure you want to delete this project?")
  if (!confirmed) return

  try {
    await fetch(`/api/projects/${projectId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminName: user?.name || "An admin" }), // ✅ send admin name
    })

    await deleteProject(projectId) // ✅ local state update
  } catch (error) {
    console.error("❌ Delete project failed", error)
    toast({
      title: "Error",
      description: "Failed to delete project.",
      variant: "destructive",
    })
  }
}


  const handleCreateProject = async (projectData: Partial<Project>) => {
    if (!user || user.role !== "ADMIN") {
      toast({
        title: "Permission Denied",
        description: "Only admins can create projects.",
        variant: "destructive",
      })
      return
    }

    await addProject(
      {
        id: `temp-${Date.now()}`,
        name: projectData.name?.trim() || "Untitled Project",
        description: projectData.description?.trim() || "",
        createdAt: new Date().toISOString(),
      } as Project,
      true // ✅ optimistic
    )

    setShowProjectDialog(false)
  }

  const handleUpdateProject = async (projectData: Partial<Project>) => {
    if (!projectData.id) return
    await updateProject(projectData as Project)
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

  // -----------------------
  // UI
  // -----------------------
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
              disabled={user?.role !== "ADMIN"}
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
              {state.projects.map((project) => (
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
                      Created: {new Date(project.createdAt).toLocaleDateString()}
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
