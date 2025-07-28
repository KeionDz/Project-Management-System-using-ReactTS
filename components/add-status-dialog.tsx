"use client"

import type React from "react"
import { useState } from "react"
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
import { type StatusColumn, useDevTrack } from "@/components/devtrack-provider"

interface AddStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const colorOptions = [
  { value: "bg-slate-100 dark:bg-slate-800", label: "Gray", preview: "bg-slate-400" },
  { value: "bg-red-100 dark:bg-red-900/20", label: "Red", preview: "bg-red-400" },
  { value: "bg-orange-100 dark:bg-orange-900/20", label: "Orange", preview: "bg-orange-400" },
  { value: "bg-yellow-100 dark:bg-yellow-900/20", label: "Yellow", preview: "bg-yellow-400" },
  { value: "bg-green-100 dark:bg-green-900/20", label: "Green", preview: "bg-green-400" },
  { value: "bg-blue-100 dark:bg-blue-900/20", label: "Blue", preview: "bg-blue-400" },
  { value: "bg-indigo-100 dark:bg-indigo-900/20", label: "Indigo", preview: "bg-indigo-400" },
  { value: "bg-purple-100 dark:bg-purple-900/20", label: "Purple", preview: "bg-purple-400" },
  { value: "bg-pink-100 dark:bg-pink-900/20", label: "Pink", preview: "bg-pink-400" },
]

export function AddStatusDialog({ open, onOpenChange }: AddStatusDialogProps) {
  const { addStatusColumn, state } = useDevTrack()
  const [formData, setFormData] = useState({
    title: "",
    color: colorOptions[0].value,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newColumn: Omit<StatusColumn, "id" | "projectId"> = {
      // projectId is added by addStatusColumn
      ...formData,
      order: state.statusColumns.filter((col) => col.projectId === state.activeProjectId).length, // Order within active project
    }

    addStatusColumn(newColumn)
    onOpenChange(false)

    // Reset form
    setFormData({
      title: "",
      color: colorOptions[0].value,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Status Column</DialogTitle>
          <DialogDescription>Create a new status column for your Kanban board.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Column Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., In Review, Testing, Deployed"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Column Color</Label>
            <div className="grid grid-cols-3 gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, color: option.value }))}
                  className={`flex items-center space-x-2 p-2 rounded-lg border-2 transition-colors ${
                    formData.color === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full ${option.preview}`} />
                  <span className="text-sm">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Column</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
