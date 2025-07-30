"use client"

import { toast } from "@/components/ui/use-toast"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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

type Project = {
  id: string
  name: string
  description: string
  createdAt: string
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showProjectDialog, setShowProjectDialog] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchProjects = async () => {
      const res = await fetch("/api/projects")
      const data = await res.json()
      setProjects(data)
      setLoading(false)
    }

    fetchProjects()
  }, [])

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
    setShowProjectDialog(true)
  }

  const handleSelectProject = (projectId: string) => {
    router.push("/board")
  }

  const handleDeleteProject = async (projectId: string) => {
    const project = projects.find((p) => p.id === projectId)
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" })

    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== projectId))
      toast({
        title: "Project Deleted",
        description: `"${project?.name}" has been deleted.`,
      })
    } else {
      const error = await res.json()
      console.error("❌ Failed to delete project:", error)
      toast({
        title: "Failed to Delete Project",
        description: error.error || "An unknown error occurred.",
        variant: "destructive",
      })
    }
  }

  const handleSaveProject = async (projectData: Partial<Project>) => {
    try {
      let savedProject: Project

      if (projectData.id) {
        // Edit existing project
        const res = await fetch(`/api/projects/${projectData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: projectData.name,
            description: projectData.description,
          }),
        })

        if (!res.ok) throw new Error("Failed to update project.")
        savedProject = await res.json()

        toast({
          title: "Project Updated",
          description: `"${savedProject.name}" has been updated.`,
        })
      } else {
        // Create new project
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(projectData),
        })

        if (!res.ok) throw new Error("Failed to create project.")
        savedProject = await res.json()

        toast({
          title: "Project Created",
          description: `"${savedProject.name}" has been created.`,
        })
      }

      // Update UI
      setProjects((prev) => {
        const exists = prev.find((p) => p.id === savedProject.id)
        return exists
          ? prev.map((p) => (p.id === savedProject.id ? savedProject : p))
          : [...prev, savedProject]
      })

      setEditingProject(null)
      setShowProjectDialog(false)
    } catch (err) {
      console.error("❌ Save error:", err)
      toast({
        title: "Failed to Save Project",
        description: "There was a problem saving the project.",
        variant: "destructive",
      })
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Your Projects</h1>
              <p className="text-muted-foreground">
                Select a project to view its Kanban board and tasks.
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingProject(null)
                setShowProjectDialog(true)
              }}
              className="shadow-lg"
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
              {projects.map((project) => (
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
                          <DropdownMenuItem
                            onClick={() => handleDeleteProject(project.id)}
                            className="text-red-600 dark:text-red-400"
                            disabled={projects.length <= 1}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
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
