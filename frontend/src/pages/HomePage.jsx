import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, BookOpen, Sparkles, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import NotesList from '@/components/NotesList'
import UploadModal from '@/components/UploadModal'
import { notesApi } from '@/lib/api'
import { toast } from '@/components/ui/use-toast'

const SUBJECTS = ['All', 'Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'Literature', 'Economics', 'Other']

export default function HomePage() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeSubject, setActiveSubject] = useState('All')
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    try {
      const data = await notesApi.list()
      setNotes(data)
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleUploaded = (note) => {
    setNotes((prev) => [note, ...prev])
    toast({ title: '✅ Notes uploaded!', description: `"${note.title}" is ready for studying.` })
  }

  const handleDelete = (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    toast({ title: 'Note deleted', description: 'Note and all chat history removed.' })
  }

  const handleChat = (note, sessionId = null) => {
    const path = sessionId
      ? `/chat/${note.id}?session=${sessionId}`
      : `/chat/${note.id}`
    navigate(path)
  }

  // Filter notes
  const filtered = notes.filter((n) => {
    const matchSearch = !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.subject.toLowerCase().includes(search.toLowerCase()) ||
      (n.description || '').toLowerCase().includes(search.toLowerCase())
    const matchSubject = activeSubject === 'All' || n.subject === activeSubject
    return matchSearch && matchSubject
  })

  // Get unique subjects from notes
  const noteSubjects = ['All', ...new Set(notes.map((n) => n.subject))]

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-purple-900/10 to-transparent" />
        <div className="container mx-auto px-4 py-12 relative">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">AI-Powered Study Assistant</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            <span className="text-gradient">Chat with Your</span>
            <br />
            Lecture Notes
          </h1>
          <p className="text-muted-foreground text-base max-w-lg mb-6">
            Upload your notes and get instant, contextual explanations powered by Gemini AI.
            Ask questions, get summaries, and master any topic.
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowUpload(true)} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Upload Notes
            </Button>
            {notes.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {notes.length} note{notes.length !== 1 ? 's' : ''} in library
              </span>
            )}
          </div>

          {/* Stats */}
          {notes.length > 0 && (
            <div className="flex items-center gap-6 mt-8">
              {[
                { label: 'Notes', value: notes.length },
                { label: 'Total Chunks', value: notes.reduce((a, n) => a + n.chunk_count, 0) },
                { label: 'Subjects', value: new Set(notes.map((n) => n.subject)).size },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-bold text-gradient">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notes library */}
      <div className="container mx-auto px-4 py-8">
        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {/* Subject filter chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {noteSubjects.map((subj) => (
              <button
                key={subj}
                onClick={() => setActiveSubject(subj)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  activeSubject === subj
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>
        </div>

        {filtered.length !== notes.length && (
          <p className="text-sm text-muted-foreground mb-4">
            Showing {filtered.length} of {notes.length} notes
          </p>
        )}

        <NotesList
          notes={filtered}
          onDelete={handleDelete}
          onChat={handleChat}
          loading={loading}
        />
      </div>

      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={handleUploaded}
      />
    </div>
  )
}

