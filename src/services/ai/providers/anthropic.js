import axios from 'axios'

export class AnthropicProvider {
  constructor(apiKey, baseUrl = 'https://api.anthropic.com/v1') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
    this.name = 'Anthropic'
  }

  async generateResponse(messages, options = {}) {
    const {
      model = 'claude-3-sonnet-20240229',
      temperature = 0.7,
      maxTokens = 1000
    } = options

    try {
      // Convert OpenAI format to Anthropic format
      const anthropicMessages = this.convertMessages(messages)
      
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          model,
          messages: anthropicMessages.messages,
          system: anthropicMessages.system,
          temperature,
          max_tokens: maxTokens
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          }
        }
      )

      return {
        content: response.data.content[0].text,
        usage: response.data.usage,
        model: response.data.model
      }
    } catch (error) {
      console.error('Anthropic API error:', error)
      throw new Error(`Anthropic API error: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  async generateStreamingResponse(messages, options = {}, onChunk) {
    const {
      model = 'claude-3-sonnet-20240229',
      temperature = 0.7,
      maxTokens = 1000
    } = options

    try {
      const anthropicMessages = this.convertMessages(messages)
      
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          messages: anthropicMessages.messages,
          system: anthropicMessages.system,
          temperature,
          max_tokens: maxTokens,
          stream: true
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'content_block_delta') {
                const content = parsed.delta?.text
                if (content) {
                  onChunk(content)
                }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Anthropic streaming error:', error)
      throw new Error(`Anthropic streaming error: ${error.message}`)
    }
  }

  convertMessages(messages) {
    let system = ''
    const anthropicMessages = []

    for (const msg of messages) {
      if (msg.role === 'system') {
        system = msg.content
      } else {
        anthropicMessages.push({
          role: msg.role,
          content: msg.content
        })
      }
    }

    return { system, messages: anthropicMessages }
  }

  isConfigured() {
    return !!this.apiKey
  }

  getModels() {
    return [
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fast and efficient' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable model' }
    ]
  }
}