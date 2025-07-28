"use client"

import { useState } from "react"
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  closestCorners,
  type DragOverEvent,
} from "@dnd-kit/core"
import { type Task, useTask } from "@/components/task-provider"
import { TaskCard } from "@/components/task-card"
import { KanbanColumn } from "@/components/kanban-column"
import { Button } from "@/components/ui/button"
import { Plus, Settings, GripVertical } from "lucide-react"
import { AddTaskDialog } from "@/components/add-task-dialog"
import { AddStatusDialog } from "@/components/add-status-dialog"
import { EditTaskDialog } from "@/components/edit-task-dialog"
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { SortableStatusColumn } from "@/components/sortable-status-column"
import type { StatusColumn } from "@/components/task-provider"

export function KanbanBoard() {
  const { state, moveTask, reorderStatusColumns } = useTask()
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [activeColumn, setActiveColumn] = useState<StatusColumn | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showAddStatusDialog, setShowAddStatusDialog] = useState(false)
  const [showEditTaskDialog, setShowEditTaskDialog] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  const [isReorderingColumns, setIsReorderingColumns] = useState(false)

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const activeId = active.id as string

    // Check if dragging a task
    const task = state.tasks.find((t) => t.id === activeId)
    if (task) {
      setActiveTask(task)
      return
    }

    // Check if dragging a column (only if reordering is enabled)
    if (isReorderingColumns) {
      const column = state.statusColumns.find((c) => c.id === activeId)
      if (column) {
        setActiveColumn(column)
      }
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    // This function is intentionally left empty to prevent excessive re-renders.
    // Task status updates are handled in handleDragEnd.
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveTask(null)
      setActiveColumn(null)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    // Handle column reordering
    if (activeColumn) {
      const oldIndex = state.statusColumns.findIndex((col) => col.id === activeId)
      const newIndex = state.statusColumns.findIndex((col) => col.id === overId)

      if (oldIndex !== newIndex) {
        const reorderedColumns = arrayMove(state.statusColumns, oldIndex, newIndex)
        reorderStatusColumns(reorderedColumns)
      }
    }

    // Handle task movement
    if (activeTask) {
      const newStatus = overId
      if (activeTask.status !== newStatus) {
        moveTask(activeId, newStatus)
      }
    }

    setActiveTask(null)
    setActiveColumn(null)
  }

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task)
    setShowEditTaskDialog(true)
  }

  const getTasksByStatus = (status: string) => {
    return state.tasks.filter((task) => task.status === status)
  }

  const sortedColumns = [...state.statusColumns].sort((a, b) => a.order - b.order)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Project Board</h1>
          <p className="text-muted-foreground">Manage your tasks with drag and drop</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={isReorderingColumns ? "default" : "outline"}
            onClick={() => setIsReorderingColumns(!isReorderingColumns)}
          >
            <GripVertical className="mr-2 h-4 w-4" />
            {isReorderingColumns ? "Done Reordering" : "Reorder Columns"}
          </Button>
          <Button variant="outline" onClick={() => setShowAddStatusDialog(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Add Status
          </Button>
          <Button onClick={() => setShowAddDialog(true)} className="shadow-lg">
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      <DndContext
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-4">
          <SortableContext items={sortedColumns.map((col) => col.id)} strategy={horizontalListSortingStrategy}>
            {sortedColumns.map((column) => {
              const tasks = getTasksByStatus(column.id)
              return (
                <SortableStatusColumn
                  key={column.id}
                  column={column}
                  tasks={tasks}
                  isReorderingColumns={isReorderingColumns}
                  onTaskEdit={handleEditTask}
                />
              )
            })}
          </SortableContext>
        </div>

        <DragOverlay>
          {activeTask ? (
            // Render the TaskCard in DragOverlay without the drag handle listeners/attributes
            <TaskCard task={activeTask} onEdit={handleEditTask} />
          ) : activeColumn ? (
            <div className="w-80 opacity-50">
              <KanbanColumn
                id={activeColumn.id}
                title={activeColumn.title}
                tasks={getTasksByStatus(activeColumn.id)}
                color={activeColumn.color}
                onTaskEdit={handleEditTask}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <AddTaskDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      <AddStatusDialog open={showAddStatusDialog} onOpenChange={setShowAddStatusDialog} />
      <EditTaskDialog open={showEditTaskDialog} onOpenChange={setShowEditTaskDialog} task={taskToEdit} />
    </div>
  )
}
