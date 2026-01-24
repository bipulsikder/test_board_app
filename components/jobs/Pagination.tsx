import Link from "next/link"

export function Pagination({ basePath, page, totalPages }: { basePath: string; page: number; totalPages: number }) {
  if (totalPages <= 1) return null

  const prev = Math.max(1, page - 1)
  const next = Math.min(totalPages, page + 1)

  return (
    <div className="flex items-center justify-center gap-2 py-6">
      <Link
        className="rounded-full border bg-card px-4 py-2 text-sm text-foreground/80 hover:bg-accent"
        href={`${basePath}?page=${prev}`}
        aria-disabled={page === 1}
      >
        Prev
      </Link>
      <div className="text-sm text-muted-foreground">
        Page {page} / {totalPages}
      </div>
      <Link
        className="rounded-full border bg-card px-4 py-2 text-sm text-foreground/80 hover:bg-accent"
        href={`${basePath}?page=${next}`}
        aria-disabled={page === totalPages}
      >
        Next
      </Link>
    </div>
  )
}

