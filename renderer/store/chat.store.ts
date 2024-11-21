import { API_CONFIG } from '@/lib/http'
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
  saveChatsToDisk: () => void // 保存对��到磁盘
  sendMessage: (message: ChatMessage) => void // 发送消息
}

/**
 * 创建聊天状态管理store
 */
export const useChatStore = create<ChatStore>()((set, get) => {
  const storageAdapter = getStorageAdapter()

  return {
    // 初始状态
    currentChatId: null,
    chatHistories: [],
    messageStreamingMap: {},
    isLoadingMap: {},

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
     * @param messages 新的消息列表
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
          })
        }
      } catch (error) {
        console.error('加载聊天记录失败:', error)
      }
    },

    /**
     * 保存对话历史到存储
     * 使用防抖以避免频繁保存
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
      const { currentChatId } = get()
      let chatId = currentChatId

      // 检查是否已经在加载状态
      const isLoading = get().isLoadingMap[chatId || '']
      if (isLoading) return // 如果正在加载，直接返回

      if (!chatId) {
        const newChat = {
          id: Date.now().toString(),
          title: message.content.slice(0, 20) || '新对话',
          messages: [],
          createdAt: new Date().toISOString(),
        }

        set((state) => ({
          chatHistories: [newChat, ...state.chatHistories],
          currentChatId: newChat.id,
        }))

        chatId = newChat.id
      }

      // 获取当前聊天记录
      const currentChat = get().chatHistories.find((chat) => chat.id === chatId)
      if (!currentChat) return

      // 添加用户消息并设置加载状态
      const newMessages = [...currentChat.messages, message]
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
        isLoadingMap: { ...state.isLoadingMap, [chatId]: true },
        messageStreamingMap: { ...state.messageStreamingMap, [chatId]: '' },
      }))

      try {
        // 发送请求到AI并获取响应
        const token = 'sk-DV7fnAi6a6f5qYN2AqEM6VQiyYOS4NTETYRoZHENptDSHdMI'
        const response = await fetch(`${API_CONFIG.COMMON}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: newMessages,
            stream: true,
            temperature: 0.7,
            top_p: 1.0,
            n: 1,
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
      } catch (error) {
        console.error('发送消息失败:', error)
        // 添加错误提示
        set((state) => ({
          messageStreamingMap: {
            ...state.messageStreamingMap,
            [chatId]: '抱歉，发送消息失败，请稍后重试。',
          },
        }))
      } finally {
        // 确保在完成后重置加载状态
        set((state) => ({
          isLoadingMap: { ...state.isLoadingMap, [chatId]: false },
        }))
        get().saveChatsToDisk()
      }
    },
  }
})
