import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { stdin, stdout } from 'process'
import { join } from 'path'
import { CloudAgent } from './agent.js'
import { sessionManager } from './session.js'
import { bold, cyan, dim, green, blue, red } from './colors.js'
import type { Message, PermissionContext } from './types.js'

const CONFIG = join(homedir(), '.cloudagent', 'config.json')

interface Config {
  apiKey: string
  baseUrl: string
  model: string
}

function cfg(): Config {
  if (existsSync(CONFIG))
    try { return JSON.parse(readFileSync(CONFIG, 'utf-8')) } catch {}
  return { apiKey: '', baseUrl: 'https://api.minimaxi.com/v1', model: 'MiniMax-M2.7' }
}

function save(c: Config) {
  mkdirSync(join(homedir(), '.cloudagent'), { recursive: true })
  writeFileSync(CONFIG, JSON.stringify(c, null, 2))
}

function rl(prompt: string = ''): Promise<string> {
  return new Promise(r => {
    const i = require('readline').createInterface({ input: stdin, output: stdout })
    i.question(prompt, s => { i.close(); r(s) })
  })
}

function printBanner(model: string) {
  const w = 50
  console.log()
  console.log(cyan('┌') + '─'.repeat(w) + cyan('┐'))
  console.log(cyan('│') + bold(blue('   CloudAgent  ·  AI CLI Assistant')) + ' '.repeat(20) + cyan('│'))
  console.log(cyan('└') + '─'.repeat(w) + cyan('┘'))
  console.log()
  console.log(dim('  ★') + dim(' Powered by MiniMax') + dim('  ·  ') + bold(green(model)) + dim('  ·  REPL mode'))
  console.log()
  console.log(dim('  exit / quit ') + dim('· close session'))
  console.log(dim('─'.repeat(w)))
}

async function runChat(input: string, agent: CloudAgent) {
  const divider = dim('─'.repeat(50))
  console.log()
  console.log(bold(green('◈ You')))
  console.log('  ' + input)
  console.log(divider)
  process.stdout.write('\n' + bold(cyan('◈ Agent')) + '\n  ')
  await agent.chat([{ role: 'user', content: input }], s => process.stdout.write(s))
  console.log('\n' + divider)
}

async function main() {
  const args = process.argv.slice(2)

  if (args[0] === 'login') {
    const c = cfg()
    stdout.write('API URL [' + c.baseUrl + ']: ')
    const bu = await rl()
    stdout.write('API Key: ')
    const ak = await rl()
    stdout.write('Model [' + c.model + ']: ')
    const m = await rl()
    if (bu.trim()) c.baseUrl = bu.trim()
    if (ak.trim()) c.apiKey = ak.trim()
    if (m.trim()) c.model = m.trim()
    save(c)
    console.log(green('\u2713 Saved'))
  } else if (args[0] === 'sessions') {
    const ss = sessionManager.listSessions()
    if (!ss.length) { console.log('No sessions.'); return }
    ss.forEach((s: any) => console.log(cyan(s.id), '|', s.model, '|', s.createdAt))
  } else {
    const input = args.join(' ')
    if (!input) {
      const c = cfg()
      if (!c.apiKey) { console.log(red('Not configured. Run: cloudagent login')); process.exit(1) }
      const perms: PermissionContext = { mode: 'default', alwaysAllow: ['Read','Glob','Grep','Bash','Edit','Write'], alwaysDeny: [] }
      const agent = new CloudAgent({ apiKey: c.apiKey, baseUrl: c.baseUrl, model: c.model, workingDirectory: process.cwd(), permissions: perms })

      printBanner(c.model)

      while (true) {
        try {
          const userInput = await rl(bold(green('\n◈ You\n  ')))
          if (!userInput.trim()) continue
          if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') break
          await runChat(userInput, agent)
        } catch (e) {
          if (String(e).includes('SIGINT')) break
          console.error(red(String(e)))
        }
      }
      console.log(dim('\n\nSee you next time!\n'))
      return
    }

    if (!cfg().apiKey) { console.log(red('Not configured.')); process.exit(1) }
    const c = cfg()
    const perms: PermissionContext = { mode: 'default', alwaysAllow: ['Read','Glob','Grep','Bash','Edit','Write'], alwaysDeny: [] }
    const agent = new CloudAgent({ apiKey: c.apiKey, baseUrl: c.baseUrl, model: c.model, workingDirectory: process.cwd(), permissions: perms })
    printBanner(c.model)
    await runChat(input, agent)
  }
}

main().catch(e => { console.error(red(String(e))); process.exit(1) })
