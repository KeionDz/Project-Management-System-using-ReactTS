"use client"

import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Github, GitPullRequest, GitCommit, ExternalLink, CheckCircle, Star, Eye } from "lucide-react"
import { useDevTrack } from "@/components/devtrack-provider"

export default function GitHubPage() {
  const { state, connectGitHub } = useDevTrack()

  const getStatusColor = (status: string) => {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">GitHub Integration</h1>
          <p className="text-muted-foreground">
            Connect your GitHub account to sync pull requests and commits with your tasks.
          </p>
        </div>

        {!state.githubConnected ? (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                <Github className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Connect GitHub</CardTitle>
              <CardDescription>
                Link your GitHub account to automatically sync your development workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={connectGitHub} disabled={state.loading} className="w-full" size="lg">
                <Github className="mr-2 h-4 w-4" />
                {state.loading ? "Connecting..." : "Connect with GitHub"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Connected Status */}
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-green-800 dark:text-green-400">GitHub Connected</CardTitle>
                </div>
                <CardDescription>Your GitHub account is successfully connected and syncing.</CardDescription>
              </CardHeader>
            </Card>

            {/* Repositories */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Connected Repositories</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {state.repositories.map((repo) => (
                  <Card key={repo.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base flex items-center space-x-2">
                            <span>{repo.name}</span>
                            {repo.isPrivate && (
                              <Badge variant="secondary" className="text-xs">
                                Private
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-sm mt-1">{repo.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span>{repo.language}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3" />
                            <span>{repo.stars}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Eye className="h-3 w-3" />
                            <span>{repo.watchers}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pull Requests */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Recent Pull Requests</h2>
                <div className="space-y-3">
                  {state.pullRequests.map((pr) => (
                    <Card key={pr.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <GitPullRequest className="h-4 w-4 mt-1 text-blue-600" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-medium text-sm truncate">{pr.title}</h3>
                              <Badge className={`text-xs ${getStatusColor(pr.status)}`}>{pr.status}</Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span>{pr.repository}</span>
                              <span>{pr.author}</span>
                              <span>{formatDate(pr.createdAt)}</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                            <a href={pr.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Recent Commits */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Recent Commits</h2>
                <div className="space-y-3">
                  {state.commits.map((commit) => (
                    <Card key={commit.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <GitCommit className="h-4 w-4 mt-1 text-gray-600" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm mb-1 line-clamp-2">{commit.message}</h3>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span className="font-mono">{commit.sha.substring(0, 7)}</span>
                              <span>{commit.repository}</span>
                              <span>{commit.author}</span>
                              <span>{formatDate(commit.timestamp)}</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                            <a href={commit.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
