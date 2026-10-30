import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  ThumbsUp, ThumbsDown, ChevronDown, ChevronUp,
  BookOpen, Loader2, Send, Sparkles, User, Trash2,
  RefreshCw, MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { chatApi, votesApi } from '@/lib/api'
import { cn, formatRelativeTime } from '@/lib/utils'

// ─── Markdown renderer ─────────────────────────────────────────────────────────
function MarkdownContent({ content }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" {...props}>
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>{children}</code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

// ─── Source citations ──────────────────────────────────────────────────────────
function Sources({ sources }) {
  const [open, setOpen] = useState(false)
  if (!sources || sources.length === 0) return null
  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <BookOpen className="h-3.5 w-3.5" />
        <span>{sources.length} source{sources.length > 1 ? 's' : ''} from notes</span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {sources.map((s, i) => (
            <div key={i} className="bg-white/5 rounded-lg p-3 text-xs text-muted-foreground">
              {s.page !== undefined && s.page !== '' && (
                <span className="text-primary font-medium">Page {s.page + 1} · </span>
              )}
              {s.content_preview}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Single message bubble ─────────────────────────────────────────────────────
function MessageBubble({ message, sessionId, onVote }) {
  const isAI = message.role === 'assistant'
  const [votes, setVotes] = useState({ upvotes: message.upvotes || 0, downvotes: message.downvotes || 0 })
  const [voted, setVoted] = useState(null)
  const [voting, setVoting] = useState(false)

  const handleVote = async (type) => {
    if (voted || voting || !isAI) return
    setVoting(true)
    try {
      const result = await votesApi.vote(sessionId, message.message_id, type)
      setVotes({ upvotes: result.upvotes, downvotes: result.downvotes })
      setVoted(type)
      onVote?.(result)
    } catch {
      // silent fail
    } finally {
      setVoting(false)
    }
  }

  return (
    <div className={cn('flex gap-3 animate-fade-in', isAI ? 'flex-row' : 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold',
        isAI ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : 'bg-secondary text-muted-foreground'
      )}>
        {isAI ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>

      {/* Bubble */}
      <div className={cn('flex-1 max-w-[85%]', isAI ? '' : 'flex flex-col items-end')}>
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm',
          isAI
            ? 'bg-secondary border border-border rounded-tl-sm'
            : 'bg-primary/20 border border-primary/30 rounded-tr-sm text-right'
        )}>
          {isAI ? (
            <>
              <MarkdownContent content={message.content} />
              <Sources sources={message.sources} />
            </>
          ) : (
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* Voting row for AI messages */}
        {isAI && message.message_id && (
          <div className="flex items-center gap-3 mt-2 px-1">
            <span className="text-xs text-muted-foreground">{formatRelativeTime(message.created_at)}</span>
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => handleVote('upvote')}
                disabled={!!voted || voting}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-all',
                  voted === 'upvote'
                    ? 'bg-green-500/20 text-green-400'
                    : 'text-muted-foreground hover:text-green-400 hover:bg-green-500/10',
                  voted && voted !== 'upvote' && 'opacity-40 cursor-not-allowed'
                )}
                title="Helpful explanation"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                <span>{votes.upvotes}</span>
              </button>
              <button
                onClick={() => handleVote('downvote')}
                disabled={!!voted || voting}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-all',
                  voted === 'downvote'
                    ? 'bg-red-500/20 text-red-400'
                    : 'text-muted-foreground hover:text-red-400 hover:bg-red-500/10',
                  voted && voted !== 'downvote' && 'opacity-40 cursor-not-allowed'
                )}
                title="Incorrect or unhelpful"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
                <span>{votes.downvotes}</span>
              </button>
            </div>
          </div>
        )}

        {/* Timestamp for user messages */}
        {!isAI && (
          <span className="text-xs text-muted-foreground mt-1 px-1">{formatRelativeTime(message.created_at)}</span>
        )}
      </div>
    </div>
  )
}

// ─── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="bg-secondary border border-border rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1.5 items-center h-5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-primary/60 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Suggested questions ───────────────────────────────────────────────────────
const SUGGESTIONS = [
  'Summarize the key concepts from these notes',
  'What are the most important definitions?',
  'Explain this topic as if I\'m a beginner',
  'What are the main formulas or theorems?',
  'Create 5 practice questions from these notes',
  'What topics should I focus on for an exam?',
]

// ─── Main Chat Interface ───────────────────────────────────────────────────────
export default function ChatInterface({ note, sessionId: initialSessionId, onSessionCreated }) {
  const [messages, setMessages] = useState([])
  const [sessionId, setSessionId] = useState(initialSessionId || null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  // Load session history
  useEffect(() => {
    if (initialSessionId) {
      setLoadingHistory(true)
      chatApi.getSession(initialSessionId)
        .then((s) => {
          setMessages(s.messages || [])
          setSessionId(s.session_id)
        })
        .catch(console.error)
        .finally(() => setLoadingHistory(false))
    } else {
      setMessages([])
      setSessionId(null)
    }
  }, [initialSessionId])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const q = (text || input).trim()
    if (!q || loading) return

    const userMsg = {
      role: 'user',
      content: q,
      message_id: `tmp-${Date.now()}`,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await chatApi.send({
        note_id: note.id,
        session_id: sessionId,
        message: q,
      })

      const aiMsg = {
        role: 'assistant',
        content: res.answer,
        message_id: res.message_id,
        sources: res.sources,
        upvotes: res.upvotes,
        downvotes: res.downvotes,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, aiMsg])

      if (!sessionId) {
        setSessionId(res.session_id)
        onSessionCreated?.(res.session_id)
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Error:** ${e.message}. Please try again.`,
          message_id: null,
          created_at: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setSessionId(null)
    onSessionCreated?.(null)
  }

  if (loadingHistory) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{note.title}</p>
            <p className="text-xs text-muted-foreground">{note.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="secondary">{note.chunk_count} chunks</Badge>
          <Button variant="ghost" size="sm" onClick={handleNewChat} title="New conversation">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 px-4 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 glow-primary">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Ready to Study!</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Ask me anything about <span className="text-primary font-medium">{note.title}</span>.
              I&apos;ll explain concepts, clarify doubts, and quiz you.
            </p>
            {/* Suggestion chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left px-3 py-2 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 text-xs text-muted-foreground hover:text-foreground transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.message_id || i}
                message={msg}
                sessionId={sessionId}
              />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-border px-4 py-3">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your notes... (Enter to send, Shift+Enter for newline)"
            className="flex-1 min-h-[44px] max-h-32 resize-none"
            rows={1}
            disabled={loading}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            size="icon"
            className="h-11 w-11 flex-shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-center">
          Responses are grounded in your lecture notes · Vote to rate explanations
        </p>
      </div>
    </div>
  )
}

