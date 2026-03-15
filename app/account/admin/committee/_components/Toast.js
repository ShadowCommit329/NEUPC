import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Toast({ message, type = 'success', onClose }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-in animation
    requestAnimationFrame(() => setIsVisible(true));

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 200);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: {
      container: 'border-emerald-500/20 bg-emerald-500/10',
      icon: 'text-emerald-400',
      text: 'text-emerald-300',
      Icon: CheckCircle2,
    },
    error: {
      container: 'border-red-500/20 bg-red-500/10',
      icon: 'text-red-400',
      text: 'text-red-300',
      Icon: AlertCircle,
    },
  };

  const style = styles[type] || styles.success;
  const Icon = style.Icon;

  return (
    <div
      className={`fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-xl border ${style.container} px-4 py-3 backdrop-blur-md shadow-2xl transition-all duration-200 ${
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-2 opacity-0'
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${style.icon}`} />
      <p className={`text-xs font-medium ${style.text}`}>{message}</p>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose?.(), 200);
        }}
        className="ml-1 flex h-5 w-5 items-center justify-center rounded text-gray-500 transition-colors hover:text-gray-300"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
