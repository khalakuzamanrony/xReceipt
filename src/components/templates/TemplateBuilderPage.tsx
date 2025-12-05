import CustomTemplateBuilder from './CustomTemplateBuilder'

interface TemplateBuilderPageProps {
  onBack: () => void
}

export default function TemplateBuilderPage({ onBack }: TemplateBuilderPageProps) {
  return (
    <CustomTemplateBuilder
      open={true}
      onClose={onBack}
      onSave={onBack}
      isPage={true}
    />
  )
}
