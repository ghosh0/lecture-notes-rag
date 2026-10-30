import { Routes, Route } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import HomePage from '@/pages/HomePage'
import ChatPage from '@/pages/ChatPage'
import { Toaster } from '@/components/ui/use-toast'

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat/:noteId" element={<ChatPage />} />
      </Routes>
      <Toaster />
    </div>
  )
}
