import React, { useEffect } from 'react';
import { Monitor, AlertTriangle } from 'lucide-react';

interface MobileLayoutProps {
  currentPage: 'wallets' | 'chart' | 'actions';
  setCurrentPage: (page: 'wallets' | 'chart' | 'actions') => void;
  children: {
    WalletsPage: React.ReactNode;
    ChartPage: React.ReactNode;
    ActionsPage: React.ReactNode;
  };
}

interface NavItem {
  id: 'wallets' | 'chart' | 'actions';
  label: string;
  Icon: LucideIcon;
  component: React.ReactNode;
}

const MobileLayout: React.FC<MobileLayoutProps> = () => {
  useEffect(() => {
    // Add cyberpunk-specific styles for desktop-only message
    const cyberpunkStyle = document.createElement('style');
    cyberpunkStyle.textContent = `
      @keyframes desktop-glow {
        0% { text-shadow: 0 0 4px rgba(2, 179, 109, 0.7); }
        50% { text-shadow: 0 0 8px rgba(2, 179, 109, 0.9), 0 0 12px rgba(2, 179, 109, 0.5); }
        100% { text-shadow: 0 0 4px rgba(2, 179, 109, 0.7); }
      }
      
      @keyframes desktop-pulse {
        0% { box-shadow: 0 0 10px rgba(2, 179, 109, 0.3), 0 0 20px rgba(2, 179, 109, 0.1); }
        50% { box-shadow: 0 0 20px rgba(2, 179, 109, 0.6), 0 0 30px rgba(2, 179, 109, 0.3); }
        100% { box-shadow: 0 0 10px rgba(2, 179, 109, 0.3), 0 0 20px rgba(2, 179, 109, 0.1); }
      }
      
      @keyframes desktop-scan {
        0% { transform: translateY(-100%); opacity: 0.3; }
        100% { transform: translateY(100%); opacity: 0; }
      }
      
      @keyframes desktop-grid {
        0% { background-position: 0% 0%; }
        100% { background-position: 20px 20px; }
      }
      
      .desktop-only-grid {
        background-image: linear-gradient(rgba(2, 179, 109, 0.1) 1px, transparent 1px), 
                         linear-gradient(90deg, rgba(2, 179, 109, 0.1) 1px, transparent 1px);
        background-size: 20px 20px;
        background-position: center center;
        opacity: 0.2;
        animation: desktop-grid 20s linear infinite;
      }
      
      .desktop-only-scan::before {
        content: "";
        position: absolute;
        width: 100%;
        height: 4px;
        background: linear-gradient(to bottom, 
          transparent 0%,
          rgba(2, 179, 109, 0.3) 50%,
          transparent 100%);
        z-index: 10;
        animation: desktop-scan 6s linear infinite;
        pointer-events: none;
      }
      
      .desktop-only-glow {
        animation: desktop-glow 3s infinite;
      }
      
      .desktop-only-pulse {
        animation: desktop-pulse 4s infinite;
      }
    `;
    document.head.appendChild(cyberpunkStyle);

    return () => {
      // Clean up on unmount
      document.head.removeChild(cyberpunkStyle);
    };
  }, []);

  return (
    <div className="md:hidden flex flex-col h-[100dvh] max-h-[100dvh] select-none bg-[#050a0e] relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Grid background */}
      <div className="absolute inset-0 desktop-only-grid"></div>
      
      {/* Scanning line effect */}
      <div className="absolute inset-0 desktop-only-scan"></div>
      
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="text-center max-w-md mx-auto">
          {/* Warning icon with glow effect */}
          <div className="mb-8 flex justify-center">
            <div className="relative desktop-only-pulse rounded-full p-4 border border-[#02b36d40] bg-[#050a0e]">
              <Monitor 
                size={48} 
                className="text-[#02b36d] desktop-only-glow" 
              />
              <AlertTriangle 
                size={20} 
                className="absolute -top-1 -right-1 text-[#ff6b6b] desktop-only-glow" 
              />
            </div>
          </div>
          
          {/* Main message */}
          <h1 className="text-2xl font-bold text-[#02b36d] mb-4 font-mono tracking-wider desktop-only-glow">
            DESKTOP REQUIRED
          </h1>
          
          {/* Subtitle */}
          <p className="text-[#7ddfbd] text-lg mb-6 font-mono leading-relaxed">
            You must use app from a desktop for an enhanced experience
          </p>
          
          {/* Additional info */}
          <div className="text-[#7ddfbd80] text-sm font-mono space-y-2">
            <p>• Advanced trading features</p>
            <p>• Multi-wallet management</p>
            <p>• Real-time analytics</p>
            <p>• Enhanced security protocols</p>
          </div>
          
          {/* Decorative elements */}
          <div className="mt-8 flex justify-center space-x-4">
            <div className="w-2 h-2 rounded-full bg-[#02b36d] desktop-only-pulse"></div>
            <div className="w-2 h-2 rounded-full bg-[#02b36d] desktop-only-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="w-2 h-2 rounded-full bg-[#02b36d] desktop-only-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
        </div>
      </div>
      
      {/* Bottom border with glow */}
      <div className="h-1 bg-gradient-to-r from-transparent via-[#02b36d] to-transparent opacity-60"></div>
      
      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#02b36d] opacity-70"></div>
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[#02b36d] opacity-70"></div>
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[#02b36d] opacity-70"></div>
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#02b36d] opacity-70"></div>
    </div>
  );
};

export default MobileLayout;