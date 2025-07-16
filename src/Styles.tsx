import React, { useState } from 'react';

// Tooltip Component with cyberpunk styling
export const WalletTooltip: React.FC<{ 
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}> = ({ 
  children, 
  content,
  position = 'top'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div className={`absolute z-50 ${positionClasses[position]}`}>
          <div className="bg-[#051014] cyberpunk-border text-[#02b36d] text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
            {content}
          </div>
        </div>
      )}
    </div>
  );
};

// Define the application styles that will be injected
export const initStyles = () => {
  return `
  /* Glassmorphism background */
  @keyframes subtle-float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
  }

  .glassmorphism-bg {
    background: linear-gradient(135deg, #0f1419 0%, #1a2332 50%, #0f1419 100%);
    position: relative;
    overflow: hidden;
  }

  .glassmorphism-bg::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 20% 80%, rgba(30, 58, 138, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
                radial-gradient(circle at 40% 40%, rgba(37, 99, 235, 0.05) 0%, transparent 50%);
    z-index: 0;
  }

  /* Glassmorphism border effect */
  @keyframes glass-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  .glassmorphism-border {
    background: rgba(30, 58, 138, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 12px;
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px rgba(30, 58, 138, 0.1);
    transition: all 0.3s ease;
  }

  .glassmorphism-border:hover {
    border-color: rgba(59, 130, 246, 0.4);
    box-shadow: 0 12px 40px rgba(30, 58, 138, 0.2);
  }

  /* Glassmorphism button animations */
  @keyframes glass-pulse {
    0% { box-shadow: 0 4px 20px rgba(59, 130, 246, 0.2); }
    50% { box-shadow: 0 8px 30px rgba(59, 130, 246, 0.4); }
    100% { box-shadow: 0 4px 20px rgba(59, 130, 246, 0.2); }
  }

  .glassmorphism-btn {
    background: rgba(30, 58, 138, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 10px;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .glassmorphism-btn:hover {
    background: rgba(30, 58, 138, 0.25);
    border-color: rgba(59, 130, 246, 0.5);
    transform: translateY(-2px);
    animation: glass-pulse 2s infinite;
  }

  .glassmorphism-btn::before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(59, 130, 246, 0.2),
      transparent
    );
    transition: left 0.5s ease;
  }

  .glassmorphism-btn:hover::before {
    left: 100%;
  }

  /* Glassmorphism text effect */
  @keyframes glass-glow {
    0%, 100% { text-shadow: 0 0 10px rgba(59, 130, 246, 0.3); }
    50% { text-shadow: 0 0 20px rgba(59, 130, 246, 0.6); }
  }

  .glassmorphism-text {
    position: relative;
    color: rgba(147, 197, 253, 0.9);
  }

  .glassmorphism-text:hover {
    animation: glass-glow 2s infinite;
  }

  /* Input focus effect */
  .glassmorphism-input {
    background: rgba(30, 58, 138, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 8px;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
  }

  .glassmorphism-input:focus {
    background: rgba(30, 58, 138, 0.15);
    border-color: rgba(59, 130, 246, 0.5);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 8px 25px rgba(30, 58, 138, 0.2);
    outline: none;
  }

  /* Card hover effect */
  .glassmorphism-card {
    background: rgba(30, 58, 138, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 16px;
    backdrop-filter: blur(15px);
    transition: all 0.3s ease;
    animation: subtle-float 6s ease-in-out infinite;
  }

  .glassmorphism-card:hover {
    background: rgba(30, 58, 138, 0.15);
    border-color: rgba(59, 130, 246, 0.4);
    transform: translateY(-5px);
    box-shadow: 0 20px 40px rgba(30, 58, 138, 0.2);
  }

  /* Glassmorphism shimmer effect */
  @keyframes glass-shimmer {
    0% { 
      transform: translateX(-100%);
      opacity: 0;
    }
    50% {
      opacity: 0.3;
    }
    100% { 
      transform: translateX(100%);
      opacity: 0;
    }
  }

  .glassmorphism-shimmer {
    position: relative;
    overflow: hidden;
  }

  .glassmorphism-shimmer::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
      transparent 0%,
      rgba(59, 130, 246, 0.1) 50%,
      transparent 100%);
    z-index: 1;
    animation: glass-shimmer 3s ease-in-out infinite;
  }

  /* Split gutter styling */
  .split-custom .gutter {
    background: rgba(30, 58, 138, 0.05);
    position: relative;
    transition: all 0.3s ease;
    backdrop-filter: blur(5px);
  }

  .split-custom .gutter-horizontal {
    cursor: col-resize;
  }

  .split-custom .gutter-horizontal:hover {
    background: rgba(30, 58, 138, 0.15);
  }

  .split-custom .gutter-horizontal::before,
  .split-custom .gutter-horizontal::after {
    content: "";
    position: absolute;
    width: 2px;
    height: 12px;
    background: rgba(59, 130, 246, 0.4);
    left: 50%;
    transform: translateX(-50%);
    transition: all 0.3s ease;
    border-radius: 1px;
  }

  .split-custom .gutter-horizontal::before {
    top: calc(50% - 8px);
  }

  .split-custom .gutter-horizontal::after {
    top: calc(50% + 8px);
  }

  .split-custom .gutter-horizontal:hover::before,
  .split-custom .gutter-horizontal:hover::after {
    background: rgba(59, 130, 246, 0.8);
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
  }

  /* Glassmorphism table styling */
  .glassmorphism-table {
    border-collapse: separate;
    border-spacing: 0;
    background: rgba(30, 58, 138, 0.05);
    border-radius: 12px;
    backdrop-filter: blur(10px);
    overflow: hidden;
  }

  .glassmorphism-table thead th {
    background: rgba(30, 58, 138, 0.15);
    border-bottom: 1px solid rgba(59, 130, 246, 0.3);
    backdrop-filter: blur(15px);
  }

  .glassmorphism-table tbody tr {
    transition: all 0.3s ease;
    border-bottom: 1px solid rgba(59, 130, 246, 0.1);
  }

  .glassmorphism-table tbody tr:hover {
    background: rgba(30, 58, 138, 0.1);
    backdrop-filter: blur(15px);
  }

  /* Glassmorphism text effect */
  .glass-text {
    color: rgba(147, 197, 253, 0.9);
    text-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
  }

  /* Glassmorphism notification animation */
  @keyframes glass-notification-slide {
    0% { transform: translateX(50px) scale(0.9); opacity: 0; }
    10% { transform: translateX(0) scale(1); opacity: 1; }
    90% { transform: translateX(0) scale(1); opacity: 1; }
    100% { transform: translateX(50px) scale(0.9); opacity: 0; }
  }

  .glass-notification-anim {
    animation: glass-notification-slide 4s forwards;
    background: rgba(30, 58, 138, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.3);
    backdrop-filter: blur(15px);
  }

  /* Glassmorphism loading animation */
  @keyframes glass-loading-pulse {
    0% { transform: scale(0.9); opacity: 0.6; }
    50% { transform: scale(1.05); opacity: 1; }
    100% { transform: scale(0.9); opacity: 0.6; }
  }

  .glass-loading-anim {
    animation: glass-loading-pulse 2s infinite;
    background: rgba(30, 58, 138, 0.1);
    backdrop-filter: blur(10px);
  }

  /* Button click effect */
  .glassmorphism-btn:active {
    transform: scale(0.95) translateY(-2px);
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
  }

  /* Menu active state */
  .glass-menu-item-active {
    border-left: 3px solid rgba(59, 130, 246, 0.8);
    background: rgba(30, 58, 138, 0.15);
    backdrop-filter: blur(10px);
  }

  /* Glassmorphism accent elements */
  .glass-accent {
    position: relative;
    display: inline-block;
  }

  .glass-accent::before,
  .glass-accent::after {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(59, 130, 246, 0.7);
    font-weight: bold;
    text-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
  }

  .glass-accent::before {
    content: "◆";
    left: -20px;
  }

  .glass-accent::after {
    content: "◆";
    right: -20px;
  }

  /* Fade-in animation */
  @keyframes fadeIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  `;
};