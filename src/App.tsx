import { useEffect, useState } from 'react'
import { blink } from './lib/blink'
import { ChatInterface } from './components/ChatInterface'
import { Sidebar } from './components/Sidebar'
import { AuthLoading } from './components/AuthLoading'

export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: number
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  created_at: number
  updated_at: number
  user_id: string
}

function App() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false) // Start closed on mobile

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (user) {
      initializeDatabase()
      loadConversations()
    }
  }, [user])

  const initializeDatabase = async () => {
    try {
      await blink.db.sql(`
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          user_id TEXT NOT NULL,
          messages TEXT NOT NULL DEFAULT '[]',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `)
    } catch (error) {
      console.error('Database initialization error:', error)
    }
  }

  const loadConversations = async () => {
    try {
      const result = await blink.db.sql(
        'SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC',
        [user!.id]
      )
      
      const formattedConversations = result.map((row: Record<string, unknown>) => ({
        ...row,
        messages: JSON.parse(row.messages as string || '[]')
      }))
      
      setConversations(formattedConversations)
    } catch (error) {
      console.error('Error loading conversations:', error)
      setConversations([])
    }
  }

  const createNewConversation = async (title = 'New Chat') => {
    try {
      const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const now = Date.now()
      
      await blink.db.sql(
        'INSERT INTO conversations (id, title, user_id, messages, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, title, user!.id, '[]', now, now]
      )
      
      const newConversation: Conversation = {
        id,
        title,
        user_id: user!.id,
        messages: [],
        created_at: now,
        updated_at: now
      }
      
      setConversations(prev => [newConversation, ...prev])
      setCurrentConversationId(id)
      setSidebarOpen(false) // Close sidebar after creating conversation
      return id
    } catch (error) {
      console.error('Error creating conversation:', error)
    }
  }

  const updateConversation = async (conversationId: string, updates: Partial<Conversation>) => {
    try {
      const updateFields = []
      const values = []
      
      if (updates.title !== undefined) {
        updateFields.push('title = ?')
        values.push(updates.title)
      }
      
      if (updates.messages !== undefined) {
        updateFields.push('messages = ?')
        values.push(JSON.stringify(updates.messages))
      }
      
      if (updateFields.length > 0) {
        updateFields.push('updated_at = ?')
        values.push(Date.now())
        values.push(conversationId)
        
        await blink.db.sql(
          `UPDATE conversations SET ${updateFields.join(', ')} WHERE id = ?`,
          values
        )
      }
      
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId ? { ...conv, ...updates, updated_at: Date.now() } : conv
        )
      )
    } catch (error) {
      console.error('Error updating conversation:', error)
    }
  }

  const deleteConversation = async (conversationId: string) => {
    try {
      await blink.db.sql('DELETE FROM conversations WHERE id = ?', [conversationId])
      setConversations(prev => prev.filter(conv => conv.id !== conversationId))
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null)
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }

  const getCurrentConversation = () => {
    return conversations.find(conv => conv.id === currentConversationId)
  }

  if (loading) {
    return <AuthLoading />
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={(id) => {
          setCurrentConversationId(id)
          setSidebarOpen(false) // Close sidebar when selecting conversation on mobile
        }}
        onNewConversation={createNewConversation}
        onDeleteConversation={deleteConversation}
        onUpdateConversation={updateConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className="flex-1 flex flex-col lg:ml-0">
        <ChatInterface
          conversation={getCurrentConversation()}
          onUpdateConversation={updateConversation}
          onNewConversation={createNewConversation}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>
    </div>
  )
}

export default App