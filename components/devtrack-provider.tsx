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
  projectId: string // New: Associate task with a project
  title: string
  description: string
  assignee: string
  dueDate: string
  status: string // Changed to string for dynamic status columns
  priority: "low" | "medium" | "high"
  tags: string[]
  githubLink?: string // Link to PR or commit
  order: number // Added for internal sorting within columns
}

export interface StatusColumn {
  id: string
  projectId: string // New: Associate column with a project
  title: string
  color: string
  order: number
}

interface DevTrackState {
  projects: Project[] // New: List of projects
  activeProjectId: string | null // New: Currently selected project
  tasks: Task[]
  statusColumns: StatusColumn[] // Added status columns
  loading: boolean
}

type DevTrackAction =
  | { type: "SET_PROJECTS"; payload: Project[] } // New action
  | { type: "ADD_PROJECT"; payload: Project } // New action
  | { type: "UPDATE_PROJECT"; payload: Project } // New action
  | { type: "DELETE_PROJECT"; payload: string } // New action
  | { type: "SET_ACTIVE_PROJECT"; payload: string | null } // New action
  | { type: "SET_TASKS"; payload: Task[] }
  | { type: "ADD_TASK"; payload: Task }
  | { type: "UPDATE_TASK"; payload: Task }
  | { type: "DELETE_TASK"; payload: string }
  | { type: "MOVE_TASK"; payload: { id: string; status: string; overId?: string } } // Modified payload
  | { type: "SET_STATUS_COLUMNS"; payload: StatusColumn[] } // New action
  | { type: "ADD_STATUS_COLUMN"; payload: StatusColumn } // New action
  | { type: "UPDATE_STATUS_COLUMN"; payload: StatusColumn } // New action
  | { type: "DELETE_STATUS_COLUMN"; payload: string } // New action
  | { type: "REORDER_STATUS_COLUMNS"; payload: StatusColumn[] } // New action
  | { type: "SET_LOADING"; payload: boolean }

const initialState: DevTrackState = {
  projects: [], // Initialize empty
  activeProjectId: null, // No active project initially
  tasks: [],
  statusColumns: [], // Initialize empty
  loading: true, // Start with loading true
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
        projects: state.projects.map((project) => (project.id === action.payload.id ? action.payload : project)),
      }
    case "DELETE_PROJECT":
      // Also delete associated tasks and status columns
      return {
        ...state,
        projects: state.projects.filter((project) => project.id !== action.payload),
        tasks: state.tasks.filter((task) => task.projectId !== action.payload),
        statusColumns: state.statusColumns.filter((col) => col.projectId !== action.payload),
        activeProjectId: state.activeProjectId === action.payload ? null : state.activeProjectId, // Clear active project if deleted
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
        tasks: state.tasks.map((task) => (task.id === action.payload.id ? action.payload : task)),
      }
    case "DELETE_TASK":
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== action.payload),
      }
    case "MOVE_TASK": {
      const { id, status: newStatus, overId } = action.payload
      const activeTask = state.tasks.find((task) => task.id === id)

      if (!activeTask) return state

      // Create a new array of tasks, excluding the active task for now
      const updatedTasks = state.tasks.filter((task) => task.id !== id)

      // Update the status of the active task
      const taskToMove = { ...activeTask, status: newStatus }

      // Get tasks that will be in the target column (excluding the active task if it was already there)
      let targetColumnTasks = updatedTasks.filter(
        (task) => task.status === newStatus && task.projectId === activeTask.projectId,
      )

      if (overId) {
        // Dropped on another task: insert at that position
        const overIndex = targetColumnTasks.findIndex((task) => task.id === overId)
        if (overIndex !== -1) {
          targetColumnTasks.splice(overIndex, 0, taskToMove)
        } else {
          targetColumnTasks.push(taskToMove)
        }
      } else {
        // Dropped on column itself (empty space): append to end
        targetColumnTasks.push(taskToMove)
      }

      // Re-assign order property for tasks in the target column
      targetColumnTasks = targetColumnTasks.map((task, index) => ({ ...task, order: index }))

      // Combine all tasks: tasks not in target column + reordered target column tasks
      const otherTasks = updatedTasks.filter(
        (task) => task.status !== newStatus || task.projectId !== activeTask.projectId,
      )
      const finalTasks = [...otherTasks, ...targetColumnTasks]

      return { ...state, tasks: finalTasks }
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
        statusColumns: state.statusColumns.map((col) => (col.id === action.payload.id ? action.payload : col)),
      }
    case "DELETE_STATUS_COLUMN":
      return {
        ...state,
        statusColumns: state.statusColumns.filter((col) => col.id !== action.payload),
        // Move tasks from deleted column to first available column within the same project
        tasks: state.tasks.map((task) => {
          if (task.status === action.payload) {
            const firstAvailableColumn = state.statusColumns.find(
              (col) => col.id !== action.payload && col.projectId === task.projectId,
            )
            return { ...task, status: firstAvailableColumn?.id || "todo" } // Fallback to "todo" if no other column in project
          }
          return task
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

const DevTrackContext = createContext<{
  state: DevTrackState
  dispatch: React.Dispatch<DevTrackAction>
  addProject: (project: Omit<Project, "id" | "createdAt">) => void // New function
  updateProject: (project: Project) => void // New function
  deleteProject: (id: string) => void // New function
  setActiveProject: (id: string | null) => void // New function
  addTask: (task: Omit<Task, "id" | "projectId">) => void
  updateTask: (task: Task) => void
  deleteTask: (id: string) => void
  moveTask: (id: string, status: string, overId?: string) => void // Modified signature
  addStatusColumn: (column: Omit<StatusColumn, "id" | "projectId">) => void // New function
  updateStatusColumn: (column: StatusColumn) => void // New function
  deleteStatusColumn: (id: string) => void // New function
  reorderStatusColumns: (columns: StatusColumn[]) => void // New function
} | null>(null)

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
