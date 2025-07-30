"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

export interface Project {
  id: string
  name: string
  description: string
  createdAt: string
}

export interface Task {
  id: string
  projectId: string
  title: string
  description: string
  assignee: string
  dueDate: string
  status: string
  priority: "low" | "medium" | "high"
  tags: string[]
  githubLink?: string
  order: number
}

export interface StatusColumn {
  id: string
  projectId: string
  title: string
  color: string
  order: number
}

interface DevTrackState {
  projects: Project[]
  activeProjectId: string | null
  tasks: Task[]
  statusColumns: StatusColumn[]
  loading: boolean
}

type DevTrackAction =
  | { type: "SET_PROJECTS"; payload: Project[] }
  | { type: "ADD_PROJECT"; payload: Project }
  | { type: "UPDATE_PROJECT"; payload: Project }
  | { type: "DELETE_PROJECT"; payload: string }
  | { type: "SET_ACTIVE_PROJECT"; payload: string | null }
  | { type: "SET_TASKS"; payload: Task[] }
  | { type: "ADD_TASK"; payload: Task }
  | { type: "UPDATE_TASK"; payload: Task }
  | { type: "DELETE_TASK"; payload: string }
  | { type: "MOVE_TASK"; payload: { id: string; status: string; overId?: string } }
  | { type: "SET_STATUS_COLUMNS"; payload: StatusColumn[] }
  | { type: "ADD_STATUS_COLUMN"; payload: StatusColumn }
  | { type: "UPDATE_STATUS_COLUMN"; payload: StatusColumn }
  | { type: "DELETE_STATUS_COLUMN"; payload: string }
  | { type: "REORDER_STATUS_COLUMNS"; payload: StatusColumn[] }
  | { type: "SET_LOADING"; payload: boolean }

// -----------------------
// Initial State & Reducer
// -----------------------

const initialState: DevTrackState = {
  projects: [],
  activeProjectId: null,
  tasks: [],
  statusColumns: [],
  loading: true,
}

