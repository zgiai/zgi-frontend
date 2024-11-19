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
  currentChatId: string | null                    // 当前选中的对话ID
  chatHistories: ChatHistory[]                    // 所有对话历史记录
  messageStreamingMap: Record<string, string>     // 每个对话的流式消息状态
  isLoadingMap: Record<string, boolean>          // 每个对话的加载状态
  setCurrentChatId: (id: string | null) => void  // 设置当前对话ID
  createChat: () => void                         // 创建新对话
  deleteChat: (id: string) => void               // 删除对话
  updateChatMessages: (chatId: string, messages: ChatMessage[]) => void  // 更新对话消息
  updateChatTitle: (chatId: string, title: string) => void              // 更新对话标题
  clearAllChats: () => void                      // 清空所有对话
  loadChatsFromDisk: () => void                  // 从磁盘加载对话
  saveChatsToDisk: () => void                    // 保存对话到磁盘
  sendMessage: (message: ChatMessage) => void     // 发送消息
}

/**
 * 创建聊天状态管理store
 */
export const useChatStore = create<ChatStore>()((set, get) => {
  const storageAdapter = getStorageAdapter();

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
        console.log('开始加载聊天记录...');
        const data = await storageAdapter.load();
        console.log('加载到的数据:', data);
        if (data) {
          set({
            chatHistories: data.chatHistories || [],
            currentChatId: data.currentChatId || null,
          });
          console.log('数据已设置到 store');
        }
      } catch (error) {
        console.error('加载聊天记录失败:', error);
      }
    },

    /**
     * 保存对话历史到存储
     * 使用防抖以避免频繁保存
     */
    saveChatsToDisk: debounce(() => {
      const state = get();
      const data = {
        chatHistories: state.chatHistories,
        currentChatId: state.currentChatId,
      };
      storageAdapter.save(data);
    }, 1000),

    /**
     * 发送消息并处理AI响应
     * @param message 用户发送的消息
     */
    sendMessage: async (message: ChatMessage) => {
      const { currentChatId } = get()

      // 如果没有当前对话，创建新对话
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

      // 获取当前对话并验证
      const currentChat = get().chatHistories.find((chat) => chat.id === chatId)
      if (!currentChat) return

      // 添加用户消息并更新状态
      const newMessages = [...currentChat.messages, message]
      set((state) => ({
        chatHistories: state.chatHistories.map((chat) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              title: chat.messages.length === 0 ? message.content.slice(0, 20) || '新对话' : chat.title,
              messages: newMessages,
            }
          }
          return chat
        }),
        isLoadingMap: { ...state.isLoadingMap, [chatId]: true },
        messageStreamingMap: { ...state.messageStreamingMap, [chatId]: '' }
      }))

      try {
        // 发送请求并处理流式响应
        const response = await streamChatCompletions(newMessages)
        let fullMessage = ''

        // 处理流式响应数据
        await handleChatStream(response, (content) => {
          fullMessage += content
          // 实时更新流式消息
          set((state) => ({
            messageStreamingMap: { ...state.messageStreamingMap, [chatId]: fullMessage }
          }))
        })

        // 响应完成后，添加完整的AI回复
        if (fullMessage) {
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: fullMessage
          }
          
          set((state) => ({
            chatHistories: state.chatHistories.map((chat) => {
              if (chat.id === chatId) {
                return {
                  ...chat,
                  messages: [...newMessages, assistantMessage]
                }
              }
              return chat
            }),
            messageStreamingMap: { ...state.messageStreamingMap, [chatId]: '' }
          }))
        }
      } catch (error) {
        console.error('发送消息失败:', error)
      } finally {
        // 清理加载状态并保存到磁盘
        set((state) => ({
          isLoadingMap: { ...state.isLoadingMap, [chatId]: false }
        }))
        get().saveChatsToDisk()
      }
    },
  };
});

