import { useState } from 'react'
import { Plus, MessageSquare, Trash2, Edit2, Check, X, ChevronLeft } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { cn } from '../lib/utils'
import type { Conversation } from '../App'

interface SidebarProps {
  conversations: Conversation[]
  currentConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  onDeleteConversation: (id: string) => void
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onUpdateConversation,
  isOpen,
  onToggle
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const handleStartEdit = (conversation: Conversation) => {
    setEditingId(conversation.id)
    setEditingTitle(conversation.title)
  }

  const handleSaveEdit = (id: string) => {
    if (editingTitle.trim()) {
      onUpdateConversation(id, { title: editingTitle.trim() })
    }
    setEditingId(null)
    setEditingTitle('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onToggle} />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col z-50 transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "lg:relative lg:translate-x-0"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <Button
            onClick={onNewConversation}
            className="flex-1 justify-start gap-2 mr-2"
            variant="outline"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
          
          <Button
            onClick={onToggle}
            variant="ghost"
            size="sm"
            className="lg:hidden"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Conversation list */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 py-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "group relative rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors",
                  currentConversationId === conversation.id && "bg-gray-100 dark:bg-gray-700"
                )}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  {editingId === conversation.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="h-6 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit(conversation.id)
                          } else if (e.key === 'Escape') {
                            handleCancelEdit()
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSaveEdit(conversation.id)
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCancelEdit()
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">
                        {conversation.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(conversation.updated_at)}
                      </div>
                    </div>
                  )}
                </div>
                
                {editingId !== conversation.id && (
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartEdit(conversation)
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteConversation(conversation.id)
                      }}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </>
  )
}