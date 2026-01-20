"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { usePathname, useRouter } from "next/navigation"
import { pusherClient } from "@/lib/pusher-client" // ✅ client for listening

// -----------------------
// Interfaces
// -----------------------
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
  description?: string
  assignee: string
  dueDate?: string | null
  statusId: string
  priority: "low" | "medium" | "high"
  tags: string[]
  githubLink?: string | null
  order: number
  createdAt?: string
  updatedAt?: string
  assigneeAvatarUrl?: string

}

export interface StatusColumn {
  id: string
  projectId: string
  name: string
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
  | { type: "SET_PROJECT_DATA"; payload: { tasks: Task[]; statusColumns: StatusColumn[] } }
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
    case "SET_PROJECT_DATA":
      return {
        ...state,
        tasks: action.payload.tasks,
        statusColumns: action.payload.statusColumns.sort((a, b) => a.order - b.order),
      }
     case "SET_PROJECTS": {
  const uniqueProjects = Array.from(
    new Map(action.payload.map((p) => [p.id, p])).values()
  )

  let newActive = state.activeProjectId
if (newActive && !uniqueProjects.some((p) => p.id === newActive)) {
  // ✅ Do not auto-select another project
  newActive = null
}

  localStorage.setItem("activeProjectId", newActive || "")

  return { ...state, projects: uniqueProjects, activeProjectId: newActive }
}


    case "ADD_PROJECT":
  return {
    ...state,
    projects: Array.from(
      new Map([...state.projects, action.payload].map(p => [p.id, p])).values()
    ),
  }

    case "UPDATE_PROJECT":
      return {
        ...state,
        projects: state.projects.map((p) => (p.id === action.payload.id ? action.payload : p)),
      }
    case "DELETE_PROJECT":
  return {
    ...state,
    projects: state.projects.filter((p) => p.id !== action.payload),
    tasks: state.tasks.filter((t) => t.projectId !== action.payload),
    statusColumns: state.statusColumns.filter((c) => c.projectId !== action.payload),
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
        tasks: state.tasks.map((t) => (t.id === action.payload.id ? action.payload : t)),
      }
    case "DELETE_TASK":
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.payload) }
    case "MOVE_TASK": {
      const { id, status: newStatus, overId } = action.payload
      const activeTask = state.tasks.find((t) => t.id === id)
      if (!activeTask) return state

      const updatedTasks = state.tasks.filter((t) => t.id !== id)
      const taskToMove = { ...activeTask, statusId: newStatus }

      let targetColumnTasks = updatedTasks.filter(
        (t) => t.statusId === newStatus && t.projectId === activeTask.projectId,
      )

      if (overId) {
        const overIndex = targetColumnTasks.findIndex((t) => t.id === overId)
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
        (t) => t.statusId !== newStatus || t.projectId !== activeTask.projectId,
      )
      return { ...state, tasks: [...otherTasks, ...targetColumnTasks] }
    }
    case "SET_STATUS_COLUMNS":
      return { ...state, statusColumns: action.payload.sort((a, b) => a.order - b.order) }
    case "ADD_STATUS_COLUMN":
      return {
        ...state,
        statusColumns: [...state.statusColumns, action.payload].sort((a, b) => a.order - b.order),
      }
    case "UPDATE_STATUS_COLUMN":
      return {
        ...state,
        statusColumns: state.statusColumns.map((c) => (c.id === action.payload.id ? action.payload : c)),
      }
    case "DELETE_STATUS_COLUMN":
      return {
        ...state,
        statusColumns: state.statusColumns.filter((c) => c.id !== action.payload),
        tasks: state.tasks.map((t) => {
          if (t.statusId === action.payload) {
            const fallback = state.statusColumns.find(
              (c) => c.id !== action.payload && c.projectId === t.projectId,
            )
            return { ...t, statusId: fallback?.id || "todo" }
          }
          return t
        }),
      }
    case "REORDER_STATUS_COLUMNS":
      return { ...state, statusColumns: action.payload.map((c, i) => ({ ...c, order: i })) }
    case "SET_LOADING":
      return { ...state, loading: action.payload }
    default:
      return state
  }
}

// -----------------------
// Context
// -----------------------
const DevTrackContext = createContext<any>(null)

