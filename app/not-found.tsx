import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Store, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
      <div className="text-center max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-6">
          <Store className="w-8 h-8 text-primary-foreground" />
        </div>

        {/* Error Code */}
        <h1 className="text-7xl font-bold text-primary mb-2">404</h1>
        
        {/* Message */}
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Page Not Found
        </h2>
        <p className="text-muted-foreground mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/login">
              Go to Login
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
