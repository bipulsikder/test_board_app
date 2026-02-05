"use client"

import type { Candidate } from "@/lib/types"
import { mapToTags, tagsToMap } from "@/components/apply/tagUtils"
import { Button } from "@/components/ui/Button"
import { Card, CardBody } from "@/components/ui/Card"
import { Input, Textarea } from "@/components/ui/Input"
import { Spinner } from "@/components/ui/Spinner"

export function ProfileStep({
  candidate,
  setCandidate,
  busy,
  onBack,
  onContinue
}: {
  candidate: Candidate | null
  setCandidate: (next: Candidate) => void
  busy: boolean
  onBack: () => void
  onContinue: () => void
}) {
  const preferences = tagsToMap(candidate?.tags)

  if (!candidate) {
    return (
      <Card>
        <CardBody className="pt-6">
          <div className="text-sm text-muted-foreground">Loading profile…</div>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardBody className="pt-6">
        <div className="grid gap-4">
          <div>
            <div className="text-base font-semibold">Autofill & review</div>
            <div className="mt-1 text-sm text-muted-foreground">Confirm details. Missing fields are required to apply.</div>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">Full name *</div>
              <Input value={candidate.name || ""} onChange={(e) => setCandidate({ ...candidate, name: e.target.value })} />
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">Email</div>
              <Input value={candidate.email} disabled />
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">Phone</div>
              <Input value={candidate.phone || ""} onChange={(e) => setCandidate({ ...candidate, phone: e.target.value })} />
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">Desired role</div>
              <Input
                value={candidate.desired_role || ""}
                onChange={(e) => setCandidate({ ...candidate, desired_role: e.target.value })}
                placeholder="e.g. Dispatcher"
              />
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">Current company</div>
              <Input
                value={candidate.current_company || ""}
                onChange={(e) => setCandidate({ ...candidate, current_company: e.target.value })}
                placeholder="e.g. Delhivery"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-xs font-medium text-muted-foreground">Current role *</div>
                <Input
                  value={candidate.current_role || ""}
                  onChange={(e) => setCandidate({ ...candidate, current_role: e.target.value })}
                  placeholder="Driver, Dispatcher, Fleet Manager"
                />
              </div>
              <div className="grid gap-2">
                <div className="text-xs font-medium text-muted-foreground">Total experience *</div>
                <Input
                  value={candidate.total_experience || ""}
                  onChange={(e) => setCandidate({ ...candidate, total_experience: e.target.value })}
                  placeholder="e.g. 3 years"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-xs font-medium text-muted-foreground">Location *</div>
                <Input value={candidate.location || ""} onChange={(e) => setCandidate({ ...candidate, location: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <div className="text-xs font-medium text-muted-foreground">Preferred location</div>
                <Input
                  value={candidate.preferred_location || ""}
                  onChange={(e) => setCandidate({ ...candidate, preferred_location: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-xs font-medium text-muted-foreground">Industry</div>
                <Input
                  value={preferences.industry || ""}
                  onChange={(e) => {
                    const next = { ...preferences, industry: e.target.value }
                    setCandidate({ ...candidate, tags: mapToTags(next) })
                  }}
                  placeholder="Logistics, Transportation"
                />
              </div>
              <div className="grid gap-2">
                <div className="text-xs font-medium text-muted-foreground">Logistics background</div>
                <select
                  value={preferences.logistics_background || "no"}
                  onChange={(e) => {
                    const next = { ...preferences, logistics_background: e.target.value }
                    setCandidate({ ...candidate, tags: mapToTags(next) })
                  }}
                  className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="grid gap-2">
                <div className="text-xs font-medium text-muted-foreground">Current salary</div>
                <Input
                  value={candidate.current_salary || ""}
                  onChange={(e) => setCandidate({ ...candidate, current_salary: e.target.value })}
                  placeholder="e.g. ₹25,000 / month"
                />
              </div>

              <div className="grid gap-2">
                <div className="text-xs font-medium text-muted-foreground">Expected salary</div>
                <Input
                  value={candidate.expected_salary || ""}
                  onChange={(e) => setCandidate({ ...candidate, expected_salary: e.target.value })}
                  placeholder="e.g. ₹35,000 / month"
                />
              </div>
              <div className="grid gap-2">
                <div className="text-xs font-medium text-muted-foreground">Open to shifts</div>
                <select
                  value={preferences.open_to_shift || "no"}
                  onChange={(e) => {
                    const next = { ...preferences, open_to_shift: e.target.value }
                    setCandidate({ ...candidate, tags: mapToTags(next) })
                  }}
                  className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="grid gap-2">
                <div className="text-xs font-medium text-muted-foreground">Open for a job</div>
                <select
                  value={preferences.open_for_job || "yes"}
                  onChange={(e) => {
                    const next = { ...preferences, open_for_job: e.target.value }
                    setCandidate({ ...candidate, tags: mapToTags(next) })
                  }}
                  className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">Summary</div>
              <Textarea value={candidate.summary || ""} onChange={(e) => setCandidate({ ...candidate, summary: e.target.value })} />
            </div>

            <div className="grid gap-3">
              <div className="text-sm font-semibold">Parsed highlights</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <div className="text-xs font-medium text-muted-foreground">Highest qualification</div>
                  <Input
                    value={candidate.highest_qualification || ""}
                    onChange={(e) => setCandidate({ ...candidate, highest_qualification: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="text-xs font-medium text-muted-foreground">Degree</div>
                  <Input value={candidate.degree || ""} onChange={(e) => setCandidate({ ...candidate, degree: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <div className="text-xs font-medium text-muted-foreground">Specialization</div>
                  <Input
                    value={candidate.specialization || ""}
                    onChange={(e) => setCandidate({ ...candidate, specialization: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="text-xs font-medium text-muted-foreground">University</div>
                  <Input value={candidate.university || ""} onChange={(e) => setCandidate({ ...candidate, university: e.target.value })} />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="text-xs font-medium text-muted-foreground">Technical skills</div>
                <Textarea
                  value={Array.isArray(candidate.technical_skills) ? candidate.technical_skills.join(", ") : ""}
                  onChange={(e) =>
                    setCandidate({
                      ...candidate,
                      technical_skills: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    })
                  }
                  placeholder="e.g. TMS, WMS, Route planning, Excel"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <div className="text-xs font-medium text-muted-foreground">Languages</div>
                  <Textarea
                    value={Array.isArray(candidate.languages_known) ? candidate.languages_known.join(", ") : ""}
                    onChange={(e) =>
                      setCandidate({
                        ...candidate,
                        languages_known: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      })
                    }
                    placeholder="e.g. Hindi, English"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="text-xs font-medium text-muted-foreground">Soft skills</div>
                  <Textarea
                    value={Array.isArray(candidate.soft_skills) ? candidate.soft_skills.join(", ") : ""}
                    onChange={(e) =>
                      setCandidate({
                        ...candidate,
                        soft_skills: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      })
                    }
                    placeholder="e.g. Team management, Communication"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={onBack} disabled={busy} className="flex-1">
              Back
            </Button>
            <Button onClick={onContinue} disabled={busy} className="flex-1">
              {busy ? <Spinner /> : null}
              Continue
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
