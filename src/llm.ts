import OpenAI from 'openai'

export interface LLMToolUse {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
  inputString?: string
}

export interface LLMResponse {
  content: string
  stopReason: string
  toolUses: LLMToolUse[]
}

export class LLMClient {
  private client: OpenAI
  private model: string

  constructor(apiKey: string, baseUrl: string, model = 'MiniMax-M2.7') {
    this.client = new OpenAI({ apiKey, baseURL: baseUrl })
    this.model = model
  }

  async complete(
    messages: any[],
    tools: any[],
    systemPrompt: string,
    onToolUse?: (tool: LLMToolUse) => void,
    onContent?: (text: string) => void,
  ): Promise<LLMResponse> {
    const MAX_TURNS = 15
    let allMessages = [...messages]
    let toolUseArray: LLMToolUse[] = []
    let finalText = ''

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const systemMsg = { role: 'system', content: systemPrompt }
      const msgsWithSystem = [systemMsg, ...allMessages]

      const params: any = {
        model: this.model,
        messages: msgsWithSystem,
        stream: true,
        temperature: 0,
        max_tokens: 8192,
      }
      if (tools && tools.length > 0) {
        params.tools = tools
      }

      let fullContent = ''
      let done = false
      let stopReason = 'end_turn'

      const stream = await this.client.chat.completions.create(params)

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta
        if (!delta) continue

        // Text content
        if (delta.content) {
          fullContent += delta.content
          onContent?.(delta.content)
        }

        // Tool calls
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const existing = toolUseArray.find(t => t.id === tc.id)
            if (!existing && tc.id && tc.function?.name) {
              toolUseArray.push({
                type: 'tool_use',
                id: tc.id,
                name: tc.function.name,
                input: {},
                inputString: tc.function.arguments || '',
              })
            } else if (existing && tc.function?.arguments) {
              existing.inputString = (existing.inputString || '') + tc.function.arguments
            }
          }
        }

        // Check stop reason
        const finishReason = chunk.choices[0]?.finish_reason
        if (finishReason === 'tool_calls') {
          stopReason = 'tool_use'
          done = true
        } else if (finishReason === 'stop') {
          stopReason = 'end_turn'
          done = true
        }
      }

      // Parse tool inputs from JSON strings
      for (const tool of toolUseArray) {
        if (tool.inputString) {
          try { tool.input = JSON.parse(tool.inputString) } catch { tool.input = {} }
        }
      }

      if (fullContent) {
        finalText = fullContent
        allMessages.push({ role: 'assistant', content: fullContent })
        console.write(fullContent)
      }

      if (done || toolUseArray.length === 0) {
        return { content: finalText, stopReason, toolUses: toolUseArray }
      }

      // Resolve tools
      onToolUse?.(toolUseArray[0])
      toolUseArray = []
    }

    return { content: finalText, stopReason: 'max_turns', toolUses: [] }
  }
}
