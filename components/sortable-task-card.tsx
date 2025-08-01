"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Task } from "@/components/devtrack-provider"
import { TaskCard } from "@/components/task-card"
import { cn } from "@/lib/utils"

interface SortableTaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  activeDragItem?: Task | null
  overIdForPlaceholder?: string | null
}

export function SortableTaskCard({
  task,
  onEdit,
  activeDragItem,
  overIdForPlaceholder,
}: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, over } = useSortable({
    id: task.id,
    data: { type: "task", task },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isOverThis = overIdForPlaceholder === task.id
  const isActiveDrag = activeDragItem?.id === task.id

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group touch-none relative",
        isDragging && "z-50",
        isOverThis && "ring-2 ring-primary/50 rounded-lg",
        isActiveDrag && "opacity-70"
      )}
    >
      <TaskCard
        task={task}
        onEdit={onEdit}
        attributes={attributes}
        listeners={listeners} // ✅ Drag handle only
      />
    </div>
  )
}
