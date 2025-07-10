import axios from 'axios'

export class OllamaProvider {
  constructor(apiKey = null, baseUrl = 'http://localhost:11434') {
    this.apiKey = apiKey // Usually not needed for local Ollama
    this.baseUrl = baseUrl
    this.name = 'Ollama'
  }

  async generateResponse(messages, options = {}) {
    const {
      model = 'llama3.2',
      temperature = 0.7,
      maxTokens = 1000
    } = options

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/chat`,
        {
          model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          options: {
            temperature,
            num_predict: maxTokens
          },
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      return {
        content: response.data.message.content,
        usage: {
          total_tokens: response.data.total_duration || 0,
          prompt_tokens: response.data.prompt_eval_count || 0,
          completion_tokens: response.data.eval_count || 0
        },
        model: response.data.model
      }
    } catch (error) {
      console.error('Ollama API error:', error)
      throw new Error(`Ollama API error: ${error.response?.data?.error || error.message}`)
    }
  }

  async generateStreamingResponse(messages, options = {}, onChunk) {
    const {
      model = 'llama3.2',
      temperature = 0.7,
      maxTokens = 1000
    } = options

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          options: {
            temperature,
            num_predict: maxTokens
          },
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
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line)
              if (parsed.message?.content) {
                onChunk(parsed.message.content)
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Ollama streaming error:', error)
      throw new Error(`Ollama streaming error: ${error.message}`)
    }
  }

  async isConfigured() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000
      })
      return response.status === 200
    } catch (error) {
      return false
    }
  }

  async getModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`)
      return response.data.models?.map(model => ({
        id: model.name,
        name: model.name,
        description: `Size: ${model.size}, Modified: ${model.modified_at}`
      })) || []
    } catch (error) {
      console.error('Error fetching Ollama models:', error)
      return [
        { id: 'llama3.2', name: 'Llama 3.2', description: 'Default model' },
        { id: 'mistral', name: 'Mistral', description: 'Alternative model' },
        { id: 'codellama', name: 'Code Llama', description: 'Code-focused model' }
      ]
    }
  }
}