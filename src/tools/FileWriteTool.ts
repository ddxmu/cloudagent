import { writeFile } from 'fs/promises'
import { resolve } from 'path'
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js'

export const FileWriteTool: ToolDefinition = {
  name: 'Write',
  description: 'Create or overwrite a file with content',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path to create' },
      content: { type: 'string', description: 'File content' },
    },
    required: ['path', 'content'],
  },
  execute: async (input, ctx): Promise<ToolResult> => {
    try {
      const target = resolve(ctx.workingDirectory, input.path as string)
      await writeFile(target, input.content as string, 'utf-8')
      return { content: `Written: ${target}`, success: true }
    } catch (e: any) {
      return { content: '', error: e.message, success: false }
    }
  },
}
