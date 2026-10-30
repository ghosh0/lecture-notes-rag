import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { notesApi } from '@/lib/api'
import { cn } from '@/lib/utils'

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
}

export default function UploadModal({ open, onClose, onUploaded }) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) {
      setFile(accepted[0])
      setError('')
      // Pre-fill title from filename
      const name = accepted[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      if (!title) setTitle(name)
    }
  }, [title])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50 MB
    onDropRejected: () => setError('Invalid file type or file too large (max 50MB).'),
  })

  const reset = () => {
    setFile(null)
    setTitle('')
    setSubject('')
    setDescription('')
    setProgress(0)
    setDone(false)
    setError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleUpload = async () => {
    if (!file || !title.trim() || !subject.trim()) {
      setError('Please fill in title and subject.')
      return
    }
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', title.trim())
      fd.append('subject', subject.trim())
      if (description.trim()) fd.append('description', description.trim())

      const note = await notesApi.upload(fd, setProgress)
      setDone(true)
      setTimeout(() => {
        onUploaded(note)
        handleClose()
      }, 1200)
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Lecture Notes
          </DialogTitle>
          <DialogDescription>
            Upload a PDF, Word, or text file to start chatting with your notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
              isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-secondary/50',
              file && 'border-green-500/50 bg-green-500/5'
            )}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-green-400" />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  className="ml-auto p-1 rounded-full hover:bg-white/10"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {isDragActive ? 'Drop your file here...' : 'Drag & drop or click to upload'}
                </p>
                <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, TXT — up to 50MB</p>
              </div>
            )}
          </div>

          {/* Form fields */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
              <Input
                placeholder="e.g., Chapter 3 - Data Structures"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={uploading}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject *</label>
              <Input
                placeholder="e.g., Computer Science, Physics, Math"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={uploading}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description (optional)</label>
              <Textarea
                placeholder="Brief description of these notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={uploading}
                rows={2}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Progress */}
          {uploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Processing notes...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={handleClose} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!file || !title || !subject || uploading || done}>
              {done ? (
                <><CheckCircle2 className="h-4 w-4 mr-2 text-green-400" /> Uploaded!</>
              ) : uploading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Upload &amp; Process</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

