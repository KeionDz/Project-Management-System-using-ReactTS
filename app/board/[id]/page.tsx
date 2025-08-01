"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  type DragOverEvent,
  rectIntersection,
} from "@dnd-kit/core"
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import {
  useDevTrack,
  type Task,
  type StatusColumn,
  type Project,
} from "@/components/devtrack-provider"
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
import { toast } from "@/components/ui/use-toast"
import { pusherClient } from "@/lib/pusher"

export default function KanbanBoardPage() {
  const {
    state,
    setActiveProject,
    moveTask,
    updateTask,
    reorderStatusColumns,
    setTasks,
    setStatusColumns,
  } = useDevTrack()

  const router = useRouter()
  const params = useParams<{ projectId: string }>()
  const projectId = params.projectId

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  const [activeDragItem, setActiveDragItem] = useState<Task | null>(null)
  const [activeColumn, setActiveColumn] = useState<StatusColumn | null>(null)
  const [showAddStatusDialog, setShowAddStatusDialog] = useState(false)
  const [isReorderingColumns, setIsReorderingColumns] = useState(false)
  const [overIdForPlaceholder, setOverIdForPlaceholder] = useState<string | null>(null)

  // ------------------ FETCH & PUSHER ------------------
  useEffect(() => {
    if (!projectId) return

    const projectExists = state.projects.some((p: Project) => p.id === projectId)
    if (!projectExists) {
      router.replace("/projects")
      return
    }

    setActiveProject(projectId)

    const fetchProjectData = async () => {
      try {
        const res = await fetch(`/api/board/${projectId}`)
        if (!res.ok) throw new Error("Failed to fetch project data")
        const projectData = await res.json()

        setStatusColumns((prev: StatusColumn[]) => {
          const merged = [
            ...prev.filter((c) => c.projectId !== projectId),
            ...projectData.statuses,
          ]
          return Array.from(new Map(merged.map((c) => [c.id, c])).values())
        })

        setTasks((prev: Task[]) => {
          const merged = [
            ...prev.filter((t) => t.projectId !== projectId),
            ...projectData.tasks,
          ]
          return Array.from(new Map(merged.map((t) => [t.id, t])).values())
        })
      } catch (err) {
        console.error(err)
      }
    }

    fetchProjectData()

    // ✅ Setup Pusher real-time subscription
    const channel = pusherClient.subscribe(`project-${projectId}`)

    channel.bind("tasks-updated", (updatedTasks: Task[]) => {
      setTasks((prev) => {
        const merged = [
          ...prev.filter((t) => t.projectId !== projectId),
          ...updatedTasks,
        ]
        return Array.from(new Map(merged.map((t) => [t.id, t])).values())
      })
    })

    channel.bind("columns-updated", (updatedCols: StatusColumn[]) => {
      setStatusColumns((prev) => {
        const merged = [
          ...prev.filter((c) => c.projectId !== projectId),
          ...updatedCols,
        ]
        return Array.from(new Map(merged.map((c) => [c.id, c])).values())
      })
    })

    return () => {
      pusherClient.unsubscribe(`project-${projectId}`)
    }
  }, [projectId, state.projects, setActiveProject, router, setStatusColumns, setTasks])

  // ------------------ DERIVED STATE ------------------
  const currentProjectTasks = state.tasks.filter((t) => t.projectId === state.activeProjectId)
  const currentProjectColumns = state.statusColumns.filter(
    (c) => c.projectId === state.activeProjectId
  )

  const isDndDragging = !!activeDragItem || !!activeColumn
  const { scrollRef, onMouseDown, isDragging: isScrolling } =
    useDraggableScroll<HTMLDivElement>(isDndDragging)

  // ------------------ DRAG HANDLERS ------------------
  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id as string
    const task = currentProjectTasks.find((t) => t.id === activeId)
    if (task) {
      setActiveDragItem(task)
      return
    }

    if (isReorderingColumns) {
      const column = currentProjectColumns.find((c) => c.id === activeId)
      if (column) setActiveColumn(column)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as string | undefined
    setOverIdForPlaceholder(overId || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const activeId = event.active.id as string
    const overId = event.over?.id as string | undefined

    setOverIdForPlaceholder(null)

    if (!overId) {
      setActiveDragItem(null)
      setActiveColumn(null)
      return
    }

    // ------------------ COLUMN REORDER ------------------
    if (activeColumn) {
      const oldIndex = currentProjectColumns.findIndex((c) => c.id === activeId)
      const newIndex = currentProjectColumns.findIndex((c) => c.id === overId)
      if (oldIndex !== newIndex) {
        const reordered: StatusColumn[] = arrayMove(currentProjectColumns, oldIndex, newIndex).map(
          (col, index) => ({ ...col, order: index })
        )

        reorderStatusColumns(reordered)

        // ✅ Persist to DB and trigger Pusher
        await fetch("/api/status-columns/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reordered.map((col) => ({ id: col.id, order: col.order, projectId }))),
        })
      }
    }

    // ------------------ TASK REORDER ------------------
    if (activeDragItem) {
      let newStatusId: string | undefined
      let targetTaskId: string | undefined

      if (event.over?.data.current?.type === "task") {
        const overTask = currentProjectTasks.find((t) => t.id === overId)
        if (overTask) {
          newStatusId = overTask.statusId
          targetTaskId = overId
        }
      } else if (event.over?.data.current?.type === "column") {
        newStatusId = overId
      }

      if (newStatusId && (activeDragItem.statusId !== newStatusId || targetTaskId)) {
        moveTask(activeId, newStatusId, targetTaskId)

        const updatedTasks = currentProjectTasks
          .map((t) => (t.id === activeId ? { ...t, statusId: newStatusId } : t))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((t, index) => ({ ...t, order: index }))

        await fetch("/api/tasks/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedTasks.map((t) => ({
            id: t.id,
            statusId: t.statusId,
            order: t.order,
            projectId,
          }))),
        })
      }
    }

    setActiveDragItem(null)
    setActiveColumn(null)
  }

  // ------------------ UI HELPERS ------------------
  const handleEditTask = (task: Task) => {
    setTaskToEdit(task)
    setShowEditDialog(true)
  }

  const getTasksByStatus = (status: string) =>
    currentProjectTasks
      .filter((t) => t.statusId === status)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const sortedColumns = [...currentProjectColumns].sort((a, b) => a.order - b.order)
  const enableHorizontalScroll = sortedColumns.length >= 6

  const isLoading = !state.activeProjectId || !state.projects.length || state.loading
  const activeProject = state.projects.find((p) => p.id === state.activeProjectId)

  // ------------------ RENDER ------------------
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-7xl mx-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading board...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold">
                    Board for {activeProject?.name || "Project"}
                  </h1>
                  <p className="text-muted-foreground">
                    Organize your tasks with drag and drop.
                  </p>
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
                  <Button
                    onClick={() => {
                      if (currentProjectColumns.length === 0) {
                        toast({
                          title: "Cannot Add Task",
                          description: "Please add a status column first before adding tasks.",
                          variant: "destructive",
                        })
                        return
                      }
                      setShowAddDialog(true)
                    }}
                    className="shadow-lg"
                    disabled={currentProjectColumns.length === 0}
                  >
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
                  <SortableContext
                    items={sortedColumns.map((c) => c.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {sortedColumns.map((column) => (
                      <SortableStatusColumn
                        key={column.id}
                        column={column}
                        tasks={getTasksByStatus(column.id)}
                        isReorderingColumns={isReorderingColumns}
                        onTaskEdit={handleEditTask}
                        activeDragItem={activeDragItem}
                        overIdForPlaceholder={overIdForPlaceholder}
                      />
                    ))}
                  </SortableContext>
                </div>

                <DragOverlay>
                  {activeDragItem ? (
                    <TaskCard
                      task={activeDragItem}
                      onEdit={handleEditTask}
                      className="opacity-50"
                    />
                  ) : activeColumn ? (
                    <div className="w-64 opacity-50">
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
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
                task={taskToEdit}
                onUpdate={updateTask}
              />
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
