"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Project } from "@/components/devtrack-provider"
import { useAuth } from "@/components/auth-provider" // ✅ Import auth

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project | null
  onSave: (projectData: Partial<Project>) => Promise<void>
}

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  onSave,
}: ProjectDialogProps) {
  const [formData, setFormData] = useState({ name: "", description: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { state: { user } } = useAuth() // ✅ Get logged-in user

  const isAdmin = user?.role === "ADMIN"

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description,
      })
    } else {
      setFormData({ name: "", description: "" })
    }
  }, [project, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !isAdmin) return

    setIsSubmitting(true)

    try {
      const payload: Partial<Project> = {
        id: project?.id,
        name: formData.name,
        description: formData.description,
      }

      await onSave(payload)
      onOpenChange(false)
    } catch (err) {
      console.error("❌ Project save failed:", err)
      alert("Failed to save project.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {project ? "Edit Project" : "Create New Project"}
          </DialogTitle>
          <DialogDescription>
            {project
              ? "Update the details of your project."
              : "Enter the details for your new project."}
          </DialogDescription>
        </DialogHeader>

        {!isAdmin ? (
          <p className="text-red-500 text-sm">
            Only admins can {project ? "edit" : "create"} projects.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Website Redesign"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="A brief overview of the project goals."
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!formData.name || isSubmitting}>
                {isSubmitting
                  ? project
                    ? "Saving..."
                    : "Creating..."
                  : project
                  ? "Save Changes"
                  : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
