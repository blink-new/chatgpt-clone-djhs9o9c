import { useState, useRef, useEffect } from 'react'
import { Send, Menu, Bot, User, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { ScrollArea } from './ui/scroll-area'
import { Card } from './ui/card'
import { blink } from '../lib/blink'
import { cn } from '../lib/utils'
import type { Conversation, Message } from '../App'

interface ChatInterfaceProps {
  conversation: Conversation | undefined
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void
  onNewConversation: () => Promise<string | undefined>
  onToggleSidebar: () => void
}

export function ChatInterface({
  conversation,
  onUpdateConversation,
  onNewConversation,
  onToggleSidebar
}: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [conversation?.messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isGenerating) return

    const userMessage = input.trim()
    setInput('')
    setIsGenerating(true)

    try {
      // Create new conversation if none exists
      let currentConversationId = conversation?.id
      if (!currentConversationId) {
        currentConversationId = await onNewConversation()
        if (!currentConversationId) return
      }

      // Add user message
      const userMsg: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: userMessage,
        role: 'user',
        timestamp: Date.now()
      }

      const updatedMessages = [...(conversation?.messages || []), userMsg]
      onUpdateConversation(currentConversationId, { messages: updatedMessages })

      // Generate AI response
      const assistantMsg: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: '',
        role: 'assistant',
        timestamp: Date.now()
      }

      const messagesWithAssistant = [...updatedMessages, assistantMsg]
      onUpdateConversation(currentConversationId, { messages: messagesWithAssistant })

      // Stream AI response
      await blink.ai.streamText(
        {
          messages: updatedMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          model: 'gpt-4o-mini',
          maxTokens: 2000
        },
        (chunk) => {
          assistantMsg.content += chunk
          onUpdateConversation(currentConversationId!, { 
            messages: [...updatedMessages, { ...assistantMsg }] 
          })
        }
      )

      // Update conversation title if it's the first message
      if (updatedMessages.length === 1) {
        const title = userMessage.length > 50 ? userMessage.substring(0, 50) + '...' : userMessage
        onUpdateConversation(currentConversationId, { title })
      }

    } catch (error) {
      console.error('Error generating response:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/\n/g, '<br>')
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {conversation?.title || 'ChatGPT Clone'}
          </h1>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
        <div className="max-w-3xl mx-auto py-6">
          {conversation?.messages.length === 0 || !conversation ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                How can I help you today?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Start a conversation by typing a message below.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {conversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-4 p-4 rounded-lg",
                    message.role === 'user' 
                      ? "bg-blue-50 dark:bg-blue-900/20" 
                      : "bg-gray-50 dark:bg-gray-800/50"
                  )}
                >
                  <div className="flex-shrink-0">
                    {message.role === 'user' ? (
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gray-600 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {message.role === 'user' ? 'You' : 'Assistant'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div 
                      className="text-gray-800 dark:text-gray-200 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                    />
                  </div>
                </div>
              ))}
              
              {isGenerating && (
                <div className="flex gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className="w-8 h-8 bg-gray-600 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Assistant
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <Card className="p-4">
            <div className="flex gap-3">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message ChatGPT..."
                className="flex-1 min-h-[60px] max-h-[200px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isGenerating}
              />
              <Button
                type="submit"
                disabled={!input.trim() || isGenerating}
                className="self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </div>
  )
}