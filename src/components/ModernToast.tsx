import { useState, useEffect } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModernToastProps {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning";
  duration?: number; // in milliseconds, 0 = no auto close
  onClose?: () => void;
}

export function ModernToastItem({ 
  id, 
  title, 
  description, 
  variant = "default", 
  duration = 3000,
  onClose 
}: ModernToastProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (duration <= 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        handleClose();
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [duration]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose?.();
    }, 300); // match animation duration
  };

  const configs = {
    default: {
      bg: "bg-blue-50 border border-blue-200",
      icon: <Info className="w-5 h-5 text-blue-600" />,
      title: "text-blue-900",
      description: "text-blue-700",
      progress: "bg-blue-500",
      closeHover: "hover:text-blue-700",
      accentBg: "bg-blue-100",
    },
    success: {
      bg: "bg-emerald-50 border border-emerald-200",
      icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
      title: "text-emerald-900",
      description: "text-emerald-700",
      progress: "bg-emerald-500",
      closeHover: "hover:text-emerald-700",
      accentBg: "bg-emerald-100",
    },
    error: {
      bg: "bg-red-50 border border-red-200",
      icon: <AlertCircle className="w-5 h-5 text-red-600" />,
      title: "text-red-900",
      description: "text-red-700",
      progress: "bg-red-500",
      closeHover: "hover:text-red-700",
      accentBg: "bg-red-100",
    },
    warning: {
      bg: "bg-amber-50 border border-amber-200",
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      title: "text-amber-900",
      description: "text-amber-700",
      progress: "bg-amber-500",
      closeHover: "hover:text-amber-700",
      accentBg: "bg-amber-100",
    },
  };

  const config = configs[variant];

  return (
    <div
      className={cn(
        "fixed top-6 right-6 z-[9999] max-w-md pointer-events-auto transition-all duration-300 ease-out",
        isClosing 
          ? "translate-x-[450px] opacity-0" 
          : "translate-x-0 opacity-100 animate-slideInRight"
      )}
    >
      <div className={cn("rounded-xl overflow-hidden shadow-2xl backdrop-blur-xl", config.bg)}>
        {/* Main content */}
        <div className="p-4 flex gap-4">
          {/* Icon with background */}
          <div className={cn("flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg", config.accentBg)}>
            {config.icon}
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0 pt-0.5">
            {title && (
              <h3 className={cn("font-semibold text-sm leading-snug", config.title)}>
                {title}
              </h3>
            )}
            {description && (
              <p className={cn("text-sm leading-relaxed mt-1 line-clamp-2", config.description)}>
                {description}
              </p>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className={cn(
              "flex-shrink-0 p-1.5 text-gray-400 transition-colors duration-200",
              config.closeHover
            )}
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        {duration > 0 && (
          <div className="h-1 bg-black/5">
            <div
              className={cn("h-full transition-all ease-out", config.progress)}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
