// src/lib/loader.js
// Scans commands/ subfolders and loads every .js file it finds.
// Each file exports:  export default { command, handler, ... }
// OR an array:        export default [ {...}, {...} ]
//
// Commands are grouped by their subfolder name (= category shown in .menu)

import { readdirSync, statSync } from 'fs'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __dir    = dirname(fileURLToPath(import.meta.url))
const CMDS_DIR = join(__dir, '../../commands')

// Map of command name → handler object
const commands = new Map()

// Map of alias → canonical command name
const aliases = new Map()

// Map of category name → array of command names (for .menu)
const categories = new Map()

export const loadCommands = async () => {
  commands.clear()
  aliases.clear()
  categories.clear()

  // Get all subdirectories inside commands/
  const subdirs = readdirSync(CMDS_DIR).filter(name => {
    return statSync(join(CMDS_DIR, name)).isDirectory()
  })

  for (const folder of subdirs) {
    const category = folder.toLowerCase()
    const catCmds  = []

    const files = readdirSync(join(CMDS_DIR, folder)).filter(f => f.endsWith('.js'))

    for (const file of files) {
      try {
        const mod      = await import(`${join(CMDS_DIR, folder, file)}?v=${Date.now()}`)
        const exported = mod.default
        if (!exported) continue

        // Support single export or array of exports
        const list = Array.isArray(exported) ? exported : [exported]

        for (const cmd of list) {
          if (!cmd?.command || !cmd?.handler) continue

          const names = Array.isArray(cmd.command) ? cmd.command : [cmd.command]
          const main  = names[0].toLowerCase()

          // Attach category from folder name
          cmd.category = category

          commands.set(main, cmd)
          catCmds.push(main)

          for (const alias of names) {
            aliases.set(alias.toLowerCase(), main)
          }
        }
      } catch (e) {
        console.error(`[Loader] Error in commands/${folder}/${file}:`, e.message)
      }
    }

    if (catCmds.length) categories.set(category, catCmds)
  }

  const total = commands.size
  console.log(`[Loader] Loaded ${total} commands across ${categories.size} categories`)
  return { commands, categories }
}

export const getCommand = (name) => {
  const canonical = aliases.get(name.toLowerCase())
  return canonical ? commands.get(canonical) : null
}

export const getCategories = () => categories

export const getAllCommands = () => [...commands.values()]
