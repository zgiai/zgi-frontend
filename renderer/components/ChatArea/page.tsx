import { useChatStore } from '@/store/chat.store'
import { Bot, User } from 'lucide-react'
import React, { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import { FixedSizeList as List } from 'react-window'

// 消息项组件
const MessageItem = ({ message, style }) => {
  const isUser = message.role === 'user'

  const renderContent = () => {
    if (message.fileType === 'image') {
      // 处理base64图片数据
      const imageUrl = message.content.startsWith('data:')
        ? message.content
        : `data:image/jpeg;base64,${message.content}`

      return (
        <div className="max-w-sm">
          <img
            src={imageUrl}
            alt={message.fileName || '图片'}
            className="rounded-lg max-w-full h-auto"
          />
          {message.fileName && <div className="text-sm mt-1 text-gray-500">{message.fileName}</div>}
        </div>
      )
    }

    return (
      <ReactMarkdown
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            return !match ? (
              <code className={className} {...props}>
                {children}
              </code>
            ) : (
              <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            )
          },
        }}
      >
        {message.content}
      </ReactMarkdown>
    )
  }

  return (
    <div style={style} className="py-2">
      <div className={`flex items-start gap-4 px-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className="flex-shrink-0">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isUser ? 'bg-purple-600' : 'bg-gray-200'
            }`}
          >
            {isUser ? (
              <User size={20} className="text-white" />
            ) : (
              <Bot size={20} className="text-gray-700" />
            )}
          </div>
        </div>

        <div
          className={`max-w-[80%] rounded-lg p-3 ${
            isUser ? 'bg-[#F5FAFF] text-gray-800' : 'bg-white text-gray-800'
          }`}
        >
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

const ChatArea = () => {
  const { currentChatId, chatHistories, loadChatsFromDisk } = useChatStore()
  const listRef = useRef<any>(null)
  const currentChat = chatHistories.find((chat) => chat.id === currentChatId)
  const messages = currentChat?.messages || []

  useEffect(() => {
    loadChatsFromDisk()
  }, [])

  // 自动滚动到底部
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(messages.length - 1)
    }
  }, [messages.length])

  if (!currentChatId) {
    return (
      <div className="flex-1 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              What is new
            </span>
          </div>
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold mb-2">How can I help you?</h2>
            <p className="text-sm text-gray-500">
              LLMChat is free to use with daily limits. Sign in required.
            </p>
          </div>
          <div className="text-center mb-4">
            <p className="text-sm text-gray-500">
              Try these example prompts or craft your own message
            </p>
          </div>
          <div className="flex justify-center space-x-2 mb-4">
            <button className="px-3 py-1 bg-gray-200 rounded-md text-sm">
              Top-rated Restaurants
            </button>
            <button className="px-3 py-1 bg-gray-200 rounded-md text-sm">
              Recent news in city
            </button>
            <button className="px-3 py-1 bg-gray-200 rounded-md text-sm">Summarize article</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-white">
      <List
        ref={listRef}
        height={window.innerHeight - 240}
        itemCount={messages.length}
        itemSize={100}
        width="100%"
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent bg-white"
        style={{
          overflow: 'overlay',
          paddingBottom: '6rem',
        }}
      >
        {({ index, style }) => (
          <MessageItem
            message={messages[index]}
            style={
              index === messages.length - 1
                ? {
                    ...style,
                    marginBottom: '6rem',
                  }
                : style
            }
          />
        )}
      </List>
    </div>
  )
}

export default ChatArea
