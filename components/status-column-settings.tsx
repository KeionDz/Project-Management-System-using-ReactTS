"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { type StatusColumn, useDevTrack } from "@/components/devtrack-provider"

interface StatusColumnSettingsProps {
  column: StatusColumn
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

export function StatusColumnSettings({ column }: StatusColumnSettingsProps) {
  const { updateStatusColumn, deleteStatusColumn, state } = useDevTrack()
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [formData, setFormData] = useState({
    title: column.title,
    color: column.color,
  })

  const handleEdit = () => {
    setFormData({ title: column.title, color: column.color })
    setShowEditDialog(true)
  }

  const handleSave = () => {
    updateStatusColumn({
      ...column,
      ...formData,
    })
    setShowEditDialog(false)
  }

  const handleDelete = () => {
    deleteStatusColumn(column.id)
  }

  // Check if there's more than one column for the active project
  const canDelete = state.statusColumns.filter((c) => c.projectId === state.activeProjectId).length > 1

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="mr-2 h-3 w-3" />
            Edit Column
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={!canDelete}
            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
          >
            <Trash2 className="mr-2 h-3 w-3" />
            Delete Column
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Status Column</DialogTitle>
            <DialogDescription>Update the title and color of your status column.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Column Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Column title"
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
