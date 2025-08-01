"use client"

import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { TaskCard } from "@/components/task-card"
import { KanbanColumn } from "@/components/kanban-column"
import { Button } from "@/components/ui/button"
import { Plus, Settings, GripVertical } from "lucide-react"
import { AddTaskDialog } from "@/components/add-task-dialog"
import { AddStatusDialog } from "@/components/add-status-dialog"
import { EditTaskDialog } from "@/components/edit-task-dialog"
import { SortableStatusColumn } from "@/components/sortable-status-column"
import type { Task, StatusColumn } from "@/components/devtrack-provider"
import { useDevTrack } from "@/components/devtrack-provider"
import { toast } from "@/components/ui/use-toast"

export function KanbanBoard() {
  const { state, dispatch } = useDevTrack()
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [activeColumn, setActiveColumn] = useState<StatusColumn | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showAddStatusDialog, setShowAddStatusDialog] = useState(false)
  const [showEditTaskDialog, setShowEditTaskDialog] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  const [isReorderingColumns, setIsReorderingColumns] = useState(false)

  // ✅ Placeholder highlight state for drag
  const [overIdForPlaceholder, setOverIdForPlaceholder] = useState<string | null>(null)

  const sortedColumns = [...state.statusColumns].sort((a, b) => a.order - b.order)

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id as string
    const task = state.tasks.find((t: { id: string }) => t.id === activeId)
    if (task) {
      setActiveTask(task)
      return
    }

    if (isReorderingColumns) {
      const column = state.statusColumns.find((c: { id: string }) => c.id === activeId)
      if (column) setActiveColumn(column)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as string | undefined
    setOverIdForPlaceholder(overId || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    setActiveColumn(null)
    setOverIdForPlaceholder(null)
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    const overType = over.data.current?.type

    // ----------------------
    // 1️⃣ Column Reordering
    // ----------------------
    if (activeColumn && isReorderingColumns) {
      const oldIndex = sortedColumns.findIndex((c) => c.id === activeId)
      const newIndex = sortedColumns.findIndex((c) => c.id === overId)
      if (oldIndex !== newIndex) {
        const reordered = arrayMove(sortedColumns, oldIndex, newIndex).map((c, idx) => ({
          ...c,
          order: idx,
        }))
        dispatch({ type: "SET_STATUS_COLUMNS", payload: reordered })

        try {
          await fetch("/api/status-columns/reorder", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reordered.map(({ id, order }) => ({ id, order }))),
          })
          toast({ title: "Columns reordered" })
        } catch (err) {
          toast({
            title: "Error",
            description: "Failed to save column order.",
            variant: "destructive",
          })
        }
      }
      return
    }

    // ----------------------
    // 2️⃣ Task Drag & Drop
    // ----------------------
    const movingTask = state.tasks.find((t: { id: string }) => t.id === activeId)
    if (!movingTask) return

    let newStatusId = movingTask.statusId
    let overTask: Task | undefined

    if (overType === "task") {
      overTask = state.tasks.find((t: { id: string }) => t.id === overId)
      if (overTask) newStatusId = overTask.statusId
    } else if (overType === "column") {
      newStatusId = overId
    }

    // Exit if no change
    if (!newStatusId || (newStatusId === movingTask.statusId && !overTask)) return

    // 2.1 Filter old & new column tasks
    const oldTasks = state.tasks
      .filter((t: { statusId: any; id: any }) => t.statusId === movingTask.statusId && t.id !== movingTask.id)
      .sort((a: { order: any }, b: { order: any }) => (a.order ?? 0) - (b.order ?? 0))

    const newTasks = state.tasks
      .filter((t: { statusId: any; id: any }) => t.statusId === newStatusId && t.id !== movingTask.id)
      .sort((a: { order: any }, b: { order: any }) => (a.order ?? 0) - (b.order ?? 0))

    const insertIndex = overTask
      ? newTasks.findIndex((t: { id: string }) => t.id === overTask.id)
      : newTasks.length

    // Insert the moved task in its new column
    newTasks.splice(insertIndex, 0, { ...movingTask, statusId: newStatusId })

    // 2.2 Build updated task list with new `order` for each column
    const updatedTasks = [
      ...state.tasks.filter(
        (t: { statusId: any }) => t.statusId !== movingTask.statusId && t.statusId !== newStatusId
      ),
      ...oldTasks.map((t: any, i: any) => ({ ...t, order: i })),
      ...newTasks.map((t: any, i: any) => ({ ...t, order: i })),
    ]

    // Update local state
    dispatch({ type: "SET_TASKS", payload: updatedTasks })

    // 2.3 Persist to DB
    try {
      await fetch("/api/tasks/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          updatedTasks.map((t) => ({
            id: t.id,
            statusId: t.statusId,
            order: t.order ?? 0,
          }))
        ),
      })
      toast({ title: "Task order saved" })
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to save task order.",
        variant: "destructive",
      })
    }
  }

  const getTasksByStatus = (statusId: string) =>
    state.tasks
      .filter((task: { statusId: string }) => task.statusId === statusId)
      .sort((a: { order: any }, b: { order: any }) => (a.order ?? 0) - (b.order ?? 0))

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task)
    setShowEditTaskDialog(true)
  }

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
          <SortableContext
            items={sortedColumns.map((col) => col.id)}
            strategy={horizontalListSortingStrategy}
          >
            {sortedColumns.map((column) => (
              <SortableStatusColumn
                key={column.id}
                column={column}
                tasks={getTasksByStatus(column.id)}
                isReorderingColumns={isReorderingColumns}
                onTaskEdit={handleEditTask}
                activeDragItem={activeTask}
                overIdForPlaceholder={overIdForPlaceholder}
              />
            ))}
          </SortableContext>
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} onEdit={handleEditTask} />
          ) : activeColumn ? (
            <div className="w-80 opacity-50">
              <KanbanColumn
                column={activeColumn}
                tasks={getTasksByStatus(activeColumn.id)}
                onTaskEdit={handleEditTask}
                activeDragItem={null}
                overIdForPlaceholder={null}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <AddTaskDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      <AddStatusDialog open={showAddStatusDialog} onOpenChange={setShowAddStatusDialog} />
      <EditTaskDialog
        open={showEditTaskDialog}
        onOpenChange={setShowEditTaskDialog}
        task={taskToEdit}
        onUpdate={(task: Task) => {
          dispatch({ type: "UPDATE_TASK", payload: task })
        }}
      />
    </div>
  )
}
