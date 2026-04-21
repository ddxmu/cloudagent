import { randomUUID } from 'crypto'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { Message } from './types.js'

const SESSION_DIR = join(process.env.HOME || '/root', '.cloudagent', 'sessions')

export class SessionManager {
  currentSessionId: string | null = null

  createSession(workingDirectory: string, model: string): string {
    const id = randomUUID()
    const session = {
      id,
      model,
      workingDirectory,
      messages: [] as Message[],
      createdAt: new Date().toISOString(),
    }
    this.currentSessionId = id
    this.saveSession(session)
    return id
  }

  loadSession(sessionId: string): any | null {
    const path = join(SESSION_DIR, `${sessionId}.json`)
    if (!existsSync(path)) return null
    try {
      return JSON.parse(readFileSync(path, 'utf-8'))
    } catch {
      return null
    }
  }

  saveSession(session: any): void {
    const dir = SESSION_DIR
    try {
      const { mkdirSync } = require('fs')
      mkdirSync(dir, { recursive: true })
    } catch {}
    const path = join(dir, `${session.id}.json`)
    writeFileSync(path, JSON.stringify(session, null, 2))
  }

  listSessions(): any[] {
    try {
      const { readdirSync } = require('fs')
      const files = readdirSync(SESSION_DIR).filter(f => f.endsWith('.json'))
      return files.map(f => {
        const data = JSON.parse(readFileSync(join(SESSION_DIR, f), 'utf-8'))
        return { id: data.id, createdAt: data.createdAt, model: data.model, workingDirectory: data.workingDirectory }
      })
    } catch {
      return []
    }
  }

  addMessage(sessionId: string, message: Message): void {
    const session = this.loadSession(sessionId)
    if (!session) return
    session.messages.push(message)
    this.saveSession(session)
  }
}

export const sessionManager = new SessionManager()
