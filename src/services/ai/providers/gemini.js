import axios from 'axios'

export class GeminiProvider {
  constructor(apiKey, baseUrl = 'https://generativelanguage.googleapis.com/v1beta') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
    this.name = 'Gemini'
  }

  async generateResponse(messages, options = {}) {
    const {
      model = 'gemini-1.5-flash',
      temperature = 0.7,
      maxTokens = 1000
    } = options

    try {
      // Convert OpenAI format to Gemini format
      const geminiMessages = this.convertMessages(messages)
      
      const response = await axios.post(
        `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          contents: geminiMessages.contents,
          systemInstruction: geminiMessages.systemInstruction,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            topP: 0.95,
            topK: 64
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      return {
        content: response.data.candidates[0].content.parts[0].text,
        usage: response.data.usageMetadata,
        model: model
      }
    } catch (error) {
      console.error('Gemini API error:', error)
      throw new Error(`Gemini API error: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  async generateStreamingResponse(messages, options = {}, onChunk) {
    const {
      model = 'gemini-1.5-flash',
      temperature = 0.7,
      maxTokens = 1000
    } = options

    try {
      const geminiMessages = this.convertMessages(messages)
      
      const response = await fetch(`${this.baseUrl}/models/${model}:streamGenerateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: geminiMessages.contents,
          systemInstruction: geminiMessages.systemInstruction,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            topP: 0.95,
            topK: 64
          }
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
              const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text
              if (content) {
                onChunk(content)
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Gemini streaming error:', error)
      throw new Error(`Gemini streaming error: ${error.message}`)
    }
  }

  convertMessages(messages) {
    let systemInstruction = null
    const contents = []

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = {
          parts: [{ text: msg.content }]
        }
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })
      }
    }

    return { systemInstruction, contents }
  }

  isConfigured() {
    return !!this.apiKey
  }

  getModels() {
    return [
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast and efficient' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Most capable model' },
      { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', description: 'Previous generation' }
    ]
  }
}