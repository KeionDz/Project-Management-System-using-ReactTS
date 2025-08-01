"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

export interface Task {
  id: string
  title: string
  description: string
  assignee: string
  dueDate: string
  status: string
  priority: "low" | "medium" | "high"
  tags: string[]
  order: number // ✅ NEW
  githubStatus?: {
    type: "pr" | "commit"
    url: string
    status: "open" | "merged" | "closed"
    title: string
  }
}

export interface StatusColumn {
  id: string
  title: string
  color: string
  order: number
}

interface TaskState {
  tasks: Task[]
  statusColumns: StatusColumn[]
  loading: boolean
}

type TaskAction =
  | { type: "SET_TASKS"; payload: Task[] }
  | { type: "SET_STATUS_COLUMNS"; payload: StatusColumn[] }
  | { type: "ADD_TASK"; payload: Task }
  | { type: "UPDATE_TASK"; payload: Task }
  | { type: "DELETE_TASK"; payload: string }
  | { type: "MOVE_TASK"; payload: { id: string; status: string; overId?: string } } // ✅ added overId
  | { type: "REORDER_TASKS"; payload: Task[] } // ✅ new
  | { type: "ADD_STATUS_COLUMN"; payload: StatusColumn }
  | { type: "UPDATE_STATUS_COLUMN"; payload: StatusColumn }
  | { type: "DELETE_STATUS_COLUMN"; payload: string }
  | { type: "REORDER_STATUS_COLUMNS"; payload: StatusColumn[] }
  | { type: "SET_LOADING"; payload: boolean }

const initialState: TaskState = {
  tasks: [],
  statusColumns: [],
  loading: false,
}

const taskReducer = (state: TaskState, action: TaskAction): TaskState => {
  switch (action.type) {
    case "SET_TASKS":
      return { ...state, tasks: action.payload }
    case "SET_STATUS_COLUMNS":
      return { ...state, statusColumns: action.payload.sort((a, b) => a.order - b.order) }
    case "ADD_TASK":
      return { ...state, tasks: [...state.tasks, action.payload] }
    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((task) => (task.id === action.payload.id ? action.payload : task)),
      }
    case "DELETE_TASK":
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== action.payload),
      }
    case "MOVE_TASK": {
      const { id, status, overId } = action.payload
      const movingTask = state.tasks.find((t) => t.id === id)
      if (!movingTask) return state

      // Remove the task first
      let remainingTasks = state.tasks.filter((t) => t.id !== id)

      // Take all tasks in the target column
      let targetColumnTasks = remainingTasks.filter((t) => t.status === status)

      // Create updated moving task
      const movedTask: Task = { ...movingTask, status }

      // Insert task at new position
      if (overId) {
        const overIndex = targetColumnTasks.findIndex((t) => t.id === overId)
        if (overIndex >= 0) targetColumnTasks.splice(overIndex, 0, movedTask)
        else targetColumnTasks.push(movedTask)
      } else {
        targetColumnTasks.push(movedTask)
      }

      // Recalculate order for tasks in that column
      targetColumnTasks = targetColumnTasks.map((t, i) => ({ ...t, order: i }))

      // Merge with tasks from other columns
      const otherTasks = remainingTasks.filter((t) => t.status !== status)
      return { ...state, tasks: [...otherTasks, ...targetColumnTasks] }
    }
    case "REORDER_TASKS":
      return { ...state, tasks: action.payload }
    case "ADD_STATUS_COLUMN":
      return {
        ...state,
        statusColumns: [...state.statusColumns, action.payload].sort((a, b) => a.order - b.order),
      }
    case "UPDATE_STATUS_COLUMN":
      return {
        ...state,
        statusColumns: state.statusColumns.map((col) => (col.id === action.payload.id ? action.payload : col)),
      }
    case "DELETE_STATUS_COLUMN": {
      const newColumns = state.statusColumns.filter((col) => col.id !== action.payload)
      const fallbackColumnId = newColumns[0]?.id || "todo"

      const movedTasks = state.tasks.map((task) =>
        task.status === action.payload ? { ...task, status: fallbackColumnId, order: 0 } : task,
      )

      return { ...state, statusColumns: newColumns, tasks: movedTasks }
    }
    case "REORDER_STATUS_COLUMNS":
      return { ...state, statusColumns: action.payload.map((col, i) => ({ ...col, order: i })) }
    case "SET_LOADING":
      return { ...state, loading: action.payload }
    default:
      return state
  }
}

