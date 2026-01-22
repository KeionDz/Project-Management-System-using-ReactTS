"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type Task, type StatusColumn, useDevTrack } from "@/components/devtrack-provider"
import { toast } from "@/components/ui/use-toast"

interface AddTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddTaskDialog({ open, onOpenChange }: AddTaskDialogProps) {
  const { state } = useDevTrack()
  const [loading, setLoading] = useState(false)

  // ✅ Filter status columns for the current active project
  const availableStatusColumns: StatusColumn[] = useMemo(
    () =>
      state.statusColumns.filter(
        (col: { projectId: string }) => col.projectId === state.activeProjectId
      ),
    [state.statusColumns, state.activeProjectId]
  )

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignee: "",
    dueDate: "",
    statusId: availableStatusColumns[0]?.id || "",
    priority: "medium" as Task["priority"],
    tags: "",
    githubLink: "",
  })

  // ✅ Ensure statusId is always the first column if form resets
  useEffect(() => {
    if (open && availableStatusColumns.length) {
      setFormData((prev) => ({
        ...prev,
        statusId: prev.statusId || availableStatusColumns[0].id,
      }))
    }
  }, [open, availableStatusColumns])

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      assignee: "",
      dueDate: "",
      statusId: availableStatusColumns[0]?.id || "",
      priority: "medium",
      tags: "",
      githubLink: "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!state.activeProjectId) return

    setLoading(true)

    // ✅ Calculate order for the selected status column
    const tasksInStatus = state.tasks.filter(
      (t: { statusId: string }) => t.statusId === formData.statusId
    )
    const newOrder = tasksInStatus.length

    const newTask = {
      title: formData.title,
      description: formData.description || null,
      assignee: formData.assignee,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
      statusId: formData.statusId,
      projectId: state.activeProjectId,
      priority: formData.priority,
      tags: formData.tags
        .split(",")
        .map((tag: string) => tag.trim())
        .filter(Boolean),
      githubLink: formData.githubLink || null,
      order: newOrder, // ✅ Places at the bottom of the chosen column
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      })

      if (!res.ok) throw new Error("Failed to create task")

      const { task } = await res.json()

      // ✅ Do NOT dispatch ADD_TASK here to avoid duplicates
      // Pusher will broadcast the new task to all clients including this one

      toast({
        title: "Task Created",
        description: `"${task.title}" has been added to ${
          availableStatusColumns.find((c) => c.id === formData.statusId)?.name || "board"
        }.`,
      })

      resetForm()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      toast({
        title: "Error",
        description: "Failed to create task.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen)
        if (!isOpen) resetForm()
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>Create a new task for your project board.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
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

          {/* Description */}
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

          {/* Assignee + Due Date */}
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

          {/* Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="statusId">Status</Label>
            <Select
              value={formData.statusId}
              onValueChange={(value: string) => setFormData((prev) => ({ ...prev, statusId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {availableStatusColumns
                  .sort((a, b) => a.order - b.order)
                  .map((column) => (
                    <SelectItem key={column.id} value={column.id}>
                      {column.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: Task["priority"]) =>
                setFormData((prev) => ({ ...prev, priority: value }))
              }
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

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="frontend, backend, design"
            />
          </div>

          {/* GitHub Link */}
          <div className="space-y-2">
            <Label htmlFor="githubLink">GitHub Link (Optional)</Label>
            <Input
              id="githubLink"
              value={formData.githubLink}
              onChange={(e) => setFormData((prev) => ({ ...prev, githubLink: e.target.value }))}
              placeholder="https://github.com/org/repo/pull/123"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
