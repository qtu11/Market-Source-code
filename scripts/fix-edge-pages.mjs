import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

function walkDir(dir, callback) {
  const files = readdirSync(dir)
  files.forEach(file => {
    const filePath = join(dir, file)
    const stat = statSync(filePath)
    if (stat.isDirectory()) {
      walkDir(filePath, callback)
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      callback(filePath)
    }
  })
}

let count = 0
const targetDirs = ['app/dashboard', 'app/admin']

targetDirs.forEach(dir => {
  walkDir(dir, filePath => {
    let content = readFileSync(filePath, 'utf8')
    const newContent = content.replace(/export const runtime = ['"`]edge['"`]/g, "export const runtime = 'nodejs'")
    if (content !== newContent) {
      writeFileSync(filePath, newContent, 'utf8')
      console.log('✅', filePath)
      count++
    }
  })
})

console.log(`\n🎯 Đã chuyển ${count} page(s) từ edge → nodejs.`)

