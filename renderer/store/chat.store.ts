import { API_CONFIG, token } from '@/lib/http'
import { getStorageAdapter } from '@/lib/storageAdapter'
import { handleChatStream, streamChatCompletions } from '@/server/chat.server'
import type { ChatHistory, ChatMessage } from '@/types/chat'
import { debounce } from 'lodash'
import { create } from 'zustand'

/**
 * 聊天状态管理接口
 * @interface ChatStore
 */
interface ChatStore {
  currentChatId: string | null // 当前选中的对话ID
  chatHistories: ChatHistory[] // 所有对话历史记录
  messageStreamingMap: Record<string, string> // 每个对话的流式消息状态
  isLoadingMap: Record<string, boolean> // 每个对话的加载状态
  setCurrentChatId: (id: string | null) => void // 设置当前对话ID
  createChat: () => void // 创建新对话
  deleteChat: (id: string) => void // 删除对话
  updateChatMessages: (chatId: string, messages: ChatMessage[]) => void // 更新对话消息
  updateChatTitle: (chatId: string, title: string) => void // 更新对话标题
  clearAllChats: () => void // 清空所有对话
  loadChatsFromDisk: () => void // 从磁盘加载对话
  saveChatsToDisk: () => void // 保存对话到磁盘
  sendMessage: (message: ChatMessage) => void // 发送消息
  updateChatTitleByContent: (chatId: string) => void // 添加新方法
  isFirstOpen: boolean  // 添加标记是否是首次打开的状态
}

/**
 * 创建聊天状态管理store
 */
