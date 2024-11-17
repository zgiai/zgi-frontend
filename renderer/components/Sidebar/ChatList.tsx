import React, { useState } from 'react'

const ChatItem = ({ chat, isActive }) => {
  return (
    <div
      className={`flex items-center p-3 cursor-pointer ${
        isActive ? 'bg-purple-100' : 'hover:bg-gray-100'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {chat.messages.length === 0 ? '新对话' : chat.title}
        </p>
      </div>
    </div>
  )
}

export default ChatItem
