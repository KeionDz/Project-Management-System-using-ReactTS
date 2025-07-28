"use client"

import type React from "react"
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

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project | null // Optional project for editing
  onSave: (projectData: Omit<Project, "id" | "createdAt"> | Project) => void
}

export function ProjectDialog({ open, onOpenChange, project, onSave }: ProjectDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description,
      })
    } else {
      setFormData({
        name: "",
        description: "",
      })
    }
  }, [project, open]) // Reset form when dialog opens or project changes

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (project) {
      // Editing existing project
      onSave({ ...project, ...formData })
    } else {
      // Adding new project
      onSave(formData)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "Create New Project"}</DialogTitle>
          <DialogDescription>
            {project ? "Update the details of your project." : "Enter the details for your new project."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Website Redesign"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="A brief overview of the project goals."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{project ? "Save Changes" : "Create Project"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
