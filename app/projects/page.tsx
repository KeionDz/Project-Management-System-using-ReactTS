"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Folder, Edit, Trash2, ArrowRight, MoreHorizontal } from "lucide-react"
import { useDevTrack, type Project } from "@/components/devtrack-provider"
import { ProjectDialog } from "@/components/project-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function ProjectsPage() {
  const { state, addProject, updateProject, deleteProject, setActiveProject } = useDevTrack()
  const router = useRouter()
  const [showProjectDialog, setShowProjectDialog] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const handleCreateProject = (projectData: Omit<Project, "id" | "createdAt">) => {
    addProject(projectData)
  }

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
    setShowProjectDialog(true)
  }

  const handleSaveEditedProject = (projectData: Project) => {
    updateProject(projectData)
    setEditingProject(null)
  }

  const handleDeleteProject = (projectId: string) => {
    deleteProject(projectId)
  }

  const handleSelectProject = (projectId: string) => {
    setActiveProject(projectId)
    router.push("/board") // Navigate to the board page
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Your Projects</h1>
              <p className="text-muted-foreground">Select a project to view its Kanban board and tasks.</p>
            </div>
            <Button onClick={() => setShowProjectDialog(true)} className="shadow-lg">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {state.projects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
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
                          disabled={state.projects.length <= 1} // Disable if only one project
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-between items-center pt-0">
                  <span className="text-sm text-muted-foreground">Created: {project.createdAt}</span>
                  <Button variant="outline" size="sm" onClick={() => handleSelectProject(project.id)}>
                    Open Board
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>

        <ProjectDialog
          open={showProjectDialog}
          onOpenChange={setShowProjectDialog}
          project={editingProject}
          onSave={editingProject ? handleSaveEditedProject : handleCreateProject}
        />
      </div>
    </ProtectedRoute>
  )
}
