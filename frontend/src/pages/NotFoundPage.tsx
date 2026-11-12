import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { EmptyState } from '@/components/feedback/EmptyState'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <EmptyState
      icon={Compass}
      title="This observation point does not exist"
      description="The address you followed is not part of the observatory. Return to the overview to continue."
      action={
        <Button variant="secondary" asChild>
          <Link to="/">Back to overview</Link>
        </Button>
      }
      footnote="HTTP 404 · A11YSCAPE"
    />
  )
}
