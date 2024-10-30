'use client'

import * as React from "react"
import { Bot, SendHorizontal, Plus, Paperclip, Image as ImageIcon, Search } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { http } from '@/lib/http'
import type { ChatMessage, ChatCompletionResponse } from '@/types/chat'
import { useState, useRef } from 'react'

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

export default function Component() {
  const [messages, setMessages] = useState<ChatMessage[]>([SYSTEM_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setStreamingMessage('')

    try {
      const response = await fetch('https://api.zgi.ai/v1/chat/completions', {
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
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No reader available')

      let fullMessage = ''
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
              const data: StreamChunk = JSON.parse(line.slice(6))
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

      // 流结束后，添加完整的消息到消息列表
      if (fullMessage) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: fullMessage
        }])
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

  return (
    <div className="flex h-[100dvh] bg-background">
      {/* Sidebar */}
      <div className="hidden md:flex w-[300px] flex-col border-r">
        <div className="p-4 space-y-4">
          <Button variant="outline" className="w-full justify-start gap-2">
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
          
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search chats..." className="pl-8" />
          </div>
        </div>

        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 p-2">
            <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">Recent Chats</h2>
            <Button variant="ghost" className="w-full justify-start">
              <Bot className="mr-2 h-4 w-4" />
              Understanding React Hooks
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Bot className="mr-2 h-4 w-4" />
              TypeScript Best Practices
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Bot className="mr-2 h-4 w-4" />
              Next.js App Router
            </Button>
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "mb-4 flex",
                  message.role === 'assistant' ? "justify-start" : "justify-end"
                )}
              >
                <div className="flex gap-3 max-w-[80%]">
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <Card className={cn(
                    "p-4",
                    message.role === 'assistant' 
                      ? "bg-muted" 
                      : "bg-primary text-primary-foreground"
                  )}>
                    {message.content}
                  </Card>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="mb-4 flex justify-start">
                <div className="flex gap-3 max-w-[80%]">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <Card className="p-4 bg-muted">
                    <div className="flex gap-2">
                      <div className="animate-bounce">●</div>
                      <div className="animate-bounce [animation-delay:0.2s]">●</div>
                      <div className="animate-bounce [animation-delay:0.4s]">●</div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
            {streamingMessage && (
              <div className="mb-4 flex justify-start">
                <div className="rounded-lg px-4 py-2 max-w-[80%] bg-muted">
                  {streamingMessage}
                </div>
              </div>
            )}
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