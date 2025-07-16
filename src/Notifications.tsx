import React, { useEffect, useState, createContext, useContext } from "react"
import { CheckCircle2, AlertCircle, X } from "lucide-react"

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

interface ToastProviderProps {
  children: React.ReactNode
}

// Custom glassmorphism styled toast animations
const glassAnimations = `
  @keyframes glass-slide-in {
    0% {
      transform: translateX(100%) scale(0.9);
      opacity: 0;
    }
    10% {
      transform: translateX(0) scale(1);
      opacity: 1;
    }
    90% {
      transform: translateX(0) scale(1);
      opacity: 1;
    }
    100% {
      transform: translateX(100%) scale(0.9);
      opacity: 0;
    }
  }

  @keyframes glass-glow {
    0%, 100% {
      box-shadow: 0 8px 32px rgba(59, 130, 246, 0.2), inset 0 0 10px rgba(30, 58, 138, 0.1);
    }
    50% {
      box-shadow: 0 12px 40px rgba(59, 130, 246, 0.4), inset 0 0 15px rgba(30, 58, 138, 0.2);
    }
  }

  @keyframes glass-error-glow {
    0%, 100% {
      box-shadow: 0 8px 32px rgba(239, 68, 68, 0.2), inset 0 0 10px rgba(127, 29, 29, 0.1);
    }
    50% {
      box-shadow: 0 12px 40px rgba(239, 68, 68, 0.4), inset 0 0 15px rgba(127, 29, 29, 0.2);
    }
  }
  
  @keyframes glass-shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  @keyframes glass-text-glow {
    0%, 90%, 100% {
      text-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
    }
    20%, 40%, 60%, 80% {
      text-shadow: 0 0 10px rgba(59, 130, 246, 0.6);
    }
  }
`

// CSS classes for glassmorphism styling
const toastClasses = {
  successToast: "relative bg-[rgba(30,58,138,0.15)] border border-[rgba(59,130,246,0.4)] text-[#93c5fd] animate-[glass-glow_3s_infinite] backdrop-blur-[15px] rounded-lg",
  errorToast: "relative bg-[rgba(127,29,29,0.15)] border border-[rgba(239,68,68,0.4)] text-[#fca5a5] animate-[glass-error-glow_3s_infinite] backdrop-blur-[15px] rounded-lg",
  shimmer: "absolute inset-0 pointer-events-none bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.1),transparent)] animate-[glass-shimmer_3s_linear_infinite] opacity-60",
  errorShimmer: "absolute inset-0 pointer-events-none bg-[linear-gradient(90deg,transparent,rgba(239,68,68,0.1),transparent)] animate-[glass-shimmer_3s_linear_infinite] opacity-60",
  icon: "h-5 w-5 text-[#93c5fd]",
  errorIcon: "h-5 w-5 text-[#fca5a5]",
  message: "font-sans tracking-normal animate-[glass-text-glow_4s_infinite]",
  closeButton: "ml-2 rounded-full p-1 hover:bg-[rgba(59,130,246,0.2)] text-[rgba(147,197,253,0.7)] hover:text-[rgba(59,130,246,0.9)] transition-colors duration-300",
  errorCloseButton: "ml-2 rounded-full p-1 hover:bg-[rgba(239,68,68,0.2)] text-[rgba(252,165,165,0.7)] hover:text-[rgba(239,68,68,0.9)] transition-colors duration-300"
}

export const ToastContext = createContext<{
  showToast: (message: string, type: 'success' | 'error') => void
}>({
  showToast: () => {},
})

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
  }

  const closeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts(prev => prev.slice(1))
      }, 2000) // Increased duration to 5 seconds to enjoy the cyberpunk effects
      return () => clearTimeout(timer)
    }
  }, [toasts])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Add the custom animations to the DOM */}
      <style>{glassAnimations}</style>
      
      <div className="fixed bottom-4 right-4 z-[999999999999999999999999999999999] flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{ animationDuration: '5s' }}
            className={`animate-[glass-slide-in_5s_ease-in-out_forwards] flex items-center gap-2 px-4 py-3 shadow-lg ${
          toast.type === 'success' ? toastClasses.successToast : toastClasses.errorToast
        }`}
          >
            {/* Shimmer effect */}
            <div className={toast.type === 'success' ? toastClasses.shimmer : toastClasses.errorShimmer}></div>
            
            {/* Icon and content */}
            {toast.type === 'success' ? (
              <CheckCircle2 className={toastClasses.icon} />
            ) : (
              <AlertCircle className={toastClasses.errorIcon} />
            )}
            <p className={toastClasses.message}>{toast.message}</p>
            <button
              onClick={() => closeToast(toast.id)}
              className={toast.type === 'success' ? toastClasses.closeButton : toastClasses.errorCloseButton}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  return useContext(ToastContext)
}

export default ToastProvider