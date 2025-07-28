"use client"

import { Navigation } from "@/components/navigation"
import { useDevTrack } from "@/components/devtrack-provider"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GitPullRequest, GitCommit, MessageSquare, CheckCircle, XCircle, ExternalLink } from "lucide-react"

export default function CodeReviewPage() {
  const { state } = useDevTrack()

  const getPRStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
      case "Merged":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
      case "Closed":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  const getBuildStatusIcon = (status: string) => {
    if (status === "Passed") {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Code Review</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pull Requests Section */}
          <div>
            <h2 className="text-2xl font-bold mb-4 azure-highlight">Pull Requests</h2>
            <div className="space-y-4">
              {state.pullRequests.map((pr) => (
                <Card key={pr.id} className="hover:shadow-md transition-shadow azure-bg-accent">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <GitPullRequest className="h-5 w-5 mt-1 azure-highlight" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <CardTitle className="text-base font-semibold truncate">{pr.title}</CardTitle>
                          <Badge className={`text-xs ${getPRStatusColor(pr.status)}`}>{pr.status}</Badge>
                        </div>
                        <CardDescription className="text-sm text-muted-foreground mb-2">
                          {pr.author} in {pr.repository}
                        </CardDescription>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            {getBuildStatusIcon(pr.buildStatus)}
                            <span>Build {pr.buildStatus}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>{pr.commentsCount} Comments</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={pr.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="azure-highlight border-azure-blue bg-transparent"
                        >
                          View PR Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Commits Section */}
          <div>
            <h2 className="text-2xl font-bold mb-4 azure-highlight">Recent Commits</h2>
            <div className="space-y-4">
              {state.commits.map((commit) => (
                <Card key={commit.id} className="hover:shadow-md transition-shadow azure-bg-accent">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <GitCommit className="h-5 w-5 mt-1 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold mb-1 line-clamp-2">{commit.message}</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground mb-2">
                          {commit.author} in {commit.repository}
                        </CardDescription>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span className="font-mono">{commit.sha.substring(0, 7)}</span>
                          <span>{formatDate(commit.timestamp)}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={commit.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
