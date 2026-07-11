import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  useReports, REPORT_REASONS, type ReportContentType, type ReportReason,
} from '@/hooks/useCommunityExtras'

interface ReportSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentType: ReportContentType
  contentId: string
  reportedUserId?: string | null
  /** Fired after a successful report — e.g. to hide the item locally. */
  onReported?: () => void
}

// Shared report dialog for every user-generated-content surface (posts, comments,
// stories, messages, profiles). App Store Guideline 1.2.
export function ReportSheet({
  open, onOpenChange, contentType, contentId, reportedUserId, onReported,
}: ReportSheetProps) {
  const { reportContent } = useReports()
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => { setReason(null); setDetails('') }

  const handleSubmit = async () => {
    if (!reason || submitting) return
    setSubmitting(true)
    const ok = await reportContent({ contentType, contentId, reportedUserId, reason, details })
    setSubmitting(false)
    if (ok) {
      reset()
      onOpenChange(false)
      onReported?.()
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Report {contentType === 'profile' ? 'user' : 'content'}</DialogTitle>
          <DialogDescription>
            Tell us what's wrong. Our team reviews reports within 24 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          {REPORT_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setReason(r.value)}
              className={cn(
                'w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors',
                reason === r.value
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border/60 text-muted-foreground hover:bg-muted/50',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <Textarea
          placeholder="Add any details (optional)"
          value={details}
          onChange={(e) => setDetails(e.target.value.slice(0, 500))}
          rows={3}
          className="resize-none"
        />

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false) }} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason || submitting}
          >
            {submitting ? 'Submitting…' : 'Submit report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
