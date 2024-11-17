import { useChatStore } from '@/store/chat.store'
import { Image, Paperclip, Send } from 'lucide-react'
import React, { useState } from 'react'

const InputArea = () => {
  const [message, setMessage] = useState('')
  const { currentChatId, sendMessage, createChat } = useChatStore()

  const handleSend = () => {
    if (!message.trim()) return

    // 如果没有选中的聊天室，先创建一个
    if (!currentChatId) {
      createChat()
    }

    sendMessage({
      id: Date.now().toString(),
      content: message,
      timestamp: new Date().toISOString(),
      role: 'user',
    })

    setMessage('')
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <div className="max-w-3xl mx-auto">
        <button className="m-2 flex">
          <Paperclip size={18} className="mr-2" />
          <Image size={18} />
        </button>
        <div className="flex items-center bg-white border border-gray-300 rounded-lg">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask anything..."
            className="flex-1 p-2 outline-none m-2"
          />
          <button className="p-2 hover:bg-gray-100 rounded-lg" onClick={handleSend}>
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default InputArea
