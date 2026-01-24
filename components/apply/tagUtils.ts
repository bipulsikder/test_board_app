export function tagsToMap(tags: unknown) {
  const out: Record<string, string> = {}
  const arr = Array.isArray(tags) ? (tags as unknown[]) : []
  for (const t of arr) {
    if (typeof t !== "string") continue
    const [k, ...rest] = t.split(":")
    if (!k || rest.length === 0) continue
    out[k] = rest.join(":")
  }
  return out
}

export function mapToTags(map: Record<string, string>) {
  const out: string[] = []
  for (const [k, v] of Object.entries(map)) {
    if (!v) continue
    out.push(`${k}:${v}`)
  }
  return out
}

