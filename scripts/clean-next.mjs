import { rm } from "node:fs/promises"
import path from "node:path"

async function safeRm(p) {
  try {
    await rm(p, { recursive: true, force: true })
  } catch {
    // ignore
  }
}

async function main() {
  const root = process.cwd()
  await safeRm(path.join(root, ".next"))
}

main()

