"use client"

import type { Candidate, ParsingJob } from "@/lib/types"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Card, CardBody } from "@/components/ui/Card"
import { Spinner } from "@/components/ui/Spinner"

export function ResumeStep({
  candidate,
  candidateLoading,
  busy,
  parsingJob,
  onError,
  onUploadAndParse,
  onSkip
}: {
  candidate: Candidate | null
  candidateLoading: boolean
  busy: boolean
  parsingJob: ParsingJob | null
  onError: (msg: string | null) => void
  onUploadAndParse: (file: File) => Promise<void>
  onSkip: () => void
}) {
  const needsResume = !candidate?.file_url

  return (
    <Card>
      <CardBody className="pt-6">
        <div className="grid gap-4">
          <div>
            <div className="text-base font-semibold">Resume upload</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {needsResume ? "Upload your resume to autofill profile fields." : "Resume found. You can replace it anytime."}
            </div>
          </div>

          {candidateLoading ? (
            <div className="text-sm text-muted-foreground">Loading profile…</div>
          ) : candidate ? (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge>{candidate.email}</Badge>
              {candidate.file_name ? <Badge>{candidate.file_name}</Badge> : null}
            </div>
          ) : null}

          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={async (e) => {
              const f = e.target.files?.[0] || null
              if (!f) return
              onError(null)
              await onUploadAndParse(f)
            }}
            className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-full file:border file:border-input file:bg-card file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent"
          />

          <div className="flex gap-2">
            {!needsResume ? (
              <Button variant="secondary" onClick={onSkip} disabled={busy} className="flex-1">
                Skip
              </Button>
            ) : null}
            <Button
              onClick={() => onError("Choose a resume file")}
              disabled
              className="flex-1 opacity-0"
              aria-hidden
            />
          </div>

          {busy ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner /> Uploading…
            </div>
          ) : null}

          {parsingJob ? <div className="text-xs text-muted-foreground">Parsing status: {parsingJob.status || "pending"}</div> : null}
        </div>
      </CardBody>
    </Card>
  )
}
