import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react"

const getToastIcon = (variant: string | undefined) => {
  switch (variant) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
    case 'destructive':
      return <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
    case 'info':
      return <Info className="h-5 w-5 text-[#3AB3FF] mt-0.5 flex-shrink-0" />
    default:
      return <Info className="h-5 w-5 text-[#85A8C3] mt-0.5 flex-shrink-0" />
  }
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant as any} {...props}>
            <div className="flex items-start gap-4 w-full">
              {getToastIcon(variant)}
              <div className="flex-1 space-y-1.5 min-w-0">
                {title && (
                  <ToastTitle className="text-base font-semibold text-white leading-tight">
                    {title}
                  </ToastTitle>
                )}
                {description && (
                  <ToastDescription className="text-sm text-white/80 leading-relaxed">
                    {description}
                  </ToastDescription>
                )}
              </div>
              {action}
            </div>
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
