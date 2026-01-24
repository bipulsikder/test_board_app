import { cp, mkdir, stat } from "node:fs/promises"
import path from "node:path"

async function exists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  const root = process.cwd()
  const nextDir = path.join(root, ".next")
  const standaloneDir = path.join(nextDir, "standalone")

  if (!(await exists(standaloneDir))) return

  const standaloneNext = path.join(standaloneDir, ".next")
  const standaloneStatic = path.join(standaloneNext, "static")
  await mkdir(standaloneStatic, { recursive: true })

  const srcStatic = path.join(nextDir, "static")
  if (await exists(srcStatic)) {
    await cp(srcStatic, standaloneStatic, { recursive: true })
  }

  const srcPublic = path.join(root, "public")
  const dstPublic = path.join(standaloneDir, "public")
  if (await exists(srcPublic)) {
    await cp(srcPublic, dstPublic, { recursive: true })
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

