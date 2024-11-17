export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  id?: string
  content: string
  timestamp?: string
}

export interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  stream: boolean
  temperature: number
  top_p: number
  n: number
  max_tokens: number
}

export interface ChatCompletionResponse {
  message: ChatMessage
  id: string
  created: number
  model: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ChatHistory {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt?: number
  model?: string
  favorite?: boolean
}
