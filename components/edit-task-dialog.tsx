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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type Task, useDevTrack } from "@/components/devtrack-provider" // Import useDevTrack

interface EditTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onUpdate: (task: Task) => void
}

export function EditTaskDialog({ open, onOpenChange, task, onUpdate }: EditTaskDialogProps) {
  const { state } = useDevTrack() // Use state to get statusColumns
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignee: "",
    dueDate: "",
    status: "",
    priority: "medium" as Task["priority"],
    tags: "",
    githubLink: "",
  })

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description,
        assignee: task.assignee,
        dueDate: task.dueDate,
        status: task.status,
        priority: task.priority,
        tags: task.tags.join(", "),
        githubLink: task.githubLink || "",
      })
    }
  }, [task])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!task) return

    const updatedTask: Task = {
      ...task,
      ...formData,
      tags: formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    }

    onUpdate(updatedTask)
    onOpenChange(false)
  }

  if (!task) return null

  // Filter status columns by active project
  const availableStatusColumns = state.statusColumns.filter((col) => col.projectId === state.activeProjectId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>Make changes to your task here.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Enter task title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Enter task description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Input
                id="assignee"
                value={formData.assignee}
                onChange={(e) => setFormData((prev) => ({ ...prev, assignee: e.target.value }))}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: string) => setFormData((prev) => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableStatusColumns
                  .sort((a, b) => a.order - b.order)
                  .map((column) => (
                    <SelectItem key={column.id} value={column.id}>
                      {column.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: Task["priority"]) => setFormData((prev) => ({ ...prev, priority: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="frontend, backend, design (comma separated)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="githubLink">GitHub Link (Optional)</Label>
            <Input
              id="githubLink"
              value={formData.githubLink}
              onChange={(e) => setFormData((prev) => ({ ...prev, githubLink: e.target.value }))}
              placeholder="e.g., https://github.com/org/repo/pull/123"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
