import { Button } from "@/components/ui/Button"
import { Card, CardBody } from "@/components/ui/Card"

export function ApplySuccess({ applicationId }: { applicationId?: string | null }) {
  return (
    <Card>
      <CardBody className="pt-6">
        <div className="grid gap-2">
          <div className="text-base font-semibold">Application submitted</div>
          <div className="text-sm text-muted-foreground">Track your status and update your profile from the dashboard.</div>
          <div className="mt-3 flex gap-2">
            <a
              href={
                applicationId
                  ? `/dashboard/my-work?tab=applications&applicationId=${encodeURIComponent(applicationId)}`
                  : "/dashboard/my-work?tab=applications"
              }
              className="flex-1"
            >
              <Button className="w-full">Open dashboard</Button>
            </a>
            <a href="/jobs" className="flex-1">
              <Button variant="secondary" className="w-full">More jobs</Button>
            </a>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
