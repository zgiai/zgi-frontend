import { useChatStore } from '@/store/chat.store'
import { Bot, User, FileText } from 'lucide-react'
import React, { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import { ImageIcon } from 'lucide-react'

// 消息项组件
const MessageItem = ({ message, style }) => {
  const isUser = message.role === 'user'
  const isStreaming = message.isStreaming
  // 添加复制状态
  const [copiedMap, setCopiedMap] = React.useState<Record<string, boolean>>({})

  // 添加一个安全的字符串转换函数
  const generateCodeId = (code: string) => {
    // 使用简单的哈希函数
    let hash = 0
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return `code-${Math.abs(hash)}`
  }

  // 修改复制代码功能
  const handleCopyCode = (code: string, codeId: string) => {
    // 如果正在显示"已复制"状态，则不执行复制
    if (copiedMap[codeId]) return

    navigator.clipboard.writeText(code)
      .then(() => {
        // 设置复制成功状态
        setCopiedMap(prev => ({ ...prev, [codeId]: true }))
        
        // 1秒后重置状态
        setTimeout(() => {
          setCopiedMap(prev => ({ ...prev, [codeId]: false }))
        }, 1000)
      })
      .catch(err => {
        console.error('复制失败:', err)
      })
  }

  const renderContent = () => {
    // 如果是流式消息且没有内容（正在加载）
    if (isStreaming && !message.content) {
      return (
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
          <span className="text-sm text-gray-500">AI is thinking...</span>
        </div>
      )
    }

    const contentClass = isStreaming ? 'typing-effect' : ''

    // 处理数组形式的消息内容
    if (Array.isArray(message.content)) {
      return (
        <div className={`${contentClass} break-words whitespace-pre-wrap`}>
          {message.content.map((item, index) => {
            if (item.type === 'file') {
              const isImage = item.fileType?.includes('image/') || 
                            /\.(jpg|jpeg|png|gif|webp)$/i.test(item.fileName || '')

              if (isImage) {
                // 修改图片 URL 处理逻辑
                let imageUrl = ''
                if (item.content.startsWith('data:') || item.content.startsWith('http')) {
                  imageUrl = item.content
                } else {
                  // 确保添加正确的 MIME type
                  const mimeType = item.fileType || 
                    (item.fileName?.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg')
                  imageUrl = `data:${mimeType};base64,${item.content}`
                }

                return (
                  <div key={index} className="mb-2">
                    <img
                      src={imageUrl}
                      alt={item.fileName || '图片'}
                      className="rounded-lg max-w-full h-auto"
                      onError={(e) => {
                        console.error('图片加载失败:', e)
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const errorDiv = document.createElement('div')
                        errorDiv.className = 'text-red-500 text-sm mt-2'
                        errorDiv.textContent = '图片加载失败'
                        target.parentElement?.appendChild(errorDiv)
                      }}
                    />
                    {item.fileName && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                        <ImageIcon size={16} />
                        <span>{item.fileName}</span>
                      </div>
                    )}
                  </div>
                )
              }
              // 处理base64图片数据
              const imageUrl = item.content.startsWith('data:')
                ? item.content
                : `data:image/jpeg;base64,${item.content}`

              return (
                <div key={index} className="mb-2 break-words whitespace-pre-wrap">
                  <img
                    src={imageUrl}
                    alt={item.fileName || '图片'}
                    className="rounded-lg max-w-full h-auto"
                  />
                  {item.fileName && <div className="text-sm mt-1 text-gray-500">{item.fileName}</div>}
                </div>
              )
            } else if (item.type === 'text') {
              return (
                <div key={index} className="mb-2 break-words whitespace-pre-wrap">
                  <ReactMarkdown
                    components={{
                      code({ node, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '')
                        
                        if (!match) {
                          return (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          )
                        }

                        const code = String(children).replace(/\n$/, '')
                        // 使用新的 ID 生成函数
                        const codeId = generateCodeId(code)
                        const isCopied = copiedMap[codeId]
                        
                        return (
                          <div className="relative group">
                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100">
                              <button
                                onClick={() => handleCopyCode(code, codeId)}
                                disabled={isCopied}
                                className={`px-2 py-1 rounded text-xs ${
                                  isCopied 
                                    ? 'bg-gray-500 text-white cursor-not-allowed' 
                                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                                }`}
                              >
                                {isCopied ? '已复制' : '复制代码'}
                              </button>
                            </div>
                            <SyntaxHighlighter 
                              style={vscDarkPlus} 
                              language={match[1]} 
                              PreTag="div"
                              {...props}
                            >
                              {code}
                            </SyntaxHighlighter>
                          </div>
                        )
                      },
                    }}
                  >
                    {item.content}
                  </ReactMarkdown>
                </div>
              )
            }
            return null
          })}
        </div>
      )
    }

    // 处理文件类型消息
    if (message.fileType || message.fileName) {
      const isImage = message.fileType?.includes('image/') || 
                     /\.(jpg|jpeg|png|gif|webp)$/i.test(message.fileName || '')

      if (isImage) {
        // 处理图片显示
        let imageUrl = ''
        if (message.content.startsWith('data:') || message.content.startsWith('http')) {
          imageUrl = message.content
        } else {
          // 确保添加正确的 MIME type
          const mimeType = message.fileType || 
            (message.fileName?.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg')
          imageUrl = `data:${mimeType};base64,${message.content}`
        }

        return (
          <div className="max-w-sm">
            <img
              src={imageUrl}
              alt={message.fileName || '图片'}
              className="rounded-lg max-w-full h-auto"
              onError={(e) => {
                console.error('图片加载失败:', e)
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const errorDiv = document.createElement('div')
                errorDiv.className = 'text-red-500 text-sm mt-2'
                errorDiv.textContent = '图片加载失败'
                target.parentElement?.appendChild(errorDiv)
              }}
            />
            {message.fileName && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <ImageIcon size={16} />
                <span>{message.fileName}</span>
              </div>
            )}
          </div>
        )
      }

      // 处理其他类型文件
      return (
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <FileText size={20} className="text-gray-500" />
          <span className="text-sm text-gray-700">{message.fileName || '未知文件'}</span>
          {message.fileType && (
            <span className="text-xs text-gray-500">
              ({message.fileType.split('/').pop()?.toUpperCase() || '未知格式'})
            </span>
          )}
        </div>
      )
    }

    // 处理普通文本消息
    return (
      <div className={`${contentClass} break-words whitespace-pre-wrap`}>
        <ReactMarkdown
          components={{
            code({ node, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '')
              
              if (!match) {
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                )
              }

              const code = String(children).replace(/\n$/, '')
              // 使用新的 ID 生成函数
              const codeId = generateCodeId(code)
              const isCopied = copiedMap[codeId]
              
              return (
                <div className="relative group">
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => handleCopyCode(code, codeId)}
                      disabled={isCopied}
                      className={`px-2 py-1 rounded text-xs ${
                        isCopied 
                          ? 'bg-gray-500 text-white cursor-not-allowed' 
                          : 'bg-gray-700 hover:bg-gray-600 text-white'
                      }`}
                    >
                      {isCopied ? '已复制' : '复制代码'}
                    </button>
                  </div>
                  <SyntaxHighlighter 
                    style={vscDarkPlus} 
                    language={match[1]} 
                    PreTag="div"
                    {...props}
                  >
                    {code}
                  </SyntaxHighlighter>
                </div>
              )
            },
            p: ({ children }) => (
              <p className="break-words whitespace-pre-wrap">{children}</p>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    )
  }

  return (
    <div style={style} className="py-2">
      <div className={`flex items-start gap-4 px-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className="flex-shrink-0 mt-1.5">
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
          className={`shrink-0 max-w-[80%] rounded-lg p-3 overflow-hidden ${
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
  const { currentChatId, chatHistories, loadChatsFromDisk, messageStreamingMap, isLoadingMap } =
    useChatStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentChat = chatHistories.find((chat) => chat.id === currentChatId)

  const streamingMessage = messageStreamingMap[currentChatId || '']
  const isLoading = isLoadingMap[currentChatId || '']

  const getAllMessages = () => {
    if (!currentChat) return []
    const baseMessages = currentChat.messages || []
    if (streamingMessage || isLoading) {
      return [
        ...baseMessages,
        {
          role: 'assistant',
          content: streamingMessage || '',
        },
      ]
    }
    return baseMessages
  }

  const messages = getAllMessages()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // 首次加载
  useEffect(() => {
    loadChatsFromDisk()
  }, [])

  // 监听消息变化和切换聊天室
  useEffect(() => {
    if (currentChatId || messages.length > 0 || streamingMessage) {
      scrollToBottom()
    }
  }, [currentChatId, messages.length, streamingMessage])

  if (!currentChatId) {
    return (
      <div className="flex-1 p-4 h-[calc(100vh-180px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              What is new
            </span>
          </div>
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold mb-2">How can I help you?</h2>
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
    <div className="h-[calc(100vh-180px)] bg-white overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
      <div className="max-w-[1200px] mx-auto pb-4">
        {messages.map((message, index) => (
          <MessageItem
            key={index}
            message={message}
            style={{
              marginBottom: index === messages.length - 1 ? '1rem' : undefined,
            }}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

export default ChatArea