// -----------------------
// Provider
// -----------------------
export function DevTrackProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(devTrackReducer, initialState)
  const { toast } = useToast()
  const pathname = usePathname()
  const router = useRouter()

  const urlProjectId =
    pathname.startsWith("/board/") && pathname.split("/board/")[1]
      ? pathname.split("/board/")[1]
      : null

  // -----------------------
  // Initial Projects Fetch
  // -----------------------
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/projects")
        const projects = await res.json()
        dispatch({ type: "SET_PROJECTS", payload: projects })

        let initialProjectId: string | null = null
        if (urlProjectId && projects.some((p: Project) => p.id === urlProjectId)) {
          initialProjectId = urlProjectId
        } else {
          const savedProject = localStorage.getItem("activeProjectId")
          if (savedProject && projects.some((p: Project) => p.id === savedProject)) {
            initialProjectId = savedProject
          } else if (projects[0]) {
            initialProjectId = projects[0].id
          }
        }

        dispatch({ type: "SET_ACTIVE_PROJECT", payload: initialProjectId })
        if (initialProjectId) localStorage.setItem("activeProjectId", initialProjectId)

        if (pathname === "/board" && initialProjectId) {
          router.replace(`/board/${initialProjectId}`)
        }
      } catch (err) {
        console.error("Failed to fetch projects", err)
      }
    }

    fetchProjects()
  }, [urlProjectId])

  // -----------------------
  // Fetch tasks & statuses
  // -----------------------
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!state.activeProjectId || !pathname.startsWith("/board")) return
      dispatch({ type: "SET_LOADING", payload: true })

      try {
        const [tasksRes, statusesRes] = await Promise.all([
          fetch(`/api/tasks?projectId=${state.activeProjectId}`),
          fetch(`/api/status?projectId=${state.activeProjectId}`),
        ])

        const [tasks, statuses] = await Promise.all([tasksRes.json(), statusesRes.json()])

        dispatch({ type: "SET_TASKS", payload: tasks })
        dispatch({ type: "SET_STATUS_COLUMNS", payload: statuses })
        localStorage.setItem("activeProjectId", state.activeProjectId)
      } catch (err) {
        console.error("Failed to fetch project data", err)
        dispatch({ type: "SET_TASKS", payload: [] })
        dispatch({ type: "SET_STATUS_COLUMNS", payload: [] })
      } finally {
        dispatch({ type: "SET_LOADING", payload: false })
      }
    }

    fetchProjectData()
  }, [state.activeProjectId, pathname])

  // -----------------------
  // Pusher Real-Time Sync
  // -----------------------
 // -----------------------
// Pusher Real-Time Sync
// -----------------------
useEffect(() => {
  const projectsChannel = pusherClient.subscribe("projects")

  projectsChannel.bind("projects-updated", (updatedProjects: Project[]) => {
  dispatch({ type: "SET_PROJECTS", payload: updatedProjects })

  // If active project was deleted
  const currentActive = state.activeProjectId
  const stillExists = updatedProjects.some((p) => p.id === currentActive)

  if (!stillExists && currentActive) {
    // Clear active project
    dispatch({ type: "SET_ACTIVE_PROJECT", payload: null })

    // Redirect user to /projects
    router.push("/projects")
  }
})


  // Per-project channels
  let projectChannel: any = null
  if (state.activeProjectId) {
    projectChannel = pusherClient.subscribe(`project-${state.activeProjectId}`)

    projectChannel.bind("tasks-updated", (updatedTasks: Task[]) => {
      dispatch({ type: "SET_TASKS", payload: updatedTasks })
    })

    projectChannel.bind("columns-updated", (updatedColumns: StatusColumn[]) => {
      dispatch({ type: "SET_STATUS_COLUMNS", payload: updatedColumns })
    })
  }

  return () => {
    if (projectChannel) {
      pusherClient.unsubscribe(`project-${state.activeProjectId}`)
    }
  }
}, [state.activeProjectId])





  // -----------------------
  // Action Helpers
  // -----------------------
 const addProject = async (data: Project, optimistic = false) => {
  // 1️⃣ Add optimistically
  if (optimistic) {
    dispatch({ type: "ADD_PROJECT", payload: data })
  }

  toast({
    title: "Project Created",
    description: optimistic
      ? `"${data.name}" is being saved...`
      : `"${data.name}" has been added.`,
  })

  if (optimistic) {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          userId: localStorage.getItem("userId"),
        }),
      })

      if (!res.ok) throw new Error("Failed to create project")
      const savedProject: Project = await res.json()

      // ✅ Replace temp project with the real one instead of adding a new one
      dispatch({ type: "DELETE_PROJECT", payload: data.id }) // remove temp
      dispatch({ type: "ADD_PROJECT", payload: savedProject }) // add real

    } catch (err) {
      console.error("❌ Add project failed:", err)
      if (data.id.startsWith("temp-")) {
        dispatch({ type: "DELETE_PROJECT", payload: data.id })
      }
      toast({
        title: "Error Creating Project",
        description: "Failed to save project to server.",
        variant: "destructive",
      })
    }
  }
}



  const updateProject = async (project: Project) => {
    if (project.id.startsWith("temp-")) {
      console.warn("Skipping update for temporary project", project.id)
      return
    }

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      })

      if (!res.ok) throw new Error("Failed to update project")
      const updated: Project = await res.json()
      dispatch({ type: "UPDATE_PROJECT", payload: updated })
      toast({ title: "Project Updated", description: `"${updated.name}" updated successfully.` })
    } catch (err) {
      console.error("❌ Update project failed", err)
      toast({ title: "Error", description: "Failed to update project.", variant: "destructive" })
    }
  }
