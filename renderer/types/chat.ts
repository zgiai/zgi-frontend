export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
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
  // Add other response fields if needed
} 