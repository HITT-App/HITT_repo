import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import termsMd from '@/content/terms-of-service.md?raw'

export default function Terms() {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      <header
        className="sticky top-0 z-20 shrink-0 bg-background/90 backdrop-blur-sm border-b border-border/40 flex items-center gap-3 px-4 py-3"
        style={{ paddingTop: 'calc(var(--safe-area-inset-top, 0px) + 12px)' }}
      >
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-semibold">Terms of Service</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <article className="p-4 max-w-2xl mx-auto prose prose-sm dark:prose-invert pb-28
                            prose-headings:font-semibold prose-headings:text-foreground
                            prose-p:text-muted-foreground prose-li:text-muted-foreground
                            prose-strong:text-foreground
                            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                            prose-blockquote:text-muted-foreground prose-blockquote:border-l-primary">
          <ReactMarkdown>{termsMd}</ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
