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

export interface PullRequest {
  id: string
  title: string
  author: string
  status: "Open" | "Merged" | "Closed"
  buildStatus: "Passed" | "Failed"
  commentsCount: number
  url: string
  repository: string
}

export interface Commit {
  id: string
  message: string
  author: string
  timestamp: string
  sha: string
  url: string
  repository: string
}

export interface Repository {
  id: string
  name: string
  description: string
  stars: number
  watchers: number
  language: string
  isPrivate: boolean
}

interface DevTrackState {
  projects: Project[] // New: List of projects
  activeProjectId: string | null // New: Currently selected project
  tasks: Task[]
  statusColumns: StatusColumn[] // Added status columns
  pullRequests: PullRequest[]
  commits: Commit[]
  repositories: Repository[]
  githubConnected: boolean
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
  | { type: "SET_PULL_REQUESTS"; payload: PullRequest[] }
  | { type: "SET_COMMITS"; payload: Commit[] }
  | { type: "SET_REPOSITORIES"; payload: Repository[] }
  | { type: "SET_GITHUB_CONNECTED"; payload: boolean }
  | { type: "SET_LOADING"; payload: boolean }

const initialState: DevTrackState = {
  projects: [], // Initialize empty
  activeProjectId: null, // No active project initially
  tasks: [],
  statusColumns: [], // Initialize empty
  pullRequests: [],
  commits: [],
  repositories: [],
  githubConnected: false,
  loading: false,
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
    case "SET_PULL_REQUESTS":
      return { ...state, pullRequests: action.payload }
    case "SET_COMMITS":
      return { ...state, commits: action.payload }
    case "SET_REPOSITORIES":
      return { ...state, repositories: action.payload }
    case "SET_GITHUB_CONNECTED":
      return { ...state, githubConnected: action.payload }
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
  connectGitHub: () => void
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
        description: "Set up NextAuth for user login and registration.",
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
        title: "Integrate GitHub API",
        description: "Connect to GitHub for PR and commit data.",
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

    const dummyPRs: PullRequest[] = [
      {
        id: "pr1",
        title: "feat: Add user profile page",
        author: "Alice",
        status: "Open",
        buildStatus: "Passed",
        commentsCount: 3,
        url: "https://github.com/vercel/next.js/pull/1",
        repository: "devtrack-frontend",
      },
      {
        id: "pr2",
        title: "fix: Resolve login redirect bug",
        author: "Bob",
        status: "Merged",
        buildStatus: "Passed",
        commentsCount: 0,
        url: "https://github.com/vercel/next.js/pull/2",
        repository: "devtrack-backend",
      },
      {
        id: "pr3",
        title: "refactor: Optimize task fetching",
        author: "Charlie",
        status: "Open",
        buildStatus: "Failed",
        commentsCount: 5,
        url: "https://github.com/vercel/next.js/pull/3",
        repository: "devtrack-frontend",
      },
    ]
    dispatch({ type: "SET_PULL_REQUESTS", payload: dummyPRs })

    const dummyCommits: Commit[] = [
      {
        id: "c1",
        message: "feat: initial project setup",
        author: "Alice",
        timestamp: "2024-07-20T10:00:00Z",
        sha: "a1b2c3d",
        url: "https://github.com/vercel/next.js/commit/a1b2c3d",
        repository: "devtrack-frontend",
      },
      {
        id: "c2",
        message: "docs: update README with project details",
        author: "Bob",
        timestamp: "2024-07-21T14:30:00Z",
        sha: "e4f5g6h",
        url: "https://github.com/vercel/next.js/commit/e4f5g6h",
        repository: "devtrack-backend",
      },
      {
        id: "c3",
        message: "fix: correct typo in task description",
        author: "Charlie",
        timestamp: "2024-07-22T09:15:00Z",
        sha: "i7j8k9l",
        url: "https://github.com/vercel/next.js/commit/i7j8k9l",
        repository: "devtrack-frontend",
      },
    ]
    dispatch({ type: "SET_COMMITS", payload: dummyCommits })

    const dummyRepos: Repository[] = [
      {
        id: "r1",
        name: "devtrack-frontend",
        description: "Frontend for DevTrack project",
        stars: 15,
        watchers: 5,
        language: "TypeScript",
        isPrivate: false,
      },
      {
        id: "r2",
        name: "devtrack-backend",
        description: "Backend API for DevTrack project",
        stars: 10,
        watchers: 3,
        language: "Node.js",
        isPrivate: true,
      },
    ]
    dispatch({ type: "SET_REPOSITORIES", payload: dummyRepos })
  }, [])

  // Simulate real-time GitHub updates (e.g., PR merge moves task to Done)
  useEffect(() => {
    const interval = setInterval(() => {
      const openPRs = state.pullRequests.filter((pr) => pr.status === "Open")
      if (openPRs.length > 0 && Math.random() > 0.8) {
        // 20% chance to "merge" an open PR
        const prToMerge = openPRs[Math.floor(Math.random() * openPRs.length)]
        const updatedPRs = state.pullRequests.map((pr) =>
          pr.id === prToMerge.id ? { ...pr, status: "Merged" as const, commentsCount: pr.commentsCount + 1 } : pr,
        )
        dispatch({ type: "SET_PULL_REQUESTS", payload: updatedPRs })
        toast({
          title: "PR Merged!",
          description: `Pull Request "${prToMerge.title}" has been merged.`,
        })

        // Find associated task and move to Done
        const associatedTask = state.tasks.find((task) => task.githubLink === prToMerge.url)
        if (associatedTask && associatedTask.status !== "done") {
          dispatch({ type: "UPDATE_TASK", payload: { ...associatedTask, status: "done" } })
          toast({
            title: "Task Auto-Updated",
            description: `Task "${associatedTask.title}" moved to Done!`,
          })
        }
      }
    }, 7000) // Check every 7 seconds

    return () => clearInterval(interval)
  }, [state.pullRequests, state.tasks, toast])

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

  const connectGitHub = () => {
    dispatch({ type: "SET_LOADING", payload: true })
    setTimeout(() => {
      dispatch({ type: "SET_GITHUB_CONNECTED", payload: true })
      dispatch({ type: "SET_LOADING", payload: false })
      toast({
        title: "GitHub Connected",
        description: "Successfully connected to your GitHub account.",
      })
    }, 1500) // Simulate OAuth delay
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
        connectGitHub,
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