const deleteProject = async (id: string) => {
  const prevProjects = state.projects
  const prevActive = state.activeProjectId

  // 1️⃣ Optimistic removal
  dispatch({ type: "DELETE_PROJECT", payload: id })
  if (prevActive === id) {
    dispatch({ type: "SET_ACTIVE_PROJECT", payload: null })
    localStorage.removeItem("activeProjectId")
  }

  try {
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" })

    if (!res.ok && res.status !== 404) throw new Error("Failed to delete project")

    toast({ title: "Project Deleted", description: "Project removed successfully." })
    // ✅ No refetch needed — Pusher will broadcast to all clients
  } catch (error) {
    console.error("❌ Delete failed, rolling back", error)

    // 2️⃣ Rollback if failed
    dispatch({ type: "SET_PROJECTS", payload: prevProjects })
    dispatch({ type: "SET_ACTIVE_PROJECT", payload: prevActive })

    toast({
      title: "Error Deleting Project",
      description: "Failed to delete project.",
      variant: "destructive",
    })
  }
}



  const setActiveProject = (id: string | null) => dispatch({ type: "SET_ACTIVE_PROJECT", payload: id })

  const addTask = async (data: Omit<Task, "id" | "projectId">) => {
    if (!state.activeProjectId) return

    const tempId = `temp-${Date.now()}`
    const newTask: Task = {
      ...data,
      id: tempId,
      projectId: state.activeProjectId,
      createdAt: new Date().toISOString(),
      order: state.tasks.filter((t) => t.projectId === state.activeProjectId && t.statusId === data.statusId).length,
    }

    dispatch({ type: "ADD_TASK", payload: newTask })

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, projectId: state.activeProjectId }),
      })

      if (!res.ok) throw new Error("Failed to add task")

      const { task: createdTask } = await res.json()
      dispatch({ type: "DELETE_TASK", payload: tempId })
      dispatch({ type: "ADD_TASK", payload: createdTask })
    } catch (error) {
      console.error("❌ Failed to create task", error)
      dispatch({ type: "DELETE_TASK", payload: tempId })
    }
  }

  const updateTask = async (task: Task) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      })
      if (!res.ok) throw new Error("Failed to update task")
      const { task: updatedTask } = await res.json()
      dispatch({ type: "UPDATE_TASK", payload: updatedTask })
      toast({ title: "Task Updated", description: `"${updatedTask.title}" updated successfully.` })
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "Failed to update task.", variant: "destructive" })
    }
  }

  const deleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete task")
      dispatch({ type: "DELETE_TASK", payload: id })
      toast({ title: "Task Deleted", description: "The task has been removed." })
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "Failed to delete task.", variant: "destructive" })
    }
  }

  const moveTask = (id: string, status: string, overId?: string) =>
    dispatch({ type: "MOVE_TASK", payload: { id, status, overId } })

  const addStatusColumn = async (data: Omit<StatusColumn, "id" | "projectId">) => {
  if (!state.activeProjectId) return

  // 1️⃣ Optimistic UI
  const tempId = `temp-${Date.now()}`
  const newColumn: StatusColumn = {
    ...data,
    id: tempId,
    projectId: state.activeProjectId,
    order: state.statusColumns.filter((c) => c.projectId === state.activeProjectId).length,
  }
  dispatch({ type: "ADD_STATUS_COLUMN", payload: newColumn })

  try {
    // 2️⃣ Post to API
    const res = await fetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, projectId: state.activeProjectId }),
    })

    if (!res.ok) throw new Error("Failed to add status column")

    // ✅ API now returns full status list
    const updatedColumns: StatusColumn[] = await res.json()

    // 3️⃣ Replace temp with full list
    dispatch({ type: "SET_STATUS_COLUMNS", payload: updatedColumns })

    // 4️⃣ Toast confirmation
    toast({
      title: "Status Column Added",
      description: `"${data.name}" has been created successfully.`,
    })

    // ✅ Pusher already broadcasts to others
  } catch (err) {
    console.error(err)

    // ❌ Revert if failed
    dispatch({ type: "DELETE_STATUS_COLUMN", payload: tempId })

    // ❌ Show error toast
    toast({
      title: "Error",
      description: "Failed to create status column.",
      variant: "destructive",
    })
  }
}



  const updateStatusColumn = async (column: StatusColumn) => {
  if (!state.activeProjectId) return

  const prevColumns = [...state.statusColumns]
  // 1️⃣ Optimistic update
  dispatch({ type: "UPDATE_STATUS_COLUMN", payload: column })

  try {
    const res = await fetch("/api/status", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(column),
    })

    if (!res.ok) throw new Error("Failed to update status column")

    // ✅ Fetch latest list for full sync
    const refreshed = await fetch(`/api/status?projectId=${state.activeProjectId}`).then((res) =>
      res.json()
    )
    dispatch({ type: "SET_STATUS_COLUMNS", payload: refreshed })

    // ✅ Success toast
    toast({
      title: "Status Updated",
      description: `"${column.name}" has been updated successfully.`,
    })
  } catch (error) {
    console.error("❌ Update failed", error)
    dispatch({ type: "SET_STATUS_COLUMNS", payload: prevColumns }) // rollback
    toast({
      title: "Error",
      description: "Failed to update status column.",
      variant: "destructive",
    })
  }
}


  const deleteStatusColumn = async (id: string) => {
  if (!state.activeProjectId) return

  const prevColumns = [...state.statusColumns]
  dispatch({ type: "DELETE_STATUS_COLUMN", payload: id }) // 1️⃣ Optimistic UI

  try {
    const res = await fetch(`/api/status?id=${id}`, { method: "DELETE" })
    if (!res.ok && res.status !== 404) throw new Error("Failed to delete column")

    // ✅ Fetch refreshed list to ensure sync
    const refreshed = await fetch(`/api/status?projectId=${state.activeProjectId}`).then((res) =>
      res.json()
    )
    dispatch({ type: "SET_STATUS_COLUMNS", payload: refreshed })

    // ✅ Success toast
    toast({
      title: "Status Deleted",
      description: "The status column has been removed.",
    })
  } catch (error) {
    console.error("❌ Delete failed", error)
    dispatch({ type: "SET_STATUS_COLUMNS", payload: prevColumns }) // rollback
    toast({
      title: "Error",
      description: "Failed to delete status column.",
      variant: "destructive",
    })
  }
}


  const reorderTasks = async (updatedTasks: Task[]) => {
    dispatch({ type: "SET_TASKS", payload: updatedTasks })
    await fetch("/api/tasks/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedTasks.map((t) => ({ id: t.id, statusId: t.statusId, order: t.order }))),
    })
  }

  const reorderStatusColumns = async (columns: StatusColumn[]) => {
    dispatch({ type: "REORDER_STATUS_COLUMNS", payload: columns })
    await fetch("/api/status/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(columns.map((c, i) => ({ id: c.id, order: i }))),
    })
  }

  return (
    <DevTrackContext.Provider
      value={{
        state,
        dispatch,
        reorderTasks,
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

// -----------------------
// Hook
// -----------------------
export const useDevTrack = () => {
  const context = useContext(DevTrackContext)
  if (!context) throw new Error("useDevTrack must be used within a DevTrackProvider")
  return context
}
