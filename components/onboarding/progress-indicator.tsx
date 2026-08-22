import { Check } from "lucide-react"

export function ProgressIndicator({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  const labels = ["Over jou", "Je bedrijf", "Je website"]

  return (
    <div aria-label={`Stap ${currentStep} van 3`} className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-primary">Stap {currentStep} van 3</span>
        <span className="text-muted-foreground">Ongeveer 2 minuten</span>
      </div>
      <ol className="grid grid-cols-3 gap-2">
        {labels.map((label, index) => {
          const step = (index + 1) as 1 | 2 | 3
          const complete = step < currentStep
          const active = step === currentStep
          return (
            <li key={label} aria-current={active ? "step" : undefined}>
              <div className={`h-1.5 rounded-full ${step <= currentStep ? "bg-primary" : "bg-border"}`} />
              <div className={`mt-2 flex items-center gap-1.5 text-xs ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {complete ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> : null}
                <span>{label}</span>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

