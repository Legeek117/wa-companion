import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const SplashScreen = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const startTime = Date.now();
    
    // Masquer le splash screen après le chargement
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3000); // 3 secondes minimum

    // Masquer aussi quand la page est chargée (mais au moins 3 secondes)
    const handleLoad = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 3000 - elapsed);
      setTimeout(() => setIsVisible(false), remaining);
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/80 backdrop-blur-sm">
      <div className="flex flex-col items-center justify-center gap-6">
        {/* Logo */}
        <div className="relative">
          <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="relative bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20">
            <img 
              src="/icon-512x512.png" 
              alt="AMDA Logo" 
              className="w-24 h-24 sm:w-32 sm:h-32 object-contain animate-pulse"
              onError={(e) => {
                // Fallback si l'image ne charge pas
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) {
                  parent.innerHTML = '<div class="text-6xl font-bold text-white">AMDA</div>';
                }
              }}
            />
          </div>
        </div>

        {/* Nom de l'application */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-lg">
            AMDA
          </h1>
          <p className="text-white/80 text-sm sm:text-base">
            WhatsApp Assistant
          </p>
        </div>

        {/* Loading spinner */}
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 text-white animate-spin" />
          <span className="text-white/80 text-sm">Chargement...</span>
        </div>
      </div>

      <style>{`
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
            visibility: hidden;
          }
        }
        
        .splash-screen-exit {
          animation: fadeOut 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;

