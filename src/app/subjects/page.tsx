import { Card } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import { FloatingSphere } from "@/components/floating-sphere"
import { BookOpen, Beaker, Globe, Languages, Calculator, Atom } from "lucide-react"

const subjects = [
  { name: "Mathematics", icon: Calculator, color: "from-blue-500 to-cyan-500" },
  { name: "Science", icon: Beaker, color: "from-green-500 to-emerald-500" },
  { name: "Physics", icon: Atom, color: "from-purple-500 to-pink-500" },
  { name: "History", icon: Globe, color: "from-orange-500 to-red-500" },
  { name: "Languages", icon: Languages, color: "from-indigo-500 to-blue-500" },
  { name: "Literature", icon: BookOpen, color: "from-rose-500 to-pink-500" },
]

export default function SubjectsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Subjects</h1>
          <p className="text-muted-foreground text-lg">Explore your personalized curriculum</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => {
            const Icon = subject.icon
            return (
              <Card
                key={subject.name}
                className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 border-accent/20 hover:border-accent group"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${subject.color} flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{subject.name}</h3>
                    <p className="text-sm text-muted-foreground">Continue learning</p>
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
