import { BookOpen, GraduationCap, Sparkles } from 'lucide-react'

export default function Navbar() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm text-gradient">LectureRAG</span>
            <span className="text-xs text-muted-foreground ml-1.5">AI Study Assistant</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Powered by Gemini</span>
        </div>
      </div>
    </header>
  )
}

