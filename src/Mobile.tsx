import React, { useEffect } from 'react';
import { Wallet, LineChart, Cog, LucideIcon } from 'lucide-react';

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

const MobileLayout: React.FC<MobileLayoutProps> = ({ 
  currentPage, 
  setCurrentPage,
  children: {
    WalletsPage,
    ChartPage,
    ActionsPage
  }
}) => {
  useEffect(() => {
    // Set viewport meta tag for mobile optimization
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }

    // Add touch handling styles
    const touchStyle = document.createElement('style');
    touchStyle.textContent = `
      * {
        touch-action: pan-x pan-y;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }
      input, textarea {
        touch-action: auto;
        user-select: text;
        -webkit-user-select: text;
      }
    `;
    document.head.appendChild(touchStyle);

    // Add cyberpunk-specific styles
    const cyberpunkStyle = document.createElement('style');
    cyberpunkStyle.textContent = `
      @keyframes mobile-nav-pulse {
        0% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5), 0 0 10px rgba(59, 130, 246, 0.2); }
        50% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.8), 0 0 15px rgba(59, 130, 246, 0.4); }
        100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5), 0 0 10px rgba(59, 130, 246, 0.2); }
      }
      
      @keyframes mobile-nav-scan {
        0% { transform: translateY(-100%); opacity: 0.3; }
        100% { transform: translateY(100%); opacity: 0; }
      }
      
      @keyframes mobile-nav-glow {
        0% { text-shadow: 0 0 4px rgba(59, 130, 246, 0.7); }
        50% { text-shadow: 0 0 8px rgba(59, 130, 246, 0.9), 0 0 12px rgba(59, 130, 246, 0.5); }
        100% { text-shadow: 0 0 4px rgba(59, 130, 246, 0.7); }
      }
      
      @keyframes mobile-nav-active {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      
      .mobile-nav-active {
        position: relative;
        background: linear-gradient(45deg, #050a0e, #091217, #0a1419);
        background-size: 200% 200%;
        animation: mobile-nav-active 8s ease infinite;
        border: 1px solid rgba(59, 130, 246, 0.3);
      }
      
      .mobile-nav-active::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: 0.5rem;
        padding: 1px;
        background: linear-gradient(45deg, rgba(59, 130, 246, 0.6), rgba(147, 197, 253, 0.3), rgba(59, 130, 246, 0.6));
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        background-size: 200% 200%;
        animation: mobile-nav-active 4s linear infinite;
        pointer-events: none;
      }
      
      .mobile-nav-scan::before {
        content: "";
        position: absolute;
        width: 100%;
        height: 4px;
        background: linear-gradient(to bottom, 
            transparent 0%,
            rgba(59, 130, 246, 0.2) 50%,
            transparent 100%);
        z-index: 10;
        animation: mobile-nav-scan 8s linear infinite;
        pointer-events: none;
      }
      
      .mobile-nav-button:active {
        transform: scale(0.95);
      }
      
      .mobile-nav-icon-active {
        animation: mobile-nav-glow 2s infinite;
      }
      
      .mobile-nav-label-active {
        animation: mobile-nav-glow 2s infinite;
      }
      
      .mobile-nav-grid {
        background-image: linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), 
                         linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px);
        background-size: 20px 20px;
        background-position: center center;
        opacity: 0.1;
      }
    `;
    document.head.appendChild(cyberpunkStyle);

    return () => {
      // Clean up on unmount
      if (viewportMeta) {
        viewportMeta.setAttribute(
          'content',
          'width=device-width, initial-scale=1.0'
        );
      }
      document.head.removeChild(touchStyle);
      document.head.removeChild(cyberpunkStyle);
    };
  }, []);

  const navItems: NavItem[] = [
    { id: 'wallets', label: 'WALLETS', Icon: Wallet, component: WalletsPage },
    { id: 'chart', label: 'CHARTS', Icon: LineChart, component: ChartPage },
    { id: 'actions', label: 'SYSTEM', Icon: Cog, component: ActionsPage }
  ];

  return (
    <div className="md:hidden flex flex-col h-[100dvh] max-h-[100dvh] select-none bg-slate-900/90 backdrop-blur-md" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Main content area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Grid background */}
        <div className="absolute inset-0 mobile-nav-grid"></div>
        
        {/* Content container */}
        <div className="absolute inset-0">
          <div className="h-full overflow-y-auto overscroll-contain pb-16 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
            {navItems.map(({ id, component }) => (
              currentPage === id && (
                <div 
                  key={id}
                  className="min-h-full w-full"
                >
                  {component}
                </div>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-t border-blue-500/40 z-50 glass-shimmer" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Ambient glow from below */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-1 opacity-60"
          style={{
            background: 'linear-gradient(to top, rgba(59, 130, 246, 0.5), transparent 100%)',
          }}
        ></div>
        
        {/* Nav items */}
        <div className="flex justify-around items-center h-16 px-4 max-w-md mx-auto" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}>
          {navItems.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setCurrentPage(id)}
              className={`
                flex flex-col items-center justify-center py-1 px-3
                rounded-lg transition-all duration-300 mobile-nav-button
                ${currentPage === id ? 'glassmorphism-btn' : 'hover:bg-slate-800/60 active:bg-slate-700/60'}
              `}
            >
              <Icon 
                size={20} 
                className={`transition-colors duration-300 ${
                  currentPage === id 
                    ? 'text-blue-400 mobile-nav-icon-active' 
                    : 'text-blue-200/50'
                }`} 
              />
              <span 
                className={`text-xs mt-1 transition-colors duration-300 font-mono tracking-wider ${
                  currentPage === id 
                    ? 'text-blue-400 mobile-nav-label-active' 
                    : 'text-blue-200/50'
                }`}
              >
                {label}
              </span>
              
              {/* Indicator dot for active tab */}
              {currentPage === id && (
                <div className="absolute -top-1 w-1 h-1 rounded-full bg-blue-400"></div>
              )}
            </button>
          ))}
        </div>
        
        {/* Decorative corner elements */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-blue-500 opacity-70"></div>
                <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-blue-500 opacity-70"></div>
      </nav>
    </div>
  );
};

export default MobileLayout;