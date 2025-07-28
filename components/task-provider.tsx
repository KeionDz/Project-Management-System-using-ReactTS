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
  status: string // Changed from union type to string for flexibility
  githubStatus?: {
    type: "pr" | "commit"
    url: string
    status: "open" | "merged" | "closed"
    title: string
  }
  priority: "low" | "medium" | "high"
  tags: string[]
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
  | { type: "MOVE_TASK"; payload: { id: string; status: string } }
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
      return { ...state, statusColumns: action.payload }
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
    case "MOVE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.payload.id ? { ...task, status: action.payload.status } : task,
        ),
      }
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
    case "DELETE_STATUS_COLUMN":
      return {
        ...state,
        statusColumns: state.statusColumns.filter((col) => col.id !== action.payload),
        // Move tasks from deleted column to first available column
        tasks: state.tasks.map((task) =>
          task.status === action.payload
            ? { ...task, status: state.statusColumns.find((col) => col.id !== action.payload)?.id || "todo" }
            : task,
        ),
      }
    case "REORDER_STATUS_COLUMNS":
      return {
        ...state,
        statusColumns: action.payload,
      }
    case "SET_LOADING":
      return { ...state, loading: action.payload }
    default:
      return state
  }
}

const TaskContext = createContext<{
  state: TaskState
  dispatch: React.Dispatch<TaskAction>
  addTask: (task: Omit<Task, "id">) => void
  updateTask: (task: Task) => void
  deleteTask: (id: string) => void
  moveTask: (id: string, status: string) => void
  addStatusColumn: (column: Omit<StatusColumn, "id">) => void
  updateStatusColumn: (column: StatusColumn) => void
  deleteStatusColumn: (id: string) => void
  reorderStatusColumns: (columns: StatusColumn[]) => void
} | null>(null)

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(taskReducer, initialState)
  const { toast } = useToast()

  // Initialize with default status columns
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
        githubStatus: {
          type: "pr",
          url: "https://github.com/company/project/pull/123",
          status: "open",
          title: "feat: add design system components",
        },
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
        githubStatus: {
          type: "pr",
          url: "https://github.com/company/project/pull/124",
          status: "open",
          title: "feat: implement JWT authentication",
        },
      },
      {
        id: "3",
        title: "User Dashboard",
        description: "Create responsive user dashboard with analytics",
        assignee: "Alex Rivera",
        dueDate: "2024-02-08",
        status: "done",
        priority: "medium",
        tags: ["frontend", "dashboard"],
        githubStatus: {
          type: "pr",
          url: "https://github.com/company/project/pull/122",
          status: "merged",
          title: "feat: user dashboard implementation",
        },
      },
      {
        id: "4",
        title: "Database Migration",
        description: "Migrate user data to new schema structure",
        assignee: "Emma Davis",
        dueDate: "2024-02-12",
        status: "todo",
        priority: "medium",
        tags: ["database", "migration"],
      },
      {
        id: "5",
        title: "Mobile Responsiveness",
        description: "Ensure all components work perfectly on mobile devices",
        assignee: "James Wilson",
        dueDate: "2024-02-18",
        status: "in-progress",
        priority: "medium",
        tags: ["frontend", "mobile"],
      },
    ]
    dispatch({ type: "SET_TASKS", payload: dummyTasks })
  }, [])

  // Simulate real-time GitHub updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate PR merge moving task to done
      const tasksWithOpenPRs = state.tasks.filter(
        (task) => task.githubStatus?.status === "open" && task.status !== "done",
      )

      if (tasksWithOpenPRs.length > 0 && Math.random() > 0.95) {
        const randomTask = tasksWithOpenPRs[Math.floor(Math.random() * tasksWithOpenPRs.length)]
        const updatedTask = {
          ...randomTask,
          status: "done" as const,
          githubStatus: {
            ...randomTask.githubStatus!,
            status: "merged" as const,
          },
        }
        dispatch({ type: "UPDATE_TASK", payload: updatedTask })
        toast({
          title: "Task Auto-Updated",
          description: `"${randomTask.title}" moved to Done - PR merged!`,
        })
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [state.tasks, toast])

  const addTask = (taskData: Omit<Task, "id">) => {
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString(),
    }
    dispatch({ type: "ADD_TASK", payload: newTask })
    toast({
      title: "Task Created",
      description: `"${newTask.title}" has been added to the board.`,
    })
  }

  const updateTask = (task: Task) => {
    dispatch({ type: "UPDATE_TASK", payload: task })
    toast({
      title: "Task Updated",
      description: `"${task.title}" has been updated.`,
    })
  }

  const deleteTask = (id: string) => {
    const task = state.tasks.find((t) => t.id === id)
    dispatch({ type: "DELETE_TASK", payload: id })
    toast({
      title: "Task Deleted",
      description: `"${task?.title}" has been removed from the board.`,
    })
  }

  const moveTask = (id: string, status: string) => {
    dispatch({ type: "MOVE_TASK", payload: { id, status } })
  }

  const addStatusColumn = (columnData: Omit<StatusColumn, "id">) => {
    const newColumn: StatusColumn = {
      ...columnData,
      id: Date.now().toString(),
    }
    dispatch({ type: "ADD_STATUS_COLUMN", payload: newColumn })
    toast({
      title: "Status Column Added",
      description: `"${newColumn.title}" column has been added to the board.`,
    })
  }

  const updateStatusColumn = (column: StatusColumn) => {
    dispatch({ type: "UPDATE_STATUS_COLUMN", payload: column })
    toast({
      title: "Status Column Updated",
      description: `"${column.title}" column has been updated.`,
    })
  }

  const deleteStatusColumn = (id: string) => {
    const column = state.statusColumns.find((c) => c.id === id)
    if (state.statusColumns.length <= 1) {
      toast({
        title: "Cannot Delete",
        description: "You must have at least one status column.",
        variant: "destructive",
      })
      return
    }
    dispatch({ type: "DELETE_STATUS_COLUMN", payload: id })
    toast({
      title: "Status Column Deleted",
      description: `"${column?.title}" column has been removed from the board.`,
    })
  }

  const reorderStatusColumns = (columns: StatusColumn[]) => {
    const reorderedColumns = columns.map((col, index) => ({ ...col, order: index }))
    dispatch({ type: "REORDER_STATUS_COLUMNS", payload: reorderedColumns })
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
  if (!context) {
    throw new Error("useTask must be used within a TaskProvider")
  }
  return context
}
