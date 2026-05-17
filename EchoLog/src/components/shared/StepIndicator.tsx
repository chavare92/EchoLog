import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  label: string;
  icon: React.ElementType;
  optional?: boolean;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number; // 0-based index of the active step
  className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className={cn("w-full", className)}>
      <ol className="flex items-center">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;
          const StepIcon = step.icon;

          return (
            <li key={step.label} className={cn("flex items-center", idx < steps.length - 1 ? "flex-1" : "")}>
              {/* Step node */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isCompleted
                      ? "bg-green-500 border-green-500 text-white"
                      : isActive
                      ? "bg-white border-primary text-primary ring-4 ring-primary/20"
                      : "bg-white border-gray-200 text-gray-400"
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <StepIcon className="w-4 h-4" aria-hidden="true" />
                  )}
                </div>
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "text-[11px] font-medium leading-tight text-center",
                      isCompleted
                        ? "text-green-600"
                        : isActive
                        ? "text-primary"
                        : "text-gray-400"
                    )}
                  >
                    {step.label}
                  </span>
                  {step.optional && (
                    <span className="text-[10px] text-gray-400 leading-tight">optional</span>
                  )}
                </div>
              </div>

              {/* Connecting line */}
              {idx < steps.length - 1 && (
                <div className="flex-1 mx-2 mt-[-18px]">
                  <div className="h-0.5 w-full bg-gray-200 relative overflow-hidden rounded-full">
                    <div
                      className="h-full bg-green-500 transition-all duration-500 rounded-full"
                      style={{ width: idx < currentStep ? "100%" : "0%" }}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
