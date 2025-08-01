"use client"

import { useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import type { Task, StatusColumn } from "@/components/devtrack-provider"
import { SortableTaskCard } from "@/components/sortable-task-card"
import { Badge } from "@/components/ui/badge"
import { StatusColumnSettings } from "@/components/status-column-settings"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface KanbanColumnProps {
  column: StatusColumn
  tasks: Task[]
  onTaskEdit: (task: Task) => void
  activeDragItem: Task | null
  overIdForPlaceholder: string | null
}

export function KanbanColumn({
  column,
  tasks,
  onTaskEdit,
  activeDragItem,
  overIdForPlaceholder,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: "column" } })
  const [showAllTasks, setShowAllTasks] = useState(false)

  const displayedTasks = showAllTasks ? tasks : tasks.slice(0, 5)
  const hasMoreTasks = tasks.length > 5 && !showAllTasks

  const renderTasksWithPlaceholder = () => {
    const elements = []
    let placeholderRendered = false

    // Placeholder for empty column
    if (isOver && activeDragItem && tasks.length === 0) {
      elements.push(
        <div
          key="placeholder-empty"
          className="h-24 border-2 border-dashed border-primary rounded-lg bg-primary/10 flex items-center justify-center text-sm text-muted-foreground animate-pulse"
        >
          Drop here
        </div>,
      )
      placeholderRendered = true
    }

    for (let i = 0; i < displayedTasks.length; i++) {
      const task = displayedTasks[i]

      // Dynamic placeholder before task
      if (
        activeDragItem &&
        overIdForPlaceholder === task.id &&
        activeDragItem.id !== task.id &&
        activeDragItem.statusId !== column.id
      ) {
        elements.push(
          <div
            key={`placeholder-${task.id}-before`}
            className="h-24 border-2 border-dashed border-primary rounded-lg bg-primary/10 flex items-center justify-center text-sm text-muted-foreground animate-pulse"
          >
            Drop here
          </div>,
        )
        placeholderRendered = true
      }

      elements.push(<SortableTaskCard key={task.id} task={task} onEdit={onTaskEdit} />)
    }

    // Placeholder at end of column
    if (
      activeDragItem &&
      !placeholderRendered &&
      isOver &&
      overIdForPlaceholder === column.id &&
      activeDragItem.statusId !== column.id
    ) {
      elements.push(
        <div
          key="placeholder-end"
          className="h-24 border-2 border-dashed border-primary rounded-lg bg-primary/10 flex items-center justify-center text-sm text-muted-foreground animate-pulse"
        >
          Drop here
        </div>,
      )
    }

    return elements
  }

  return (
    <div className="flex flex-col h-full group">
      {/* Header */}
      <div className={`column-header ${column.color}`}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">{column.name}</h2>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              {tasks.length}
            </Badge>
            <StatusColumnSettings column={column} />
          </div>
        </div>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 p-1 min-h-[200px] rounded-lg transition-all duration-200",
          isOver
            ? "border-2 border-dashed border-primary-foreground/50 bg-primary/5"
            : "border-2 border-transparent",
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {renderTasksWithPlaceholder()}
          {tasks.length === 0 && !isOver && (
            <div className="flex items-center justify-center h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <p className="text-sm text-muted-foreground">Drop tasks here</p>
            </div>
          )}
        </SortableContext>

        {hasMoreTasks && (
          <Button
            variant="ghost"
            className="w-full text-sm text-muted-foreground"
            onClick={() => setShowAllTasks(true)}
          >
            Show {tasks.length - 5} more tasks
          </Button>
        )}
      </div>
    </div>
  )
}
