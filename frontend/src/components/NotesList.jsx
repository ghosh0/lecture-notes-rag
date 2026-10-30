import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Trash2, MessageSquare, ChevronRight,
  Clock, BookOpen, History, MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { chatApi, notesApi } from '@/lib/api'
import { cn, formatDate, getFileIcon, truncate } from '@/lib/utils'

function NoteCard({ note, onDelete, onChat }) {
  const [showHistory, setShowHistory] = useState(false)
  const [sessions, setSessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const loadSessions = async () => {
    if (sessions.length > 0) { setShowHistory(true); return }
    setLoadingSessions(true)
    try {
      const s = await chatApi.getSessions(note.id)
      setSessions(s)
      setShowHistory(true)
    } catch {
      setShowHistory(true)
    } finally {
      setLoadingSessions(false)
    }
  }

  const handleDelete = async () => {
    try {
      await notesApi.delete(note.id)
      onDelete(note.id)
    } catch (e) {
      console.error(e)
    }
  }

  const totalMessages = sessions.reduce((acc, s) => acc + (s.messages?.length || 0), 0)

  return (
    <>
      <Card className="group hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            {/* File icon */}
            <div className="text-2xl flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-secondary">
              {getFileIcon(note.file_type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm truncate" title={note.title}>{note.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-xs">{note.subject}</Badge>
                    <Badge variant="outline" className="text-xs">{note.file_type.toUpperCase()}</Badge>
                  </div>
                </div>
              </div>

              {note.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {note.description}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {note.chunk_count} chunks
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(note.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
            <Button
              className="flex-1"
              size="sm"
              onClick={() => onChat(note)}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Chat with Notes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadSessions}
              disabled={loadingSessions}
              title="View chat history"
            >
              <History className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Delete note"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Session History Modal */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-md max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Chat History
            </DialogTitle>
            <DialogDescription>{note.title}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2">
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No chat sessions yet.</p>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.session_id}
                  onClick={() => { setShowHistory(false); onChat(note, s.session_id) }}
                  className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{formatDate(s.updated_at)}</p>
                      <p className="text-sm mt-0.5">{s.messages?.length || 0} messages</p>
                      {s.messages && s.messages[0] && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          &ldquo;{truncate(s.messages[0].content, 80)}&rdquo;
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Note?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{note.title}</strong> and all associated chat sessions. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { handleDelete(); setConfirmDelete(false) }}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function NotesList({ notes, onDelete, onChat, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 rounded-xl bg-secondary/50 animate-pulse" />
        ))}
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-20">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
        <h3 className="font-semibold text-lg mb-1">No notes yet</h3>
        <p className="text-sm text-muted-foreground">Upload your first lecture notes to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} onDelete={onDelete} onChat={onChat} />
      ))}
    </div>
  )
}

