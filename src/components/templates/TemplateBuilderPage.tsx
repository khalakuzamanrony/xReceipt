import { Button } from '@/components/ui/Button'
import CustomTemplateBuilder from './CustomTemplateBuilder'
import { Sparkles, ArrowLeft, FileCode } from 'lucide-react'
import { useEffect, useState } from 'react'

interface TemplateBuilderPageProps {
  onBack: () => void
  templateId?: string | null
}

export default function TemplateBuilderPage({ onBack, templateId }: TemplateBuilderPageProps) {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    const handleChange = () => setIsDesktop(mql.matches)
    handleChange()
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  // Mobile check - only block on mobile (< 768px), allow tablet and desktop
  if (!isDesktop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mb-4">
          <FileCode size={32} className="text-violet-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Desktop Only</h2>
        <p className="text-gray-600 max-w-sm mb-6">
          Template builder is only available on desktop and tablet. Please open this page on a larger screen to design templates.
        </p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to templates
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Template Builder
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Design and save your own receipt template layout.
          </p>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back to templates
          </Button>
        </div>
      </div>

      <div id="custom-template-builder">
        <CustomTemplateBuilder
          open={true}
          onClose={onBack}
          onSave={onBack}
          isPage={true}
          templateId={templateId}
        />
      </div>
    </div>
  )
}