export const useChatStore = create<ChatStore>()((set, get) => {
  const storageAdapter = getStorageAdapter()

  // 添加更新标题的辅助函数
  const updateChatTitleByContent = (chatId: string) => {
    const { chatHistories, isFirstOpen } = get()
    const chat = chatHistories.find(c => c.id === chatId)
    
    // 只有在首次打开软件时更新标题
    if (!chat || !chat.messages.length || !isFirstOpen) return

    // 获取第一条文字消息
    const firstTextMessage = chat.messages.find(msg => 
      msg.role === 'user' && !msg.fileType && msg.content.trim()
    )
    
    if (firstTextMessage) {
      const newTitle = firstTextMessage.content.slice(0, 20) + 
        (firstTextMessage.content.length > 20 ? '...' : '')
      
      set((state) => ({
        chatHistories: state.chatHistories.map((c) => {
          if (c.id === chatId) {
            return {
              ...c,
              title: newTitle,
            }
          }
          return c
        }),
      }))
      
      get().saveChatsToDisk()
    }
  }

  return {
    // 初始状态
    currentChatId: null,
    chatHistories: [],
    messageStreamingMap: {},
    isLoadingMap: {},
    isFirstOpen: true,  // 添加首次打开标记

    /**
     * 设置当前选中的对话ID
     * @param id 对话ID
     */
    setCurrentChatId: (id) => {
      set({ currentChatId: id })
      get().saveChatsToDisk()
    },

    /**
     * 创建新的对话
     */
    createChat: () => {
      const newChat: ChatHistory = {
        id: Date.now().toString(),
        title: '新对话',
        messages: [],
        createdAt: new Date().toISOString(),
      }
      set((state) => ({
        chatHistories: [newChat, ...state.chatHistories],
        currentChatId: newChat.id,
      }))
      get().saveChatsToDisk()
    },

    /**
     * 删除指定对话
     * @param id 要删除的对话ID
     */
    deleteChat: (id) => {
      set((state) => {
        const newHistories = state.chatHistories.filter((chat) => chat.id !== id)
        return {
          chatHistories: newHistories,
          currentChatId:
            state.currentChatId === id ? (newHistories[0]?.id ?? null) : state.currentChatId,
        }
      })
      get().saveChatsToDisk()
    },

    /**
     * 更新指定对话的消息列表
     * @param chatId 对话ID
     * @param messages 新消息列表
     */
    updateChatMessages: (chatId, messages) => {
      set((state) => ({
        chatHistories: state.chatHistories.map((chat) =>
          chat.id === chatId ? { ...chat, messages } : chat,
        ),
      }))
      get().saveChatsToDisk()
    },

    /**
     * 更新指定对话的标题
     * @param chatId 对话ID
     * @param title 新标题
     */
    updateChatTitle: (chatId, title) => {
      set((state) => ({
        chatHistories: state.chatHistories.map((chat) =>
          chat.id === chatId ? { ...chat, title } : chat,
        ),
      }))
      get().saveChatsToDisk()
    },

    /**
     * 清空所有对话
     */
    clearAllChats: () => {
      set({ chatHistories: [], currentChatId: null })
      get().saveChatsToDisk()
    },

    /**
     * 从存储中加载对话历史
     */
    loadChatsFromDisk: async () => {
      try {
        const data = await storageAdapter.load()
        if (data) {
          set({
            chatHistories: data.chatHistories || [],
            currentChatId: data.currentChatId || null,
            isFirstOpen: true,  // 每次加载时重置为 true
          })
        }
      } catch (error) {
        console.error('加载聊天记录失败:', error)
      }
    },

    /**
     * 保存对话历史到存储
     * 用防抖以避免频繁保存
     */
    saveChatsToDisk: debounce(() => {
      const state = get()
      const data = {
        chatHistories: state.chatHistories,
        currentChatId: state.currentChatId,
      }
      storageAdapter.save(data)
    }, 1000),

    /**
     * 发送消息并处理AI响应
     * @param message 用户发送的消息
     */
    sendMessage: async (message: ChatMessage) => {
      const { currentChatId, isFirstOpen } = get()
      let chatId = currentChatId

      // 检查是否已经在加载状态
      const isLoading = get().isLoadingMap[chatId || '']
      if (isLoading) return

      if (!chatId) {
        // 创建新对话时不设置标题，等第一条消息发送后再设置
        const newChat = {
          id: Date.now().toString(),
          title: '新对话',
          messages: [],
          createdAt: new Date().toISOString(),
        }

        set((state) => ({
          chatHistories: [newChat, ...state.chatHistories],
          currentChatId: newChat.id,
        }))

        chatId = newChat.id
      }

      const currentChat = get().chatHistories.find((chat) => chat.id === chatId)
      if (!currentChat) return

      // 添加用户消息到历史记录
      const newMessages = [...currentChat.messages, message]
      
      // 更新状态，立即显示用户消息
      set((state) => ({
        chatHistories: state.chatHistories.map((chat) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: newMessages,
            }
          }
          return chat
        }),
      }))

      // 如果是文件消息且标记为不需要 AI 回复，直接返回
      if (message.skipAIResponse) {
        return
      }

      // 设置加载状态
      set((state) => ({
        isLoadingMap: { ...state.isLoadingMap, [chatId]: true },
        messageStreamingMap: { ...state.messageStreamingMap, [chatId]: '' },
      }))

      try {
        // 修改发送给 AI 的消息格式
        const messagesToSend = currentChat.messages.map(msg => {
          if (msg.fileType?.includes('image/')) {
            // 处理图片消息
            let imageUrl = msg.content
            if (!msg.content.startsWith('http')) {
              // 如果不是 URL，则转换为 base64
              imageUrl = `data:${msg.fileType};base64,${msg.content}`
            }

            return {
              role: msg.role,
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl
                  }
                }
              ]
            }
          }
          // 处理普通文本消息
          return {
            role: msg.role,
            content: msg.content
          }
        })

        // 处理当前发送的消息
        const currentMessageToSend = message.fileType?.includes('image/')
          ? {
              role: message.role,
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: message.content.startsWith('http')
                      ? message.content
                      : `data:${message.fileType};base64,${message.content}`
                  }
                }
              ]
            }
          : {
              role: message.role,
              content: message.content
            }

        // 如果不是需要跳过 AI 响应的消息，则发送请求
        if (!message.skipAIResponse) {
          const response = await fetch(`${API_CONFIG.COMMON}/v1/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: token,
            },
            body: JSON.stringify({
              model: 'gpt-4-vision-preview',  // 使用支持图片的模型
              messages: [...messagesToSend, currentMessageToSend],
              stream: true,
              temperature: 1,
              max_tokens: 4096,
            }),
          })

          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
          const reader = response.body?.getReader()
          if (!reader) throw new Error('No reader available')

          const decoder = new TextDecoder()
          let fullMessage = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk
              .split('\n')
              .filter((line) => line.trim() !== '' && line.trim() !== 'data: [DONE]')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))
                  const content = data.choices[0]?.delta?.content
                  if (content) {
                    fullMessage += content
                    // 更新流式消息状态
                    set((state) => ({
                      messageStreamingMap: { ...state.messageStreamingMap, [chatId]: fullMessage },
                    }))
                  }
                } catch (error) {
                  console.error('Error parsing JSON:', error)
                }
              }
            }
          }

          // 将AI响应添加到消息列表
          if (fullMessage) {
            const assistantMessage: ChatMessage = {
              role: 'assistant',
              content: fullMessage,
            }

            set((state) => ({
              chatHistories: state.chatHistories.map((chat) => {
                if (chat.id === chatId) {
                  return {
                    ...chat,
                    messages: [...newMessages, assistantMessage],
                  }
                }
                return chat
              }),
              messageStreamingMap: { ...state.messageStreamingMap, [chatId]: '' },
            }))
          }
        }
      } catch (error) {
        console.error('发送消息失败:', error)
        // 只在 messageStreamingMap 中显示错误消息，不存入历史记录
        set((state) => ({
          messageStreamingMap: { 
            ...state.messageStreamingMap, 
            [chatId]: '抱歉，发送消息失败，请稍后重试。' 
          }
        }))
      } finally {
        // 重置加载状态
        set((state) => ({
          isLoadingMap: { ...state.isLoadingMap, [chatId]: false },
        }))
        
        // 只有在成功的情况下才保存到磁盘
        if (!get().messageStreamingMap[chatId]) {
          get().saveChatsToDisk()
        }
      }
    },

    updateChatTitleByContent,  // 导出方法
  }
})
