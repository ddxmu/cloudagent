import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js'

export const FileEditTool: ToolDefinition = {
  name: 'Edit',
  description: 'Make a targeted edit to a file using string replacement',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path' },
      old_string: { type: 'string', description: 'Text to replace (exact match)' },
      new_string: { type: 'string', description: 'Replacement text' },
    },
    required: ['path', 'old_string', 'new_string'],
  },
  execute: async (input, ctx): Promise<ToolResult> => {
    try {
      const target = resolve(ctx.workingDirectory, input.path as string)
      let content = await readFile(target, 'utf-8')
      const oldStr = input.old_string as string
      const newStr = input.new_string as string
      if (!content.includes(oldStr)) {
        return { content: '', error: `old_string not found in file: ${oldStr.slice(0, 50)}...`, success: false }
      }
      content = content.replace(oldStr, newStr)
      await writeFile(target, content, 'utf-8')
      return { content: `Edited ${target}`, success: true }
    } catch (e: any) {
      return { content: '', error: e.message, success: false }
    }
  },
}
