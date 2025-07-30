"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Task } from "@/components/devtrack-provider"
import { TaskCard } from "@/components/task-card"

interface SortableTaskCardProps {
  task: Task
  onEdit: (task: Task) => void // Added onEdit prop
}

export function SortableTaskCard({ task, onEdit }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: "task", // Explicitly define type as 'task'
      task,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1, // Ensure opacity is 0.5 when dragging
  }

  return (
    <div ref={setNodeRef} style={style} className="group">
      {/* Pass attributes and listeners to the TaskCard for the drag handle */}
      <TaskCard task={task} onEdit={onEdit} attributes={attributes} listeners={listeners} />
    </div>
  )
}
