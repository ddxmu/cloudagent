import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { stdin, stdout } from 'process'
import { join } from 'path'
import { CloudAgent } from './agent.js'
import { sessionManager } from './session.js'
import { bold, cyan, dim, green, blue, red, yellow } from './colors.js'
import type { Message, PermissionContext } from './types.js'

const VERSION = 'v0.1'
const CONFIG_DIR = join(homedir(), '.cloudagent')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')
const MODELS_FILE = join(CONFIG_DIR, 'models.json')

interface Config {
  apiKey: string
  baseUrl: string
  model: string
}

interface ModelEntry {
  baseUrl: string
  description?: string
}

interface ModelsConfig {
  [name: string]: ModelEntry
}

function cfg(): Config {
  if (existsSync(CONFIG_FILE))
    try { return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) } catch {}
  return { apiKey: '', baseUrl: 'https://api.minimaxi.com/v1', model: 'MiniMax-M2.7' }
}

function save(c: Config) {
  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CONFIG_FILE, JSON.stringify(c, null, 2))
}

function loadModels(): ModelsConfig {
  const defaults: ModelsConfig = {
    'MiniMax-M2.7': { baseUrl: 'https://api.minimaxi.com/v1', description: 'MiniMax M2.7 模型' },
    'MiniMax-M2':   { baseUrl: 'https://api.minimaxi.com/v1', description: 'MiniMax M2 模型' },
  }
  if (existsSync(MODELS_FILE))
    try { return { ...defaults, ...JSON.parse(readFileSync(MODELS_FILE, 'utf-8')) } } catch {}
  return defaults
}

function saveModels(m: ModelsConfig) {
  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(MODELS_FILE, JSON.stringify(m, null, 2))
}

function rl(prompt: string = ''): Promise<string> {
  return new Promise(r => {
    const i = require('readline').createInterface({ input: stdin, output: stdout })
    i.question(prompt, s => { i.close(); r(s) })
  })
}

function printBanner(model: string) {
  const w = 52
  const line = dim('\u2500'.repeat(w))

  console.log()
  console.log(dim('\u256d') + '\u2500'.repeat(w) + dim('\u256e'))
  console.log(dim('\u2502') + bold(cyan('   ___ _   _ ___ ___   ___ _   ___ ___   ')) + dim('\u2502'))
  console.log(dim('\u2502') + bold(cyan('  / __| | | | _ ) _ ) | __| | | | __| _ \\  ')) + dim('\u2502'))
  console.log(dim('\u2502') + bold(cyan(' | (__| |_| | _ \\ _ \\ | _|| |_| | _||   /  ')) + dim('\u2502'))
  console.log(dim('\u2502') + bold(cyan('  \\___|___|_|___/___/ |_|  \\___/|_| |_|_\\  ')) + dim('\u2502'))
  console.log(dim('\u2502') + bold(blue ('   \u2502 A I \u2502 C L I \u2502 A s s i s t a n t \u2502')) + dim('\u2502'))
  console.log(dim('\u2570') + '\u2500'.repeat(w) + dim('\u256f'))
  console.log()
  const verTag   = bold(yellow(VERSION))
  const modelTag = bold(green(model))
  console.log(dim('  \u2605') + ' Powered by MiniMax'
    + dim('  \u2502  ') + cyan('\u25c6') + ' Model: ' + modelTag
    + dim('  \u2502  ') + cyan('\u25c6') + ' Version: ' + verTag)
  console.log()
  console.log(line)
  console.log(dim('  exit / quit \u00b7 close session       /model \u00b7 switch model'))
  console.log(line)
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

async function cmdModel(args: string[]) {
  const c = cfg()
  const models = loadModels()

  if (!args.length || args[0] === '') {
    // List all models
    console.log()
    console.log(bold(cyan('◈ 可用模型')))
    console.log(dim('─'.repeat(50)))
    const entries = Object.entries(models)
    entries.forEach(([name, info]) => {
      const marker = name === c.model ? bold(green(' ▶ ')) : '   '
      console.log(marker + bold(green(name)))
      console.log('    ' + dim(info.baseUrl))
      if (info.description) console.log('    ' + dim(info.description))
      console.log()
    })
    console.log(dim('使用 /model <名称> 切换模型'))
    console.log(dim('使用 /model add <名称> <baseUrl> 添加模型'))
    return
  }

  if (args[0] === 'add') {
    // Add a new model
    if (!args[1] || !args[2]) {
      console.log(red('用法: /model add <名称> <baseUrl>'))
      console.log(dim('示例: /model add my-model https://api.example.com/v1'))
      return
    }
    const name = args[1]
    const baseUrl = args[2]
    models[name] = { baseUrl, description: '自定义模型' }
    saveModels(models)
    console.log(green('✓ 模型已添加: ') + name)
    console.log(dim('  ' + baseUrl))
    console.log(dim('使用 /model ' + name + ' 切换到此模型'))
    return
  }

  // Switch to a model
  const target = args[0]
  if (!models[target]) {
    console.log(red('✗ 未知模型: ') + target)
    console.log(dim('使用 /model 查看可用模型'))
    return
  }

  c.model = target
  c.baseUrl = models[target].baseUrl
  save(c)
  console.log(green('✓ 已切换到模型: ') + target)
  console.log(dim('  ' + models[target].baseUrl))
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
  } else if (args[0] === 'model') {
    await cmdModel(args.slice(1))
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

          // Handle built-in commands in REPL
          if (userInput.startsWith('/model')) {
            const parts = userInput.slice(1).trim().split(/\s+/)
            await cmdModel(parts)
            continue
          }

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
