export interface ToolResult {
  content: string
  error?: string
  success: boolean
}

export interface ToolUse {
  name: string
  input: Record<string, unknown>
}

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  execute: (input: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>
}

export interface ToolContext {
  workingDirectory: string
  sessionId: string
  permissions: PermissionContext
  onProgress?: (msg: string) => void
}

export interface PermissionContext {
  mode: 'default' | 'plan' | 'bypass' | 'auto'
  alwaysAllow: string[]
  alwaysDeny: string[]
}

export interface Session {
  id: string
  messages: Message[]
  model: string
  createdAt: Date
  workingDirectory: string
}

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  toolUses?: ToolUse[]
  toolResults?: ToolResult[]
}

export interface AgentConfig {
  apiKey: string
  model: string
  workingDirectory: string
  permissions: PermissionContext
}
