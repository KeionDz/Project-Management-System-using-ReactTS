import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { DevTrackProvider } from "@/components/devtrack-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "DevTrack - Modern Project Management",
  description: "A modern project management system with Kanban boards, GitHub integration, and code review features.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <DevTrackProvider>
            {children}
            <Toaster />
          </DevTrackProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
