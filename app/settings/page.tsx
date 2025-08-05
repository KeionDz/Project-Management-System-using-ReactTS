"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Navigation } from "@/components/navigation"
import { useTheme } from "next-themes"
import Image from "next/image"
import { useAuth } from "@/components/auth-provider"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { state } = useAuth() // ✅ logged-in user
  const userEmail = state.user?.email || ""

  // Local state for profile form
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [avatar, setAvatar] = useState("/placeholder.svg?height=64&width=64")
  const [loading, setLoading] = useState(true)

  // ✅ Fetch current user profile from API
  useEffect(() => {
    if (!userEmail) {
      setLoading(false)
      return
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile", {
          headers: {
            "x-user-email": userEmail, // ✅ server uses this to identify user
          },
        })
        if (!res.ok) throw new Error("Failed to load profile")
        const data = await res.json()

        setName(data.name || "")
        setEmail(data.email || "")
        setAvatar(data.avatarUrl || "/placeholder.svg?height=64&width=64")
      } catch (error) {
        console.error("Error fetching profile:", error)
        alert("Failed to load profile. Please refresh.")
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [userEmail])

  // ✅ Save changes to DB
  const handleProfileSave = async () => {
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email, // Email used as identifier
          avatarUrl: avatar,
        }),
      })

      if (!res.ok) throw new Error("Failed to update profile")
      alert("Profile saved successfully!")
    } catch (err) {
      console.error("Save failed", err)
      alert("Failed to save profile")
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result) setAvatar(reader.result.toString())
    }
    reader.readAsDataURL(file)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>

        <div className="grid gap-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update your personal information and avatar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Image
                  src={avatar}
                  alt="Avatar"
                  width={64}
                  height={64}
                  className="rounded-full object-cover border"
                />
                <div>
                  <Label htmlFor="avatar" className="block mb-1">
                    Change Avatar
                  </Label>
                  <Input type="file" id="avatar" accept="image/*" onChange={handleAvatarChange} />
                </div>
              </div>

              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  className="mt-1 bg-muted cursor-not-allowed"
                />
              </div>

              <Button onClick={handleProfileSave}>Save Changes</Button>
            </CardContent>
          </Card>

          {/* Appearance Section */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of DevTrack.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <Switch
                  id="dark-mode"
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notifications Section */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Manage your notification preferences.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <Switch id="email-notifications" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="in-app-notifications">In-App Notifications</Label>
                <Switch id="in-app-notifications" defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Account Section */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Manage your account settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">Change Password</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
