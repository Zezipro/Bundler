import React, { useEffect, useState } from 'react';
import { 
  Download, 
  Settings2,
  ChevronDown, 
  Share2,
  Waypoints,
  Blocks,
  Trash2,
  ChartSpline,
  Send,
  Workflow,
  Sparkles
} from 'lucide-react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { WalletType, loadConfigFromCookies } from "./Utils";
import { useToast } from "./Notifications";
import { countActiveWallets, validateActiveWallets, getScriptName, maxWalletsConfig } from './Wallets';
import TradingCard from './TradingForm';

import { executePumpSell, validatePumpSellInputs } from './utils/pumpsell';
import { executePumpBuy, validatePumpBuyInputs } from './utils/pumpbuy';
import { executeBoopSell, validateBoopSellInputs } from './utils/boopsell';
import { executeBoopBuy, validateBoopBuyInputs } from './utils/boopbuy';

// Enhanced glassmorphism-styled Switch component (simplified)
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={`
      peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full
      border-2 border-blue-500/40 transition-colors duration-300
      focus-visible:outline-none focus-visible:ring-2
      focus-visible:ring-blue-500 focus-visible:ring-offset-2
      focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed
      disabled:opacity-50 data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-slate-800
      relative overflow-hidden ${className}`}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb
      className={`
        pointer-events-none block h-5 w-5 rounded-full
        bg-white shadow-lg ring-0 transition-transform
        data-[state=checked]:translate-x-5 data-[state=checked]:bg-blue-100
        data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-slate-300`}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = 'Switch';

interface ActionsPageProps {
  tokenAddress: string;
  transactionFee: string;
  handleRefresh: () => void;
  wallets: WalletType[];
  solBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
  currentMarketCap: number | null;
  setBurnModalOpen: (open: boolean) => void;
  setCalculatePNLModalOpen: (open: boolean) => void;
  setDeployModalOpen: (open: boolean) => void;
  setCleanerTokensModalOpen: (open: boolean) => void;
  setCustomBuyModalOpen: (open: boolean) => void;
  onOpenFloating: () => void;
  isFloatingCardOpen: boolean;
}

// Simplified Tooltip component without animations
export const Tooltip = ({ 
  children, 
  content,
  position = 'top'
}: { 
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
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
          <div className="bg-slate-900/90 backdrop-blur-sm border border-blue-500/40 text-blue-400 text-xs px-2 py-1 rounded 
                         shadow-lg shadow-blue-500/20 whitespace-nowrap font-mono tracking-wide">
            {content}
          </div>
        </div>
      )}
    </div>
  );
};

