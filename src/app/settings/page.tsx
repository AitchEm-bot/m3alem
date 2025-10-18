import { Card } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import { FloatingSphere } from "@/components/floating-sphere"
import { User, Bell, Shield, Palette } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground text-lg">Manage your account and preferences</p>
        </div>

        <div className="space-y-4">
          {[
            { icon: User, title: "Profile", description: "Manage your personal information" },
            { icon: Bell, title: "Notifications", description: "Configure your notification preferences" },
            { icon: Shield, title: "Privacy", description: "Control your privacy settings" },
            { icon: Palette, title: "Appearance", description: "Customize your learning experience" },
          ].map((item) => {
            const Icon = item.icon
            return (
              <Card
                key={item.title}
                className="p-6 hover:shadow-lg transition-all cursor-pointer border border-accent/20 hover:border-accent"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </main>

      <FloatingSphere />
    </div>
  )
}