const TaskContext = createContext<{
  state: TaskState
  dispatch: React.Dispatch<TaskAction>
  addTask: (task: Omit<Task, "id" | "order">) => void
  updateTask: (task: Task) => void
  deleteTask: (id: string) => void
  moveTask: (id: string, status: string, overId?: string) => void
  reorderTasks: (tasks: Task[]) => void
  addStatusColumn: (column: Omit<StatusColumn, "id">) => void
  updateStatusColumn: (column: StatusColumn) => void
  deleteStatusColumn: (id: string) => void
  reorderStatusColumns: (columns: StatusColumn[]) => void
} | null>(null)

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(taskReducer, initialState)
  const { toast } = useToast()

  // Initialize columns and dummy tasks
  useEffect(() => {
    const defaultColumns: StatusColumn[] = [
      { id: "todo", title: "To Do", color: "bg-slate-100 dark:bg-slate-800", order: 0 },
      { id: "in-progress", title: "In Progress", color: "bg-blue-100 dark:bg-blue-900/20", order: 1 },
      { id: "done", title: "Done", color: "bg-green-100 dark:bg-green-900/20", order: 2 },
    ]
    dispatch({ type: "SET_STATUS_COLUMNS", payload: defaultColumns })

    const dummyTasks: Task[] = [
      {
        id: "1",
        title: "Design System Setup",
        description: "Create a comprehensive design system with components and tokens",
        assignee: "Sarah Chen",
        dueDate: "2024-02-15",
        status: "todo",
        priority: "high",
        tags: ["design", "frontend"],
        order: 0,
      },
      {
        id: "2",
        title: "API Authentication",
        description: "Implement JWT-based authentication for the API endpoints",
        assignee: "Mike Johnson",
        dueDate: "2024-02-10",
        status: "in-progress",
        priority: "high",
        tags: ["backend", "security"],
        order: 0,
      },
    ]
    dispatch({ type: "SET_TASKS", payload: dummyTasks })
  }, [])

  // Actions
  const addTask = (taskData: Omit<Task, "id" | "order">) => {
    const columnTasks = state.tasks.filter((t) => t.status === taskData.status)
    const newTask: Task = { ...taskData, id: Date.now().toString(), order: columnTasks.length }
    dispatch({ type: "ADD_TASK", payload: newTask })
    toast({ title: "Task Created", description: `"${newTask.title}" has been added to the board.` })
  }

  const updateTask = (task: Task) => {
    dispatch({ type: "UPDATE_TASK", payload: task })
    toast({ title: "Task Updated", description: `"${task.title}" has been updated.` })
  }

  const deleteTask = (id: string) => {
    const task = state.tasks.find((t) => t.id === id)
    dispatch({ type: "DELETE_TASK", payload: id })
    toast({ title: "Task Deleted", description: `"${task?.title}" has been removed.` })
  }

  const moveTask = (id: string, status: string, overId?: string) => {
    dispatch({ type: "MOVE_TASK", payload: { id, status, overId } })
  }

  const reorderTasks = (tasks: Task[]) => {
    dispatch({ type: "REORDER_TASKS", payload: tasks })
  }

  const addStatusColumn = (columnData: Omit<StatusColumn, "id">) => {
    const newColumn: StatusColumn = { ...columnData, id: Date.now().toString() }
    dispatch({ type: "ADD_STATUS_COLUMN", payload: newColumn })
    toast({ title: "Status Column Added", description: `"${newColumn.title}" column added.` })
  }

  const updateStatusColumn = (column: StatusColumn) => {
    dispatch({ type: "UPDATE_STATUS_COLUMN", payload: column })
    toast({ title: "Status Column Updated", description: `"${column.title}" updated.` })
  }

  const deleteStatusColumn = (id: string) => {
    if (state.statusColumns.length <= 1) {
      toast({ title: "Cannot Delete", description: "You must have at least one status column.", variant: "destructive" })
      return
    }
    dispatch({ type: "DELETE_STATUS_COLUMN", payload: id })
  }

  const reorderStatusColumns = (columns: StatusColumn[]) => {
    dispatch({ type: "REORDER_STATUS_COLUMNS", payload: columns })
  }

  return (
    <TaskContext.Provider
      value={{
        state,
        dispatch,
        addTask,
        updateTask,
        deleteTask,
        moveTask,
        reorderTasks,
        addStatusColumn,
        updateStatusColumn,
        deleteStatusColumn,
        reorderStatusColumns,
      }}
    >
      {children}
    </TaskContext.Provider>
  )
}

export const useTask = () => {
  const context = useContext(TaskContext)
  if (!context) throw new Error("useTask must be used within a TaskProvider")
  return context
}
