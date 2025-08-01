"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Task, StatusColumn } from "@/components/devtrack-provider"
import { KanbanColumn } from "@/components/kanban-column" // ✅ Named import
import { GripVertical } from "lucide-react"

interface SortableStatusColumnProps {
  column: StatusColumn
  tasks: Task[]
  isReorderingColumns: boolean
  onTaskEdit: (task: Task) => void
  activeDragItem: Task | null
  overIdForPlaceholder: string | null
}

export function SortableStatusColumn({
  column,
  tasks,
  isReorderingColumns,
  onTaskEdit,
  activeDragItem,
  overIdForPlaceholder,
}: SortableStatusColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: "column", column },
    disabled: !isReorderingColumns,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-64 flex-shrink-0 ${isDragging ? "z-10" : ""} ${
        isReorderingColumns ? "cursor-grab" : "cursor-default"
      } relative`}
    >
      {isReorderingColumns && (
        <div
          className="absolute top-0 left-0 right-0 h-10 flex items-center justify-center cursor-grab z-20"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <KanbanColumn
        column={column}
        tasks={tasks}
        onTaskEdit={onTaskEdit}
        activeDragItem={activeDragItem}
        overIdForPlaceholder={overIdForPlaceholder}
      />
    </div>
  )
}
