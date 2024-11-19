import { http } from "@/lib/http";
import { Role } from "@/types/chat";



interface ChatMessage {
  role: Role
  content: string
}

interface ChatCompletionOptions {
  model?: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

/**
 * 基于OpenAI Chat Completions API封装的请求方法
 * @param messages 消息列表
 * @param options 请求配置选项
 * @returns API响应数据
 */
export const chatCompletions = async (
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
) => {
  const {
    model = 'gpt-4o',
    temperature = 0.7,
    max_tokens = 2000,
    stream = false
  } = options

  const response = await http.post('/chat/completions', {
    model,
    messages,
    temperature,
    max_tokens,
    stream
  })
  
  return response
}

/**
 * 发送消息并获取实时响应流
 * @param messages 消息列表
 * @param options 请求配置选项
 * @returns 返回一个可读流
 */
export const streamChatCompletions = async (
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
) => {
  const {
    model = 'gpt-4',
    temperature = 0.7,
    max_tokens = 2000
  } = options

  const response = await http.post('/chat/completions', {
    model,
    messages,
    temperature, 
    max_tokens,
    stream: true
  }, {
    responseType: 'stream'
  })

  if (!response) {
    throw new Error('响应为空')
  }

  return response
}

/**
 * 处理流式响应数据
 * @param response 响应数据流
 * @param onMessage 消息回调函数
 */
export const handleChatStream = async (
  response: any,
  onMessage: (message: string) => void
) => {
  const reader = response.data
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') return

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices[0]?.delta?.content
            if (content) {
              onMessage(content)
            }
          } catch (e) {
            console.error('解析流数据失败:', e)
          }
        }
      }
    }
  } finally {
    if (reader.releaseLock) {
      reader.releaseLock()
    }
  }
}

/**
 * 使用示例:
 * 
 * // 在组件中使用
 * const sendMessage = async () => {
 *   const messages = [
 *     { role: 'user', content: '你好' }
 *   ]
 *   
 *   try {
 *     // 发起流式请求
 *     const response = await streamChatCompletions(messages)
 *     
 *     // 处理流式响应
 *     await handleChatStream(response, (message) => {
 *       // 这里可以实时更新UI显示接收到的消息
 *       console.log('收到消息片段:', message)
 *       // 例如:
 *       // setMessages(prev => [...prev, message])
 *     })
 *   } catch (error) {
 *     console.error('发送消息失败:', error)
 *   }
 * }
 */


