"use client"

import { useEffect, useState } from "react"
import type { Task } from "@/components/devtrack-provider"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, GitPullRequest, ExternalLink, MoreHorizontal, Trash2, GripVertical, Pencil } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useDevTrack } from "@/components/devtrack-provider"
import type { DraggableAttributes } from "@dnd-kit/core"
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface User {
  id: string
  name: string
  email: string
}

const getPriorityColor = (priority: Task["priority"]) => {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
    case "medium":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
    case "low":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
  }
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  attributes?: DraggableAttributes
  listeners?: SyntheticListenerMap
  className?: string
}

export function TaskCard({ task, onEdit, attributes, listeners, className }: TaskCardProps) {
  const { deleteTask } = useDevTrack()
  const [users, setUsers] = useState<User[]>([])

  // Fetch users for dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users")
        if (!res.ok) throw new Error("Failed to fetch users")
        const data: User[] = await res.json()
        setUsers(data)
      } catch (err) {
        console.error("❌ Failed to fetch users", err)
      }
    }
    fetchUsers()
  }, [])

  // Update assignee
  const handleAssign = async (user: User) => {
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignee: user.name }),
      })
      onEdit({ ...task, assignee: user.name }) // Update local UI
    } catch (err) {
      console.error("❌ Failed to update assignee", err)
    }
  }

  return (
    <Card
      className={cn(
        "group task-card cursor-pointer p-3 hover:shadow-md transition-shadow duration-200",
        className
      )}
      onClick={() => onEdit(task)}
    >
      <CardHeader className="p-0 mb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="font-semibold text-sm leading-tight line-clamp-1">{task.title}</h3>
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
            )}
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            {/* Drag Handle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
              onClick={(e) => e.stopPropagation()}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-3 w-3" />
            </Button>

            {/* Task Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(task)
                  }}
                >
                  <Pencil className="mr-2 h-3 w-3" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 dark:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteTask(task.id)
                  }}
                >
                  <Trash2 className="mr-2 h-3 w-3" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 space-y-2">
        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Priority + Due Date */}
        <div className="flex items-center justify-between text-xs">
          <Badge className={cn("px-2 py-0.5", getPriorityColor(task.priority))}>
            {task.priority.toUpperCase()}
          </Badge>
          {task.dueDate && (
            <div className="flex items-center text-muted-foreground">
              <Calendar className="mr-1 h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* GitHub Link */}
        {task.githubLink && (
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <GitPullRequest className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium">GitHub PR</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
              <a
                href={task.githubLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        )}

        {/* Assignee Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center space-x-2 cursor-pointer hover:opacity-80">
              <Avatar className="h-6 w-6">
                <AvatarImage
                  src={`/placeholder.svg?height=24&width=24&text=${getInitials(task.assignee)}`}
                />
                <AvatarFallback className="text-xs">{getInitials(task.assignee)}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                {task.assignee || "Unassigned"}
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {users.map((user) => (
              <DropdownMenuItem
                key={user.id}
                onClick={(e) => {
                  e.stopPropagation()
                  handleAssign(user)
                }}
              >
                {user.name} ({user.email})
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  )
}