const devTrackReducer = (state: DevTrackState, action: DevTrackAction): DevTrackState => {
  switch (action.type) {
    case "SET_PROJECTS":
      return { ...state, projects: action.payload }
    case "ADD_PROJECT":
      return { ...state, projects: [...state.projects, action.payload] }
    case "UPDATE_PROJECT":
      return {
        ...state,
        projects: state.projects.map(p => (p.id === action.payload.id ? action.payload : p)),
      }
    case "DELETE_PROJECT":
      return {
        ...state,
        projects: state.projects.filter(p => p.id !== action.payload),
        tasks: state.tasks.filter(t => t.projectId !== action.payload),
        statusColumns: state.statusColumns.filter(c => c.projectId !== action.payload),
        activeProjectId: state.activeProjectId === action.payload ? null : state.activeProjectId,
      }
    case "SET_ACTIVE_PROJECT":
      return { ...state, activeProjectId: action.payload }
    case "SET_TASKS":
      return { ...state, tasks: action.payload }
    case "ADD_TASK":
      return { ...state, tasks: [...state.tasks, action.payload] }
    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.map(t => (t.id === action.payload.id ? action.payload : t)),
      }
    case "DELETE_TASK":
      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.payload),
      }
    case "MOVE_TASK": {
      const { id, status: newStatus, overId } = action.payload
      const activeTask = state.tasks.find(t => t.id === id)
      if (!activeTask) return state

      const updatedTasks = state.tasks.filter(t => t.id !== id)
      const taskToMove = { ...activeTask, status: newStatus }

      let targetColumnTasks = updatedTasks.filter(
        t => t.status === newStatus && t.projectId === activeTask.projectId,
      )

      if (overId) {
        const overIndex = targetColumnTasks.findIndex(t => t.id === overId)
        if (overIndex !== -1) {
          targetColumnTasks.splice(overIndex, 0, taskToMove)
        } else {
          targetColumnTasks.push(taskToMove)
        }
      } else {
        targetColumnTasks.push(taskToMove)
      }

      targetColumnTasks = targetColumnTasks.map((t, i) => ({ ...t, order: i }))
      const otherTasks = updatedTasks.filter(
        t => t.status !== newStatus || t.projectId !== activeTask.projectId,
      )
      return { ...state, tasks: [...otherTasks, ...targetColumnTasks] }
    }
    case "SET_STATUS_COLUMNS":
      return { ...state, statusColumns: action.payload }
    case "ADD_STATUS_COLUMN":
      return {
        ...state,
        statusColumns: [...state.statusColumns, action.payload].sort((a, b) => a.order - b.order),
      }
    case "UPDATE_STATUS_COLUMN":
      return {
        ...state,
        statusColumns: state.statusColumns.map(c => (c.id === action.payload.id ? action.payload : c)),
      }
    case "DELETE_STATUS_COLUMN":
      return {
        ...state,
        statusColumns: state.statusColumns.filter(c => c.id !== action.payload),
        tasks: state.tasks.map(t => {
          if (t.status === action.payload) {
            const fallback = state.statusColumns.find(
              c => c.id !== action.payload && c.projectId === t.projectId,
            )
            return { ...t, status: fallback?.id || "todo" }
          }
          return t
        }),
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
// -----------------------
// Context
// -----------------------

const DevTrackContext = createContext<{
  state: DevTrackState
  dispatch: React.Dispatch<DevTrackAction>
  addProject: (data: Omit<Project, "id" | "createdAt">) => void
  updateProject: (project: Project) => void
  deleteProject: (id: string) => void
  setActiveProject: (id: string | null) => void
  addTask: (task: Omit<Task, "id" | "projectId">) => void
  updateTask: (task: Task) => void
  deleteTask: (id: string) => void
  moveTask: (id: string, status: string, overId?: string) => void
  addStatusColumn: (data: Omit<StatusColumn, "id" | "projectId">) => void
  updateStatusColumn: (column: StatusColumn) => void
  deleteStatusColumn: (id: string) => void
  reorderStatusColumns: (columns: StatusColumn[]) => void
} | null>(null)

// -----------------------
// Provider
// -----------------------

export function DevTrackProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(devTrackReducer, initialState)
  const { toast } = useToast()

  // Initialize with dummy data including a default project
  useEffect(() => {
    const defaultProjectId = "project-devtrack-main"
    const defaultProject: Project = {
      id: defaultProjectId,
      name: "DevTrack Main Project",
      description: "The main project for developing DevTrack itself.",
      createdAt: new Date().toISOString().split("T")[0],
    }

    const defaultColumns: StatusColumn[] = [
      { id: "todo", projectId: defaultProjectId, title: "To Do", color: "bg-slate-100 dark:bg-slate-800", order: 0 },
      {
        id: "in-progress",
        projectId: defaultProjectId,
        title: "In Progress",
        color: "bg-blue-100 dark:bg-blue-900/20",
        order: 1,
      },
      { id: "done", projectId: defaultProjectId, title: "Done", color: "bg-green-100 dark:bg-green-900/20", order: 2 },
    ]
    dispatch({ type: "SET_PROJECTS", payload: [defaultProject] })
    dispatch({ type: "SET_ACTIVE_PROJECT", payload: defaultProjectId })
    dispatch({ type: "SET_STATUS_COLUMNS", payload: defaultColumns })

    const dummyTasks: Task[] = [
      {
        id: "1",
        projectId: defaultProjectId,
        title: "Implement user authentication",
        description: "Set up authentication system for user login and registration.",
        assignee: "Alice",
        dueDate: "2024-08-01",
        status: "todo",
        priority: "high",
        tags: ["frontend", "backend"],
        githubLink: "https://github.com/vercel/next.js/pull/123",
        order: 0,
      },
      {
        id: "4",
        projectId: defaultProjectId,
        title: "Develop API endpoints for tasks",
        description: "Create REST APIs for CRUD operations on tasks.",
        assignee: "Alice",
        dueDate: "2024-08-05",
        status: "todo",
        priority: "high",
        tags: ["backend", "api"],
        order: 1,
      },
      {
        id: "6",
        projectId: defaultProjectId,
        title: "Write unit tests for authentication",
        description: "Ensure all authentication flows are covered by tests.",
        assignee: "Alice",
        dueDate: "2024-08-08",
        status: "todo",
        priority: "high",
        tags: ["testing", "backend"],
        order: 2,
      },
      {
        id: "2",
        projectId: defaultProjectId,
        title: "Design Kanban board UI",
        description: "Create wireframes and mockups for the board layout.",
        assignee: "Bob",
        dueDate: "2024-07-30",
        status: "in-progress",
        priority: "medium",
        tags: ["design", "frontend"],
        githubLink: "https://github.com/vercel/next.js/pull/124",
        order: 0,
      },
      {
        id: "5",
        projectId: defaultProjectId,
        title: "Integrate project management features",
        description: "Add multi-project support to the application.",
        assignee: "Bob",
        dueDate: "2024-08-10",
        status: "in-progress",
        priority: "medium",
        tags: ["integration", "backend"],
        order: 1,
      },
      {
        id: "7",
        projectId: defaultProjectId,
        title: "Refactor CSS for responsiveness",
        description: "Improve mobile and tablet responsiveness across the application.",
        assignee: "Bob",
        dueDate: "2024-08-12",
        status: "in-progress",
        priority: "medium",
        tags: ["frontend", "css"],
        order: 2,
      },
      {
        id: "3",
        projectId: defaultProjectId,
        title: "Set up database schema",
        description: "Define tables for tasks, users, and projects.",
        assignee: "Charlie",
        dueDate: "2024-07-25",
        status: "done",
        priority: "low",
        tags: ["backend", "database"],
        githubLink: "https://github.com/vercel/next.js/pull/122",
        order: 0,
      },
      {
        id: "8",
        projectId: defaultProjectId,
        title: "Prepare deployment script",
        description: "Automate the deployment process to Vercel.",
        assignee: "Charlie",
        dueDate: "2024-08-01",
        status: "done",
        priority: "low",
        tags: ["devops", "deployment"],
        order: 1,
      },
    ]
    dispatch({ type: "SET_TASKS", payload: dummyTasks })

    // Set loading to false after initialization
    dispatch({ type: "SET_LOADING", payload: false })
  }, [])

  const addProject = (projectData: Omit<Project, "id" | "createdAt">) => {
    const newProject: Project = {
      ...projectData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split("T")[0],
    }
    dispatch({ type: "ADD_PROJECT", payload: newProject })
    toast({
      title: "Project Created",
      description: `"${newProject.name}" has been added.`,
    })
  }

  const updateProject = (project: Project) => {
    dispatch({ type: "UPDATE_PROJECT", payload: project })
    toast({
      title: "Project Updated",
      description: `"${project.name}" has been updated.`,
    })
  }

  const deleteProject = (id: string) => {
    const project = state.projects.find((p) => p.id === id)
    if (state.projects.length <= 1) {
      toast({
        title: "Cannot Delete",
        description: "You must have at least one project.",
        variant: "destructive",
      })
      return
    }
    dispatch({ type: "DELETE_PROJECT", payload: id })
    toast({
      title: "Project Deleted",
      description: `"${project?.name}" and its associated data have been removed.`,
    })
  }

  const setActiveProject = (id: string | null) => {
    dispatch({ type: "SET_ACTIVE_PROJECT", payload: id })
  }

  const addTask = (taskData: Omit<Task, "id" | "projectId">) => {
    if (!state.activeProjectId) {
      toast({
        title: "No Active Project",
        description: "Please select or create a project before adding tasks.",
        variant: "destructive",
      })
      return
    }
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString(),
      projectId: state.activeProjectId, // Assign to active project
      order: state.tasks.filter((t) => t.status === taskData.status && t.projectId === state.activeProjectId).length, // Assign order based on current tasks in column for active project
    }
    dispatch({ type: "ADD_TASK", payload: newTask })
    toast({
      title: "Task Created",
      description: `"${newTask.title}" has been added.`,
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
      description: `"${task?.title}" has been removed.`,
    })
  }

  const moveTask = (id: string, status: string, overId?: string) => {
    dispatch({ type: "MOVE_TASK", payload: { id, status, overId } })
  }

  const addStatusColumn = (columnData: Omit<StatusColumn, "id" | "projectId">) => {
    if (!state.activeProjectId) {
      toast({
        title: "No Active Project",
        description: "Please select or create a project before adding status columns.",
        variant: "destructive",
      })
      return
    }
    const newColumn: StatusColumn = {
      ...columnData,
      id: Date.now().toString(),
      projectId: state.activeProjectId, // Assign to active project
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
    if (state.statusColumns.filter((c) => c.projectId === state.activeProjectId).length <= 1) {
      // Check columns for active project
      toast({
        title: "Cannot Delete",
        description: "You must have at least one status column in the active project.",
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
    <DevTrackContext.Provider
      value={{
        state,
        dispatch,
        addProject,
        updateProject,
        deleteProject,
        setActiveProject,
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
    </DevTrackContext.Provider>
  )
}

export const useDevTrack = () => {
  const context = useContext(DevTrackContext)
  if (!context) {
    throw new Error("useDevTrack must be used within a DevTrackProvider")
  }
  return context
}
