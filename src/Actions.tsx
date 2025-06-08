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

// Enhanced cyberpunk-styled Switch component (simplified)
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={`
      peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full
      border-2 border-[#02b36d40] transition-colors duration-300
      focus-visible:outline-none focus-visible:ring-2
      focus-visible:ring-[#02b36d] focus-visible:ring-offset-2
      focus-visible:ring-offset-[#050a0e] disabled:cursor-not-allowed
      disabled:opacity-50 data-[state=checked]:bg-[#02b36d] data-[state=unchecked]:bg-[#0a1419]
      relative overflow-hidden ${className}`}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb
      className={`
        pointer-events-none block h-5 w-5 rounded-full
        bg-white shadow-lg ring-0 transition-transform
        data-[state=checked]:translate-x-5 data-[state=checked]:bg-[#e4fbf2]
        data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-[#7ddfbd]`}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = 'Switch';

interface ActionsPageProps {
  tokenAddress: string;
  transactionFee: string;
  ammKey: string | null;
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
          <div className="bg-[#051014] border border-[#02b36d40] text-[#02b36d] text-xs px-2 py-1 rounded 
                         shadow-lg shadow-[#02b36d20] whitespace-nowrap font-mono tracking-wide">
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
  ammKey,
  solBalances,
  tokenBalances,
  currentMarketCap,
  setBurnModalOpen,
  setCalculatePNLModalOpen,
  setDeployModalOpen,
  setCleanerTokensModalOpen,
  setCustomBuyModalOpen
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

  // Token price fetching effect (unchanged)
  useEffect(() => {
    const fetchTokenPrice = async () => {
      if (!tokenAddress) {
        setTokenPrice(null);
        return;
      }
      
      try {
        setPriceLoading(true);
        const response = await fetch(`https://api.jup.ag/price/v2?ids=${tokenAddress}`);
        const data = await response.json();
        setTokenPrice(data.data[tokenAddress]?.price || null);
      } catch (error) {
        setTokenPrice("0");
      } finally {
        setPriceLoading(false);
      }
    };
  
    fetchTokenPrice();
  }, [tokenAddress, showToast]);

  const dexOptions = [
    { value: 'auto', label: 'Auto Route' },
    { value: 'pumpfun', label: 'PumpFun' },
    { value: 'moonshot', label: 'Moonshot' },
    { value: 'pumpswap', label: 'PumpSwap' },
    { value: 'raydium', label: 'Raydium' },
    { value: 'jupiter', label: 'Jupiter' },
    { value: 'launchpad', label: 'Launchpad' },
    { value: 'boopfun', label: 'BoopFun' },
  ];
  
  const handleTradeSubmit = async (wallets: WalletType[], isBuyMode: boolean) => {
    setIsLoading(true);
    
    if (!tokenAddress) {
      showToast("Please select a token first", "error");
      setIsLoading(false);
      return;
    }
    
    // If selected DEX is "auto", determine best route first
    if (selectedDex === 'auto') {
      try {
        // Determine action and prepare payload
        const action = isBuyMode ? "buy" : "sell";
        let amount;
        
        if (isBuyMode) {
          amount = buyAmount; // In SOL
        } else {
          // For selling, we need to calculate token amount based on percentage
          const activeWallets = wallets.filter(wallet => wallet.isActive);
          if (activeWallets.length === 0) {
            showToast("Please activate at least one wallet", "error");
            setIsLoading(false);
            return;
          }
          
          // Calculate total token balance across all active wallets
          const totalTokenBalance = activeWallets.reduce((sum, wallet) => {
            const balance = tokenBalances.get(wallet.address) || 0;
            return sum + balance;
          }, 0);
          
          // Calculate amount to sell based on percentage
          const sellPercentage = parseFloat(sellAmount);
          const tokenAmount = totalTokenBalance * (sellPercentage / 100);
          
          if (tokenAmount <= 0) {
            showToast("No tokens to sell", "error");
            setIsLoading(false);
            return;
          }
          
          amount = Math.floor(tokenAmount).toString(); // Convert to raw token amount
        }
        
        const savedConfig = loadConfigFromCookies();
        // Call the routing API to determine best DEX
        const response = await fetch('https://solana.Raze.bot/api/tokens/route', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: action,
            tokenMintAddress: tokenAddress,
            amount: amount,
            rpcUrl: savedConfig?.rpcEndpoint || "https://api.mainnet-beta.solana.com"
          })
        });
        
        const data = await response.json();
        
        if (!data.success) {
          showToast(`Failed to determine best route: ${data.error || "Unknown error"}`, "error");
          setIsLoading(false);
          return;
        }
        
        // Map protocol to DEX
        const protocolToDex = {
          'pumpfun': 'pumpfun',
          'moonshot': 'moonshot',
          'pumpswap': 'pumpswap',
          'raydium': 'raydium',
          'jupiter': 'jupiter',
          'launchpad': 'launchpad',
          'boopfun': 'boopfun'
        };
        
        const bestDex = protocolToDex[data.protocol.toLowerCase()];
        
        if (!bestDex) {
          showToast(`Unknown protocol: ${data.protocol}. Using Jupiter as fallback.`, "error");
          // Use Jupiter as fallback
          const tempDex = 'jupiter';
          const tempHandleTradeSubmit = originalHandleTradeSubmit.bind(null, tempDex);
          await tempHandleTradeSubmit(wallets, isBuyMode);
        } else {
          // Use determined best DEX
          showToast(`Using ${dexOptions.find(d => d.value === bestDex)?.label} for best rate`, "success");
          const tempHandleTradeSubmit = originalHandleTradeSubmit.bind(null, bestDex);
          await tempHandleTradeSubmit(wallets, isBuyMode);
        }
      } catch (error) {
        console.error("Error determining best route:", error);
        showToast(`Error determining best route: ${error.message}`, "error");
        setIsLoading(false);
      }
      return;
    }
    
    // If not auto, use the selected DEX
    await originalHandleTradeSubmit(selectedDex, wallets, isBuyMode);
  };

  // Original trade submit function that accepts selectedDex as a parameter
  const originalHandleTradeSubmit = async (dex: string, wallets: WalletType[], isBuyMode: boolean) => {
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
            solAmount: parseFloat(buyAmount)
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
            sellPercent: parseFloat(sellAmount)
          };
          
          // Create a token balance map for validation
          const tokenBalanceMap = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = tokenBalances.get(wallet.address) || 0;
            tokenBalanceMap.set(wallet.address, balance);
          });
          
          // Import and validate inputs before executing
          const { validateMoonSellInputs, executeMoonSell } = await import('./utils/moonsell');
          
          const validation = validateMoonSellInputs(formattedWallets, tokenConfig, tokenBalanceMap);
          if (!validation.valid) {
            showToast(`Validation failed: ${validation.error}`, "error");
            setIsLoading(false);
            return;
          }
          
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
            solAmount: parseFloat(buyAmount)
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
            sellPercent: parseFloat(sellAmount)
          };
          
          // Create a token balance map for validation
          const tokenBalanceMap = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = tokenBalances.get(wallet.address) || 0;
            tokenBalanceMap.set(wallet.address, balance);
          });
          
          // Validate inputs before executing
          const validation = validateBoopSellInputs(formattedWallets, tokenConfig, tokenBalanceMap);
          if (!validation.valid) {
            showToast(`Validation failed: ${validation.error}`, "error");
            setIsLoading(false);
            return;
          }
          
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
            solAmount: parseFloat(buyAmount)
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
            sellPercent: parseFloat(sellAmount)
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
    
    // Special handling for Jupiter operations with client-side transaction signing
    if (dex === 'jupiter') {
      try {
        // Get active wallets
        const activeWallets = wallets.filter(wallet => wallet.isActive);
        
        if (activeWallets.length === 0) {
          showToast("Please activate at least one wallet", "error");
          setIsLoading(false);
          return;
        }
        
        // Format wallets for Jupiter operations
        const formattedWallets = activeWallets.map(wallet => ({
          address: wallet.address,
          privateKey: wallet.privateKey
        }));
        
        if (isBuyMode) {
          // Jupiter Buy flow
          const swapConfig = {
            inputMint: "So11111111111111111111111111111111111111112", // SOL
            outputMint: tokenAddress,
            solAmount: parseFloat(buyAmount),
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
          
          console.log(`Executing Jupiter Swap (Buy) for ${tokenAddress} with ${activeWallets.length} wallets`);
          
          // Execute JupSwap operation
          const result = await executeJupSwap(formattedWallets, swapConfig);
          
          if (result.success) {
            showToast("Jupiter Buy transactions submitted successfully", "success");
            handleRefresh(); // Refresh balances
          } else {
            showToast(`Jupiter Buy failed: ${result.error}`, "error");
          }
        } else {
          // Jupiter Sell flow
          const sellConfig = {
            inputMint: tokenAddress, // Token to sell
            outputMint: "So11111111111111111111111111111111111111112", // SOL
            sellPercent: parseFloat(sellAmount), // Percentage of tokens to sell
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
          
          console.log(`Executing Jupiter Sell for ${tokenAddress} with ${activeWallets.length} wallets (${sellConfig.sellPercent}%)`);
          
          // Execute JupSell operation with RPC URL
          const result = await executeJupSell(formattedWallets, sellConfig);
          
          if (result.success) {
            showToast("Jupiter Sell transactions submitted successfully", "success");
            handleRefresh(); // Refresh balances
          } else {
            showToast(`Jupiter Sell failed: ${result.error}`, "error");
          }
        }
      } catch (error) {
        console.error(`Jupiter ${isBuyMode ? 'Buy' : 'Sell'} error:`, error);
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
            solAmount: parseFloat(buyAmount)
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
            sellPercent: parseFloat(sellAmount)
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
            solAmount: parseFloat(buyAmount)
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
            sellPercent: parseFloat(sellAmount)
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
            solAmount: parseFloat(buyAmount)
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
            sellPercent: parseFloat(sellAmount)
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
    <div className="flex-1 overflow-y-auto bg-[#050a0e] p-4 md:p-6 relative">
      {/* Background effects - keeping original */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 bg-[#050a0e] opacity-90">
          <div className="absolute inset-0 bg-gradient-to-b from-[#02b36d05] to-transparent"></div>
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(2, 179, 109, 0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(2, 179, 109, 0.05) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
              backgroundPosition: 'center center',
            }}
          ></div>
        </div>
        
        {/* Glowing corner accents */}
        <div className="absolute top-0 left-0 w-32 h-32 opacity-20">
          <div className="absolute top-0 left-0 w-px h-16 bg-gradient-to-b from-[#02b36d] to-transparent"></div>
          <div className="absolute top-0 left-0 w-16 h-px bg-gradient-to-r from-[#02b36d] to-transparent"></div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
          <div className="absolute top-0 right-0 w-px h-16 bg-gradient-to-b from-[#02b36d] to-transparent"></div>
          <div className="absolute top-0 right-0 w-16 h-px bg-gradient-to-l from-[#02b36d] to-transparent"></div>
        </div>
        <div className="absolute bottom-0 left-0 w-32 h-32 opacity-20">
          <div className="absolute bottom-0 left-0 w-px h-16 bg-gradient-to-t from-[#02b36d] to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-16 h-px bg-gradient-to-r from-[#02b36d] to-transparent"></div>
        </div>
        <div className="absolute bottom-0 right-0 w-32 h-32 opacity-20">
          <div className="absolute bottom-0 right-0 w-px h-16 bg-gradient-to-t from-[#02b36d] to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-16 h-px bg-gradient-to-l from-[#02b36d] to-transparent"></div>
        </div>
      </div>
      
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
        />
        
        {/* Token Operations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-[#02b36d20] to-[#02b36d05] rounded-lg">
                <Settings2 size={16} className="text-[#02b36d]" />
              </div>
              <span className="font-mono text-sm tracking-wider text-[#7ddfbd] uppercase">Operations</span>
            </div>
            
            {/* PNL Button moved to Token Operations row */}
            <button
              onClick={() => {
                if (!tokenAddress) {
                  showToast("Please select a token first", "error");
                  return;
                }
                setCalculatePNLModalOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg
                        bg-gradient-to-r from-[#02b36d] to-[#01a35f] hover:from-[#01a35f] hover:to-[#029359]
                        shadow-md shadow-[#02b36d40] hover:shadow-[#02b36d60]
                        transition-all duration-300 relative overflow-hidden"
            >
              <ChartSpline size={16} className="text-black relative z-10" />
              <span className="text-sm font-mono tracking-wider text-black font-medium relative z-10">Share PNL</span>
            </button>
          </div>
          
          <div className="bg-gradient-to-br from-[#0a141980] to-[#05080a80] backdrop-blur-sm rounded-xl p-4 shadow-xl border border-[#02b36d20] relative overflow-hidden">
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
                          bg-gradient-to-br from-[#0a141990] to-[#05080a90] border border-[#02b36d30] hover:border-[#02b36d60]
                          transition-all duration-300"
              >
                <div className="p-3 bg-gradient-to-br from-[#02b36d20] to-[#02b36d05] rounded-lg">
                  <Waypoints size={20} className="text-[#02b36d]" />
                </div>
                <span className="text-xs font-mono tracking-wider text-[#7ddfbd] uppercase">Cleaner</span>
              </button>
              
              {/* Deploy Button */}
              <button
                onClick={() => setDeployModalOpen(true)}
                className="flex flex-col items-center gap-2 p-3 rounded-lg
                          bg-gradient-to-br from-[#0a141990] to-[#05080a90] border border-[#02b36d30] hover:border-[#02b36d60]
                          transition-all duration-300"
              >
                <div className="p-3 bg-gradient-to-br from-[#02b36d20] to-[#02b36d05] rounded-lg">
                  <Blocks size={20} className="text-[#02b36d]" />
                </div>
                <span className="text-xs font-mono tracking-wider text-[#7ddfbd] uppercase">Deploy</span>
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
                          bg-gradient-to-br from-[#0a141990] to-[#05080a90] border border-[#02b36d30] hover:border-[#02b36d60]
                          transition-all duration-300"
              >
                <div className="p-3 bg-gradient-to-br from-[#02b36d20] to-[#02b36d05] rounded-lg">
                  <Trash2 size={20} className="text-[#02b36d]" />
                </div>
                <span className="text-xs font-mono tracking-wider text-[#7ddfbd] uppercase">Burn</span>
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
                          bg-gradient-to-br from-[#0a141990] to-[#05080a90] border border-[#02b36d30] hover:border-[#02b36d60]
                          transition-all duration-300"
              >
                <div className="p-3 bg-gradient-to-br from-[#02b36d20] to-[#02b36d05] rounded-lg">
                  <Workflow size={20} className="text-[#02b36d]" />
                </div>
                <span className="text-xs font-mono tracking-wider text-[#7ddfbd] uppercase">Stagger</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <br></br>
      
      {/* Enhanced GitHub & Website Section */}
      <div className="mb-4 mx-auto max-w-4xl">
        <div className="bg-gradient-to-br from-[#0a141950] to-[#05080a50] backdrop-blur-sm 
                     rounded-xl p-4 relative overflow-hidden border border-[#02b36d10] 
                     hover:border-[#02b36d30] transition-all duration-300">
          
          {/* Header */}
          <div className="flex items-center mb-3">
            <svg 
              viewBox="0 0 24 24" 
              width="20" 
              height="20" 
              className="text-[#02b36d] mr-2"
            >
              <path
                fill="currentColor"
                d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.934.359.31.678.92.678 1.855 0 1.337-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z"
              />
            </svg>
            <span className="text-sm font-mono tracking-wider text-[#7ddfbd] font-semibold">
              OPEN SOURCE PROJECT
            </span>
          </div>
          
          {/* Description */}
          <p className="text-xs text-[#7ddfbd80] mb-4 leading-relaxed">
            Built with transparency in mind. Explore the code, contribute, or fork for your own use.
          </p>
          
          {/* Links */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Main Website Link */}
            <a 
              href="https://fury.bot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center py-2 px-4 rounded-lg bg-gradient-to-r 
                         from-[#02b36d] to-[#02b36d90] text-black font-mono text-xs font-semibold
                         hover:from-[#02b36d90] hover:to-[#02b36d] 
                         transition-all duration-300 transform hover:scale-105"
            >
              <svg 
                viewBox="0 0 24 24" 
                width="16" 
                height="16" 
                className="mr-2"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              FURY.BOT
            </a>
            
            {/* GitHub Link */}
            <a 
              href="https://github.com/furydotbot/raze.bot/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center py-2 px-4 rounded-lg bg-gradient-to-r 
                         from-[#02b36d20] to-[#02b36d10] border border-[#02b36d30]
                         hover:from-[#02b36d30] hover:to-[#02b36d20] 
                         transition-all duration-300 transform hover:scale-105"
            >
              <svg 
                viewBox="0 0 24 24" 
                width="16" 
                height="16" 
                className="mr-2 text-[#02b36d]"
                fill="currentColor"
              >
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.934.359.31.678.92.678 1.855 0 1.337-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
              <span className="text-xs font-mono tracking-wider text-[#02b36d] font-semibold">
                @FURYDOTBOT
              </span>
            </a>
          </div>
        </div>
      </div>
      
    </div>
  );
};