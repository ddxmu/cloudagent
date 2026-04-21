import { ALL_TOOLS, getToolByName } from './tools.js'
import type { Message, ToolContext, PermissionContext, LLMToolUse } from './types.js'
import { sessionManager } from './session.js'
import { getSystemPrompt } from './prompt.js'
import { LLMClient } from './llm.js'
import { bold, cyan, dim, green, red, yellow } from './colors.js'

export interface AgentOptions {
  apiKey: string
  baseUrl?: string
  model?: string
  workingDirectory: string
  permissions: PermissionContext
  sessionId?: string
}

export class CloudAgent {
  private llm: LLMClient
  private workingDirectory: string
  private permissions: PermissionContext
  private sessionId: string

  constructor(opts: AgentOptions) {
    this.llm = new LLMClient(
      opts.apiKey,
      opts.baseUrl || 'https://api.minimaxi.com/v1',
      opts.model || 'MiniMax-M2.7',
    )
    this.workingDirectory = opts.workingDirectory
    this.permissions = opts.permissions
    this.sessionId = opts.sessionId || sessionManager.createSession(opts.workingDirectory, opts.model || 'MiniMax-M2.7')
  }

  private toolContext(): ToolContext {
    return {
      workingDirectory: this.workingDirectory,
      sessionId: this.sessionId,
      permissions: this.permissions,
    }
  }

  private toOpenAIFunctions() {
    return ALL_TOOLS.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }))
  }

  private async resolveToolUse(tool: LLMToolUse): Promise<{ id: string; content: string }> {
    const toolDef = getToolByName(tool.name)
    if (!toolDef) {
      return { id: tool.id, content: `Error: unknown tool ${tool.name}` }
    }
    try {
      const result = await toolDef.execute(tool.input, this.toolContext())
      return { id: tool.id, content: result.success ? result.content : `Error: ${result.error}` }
    } catch (e: any) {
      return { id: tool.id, content: `Exception: ${e.message}` }
    }
  }

  async chat(initialMessages: Message[], onChunk?: (text: string) => void): Promise<string> {
    const systemPrompt = getSystemPrompt(this.workingDirectory)
    const MAX_TURNS = 15
    let messages: any[] = [...initialMessages.map(m => ({ role: m.role, content: m.content }))]

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      process.stdout.write(dim(`\n[Turn ${turn + 1}/${MAX_TURNS}]\n`))

      const tools = this.toOpenAIFunctions()
      const response = await this.llm.complete(
        messages,
        tools,
        systemPrompt,
        undefined,
        (text) => process.stdout.write(text),
      )

      if (!response.content && response.toolUses.length === 0) {
        break
      }

      if (response.toolUses.length === 0) {
        // No tools called, done
        break
      }

      // Resolve each tool and add result as user message
      for (const tool of response.toolUses) {
        process.stdout.write(yellow(`\n[Tool: ${tool.name}]\n`))
        const { id, content } = await this.resolveToolUse(tool)
        messages.push({
          role: 'assistant',
          content: '',
          tool_calls: [{
            id: tool.id,
            type: 'function',
            function: { name: tool.name, arguments: JSON.stringify(tool.input) },
          }],
        })
        messages.push({
          role: 'tool',
          tool_call_id: id,
          content: content,
        })
        const display = content.length > 300 ? content.slice(0, 300) + '...' : content
        console.log(dim(`Result: ${display}\n`))
      }
    }

    return messages[messages.length - 1]?.content || ''
  }
}
