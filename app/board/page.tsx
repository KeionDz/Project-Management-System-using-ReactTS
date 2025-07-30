"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  type DragOverEvent,
  rectIntersection,
} from "@dnd-kit/core"
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { useDevTrack, type Task, type StatusColumn } from "@/components/devtrack-provider"
import { Navigation } from "@/components/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Plus, Settings, GripVertical } from "lucide-react"
import { AddTaskDialog } from "@/components/add-task-dialog"
import { TaskCard } from "@/components/task-card"
import { EditTaskDialog } from "@/components/edit-task-dialog"
import { KanbanColumn } from "@/components/kanban-column"
import { AddStatusDialog } from "@/components/add-status-dialog"
import { SortableStatusColumn } from "@/components/sortable-status-column"
import { useDraggableScroll } from "@/hooks/use-draggable-scroll"
import { cn } from "@/lib/utils"

export default function KanbanBoardPage() {
  const { state, moveTask, updateTask, reorderStatusColumns } = useDevTrack()
  const router = useRouter()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  const [activeDragItem, setActiveDragItem] = useState<Task | null>(null)
  const [activeColumn, setActiveColumn] = useState<StatusColumn | null>(null)
  const [showAddStatusDialog, setShowAddStatusDialog] = useState(false)
  const [isReorderingColumns, setIsReorderingColumns] = useState(false)
  const [overIdForPlaceholder, setOverIdForPlaceholder] = useState<string | null>(null)

  // Redirect to projects page if no active project is selected
  useEffect(() => {
    if (!state.activeProjectId) {
      router.replace("/projects")
    }
  }, [state.activeProjectId, router])

  // Filter tasks and columns for the active project
  const currentProjectTasks = state.tasks.filter((task) => task.projectId === state.activeProjectId)
  const currentProjectColumns = state.statusColumns.filter((col) => col.projectId === state.activeProjectId)

  // Determine if dnd-kit is currently dragging any item
  const isDndDragging = !!activeDragItem || !!activeColumn

  // Initialize the useDraggableScroll hook, disabling it when dnd-kit is active
  const { scrollRef, onMouseDown, isDragging: isScrolling } = useDraggableScroll<HTMLDivElement>(isDndDragging)

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const activeId = active.id as string

    const task = currentProjectTasks.find((t) => t.id === activeId)
    if (task) {
      setActiveDragItem(task)
      return
    }

    if (isReorderingColumns) {
      const column = currentProjectColumns.find((c) => c.id === activeId)
      if (column) {
        setActiveColumn(column)
      }
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event

    if (active.data.current?.type === "task") {
      if (over) {
        setOverIdForPlaceholder(over.id as string)
      } else {
        setOverIdForPlaceholder(null)
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    setOverIdForPlaceholder(null)

    if (!over) {
      setActiveDragItem(null)
      setActiveColumn(null)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    // Handle column reordering
    if (activeColumn) {
      const oldIndex = currentProjectColumns.findIndex((col) => col.id === activeId)
      const newIndex = currentProjectColumns.findIndex((col) => col.id === overId)

      if (oldIndex !== newIndex) {
        const reorderedColumns = arrayMove(currentProjectColumns, oldIndex, newIndex)
        reorderStatusColumns(reorderedColumns)
      }
    }

    // Handle task movement/reordering
    if (activeDragItem) {
      let newStatusColumnId: string | undefined
      let targetOverId: string | undefined = undefined

      if (over.data.current?.type === "task") {
        const overTask = currentProjectTasks.find((t) => t.id === over.id)
        if (overTask) {
          newStatusColumnId = overTask.status
          targetOverId = over.id
        }
      } else if (over.data.current?.type === "column") {
        newStatusColumnId = over.id
        targetOverId = undefined
      }

      if (!newStatusColumnId) {
        setActiveDragItem(null)
        setActiveColumn(null)
        return
      }

      if (activeDragItem.status !== newStatusColumnId || targetOverId) {
        moveTask(activeId, newStatusColumnId, targetOverId)
      }
    }

    setActiveDragItem(null)
    setActiveColumn(null)
  }

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task)
    setShowEditDialog(true)
  }

  const getTasksByStatus = (status: string) => {
    return currentProjectTasks.filter((task) => task.status === status).sort((a, b) => (a.order || 0) - (b.order || 0))
  }

  const sortedColumns = [...currentProjectColumns].sort((a, b) => a.order - b.order)

  const enableHorizontalScroll = currentProjectColumns.length >= 6

  // Render a loading state or redirect if no active project
  if (!state.activeProjectId) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Redirecting to projects...</p>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">
                Kanban Board for{" "}
                {state.projects.find((p) => p.id === state.activeProjectId)?.name || "Selected Project"}
              </h1>
              <p className="text-muted-foreground">Organize your tasks with drag and drop.</p>
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
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div
              ref={scrollRef}
              onMouseDown={onMouseDown}
              className={cn(
                "flex gap-6 pb-4",
                enableHorizontalScroll ? "overflow-x-auto" : "overflow-x-hidden",
                !isDndDragging && (isScrolling ? "cursor-grabbing" : "cursor-grab"),
              )}
            >
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
                      activeDragItem={activeDragItem}
                      overIdForPlaceholder={overIdForPlaceholder}
                    />
                  )
                })}
              </SortableContext>
            </div>

            <DragOverlay>
              {activeDragItem ? (
                <TaskCard task={activeDragItem} onEdit={handleEditTask} className="opacity-50" />
              ) : activeColumn ? (
                <div className="w-64 opacity-50">
                  <KanbanColumn
                    column={activeColumn}
                    tasks={getTasksByStatus(activeColumn.id)}
                    onTaskEdit={handleEditTask}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          <AddTaskDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
          <AddStatusDialog open={showAddStatusDialog} onOpenChange={setShowAddStatusDialog} />
          <EditTaskDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            task={taskToEdit}
            onUpdate={updateTask}
          />
        </main>
      </div>
    </ProtectedRoute>
  )
}
