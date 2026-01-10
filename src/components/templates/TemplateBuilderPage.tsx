import { Button } from '@/components/ui/Button'
import CustomTemplateBuilder from './CustomTemplateBuilder'
import { Sparkles, ArrowLeft } from 'lucide-react'

interface TemplateBuilderPageProps {
  onBack: () => void
  templateId?: string | null
}

export default function TemplateBuilderPage({ onBack, templateId }: TemplateBuilderPageProps) {
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
