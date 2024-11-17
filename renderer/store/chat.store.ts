import type { ChatHistory, ChatMessage } from '@/types/chat'
import { INVOKE_CHANNLE } from '@shared/constants/channleName'
import { debounce } from 'lodash'
import { create } from 'zustand'

interface ChatStore {
  currentChatId: string | null
  chatHistories: ChatHistory[]
  setCurrentChatId: (id: string | null) => void
  createChat: () => void
  deleteChat: (id: string) => void
  updateChatMessages: (chatId: string, messages: ChatMessage[]) => void
  updateChatTitle: (chatId: string, title: string) => void
  clearAllChats: () => void
  loadChatsFromDisk: () => void
  saveChatsToDisk: () => void
  sendMessage: (message: ChatMessage) => void
}

export const useChatStore = create<ChatStore>()((set, get) => ({
  currentChatId: null,
  chatHistories: [],

  setCurrentChatId: (id) => {
    set({ currentChatId: id })
    get().saveChatsToDisk()
  },

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

  updateChatMessages: (chatId, messages) => {
    set((state) => ({
      chatHistories: state.chatHistories.map((chat) =>
        chat.id === chatId ? { ...chat, messages } : chat,
      ),
    }))
    get().saveChatsToDisk()
  },

  updateChatTitle: (chatId, title) => {
    set((state) => ({
      chatHistories: state.chatHistories.map((chat) =>
        chat.id === chatId ? { ...chat, title } : chat,
      ),
    }))
    get().saveChatsToDisk()
  },

  clearAllChats: () => {
    set({ chatHistories: [], currentChatId: null })
    get().saveChatsToDisk()
  },

  loadChatsFromDisk: async () => {
    try {
      console.log('开始加载聊天记录...')
      const data = await window.ipc.invoke(INVOKE_CHANNLE.loadChats)
      console.log('加载到的数据:', data)
      if (data) {
        set({
          chatHistories: data.chatHistories || [],
          currentChatId: data.currentChatId || null,
        })
        console.log('数据已设置到 store')
      }
    } catch (error) {
      console.error('加载聊天记录失败:', error)
    }
  },

  saveChatsToDisk: debounce(() => {
    const state = get()
    const data = {
      chatHistories: state.chatHistories,
      currentChatId: state.currentChatId,
    }
    window.ipc.invoke(INVOKE_CHANNLE.saveChats, data)
  }, 1000),

  sendMessage: (message: ChatMessage) => {
    const { currentChatId, chatHistories } = get()

    // 如果没有当前聊天，创建一个新的
    let chatId = currentChatId
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

    // 添加消息到聊天记录
    set((state) => ({
      chatHistories: state.chatHistories.map((chat) => {
        if (chat.id === chatId) {
          const isFirstMessage = chat.messages.length === 0
          return {
            ...chat,
            title: isFirstMessage ? message.content.slice(0, 20) || '新对话' : chat.title,
            messages: [...chat.messages, message],
          }
        }
        return chat
      }),
    }))

    get().saveChatsToDisk()
  },
}))
