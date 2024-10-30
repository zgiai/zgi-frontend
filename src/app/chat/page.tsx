'use client'

import * as React from "react"
import { Bot, SendHorizontal, Plus, Paperclip, Image as ImageIcon, Search, Trash2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { http } from '@/lib/http'
import type { ChatMessage, ChatCompletionResponse } from '@/types/chat'
import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SYSTEM_MESSAGE: ChatMessage = {
  role: 'system',
  content: 'You are a helpful assistant.'
}

// 添加类型定义
interface StreamChunk {
  id: string
  object: string
  created: number
  model: string
  system_fingerprint: string
  choices: {
    index: number
    delta: {
      content?: string
    }
    logprobs: null
    finish_reason: null | string
  }[]
}

// 添加类型定义
interface ChatHistory {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
}

const STORAGE_KEY = 'chat_histories'

export default function ChatPage() {
  // 添加 messagesEndRef 定义
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. 首先定义所有状态
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')

  // 2. 在组件加载时从 localStorage 加载数据
  useEffect(() => {
    const loadChatHistories = () => {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const histories = JSON.parse(saved)
        setChatHistories(histories)
        
        // 如果没有当前选中的聊天，自动选择最新的一个
        if (!currentChatId && histories.length > 0) {
          const mostRecent = histories[0]
          setCurrentChatId(mostRecent.id)
          setMessages(mostRecent.messages)
        }
      }
    }

    loadChatHistories()
  }, []) // 只在组件挂载时执行一次

  // 3. 当聊天历史更新时保存到 localStorage
  useEffect(() => {
    if (chatHistories.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistories))
    }
  }, [chatHistories])

  // 4. 创建新聊天的函数
  const createNewChat = () => {
    const newChat: ChatHistory = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString()
    }
    setChatHistories(prev => [newChat, ...prev])
    setCurrentChatId(newChat.id)
    setMessages([])
  }

  // 5. 加载特定聊天的函数
  const loadChat = (chatId: string) => {
    const chat = chatHistories.find(c => c.id === chatId)
    if (chat) {
      setCurrentChatId(chatId)
      setMessages(chat.messages)
    }
  }

  // 6. 删除聊天的函数
  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation() // 防止触发聊天选择
    setChatHistories(prev => prev.filter(chat => chat.id !== chatId))
    if (currentChatId === chatId) {
      const remaining = chatHistories.filter(chat => chat.id !== chatId)
      if (remaining.length > 0) {
        loadChat(remaining[0].id)
      } else {
        setCurrentChatId(null)
        setMessages([])
      }
    }
  }

  // 7. 修改发送消息函数，确保更新 chatHistories
  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setStreamingMessage('')

    try {
      const response = await fetch('/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [...messages, userMessage],
          stream: true,
          temperature: 0.7,
          top_p: 1.0,
          n: 1,
          max_tokens: 100
        })
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      const decoder = new TextDecoder()
      let fullMessage = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk
            .split('\n')
            .filter(line => line.trim() !== '' && line.trim() !== 'data: [DONE]')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                const content = data.choices[0]?.delta?.content
                if (content) {
                  fullMessage += content
                  setStreamingMessage(fullMessage)
                }
              } catch (error) {
                console.error('Error parsing JSON:', error)
              }
            }
          }
        }

        if (fullMessage) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: fullMessage
          }])

          // 更新聊天历史
          setChatHistories(prev => prev.map(chat => {
            if (chat.id === currentChatId) {
              return {
                ...chat,
                messages: [...chat.messages, userMessage, { role: 'assistant', content: fullMessage }]
              }
            }
            return chat
          }))
        }

      } catch (error) {
        console.error('Error reading stream:', error)
      } finally {
        reader.releaseLock()
      }

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
      setStreamingMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Check if Enter is pressed without Shift key
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault() // Prevent default to avoid new line
      sendMessage(e)
    }
  }

  // 添加自动滚动到底部的效果
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // 当消息更新时自动滚动
  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage])

  return (
    <div className="flex h-[100dvh] bg-background">
      <div className="hidden md:flex w-[300px] flex-col border-r">
        <div className="p-4">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 mb-4"
            onClick={createNewChat}
            type="button"
          >
            <Plus className="h-4 w-4" />
            <span>New Chat</span>
          </Button>

          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight mb-2">
              Recent Chats
            </h2>
            <ScrollArea className="h-[calc(100vh-180px)]">
              <div className="space-y-1">
                {chatHistories.map((chat) => (
                  <div key={chat.id} className="flex items-center gap-2 px-2">
                    <Button
                      variant={currentChatId === chat.id ? "secondary" : "ghost"}
                      className="w-full justify-start text-left"
                      onClick={() => loadChat(chat.id)}
                    >
                      <Bot className="mr-2 h-4 w-4" />
                      <span className="truncate">{chat.title}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => deleteChat(chat.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "mb-4",
                  message.role === "user" ? "ml-auto" : "mr-auto"
                )}
              >
                <Card className={cn(
                  "max-w-[80%]",
                  message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <CardContent className="p-3">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
            {streamingMessage && (
              <div className="mr-auto mb-4">
                <Card className="bg-muted max-w-[80%]">
                  <CardContent className="p-3">
                    <p className="whitespace-pre-wrap">{streamingMessage}</p>
                  </CardContent>
                </Card>
              </div>
            )}
            {/* 添加 ref 元素用于滚动 */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4">
          <form onSubmit={sendMessage} className="max-w-3xl mx-auto flex gap-4">
            <div className="relative flex-1">
              <Textarea
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                className="min-h-[44px] w-full resize-none py-3 pr-20"
              />
              <div className="absolute right-4 top-3 flex gap-2">
                <Button size="icon" variant="ghost" type="button">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" type="button">
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button type="submit" size="icon" disabled={isLoading}>
              <SendHorizontal className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}