import { ToolDefinition, ToolContext, ToolResult } from './types.js'
import { readFile } from 'fs/promises'
import { readdir, stat } from 'fs/promises'
import { join, resolve } from 'path'
import { execSync } from 'child_process'
import { FileEditTool } from './tools/FileEditTool.js'
import { FileWriteTool } from './tools/FileWriteTool.js'

function checkPermission(toolName: string, ctx: ToolContext): boolean {
  const { permissions } = ctx
  if (permissions.mode === 'bypass') return true
  if (permissions.alwaysAllow.includes(toolName)) return true
  if (permissions.alwaysDeny.includes(toolName)) return false
  return true
}

export const BashTool: ToolDefinition = {
  name: 'Bash',
  description: 'Execute a shell command in the agent working directory',
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'The shell command to execute' },
      timeout: { type: 'number', description: 'Timeout in milliseconds', default: 60000 },
    },
    required: ['command'],
  },
  execute: async (input, ctx): Promise<ToolResult> => {
    if (!checkPermission('Bash', ctx)) {
      return { content: '', error: 'Permission denied for Bash tool', success: false }
    }
    const { command, timeout = 60000 } = input
    try {
      const result = execSync(command, {
        cwd: ctx.workingDirectory,
        timeout: timeout / 1000,
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf-8',
      })
      return { content: result, success: true }
    } catch (e: any) {
      return { content: e.stdout || '', error: e.message, success: false }
    }
  },
}

export const FileReadTool: ToolDefinition = {
  name: 'Read',
  description: 'Read the contents of a file or directory',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File or directory path to read' },
      limit: { type: 'number', description: 'Max lines to read', default: 500 },
      offset: { type: 'number', description: 'Line offset', default: 1 },
    },
    required: ['path'],
  },
  execute: async (input, ctx): Promise<ToolResult> => {
    if (!checkPermission('Read', ctx)) {
      return { content: '', error: 'Permission denied', success: false }
    }
    const { path, limit = 500, offset = 1 } = input
    try {
      const target = resolve(ctx.workingDirectory, path)
      const stats = await stat(target)
      if (stats.isDirectory()) {
        const entries = await readdir(target)
        const items = entries.map(e => `  ${e}`)
        return { content: `Directory: ${target}\n${items.join('\n')}`, success: true }
      }
      const content = await readFile(target, 'utf-8')
      const lines = content.split('\n')
      const slice = lines.slice(offset - 1, offset - 1 + limit)
      const header = lines.length > limit ? `\n[Lines ${offset}-${offset + slice.length - 1} of ${lines.length}]\n` : ''
      return { content: header + slice.join('\n'), success: true }
    } catch (e: any) {
      return { content: '', error: e.message, success: false }
    }
  },
}

export const GlobTool: ToolDefinition = {
  name: 'Glob',
  description: 'Find files matching a glob pattern',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Glob pattern, e.g. **/*.ts' },
      base: { type: 'string', description: 'Base directory', default: '.' },
    },
    required: ['pattern'],
  },
  execute: async (input, ctx): Promise<ToolResult> => {
    if (!checkPermission('Glob', ctx)) return { content: '', error: 'Permission denied', success: false }
    const { pattern, base = '.' } = input
    try {
      const cwd = resolve(ctx.workingDirectory, base)
      const safePattern = pattern.replace(/"/g, '\\"')
      const cmd = `find "${cwd}" -name "${safePattern}" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -100`
      const result = execSync(cmd, { encoding: 'utf-8', timeout: 10 })
      return { content: result.trim() || '(no matches)', success: true }
    } catch (e: any) {
      return { content: e.stdout || '', error: e.message, success: false }
    }
  },
}

export const GrepTool: ToolDefinition = {
  name: 'Grep',
  description: 'Search for text patterns in files',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Regex pattern to search' },
      path: { type: 'string', description: 'Directory or file to search in', default: '.' },
      context: { type: 'number', description: 'Lines of context', default: 3 },
    },
    required: ['pattern'],
  },
  execute: async (input, ctx): Promise<ToolResult> => {
    if (!checkPermission('Grep', ctx)) return { content: '', error: 'Permission denied', success: false }
    const { pattern, path = '.', context = 3 } = input
    try {
      const cwd = ctx.workingDirectory
      const safePattern = pattern.replace(/"/g, '\\"')
      const cmd = `grep -rn -C ${context} "${safePattern}" "${resolve(cwd, path)}" 2>/dev/null | head -100`
      const result = execSync(cmd, { encoding: 'utf-8', timeout: 15, shell: '/bin/bash' })
      return { content: result.trim() || '(no matches)', success: true }
    } catch (e: any) {
      return { content: e.stdout || '', error: e.message, success: false }
    }
  },
}

export const ALL_TOOLS: ToolDefinition[] = [
  BashTool,
  FileReadTool,
  GlobTool,
  GrepTool,
  FileEditTool,
  FileWriteTool,
]

export function getToolByName(name: string): ToolDefinition | undefined {
  return ALL_TOOLS.find(t => t.name === name)
}

export function toAnthropicTools(): any[] {
  return ALL_TOOLS.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }))
}