export const ActionsPage: React.FC<ActionsPageProps> = ({ 
  tokenAddress, 
  transactionFee, 
  handleRefresh, 
  wallets, 
  solBalances, 
  tokenBalances, 
  currentMarketCap,
  setBurnModalOpen,
  setCalculatePNLModalOpen,
  setDeployModalOpen,
  setCleanerTokensModalOpen,
  setCustomBuyModalOpen,
  onOpenFloating,
  isFloatingCardOpen
}) => {
  // State management (no changes)
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [selectedDex, setSelectedDex] = useState('auto'); // Default to auto
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenPrice, setTokenPrice] = useState<string | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const { showToast } = useToast();


  const dexOptions = [
    { value: 'auto', label: '⭐ Auto', icon: '⭐' },
    { value: 'pumpfun', label: 'PumpFun' },
    { value: 'moonshot', label: 'Moonshot' },
    { value: 'pumpswap', label: 'PumpSwap' },
    { value: 'raydium', label: 'Raydium' },
    { value: 'launchpad', label: 'Launchpad' },
    { value: 'boopfun', label: 'BoopFun' },
  ];
  
  const handleTradeSubmit = async (wallets: WalletType[], isBuyMode: boolean, dex?: string, buyAmount?: string, sellAmount?: string) => {
    setIsLoading(true);
    
    if (!tokenAddress) {
      showToast("Please select a token first", "error");
      setIsLoading(false);
      return;
    }
    
    // Use the provided dex parameter if available, otherwise use selectedDex
    const dexToUse = dex || selectedDex;
    
    // Use the determined DEX
    await originalHandleTradeSubmit(dexToUse, wallets, isBuyMode, buyAmount, sellAmount);
  };

  // Original trade submit function that accepts selectedDex as a parameter
  const originalHandleTradeSubmit = async (dex: string, wallets: WalletType[], isBuyMode: boolean, buyAmountParam?: string, sellAmountParam?: string) => {
    // Replace the moonshot branch in handleTradeSubmit with this implementation
    if (dex === 'moonshot') {
      try {
        // Get active wallets
        const activeWallets = wallets.filter(wallet => wallet.isActive);
        
        if (activeWallets.length === 0) {
          showToast("Please activate at least one wallet", "error");
          setIsLoading(false);
          return;
        }
        
        // Format wallets for MoonBuy/MoonSell
        const formattedWallets = activeWallets.map(wallet => ({
          address: wallet.address,
          privateKey: wallet.privateKey
        }));
        
        if (isBuyMode) {
          // MoonBuy flow - implementation unchanged
          const tokenConfig = {
            tokenAddress: tokenAddress,
            solAmount: parseFloat(buyAmountParam || buyAmount)
          };
          
          // Create a balance map for validation
          const walletBalances = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = solBalances.get(wallet.address) || 0;
            walletBalances.set(wallet.address, balance);
          });
          
          // Import and validate inputs before executing
          const { validateMoonBuyInputs, executeMoonBuy } = await import('./utils/moonbuy');
          
          const validation = validateMoonBuyInputs(formattedWallets, tokenConfig, walletBalances);
          if (!validation.valid) {
            showToast(`Validation failed: ${validation.error}`, "error");
            setIsLoading(false);
            return;
          }
          
          console.log(`Executing MoonBuy for ${tokenAddress} with ${activeWallets.length} wallets`);
          
          // Execute MoonBuy operation
          const result = await executeMoonBuy(formattedWallets, tokenConfig);
          
          if (result.success) {
            showToast("MoonBuy transactions submitted successfully", "success");
            handleRefresh(); // Refresh balances
          } else {
            showToast(`MoonBuy failed: ${result.error}`, "error");
          }
        } else {
          // MoonSell flow - implementation unchanged
          const tokenConfig = {
            tokenAddress: tokenAddress,
            sellPercent: parseFloat(sellAmountParam || sellAmount)
          };
          
          // Import and execute MoonSell
          const { executeMoonSell } = await import('./utils/moonsell');
          
          console.log(`Executing MoonSell for ${tokenAddress} with ${activeWallets.length} wallets`);
          
          // Execute MoonSell operation
          const result = await executeMoonSell(formattedWallets, tokenConfig);
          
          if (result.success) {
            showToast("MoonSell transactions submitted successfully", "success");
            handleRefresh(); // Refresh balances
          } else {
            showToast(`MoonSell failed: ${result.error}`, "error");
          }
        }
      } catch (error) {
        console.error(`Moonshot ${isBuyMode ? 'Buy' : 'Sell'} error:`, error);
        showToast(`Error: ${error.message}`, "error");
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Special handling for boopFun operations with client-side transaction signing
    if (dex === 'boopfun') {
      try {
        // Get active wallets
        const activeWallets = wallets.filter(wallet => wallet.isActive);
        
        if (activeWallets.length === 0) {
          showToast("Please activate at least one wallet", "error");
          setIsLoading(false);
          return;
        }
        
        // Format wallets for BoopBuy/BoopSell
        const formattedWallets = activeWallets.map(wallet => ({
          address: wallet.address,
          privateKey: wallet.privateKey
        }));
        
        if (isBuyMode) {
          // BoopBuy flow 
          const tokenConfig = {
            tokenAddress: tokenAddress,
            solAmount: parseFloat(buyAmountParam || buyAmount)
          };
          
          // Create a balance map for validation
          const walletBalances = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = solBalances.get(wallet.address) || 0;
            walletBalances.set(wallet.address, balance);
          });
          
          // Validate inputs before executing
          const validation = validateBoopBuyInputs(formattedWallets, tokenConfig, walletBalances);
          if (!validation.valid) {
            showToast(`Validation failed: ${validation.error}`, "error");
            setIsLoading(false);
            return;
          }
          
          console.log(`Executing BoopBuy for ${tokenAddress} with ${activeWallets.length} wallets`);
          
          // Execute BoopBuy operation
          const result = await executeBoopBuy(formattedWallets, tokenConfig);
          
          if (result.success) {
            showToast("BoopBuy transactions submitted successfully", "success");
            handleRefresh(); // Refresh balances
          } else {
            showToast(`BoopBuy failed: ${result.error}`, "error");
          }
        } else {
          // BoopSell flow
          const tokenConfig = {
            tokenAddress: tokenAddress,
            sellPercent: parseFloat(sellAmountParam || sellAmount)
          };
          
          // Import and execute BoopSell
          const { executeBoopSell } = await import('./utils/boopsell');
          
          console.log(`Executing BoopSell for ${tokenAddress} with ${activeWallets.length} wallets`);
          
          // Execute BoopSell operation
          const result = await executeBoopSell(formattedWallets, tokenConfig);
          
          if (result.success) {
            showToast("BoopSell transactions submitted successfully", "success");
            handleRefresh(); // Refresh balances
          } else {
            showToast(`BoopSell failed: ${result.error}`, "error");
          }
        }
      } catch (error) {
        console.error(`Boop${isBuyMode ? 'Buy' : 'Sell'} error:`, error);
        showToast(`Error: ${error.message}`, "error");
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Special handling for PumpFun operations with client-side transaction signing
    if (dex === 'pumpfun') {
      try {
        // Get active wallets
        const activeWallets = wallets.filter(wallet => wallet.isActive);
        
        if (activeWallets.length === 0) {
          showToast("Please activate at least one wallet", "error");
          setIsLoading(false);
          return;
        }
        
        // Format wallets for PumpBuy/PumpSell
        const formattedWallets = activeWallets.map(wallet => ({
          address: wallet.address,
          privateKey: wallet.privateKey
        }));
        
        if (isBuyMode) {
          // PumpBuy flow 
          const tokenConfig = {
            tokenAddress: tokenAddress,
            solAmount: parseFloat(buyAmountParam || buyAmount)
          };
          
          // Create a balance map for validation
          const walletBalances = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = solBalances.get(wallet.address) || 0;
            walletBalances.set(wallet.address, balance);
          });
          
          // Validate inputs before executing
          const validation = validatePumpBuyInputs(formattedWallets, tokenConfig, walletBalances);
          if (!validation.valid) {
            showToast(`Validation failed: ${validation.error}`, "error");
            setIsLoading(false);
            return;
          }
          
          console.log(`Executing PumpBuy for ${tokenAddress} with ${activeWallets.length} wallets`);
          
          // Execute PumpBuy operation
          const result = await executePumpBuy(formattedWallets, tokenConfig);
          
          if (result.success) {
            showToast("PumpBuy transactions submitted successfully", "success");
            handleRefresh(); // Refresh balances
          } else {
            showToast(`PumpBuy failed: ${result.error}`, "error");
          }
        } else {
          // PumpSell flow
          const tokenConfig = {
            tokenAddress: tokenAddress,
            sellPercent: parseFloat(sellAmountParam || sellAmount)
          };
          
          // Create a token balance map for validation
          const tokenBalanceMap = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = tokenBalances.get(wallet.address) || 0;
            tokenBalanceMap.set(wallet.address, balance);
          });
          
          // Validate inputs before executing
          const validation = validatePumpSellInputs(formattedWallets, tokenConfig, tokenBalanceMap);
          if (!validation.valid) {
            showToast(`Validation failed: ${validation.error}`, "error");
            setIsLoading(false);
            return;
          }
          
          console.log(`Executing PumpSell for ${tokenAddress} with ${activeWallets.length} wallets`);
          
          // Execute PumpSell operation
          const result = await executePumpSell(formattedWallets, tokenConfig);
          
          if (result.success) {
            showToast("PumpSell transactions submitted successfully", "success");
            handleRefresh(); // Refresh balances
          } else {
            showToast(`PumpSell failed: ${result.error}`, "error");
          }
        }
      } catch (error) {
        console.error(`Pump${isBuyMode ? 'Buy' : 'Sell'} error:`, error);
        showToast(`Error: ${error.message}`, "error");
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Special handling for Auto operations with client-side transaction signing
    if (dex === 'auto') {
      try {
        // Get active wallets
        const activeWallets = wallets.filter(wallet => wallet.isActive);
        
        if (activeWallets.length === 0) {
          showToast("Please activate at least one wallet", "error");
          setIsLoading(false);
          return;
        }
        
        // Format wallets for Auto operations
        const formattedWallets = activeWallets.map(wallet => ({
          address: wallet.address,
          privateKey: wallet.privateKey
        }));
        
        if (isBuyMode) {
          // Auto Buy flow
          const swapConfig = {
            inputMint: "So11111111111111111111111111111111111111112", // SOL
            outputMint: tokenAddress,
            solAmount: parseFloat(buyAmountParam || buyAmount),
            slippageBps: 9900 // Default to 1% slippage
          };
          
          // Create a balance map for validation
          const walletBalances = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = solBalances.get(wallet.address) || 0;
            walletBalances.set(wallet.address, balance);
          });
          
          // Import and validate inputs before executing
          const { validateJupSwapInputs, executeJupSwap } = await import('./utils/jupbuy');
          
          const validation = validateJupSwapInputs(formattedWallets, swapConfig, walletBalances);
          if (!validation.valid) {
            showToast(`Validation failed: ${validation.error}`, "error");
            setIsLoading(false);
            return;
          }
          
          console.log(`Executing Auto Swap (Buy) for ${tokenAddress} with ${activeWallets.length} wallets`);
          
          // Execute JupSwap operation
          const result = await executeJupSwap(formattedWallets, swapConfig);
          
          if (result.success) {
            showToast("Auto Buy transactions submitted successfully", "success");
            handleRefresh(); // Refresh balances
          } else {
            showToast(`Auto Buy failed: ${result.error}`, "error");
          }
        } else {
          // Auto Sell flow
          const sellConfig = {
            inputMint: tokenAddress, // Token to sell
            outputMint: "So11111111111111111111111111111111111111112", // SOL
            sellPercent: parseFloat(sellAmountParam || sellAmount), // Percentage of tokens to sell
            slippageBps: 9900 // Default to 1% slippage
          };
          
          // Create a token balance map for validation
          const tokenBalanceMap = new Map<string, bigint>();
          activeWallets.forEach(wallet => {
            // Convert to bigint for compatibility with selljup validation
            const balance = BigInt(Math.floor((tokenBalances.get(wallet.address) || 0)));
            tokenBalanceMap.set(wallet.address, balance);
          });
          
          // Import the dedicated sell functions from selljup
          const { validateJupSellInputs, executeJupSell } = await import('./utils/jupsell');
          
          console.log(`Executing Auto Sell for ${tokenAddress} with ${activeWallets.length} wallets (${sellConfig.sellPercent}%)`);
          
          // Execute JupSell operation with RPC URL
          const result = await executeJupSell(formattedWallets, sellConfig);
          
          if (result.success) {
            showToast("Auto Sell transactions submitted successfully", "success");
            handleRefresh(); // Refresh balances
          } else {
            showToast(`Auto Sell failed: ${result.error}`, "error");
          }
        }
      } catch (error) {
        console.error(`Auto ${isBuyMode ? 'Buy' : 'Sell'} error:`, error);
        showToast(`Error: ${error.message}`, "error");
      } finally {
        setIsLoading(false);
      }
      return;
    }
  
    // Replace the raydium branch in handleTradeSubmit with this implementation
    if (dex === 'raydium') {
      try {
        // Get active wallets
        const activeWallets = wallets.filter(wallet => wallet.isActive);
        
        if (activeWallets.length === 0) {
          showToast("Please activate at least one wallet", "error");
          setIsLoading(false);
          return;
        }
        
        // Format wallets for RayBuy/Ray
        const formattedWallets = activeWallets.map(wallet => ({
          address: wallet.address,
          privateKey: wallet.privateKey
        }));
        
        if (isBuyMode) {
          // Ray flow
          const tokenConfig = {
            tokenAddress: tokenAddress,
            solAmount: parseFloat(buyAmountParam || buyAmount)
          };
          
          // Create a balance map for validation
          const walletBalances = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = solBalances.get(wallet.address) || 0;
            walletBalances.set(wallet.address, balance);
          });
          
          // Import and validate inputs before executing
          const { validateRayBuyInputs, executeRayBuy } = await import('./utils/raybuy');
          
          const validation = validateRayBuyInputs(formattedWallets, tokenConfig, walletBalances);
          if (!validation.valid) {
            showToast(`Validation failed: ${validation.error}`, "error");
            setIsLoading(false);
            return;
          }
          
          console.log(`Executing RayBuy for ${tokenAddress} with ${activeWallets.length} wallets`);
          
          // Execute MoonBuy operation
          const result = await executeRayBuy(formattedWallets, tokenConfig);
          
          if (result.success) {
            showToast("RayBuy transactions submitted successfully", "success");
            handleRefresh(); // Refresh balances
          } else {
            showToast(`RayBuy failed: ${result.error}`, "error");
          }
        } else {
          // RaySell flow
          const tokenConfig = {
            tokenAddress: tokenAddress,
            sellPercent: parseFloat(sellAmountParam || sellAmount)
          };
          
          // Create a token balance map for validation
          const tokenBalanceMap = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = tokenBalances.get(wallet.address) || 0;
            tokenBalanceMap.set(wallet.address, balance);
          });
          
          // Import and validate inputs before executing
          const { validateRaySellInputs, executeRaySell } = await import('./utils/raysell');
          
          const validation = validateRaySellInputs(formattedWallets, tokenConfig, tokenBalanceMap);
          if (!validation.valid) {
            showToast(`Validation failed: ${validation.error}`, "error");
            setIsLoading(false);
            return;
          }
          
          console.log(`Executing RaySell for ${tokenAddress} with ${activeWallets.length} wallets`);
          
          // Execute RaySell operation
          const result = await executeRaySell(formattedWallets, tokenConfig);
          
          if (result.success) {
            showToast("RaySell transactions submitted successfully", "success");
            handleRefresh(); // Refresh balances
          } else {
            showToast(`RaySell failed: ${result.error}`, "error");
          }
        }
      } catch (error) {
        console.error(`Moonshot ${isBuyMode ? 'Buy' : 'Sell'} error:`, error);
        showToast(`Error: ${error.message}`, "error");
      } finally {
        setIsLoading(false);
      }
      return;
    }
    // Replace the raydium branch in handleTradeSubmit with this implementation
    if (dex === 'launchpad') {
      try {
        // Get active wallets
        const activeWallets = wallets.filter(wallet => wallet.isActive);
        
        if (activeWallets.length === 0) {
          showToast("Please activate at least one wallet", "error");
          setIsLoading(false);
          return;
        }
        
        // Format wallets for RayBuy/Ray
        const formattedWallets = activeWallets.map(wallet => ({
          address: wallet.address,
          privateKey: wallet.privateKey
        }));
        
        if (isBuyMode) {
          // Ray flow
          const tokenConfig = {
            tokenAddress: tokenAddress,
            solAmount: parseFloat(buyAmountParam || buyAmount)
          };
          
          // Create a balance map for validation
          const walletBalances = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = solBalances.get(wallet.address) || 0;
            walletBalances.set(wallet.address, balance);
          });
          
          // Import and validate inputs before executing
          const { validateLaunchBuyInputs, executeLaunchBuy } = await import('./utils/launchbuy');
          
          const validation = validateLaunchBuyInputs(formattedWallets, tokenConfig, walletBalances);
          if (!validation.valid) {
            showToast(`Validation failed: ${validation.error}`, "error");
            setIsLoading(false);
            return;
          }
          
          console.log(`Executing RayBuy for ${tokenAddress} with ${activeWallets.length} wallets`);
          
          // Execute MoonBuy operation
          const result = await executeLaunchBuy(formattedWallets, tokenConfig);
          
          if (result.success) {
            showToast("RayBuy transactions submitted successfully", "success");
            handleRefresh(); // Refresh balances
          } else {
            showToast(`RayBuy failed: ${result.error}`, "error");
          }
        } else {
          // RaySell flow
          const tokenConfig = {
            tokenAddress: tokenAddress,
            sellPercent: parseFloat(sellAmountParam || sellAmount)
          };
          
          // Create a token balance map for validation
          const tokenBalanceMap = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = tokenBalances.get(wallet.address) || 0;
            tokenBalanceMap.set(wallet.address, balance);
          });
          
          // Import and validate inputs before executing
          const { validateLaunchSellInputs, executeLaunchSell } = await import('./utils/launchsell');
          
          const validation = validateLaunchSellInputs(formattedWallets, tokenConfig, tokenBalanceMap);
          if (!validation.valid) {
            showToast(`Validation failed: ${validation.error}`, "error");
            setIsLoading(false);
            return;
          }
          
          console.log(`Executing RaySell for ${tokenAddress} with ${activeWallets.length} wallets`);
          
          // Execute RaySell operation
          const result = await executeLaunchSell(formattedWallets, tokenConfig);
          
          if (result.success) {
            showToast("RaySell transactions submitted successfully", "success");
            handleRefresh(); // Refresh balances
          } else {
            showToast(`RaySell failed: ${result.error}`, "error");
          }
        }
      } catch (error) {
        console.error(`Moonshot ${isBuyMode ? 'Buy' : 'Sell'} error:`, error);
        showToast(`Error: ${error.message}`, "error");
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Replace the pumpswap branch in handleTradeSubmit with this implementation
    if (dex === 'pumpswap') {
      try {
        // Get active wallets
        const activeWallets = wallets.filter(wallet => wallet.isActive);
        
        if (activeWallets.length === 0) {
          showToast("Please activate at least one wallet", "error");
          setIsLoading(false);
          return;
        }
        
        // Format wallets for MoonBuy/MoonSell
        const formattedWallets = activeWallets.map(wallet => ({
          address: wallet.address,
          privateKey: wallet.privateKey
        }));
        
        if (isBuyMode) {
          // MoonBuy flow
          const tokenConfig = {
            tokenAddress: tokenAddress,
            solAmount: parseFloat(buyAmountParam || buyAmount)
          };
          
          // Create a balance map for validation
          const walletBalances = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = solBalances.get(wallet.address) || 0;
            walletBalances.set(wallet.address, balance);
          });
          
          // Import and validate inputs before executing
          const { validateSwapBuyInputs, executeSwapBuy } = await import('./utils/swapbuy');
          
          const validation = validateSwapBuyInputs(formattedWallets, tokenConfig, walletBalances);
          if (!validation.valid) {
            showToast(`Validation failed: ${validation.error}`, "error");
            setIsLoading(false);
            return;
          }
          
          console.log(`Executing Swap for ${tokenAddress} with ${activeWallets.length} wallets`);
          
          // Execute Swap operation
          const result = await executeSwapBuy(formattedWallets, tokenConfig);
          
          if (result.success) {
            showToast("Swap transactions submitted successfully", "success");
            handleRefresh(); // Refresh balances
          } else {
            showToast(`MoonBuy failed: ${result.error}`, "error");
          }
        } else {
          // MoonSell flow
          const tokenConfig = {
            tokenAddress: tokenAddress,
            sellPercent: parseFloat(sellAmountParam || sellAmount)
          };
          
          // Create a token balance map for validation
          const tokenBalanceMap = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = tokenBalances.get(wallet.address) || 0;
            tokenBalanceMap.set(wallet.address, balance);
          });
          
          // Import and validate inputs before executing
          const { validateSwapSellInputs, executeSwapSell } = await import('./utils/swapsell');
          
          const validation = validateSwapSellInputs(formattedWallets, tokenConfig, tokenBalanceMap);
          if (!validation.valid) {
            showToast(`Validation failed: ${validation.error}`, "error");
            setIsLoading(false);
            return;
          }
          
          console.log(`Executing MoonSell for ${tokenAddress} with ${activeWallets.length} wallets`);
          
          // Execute MoonSell operation
          const result = await executeSwapSell(formattedWallets, tokenConfig);
          
          if (result.success) {
            showToast("MoonSell transactions submitted successfully", "success");
            handleRefresh(); // Refresh balances
          } else {
            showToast(`MoonSell failed: ${result.error}`, "error");
          }
        }
      } catch (error) {
        console.error(`Moonshot ${isBuyMode ? 'Buy' : 'Sell'} error:`, error);
        showToast(`Error: ${error.message}`, "error");
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    setIsLoading(false);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-transparent p-4 md:p-6 relative">
      {/* Background effects removed for transparency */}
      
      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        {/* Trading Card (unchanged) */}
        <TradingCard
          tokenAddress={tokenAddress}
          wallets={wallets}
          selectedDex={selectedDex}
          setSelectedDex={setSelectedDex}
          isDropdownOpen={isDropdownOpen}
          setIsDropdownOpen={setIsDropdownOpen}
          buyAmount={buyAmount}
          setBuyAmount={setBuyAmount}
          sellAmount={sellAmount}
          setSellAmount={setSellAmount}
          handleTradeSubmit={handleTradeSubmit}
          isLoading={isLoading}
          dexOptions={dexOptions}
          validateActiveWallets={validateActiveWallets}
          getScriptName={getScriptName}
          countActiveWallets={countActiveWallets}
          maxWalletsConfig={maxWalletsConfig}
          currentMarketCap={currentMarketCap}
          tokenBalances={tokenBalances}
          onOpenFloating={onOpenFloating}
          isFloatingCardOpen={isFloatingCardOpen}
        />
        
        {/* Token Operations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-lg">
                <Settings2 size={16} className="text-blue-400" />
              </div>
              <span className="font-mono text-sm tracking-wider text-slate-300 uppercase">Operations</span>
            </div>
            
            {/* PNL Button moved to Token Operations row - HIDDEN FOR FUTURE USE */}
            <button
              onClick={() => {
                if (!tokenAddress) {
                  showToast("Please select a token first", "error");
                  return;
                }
                setCalculatePNLModalOpen(true);
              }}
              className="hidden flex items-center gap-2 px-3 py-2 rounded-lg
                        bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700
                        shadow-md shadow-blue-500/40 hover:shadow-blue-500/60
                        transition-all duration-300 relative overflow-hidden"
            >
              <ChartSpline size={16} className="text-white relative z-10" />
              <span className="text-sm font-mono tracking-wider text-white font-medium relative z-10">Share PNL</span>
            </button>
          </div>
          
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-blue-500/20 relative overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
              {/* Cleaner Button */}
              <button
                onClick={() => {
                  if (!tokenAddress) {
                    showToast("Please select a token first", "error");
                    return;
                  }
                  setCleanerTokensModalOpen(true);
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-lg
                          bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-blue-500/30 hover:border-blue-500/60
                          transition-all duration-300"
              >
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-lg">
                  <Waypoints size={20} className="text-blue-400" />
                </div>
                <span className="text-xs font-mono tracking-wider text-slate-300 uppercase">Cleaner</span>
              </button>
              
              {/* Deploy Button */}
              <button
                onClick={() => setDeployModalOpen(true)}
                className="flex flex-col items-center gap-2 p-3 rounded-lg
                          bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-blue-500/30 hover:border-blue-500/60
                          transition-all duration-300"
              >
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-lg">
                  <Blocks size={20} className="text-blue-400" />
                </div>
                <span className="text-xs font-mono tracking-wider text-slate-300 uppercase">Deploy</span>
              </button>
              
              {/* Burn Button */}
              <button
                onClick={() => {
                  if (!tokenAddress) {
                    showToast("Please select a token first", "error");
                    return;
                  }
                  setBurnModalOpen(true);
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-lg
                          bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-blue-500/30 hover:border-blue-500/60
                          transition-all duration-300"
              >
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-lg">
                  <Trash2 size={20} className="text-blue-400" />
                </div>
                <span className="text-xs font-mono tracking-wider text-slate-300 uppercase">Burn</span>
              </button>
              
              {/* Stagger Button */}
              <button
                onClick={() => {
                  if (!tokenAddress) {
                    showToast("Please select a token first", "error");
                    return;
                  }
                  setCustomBuyModalOpen(true);
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-lg
                          bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-blue-500/30 hover:border-blue-500/60
                          transition-all duration-300"
              >
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-lg">
                  <Workflow size={20} className="text-blue-400" />
                </div>
                <span className="text-xs font-mono tracking-wider text-slate-300 uppercase">Stagger</span>
              </button>
            </div>
          </div>
        </div>
      </div>


      
    </div>
  );
};