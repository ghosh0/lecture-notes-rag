import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, History, Trash2, ChevronRight,
  Clock, MessageSquare, BookOpen, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import ChatInterface from '@/components/ChatInterface'
import { notesApi, chatApi } from '@/lib/api'
import { cn, formatRelativeTime, truncate } from '@/lib/utils'
import { toast } from '@/components/ui/use-toast'

function SessionSidebarItem({ session, active, onClick, onDelete }) {
  const firstUserMsg = session.messages?.find((m) => m.role === 'user')
  return (
    <div
      className={cn(
        'group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all border',
        active
          ? 'bg-primary/10 border-primary/40 text-foreground'
          : 'border-transparent hover:bg-secondary text-muted-foreground hover:text-foreground'
      )}
      onClick={onClick}
    >
      <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate">
          {firstUserMsg ? truncate(firstUserMsg.content, 45) : 'New conversation'}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {session.messages?.length || 0} msgs · {formatRelativeTime(session.updated_at)}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(session.session_id) }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 hover:text-destructive transition-all"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  )
}

export default function ChatPage() {
  const { noteId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialSessionId = searchParams.get('session')

  const [note, setNote] = useState(null)
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(initialSessionId)
  const [loadingNote, setLoadingNote] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [noteData, sessionData] = await Promise.all([
          notesApi.get(noteId),
          chatApi.getSessions(noteId),
        ])
        setNote(noteData)
        setSessions(sessionData)
      } catch (e) {
        toast({ title: 'Error', description: e.message, variant: 'destructive' })
        navigate('/')
      } finally {
        setLoadingNote(false)
      }
    }
    load()
  }, [noteId])

  const handleSessionCreated = (sid) => {
    setActiveSessionId(sid)
    if (sid) {
      setSearchParams({ session: sid })
      // Refresh sessions list
      chatApi.getSessions(noteId).then(setSessions).catch(console.error)
    } else {
      setSearchParams({})
    }
  }

  const handleSelectSession = (sid) => {
    setActiveSessionId(sid)
    setSearchParams(sid ? { session: sid } : {})
  }

  const handleDeleteSession = async (sid) => {
    try {
      await chatApi.deleteSession(sid)
      setSessions((prev) => prev.filter((s) => s.session_id !== sid))
      if (activeSessionId === sid) {
        setActiveSessionId(null)
        setSearchParams({})
      }
      toast({ title: 'Session deleted' })
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  if (loadingNote) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!note) return null

  return (
    <div className="h-[calc(100vh-3.5rem)] flex overflow-hidden">
      {/* Sidebar */}
      <div className={cn(
        'border-r border-border bg-background/50 flex flex-col transition-all duration-200',
        sidebarOpen ? 'w-64 xl:w-72' : 'w-0 overflow-hidden'
      )}>
        {/* Sidebar header */}
        <div className="p-3 border-b border-border flex-shrink-0">
          <Link to="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Library
          </Link>
          <div className="flex items-start gap-2">
            <BookOpen className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{note.title}</p>
              <Badge variant="secondary" className="text-[10px] mt-0.5">{note.subject}</Badge>
            </div>
          </div>
        </div>

        {/* New chat button */}
        <div className="p-3 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => handleSelectSession(null)}
          >
            + New Conversation
          </Button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            History ({sessions.length})
          </p>
          <ScrollArea className="flex-1 px-2 pb-2">
            <div className="space-y-1">
              {sessions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No sessions yet.</p>
              ) : (
                sessions.map((s) => (
                  <SessionSidebarItem
                    key={s.session_id}
                    session={s}
                    active={s.session_id === activeSessionId}
                    onClick={() => handleSelectSession(s.session_id)}
                    onDelete={handleDeleteSession}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toggle sidebar on mobile */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="absolute left-0 top-1/2 z-10 h-8 w-4 flex items-center justify-center bg-secondary border border-border rounded-r-lg opacity-60 hover:opacity-100 transition-opacity"
          style={{ marginTop: '3.5rem' }}
        >
          <ChevronRight className={cn('h-3 w-3 transition-transform', sidebarOpen && 'rotate-180')} />
        </button>

        <ChatInterface
          note={note}
          sessionId={activeSessionId}
          onSessionCreated={handleSessionCreated}
        />
      </div>
    </div>
  )
}

