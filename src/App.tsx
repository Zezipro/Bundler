import React, { useEffect, lazy, useCallback, useReducer, useMemo } from 'react';
import { X, Settings } from 'lucide-react';
import { Connection } from '@solana/web3.js';
import ServiceSelector from './Menu.tsx';
import { WalletTooltip, initStyles } from './Styles';
import { 
  saveWalletsToCookies,
  loadWalletsFromCookies,
  saveConfigToCookies,
  loadConfigFromCookies,
  loadQuickBuyPreferencesFromCookies,
  saveQuickBuyPreferencesToCookies,
  downloadPrivateKey,
  downloadAllWallets, 
  deleteWallet, 
  WalletType, 
  formatAddress,
  copyToClipboard,
  ConfigType,
} from './Utils';

import { useToast } from "./Notifications";
import {
  fetchSolBalances,
  fetchTokenBalances,
  handleSortWallets,
  handleApiKeyFromUrl
} from './Manager';
import { countActiveWallets, validateActiveWallets, getScriptName, maxWalletsConfig } from './Wallets';
import { executeTrade } from './TradingLogic';

// Lazy loaded components
const EnhancedSettingsModal = lazy(() => import('./SettingsModal'));
const EnhancedWalletOverview = lazy(() => import('./WalletOverview.tsx'));
const WalletsPage = lazy(() => import('./Wallets').then(module => ({ default: module.WalletsPage })));
const ChartPage = lazy(() => import('./Chart').then(module => ({ default: module.ChartPage })));
const ActionsPage = lazy(() => import('./Actions').then(module => ({ default: module.ActionsPage })));
const MobileLayout = lazy(() => import('./Mobile'));

// Import modal components 
const BurnModal = lazy(() => import('./BurnModal').then(module => ({ default: module.BurnModal })));
const PnlModal = lazy(() => import('./CalculatePNLModal').then(module => ({ default: module.PnlModal })));
const DeployModal = lazy(() => import('./DeployModal').then(module => ({ default: module.DeployModal })));
const CleanerTokensModal = lazy(() => import('./CleanerModal').then(module => ({ default: module.CleanerTokensModal })));
const CustomBuyModal = lazy(() => import('./CustomBuyModal').then(module => ({ default: module.CustomBuyModal })));
const FloatingTradingCard = lazy(() => import('./FloatingTradingCard'));

const WalletManager: React.FC = () => {
  // Apply styles
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = initStyles();
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Optimized state management with useReducer
  interface AppState {
    copiedAddress: string | null;
    tokenAddress: string;
    isModalOpen: boolean;
    isSettingsOpen: boolean;
    activeTab: 'network' | 'wallets' | 'advanced';
    config: ConfigType;
    currentPage: 'wallets' | 'chart' | 'actions';
    wallets: WalletType[];
    isRefreshing: boolean;
    connection: Connection | null;
    solBalances: Map<string, number>;
    tokenBalances: Map<string, number>;

    isLoadingChart: boolean;
    currentMarketCap: number | null;
    modals: {
      burnModalOpen: boolean;
      calculatePNLModalOpen: boolean;
      deployModalOpen: boolean;
      cleanerTokensModalOpen: boolean;
      customBuyModalOpen: boolean;
    };
    sortDirection: 'asc' | 'desc';
    tickEffect: boolean;

    floatingCard: {
      isOpen: boolean;
      position: { x: number; y: number };
      isDragging: boolean;
    };
    quickBuyEnabled: boolean;
    quickBuyAmount: number;
    quickBuyMinAmount: number;
    quickBuyMaxAmount: number;
    useQuickBuyRange: boolean;
    iframeData: {
    tradingStats: any;
    solPrice: number | null;
    currentWallets: any[];
    recentTrades: {
      type: 'buy' | 'sell';
      address: string;
      tokensAmount: number;
      avgPrice: number;
      solAmount: number;
      timestamp: number;
      signature: string;
    }[];
    tokenPrice: {
      tokenPrice: number;
      tokenMint: string;
      timestamp: number;
      tradeType: 'buy' | 'sell';
      volume: number;
    } | null;
  } | null;
  }

  type AppAction = 
    | { type: 'SET_COPIED_ADDRESS'; payload: string | null }
    | { type: 'SET_TOKEN_ADDRESS'; payload: string }
    | { type: 'SET_MODAL_OPEN'; payload: boolean }
    | { type: 'SET_SETTINGS_OPEN'; payload: boolean }
    | { type: 'SET_ACTIVE_TAB'; payload: 'network' | 'wallets' | 'advanced' }
    | { type: 'SET_CONFIG'; payload: ConfigType }
    | { type: 'SET_CURRENT_PAGE'; payload: 'wallets' | 'chart' | 'actions' }
    | { type: 'SET_WALLETS'; payload: WalletType[] }
    | { type: 'SET_REFRESHING'; payload: boolean }
    | { type: 'SET_CONNECTION'; payload: Connection | null }
    | { type: 'SET_SOL_BALANCES'; payload: Map<string, number> }
    | { type: 'SET_TOKEN_BALANCES'; payload: Map<string, number> }

    | { type: 'SET_LOADING_CHART'; payload: boolean }
    | { type: 'SET_MARKET_CAP'; payload: number | null }
    | { type: 'SET_MODAL'; payload: { modal: keyof AppState['modals']; open: boolean } }
    | { type: 'SET_SORT_DIRECTION'; payload: 'asc' | 'desc' }
    | { type: 'SET_TICK_EFFECT'; payload: boolean }

    | { type: 'UPDATE_BALANCE'; payload: { address: string; solBalance?: number; tokenBalance?: number } }
    | { type: 'SET_FLOATING_CARD_OPEN'; payload: boolean }
    | { type: 'SET_FLOATING_CARD_POSITION'; payload: { x: number; y: number } }
    | { type: 'SET_FLOATING_CARD_DRAGGING'; payload: boolean }
    | { type: 'SET_QUICK_BUY_ENABLED'; payload: boolean }
    | { type: 'SET_QUICK_BUY_AMOUNT'; payload: number }
    | { type: 'SET_QUICK_BUY_MIN_AMOUNT'; payload: number }
    | { type: 'SET_QUICK_BUY_MAX_AMOUNT'; payload: number }
    | { type: 'SET_USE_QUICK_BUY_RANGE'; payload: boolean }
    | { type: 'SET_IFRAME_DATA'; payload: { tradingStats: any; solPrice: number | null; currentWallets: any[]; recentTrades: { type: 'buy' | 'sell'; address: string; tokensAmount: number; avgPrice: number; solAmount: number; timestamp: number; signature: string; }[]; tokenPrice: { tokenPrice: number; tokenMint: string; timestamp: number; tradeType: 'buy' | 'sell'; volume: number; } | null; } | null };

  const initialState: AppState = {
    copiedAddress: null,
    tokenAddress: '',
    isModalOpen: false,
    isSettingsOpen: false,
    activeTab: 'network',
    config: {
      rpcEndpoint: 'https://smart-special-thunder.solana-mainnet.quiknode.pro/1366b058465380d24920f9d348f85325455d398d/',
      transactionFee: '0.000005',
      apiKey: '',
      selectedDex: 'auto',
      isDropdownOpen: false,
      buyAmount: '',
      sellAmount: ''
    },
    currentPage: 'wallets',
    wallets: [],
    isRefreshing: false,
    connection: null,
    solBalances: new Map(),
    tokenBalances: new Map(),

    isLoadingChart: false,
    currentMarketCap: null,
    modals: {
      burnModalOpen: false,
      calculatePNLModalOpen: false,
      deployModalOpen: false,
      cleanerTokensModalOpen: false,
      customBuyModalOpen: false
    },
    sortDirection: 'asc',
    tickEffect: false,

    floatingCard: {
      isOpen: false,
      position: { x: 100, y: 100 },
      isDragging: false
    },
    quickBuyEnabled: true,
    quickBuyAmount: 0.01,
    quickBuyMinAmount: 0.01,
    quickBuyMaxAmount: 0.05,
    useQuickBuyRange: false,
    iframeData: null
  };

  const appReducer = (state: AppState, action: AppAction): AppState => {
    switch (action.type) {
      case 'SET_COPIED_ADDRESS':
        return { ...state, copiedAddress: action.payload };
      case 'SET_TOKEN_ADDRESS':
        return { ...state, tokenAddress: action.payload };
      case 'SET_MODAL_OPEN':
        return { ...state, isModalOpen: action.payload };
      case 'SET_SETTINGS_OPEN':
        return { ...state, isSettingsOpen: action.payload };
      case 'SET_ACTIVE_TAB':
        return { ...state, activeTab: action.payload };
      case 'SET_CONFIG':
        return { ...state, config: action.payload };
      case 'SET_CURRENT_PAGE':
        return { ...state, currentPage: action.payload };
      case 'SET_WALLETS':
        return { ...state, wallets: action.payload };
      case 'SET_REFRESHING':
        return { ...state, isRefreshing: action.payload };
      case 'SET_CONNECTION':
        return { ...state, connection: action.payload };
      case 'SET_SOL_BALANCES':
        return { ...state, solBalances: action.payload };
      case 'SET_TOKEN_BALANCES':
        return { ...state, tokenBalances: action.payload };

      case 'SET_LOADING_CHART':
        return { ...state, isLoadingChart: action.payload };
      case 'SET_MARKET_CAP':
        return { ...state, currentMarketCap: action.payload };
      case 'SET_MODAL':
        return {
          ...state,
          modals: {
            ...state.modals,
            [action.payload.modal]: action.payload.open
          }
        };
      case 'SET_SORT_DIRECTION':
        return { ...state, sortDirection: action.payload };
      case 'SET_TICK_EFFECT':
        return { ...state, tickEffect: action.payload };

      case 'UPDATE_BALANCE':
        const newState = { ...state };
        if (action.payload.solBalance !== undefined) {
          newState.solBalances = new Map(state.solBalances);
          newState.solBalances.set(action.payload.address, action.payload.solBalance);
        }
        if (action.payload.tokenBalance !== undefined) {
          newState.tokenBalances = new Map(state.tokenBalances);
          newState.tokenBalances.set(action.payload.address, action.payload.tokenBalance);
        }
        return newState;
      case 'SET_FLOATING_CARD_OPEN':
        return {
          ...state,
          floatingCard: {
            ...state.floatingCard,
            isOpen: action.payload
          }
        };
      case 'SET_FLOATING_CARD_POSITION':
        return {
          ...state,
          floatingCard: {
            ...state.floatingCard,
            position: action.payload
          }
        };
      case 'SET_FLOATING_CARD_DRAGGING':
        return {
          ...state,
          floatingCard: {
            ...state.floatingCard,
            isDragging: action.payload
          }
        };
      case 'SET_QUICK_BUY_ENABLED':
        return { ...state, quickBuyEnabled: action.payload };
      case 'SET_QUICK_BUY_AMOUNT':
        return { ...state, quickBuyAmount: action.payload };
      case 'SET_QUICK_BUY_MIN_AMOUNT':
        return { ...state, quickBuyMinAmount: action.payload };
      case 'SET_QUICK_BUY_MAX_AMOUNT':
        return { ...state, quickBuyMaxAmount: action.payload };
      case 'SET_USE_QUICK_BUY_RANGE':
        return { ...state, useQuickBuyRange: action.payload };
      case 'SET_IFRAME_DATA':
        return { ...state, iframeData: action.payload };
      default:
        return state;
    }
  };

  const [state, dispatch] = useReducer(appReducer, initialState);
  const { showToast } = useToast();

  // Memoized selectors for expensive calculations
  const memoizedBalances = useMemo(() => {
    return {
      totalSolBalance: Array.from(state.solBalances.values()).reduce((sum, balance) => sum + balance, 0),
      totalTokenBalance: Array.from(state.tokenBalances.values()).reduce((sum, balance) => sum + balance, 0),
      walletsWithBalance: state.wallets.filter(wallet => 
        (state.solBalances.get(wallet.address) || 0) > 0 || 
        (state.tokenBalances.get(wallet.address) || 0) > 0
      )
    };
  }, [state.solBalances, state.tokenBalances, state.wallets]);

  // Memoized callbacks to prevent unnecessary re-renders
  const memoizedCallbacks = useMemo(() => ({
    setCopiedAddress: (address: string | null) => dispatch({ type: 'SET_COPIED_ADDRESS', payload: address }),
    setTokenAddress: (address: string) => dispatch({ type: 'SET_TOKEN_ADDRESS', payload: address }),
    setIsModalOpen: (open: boolean) => dispatch({ type: 'SET_MODAL_OPEN', payload: open }),
    setIsSettingsOpen: (open: boolean) => dispatch({ type: 'SET_SETTINGS_OPEN', payload: open }),
    setActiveTab: (tab: 'network' | 'wallets' | 'advanced') => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab }),
    setConfig: (config: ConfigType) => dispatch({ type: 'SET_CONFIG', payload: config }),
    setCurrentPage: (page: 'wallets' | 'chart' | 'actions') => dispatch({ type: 'SET_CURRENT_PAGE', payload: page }),
    setWallets: (wallets: WalletType[]) => dispatch({ type: 'SET_WALLETS', payload: wallets }),
    setIsRefreshing: (refreshing: boolean) => dispatch({ type: 'SET_REFRESHING', payload: refreshing }),
    setConnection: (connection: Connection | null) => dispatch({ type: 'SET_CONNECTION', payload: connection }),
    setSolBalances: (balances: Map<string, number>) => dispatch({ type: 'SET_SOL_BALANCES', payload: balances }),
    setTokenBalances: (balances: Map<string, number>) => dispatch({ type: 'SET_TOKEN_BALANCES', payload: balances }),

    setIsLoadingChart: (loading: boolean) => dispatch({ type: 'SET_LOADING_CHART', payload: loading }),
    setCurrentMarketCap: (cap: number | null) => dispatch({ type: 'SET_MARKET_CAP', payload: cap }),
    setBurnModalOpen: (open: boolean) => dispatch({ type: 'SET_MODAL', payload: { modal: 'burnModalOpen', open } }),
    setCalculatePNLModalOpen: (open: boolean) => dispatch({ type: 'SET_MODAL', payload: { modal: 'calculatePNLModalOpen', open } }),
    setDeployModalOpen: (open: boolean) => dispatch({ type: 'SET_MODAL', payload: { modal: 'deployModalOpen', open } }),
    setCleanerTokensModalOpen: (open: boolean) => dispatch({ type: 'SET_MODAL', payload: { modal: 'cleanerTokensModalOpen', open } }),
    setCustomBuyModalOpen: (open: boolean) => dispatch({ type: 'SET_MODAL', payload: { modal: 'customBuyModalOpen', open } }),
    setSortDirection: (direction: 'asc' | 'desc') => dispatch({ type: 'SET_SORT_DIRECTION', payload: direction }),
    setTickEffect: (effect: boolean) => dispatch({ type: 'SET_TICK_EFFECT', payload: effect }),

    setFloatingCardOpen: (open: boolean) => dispatch({ type: 'SET_FLOATING_CARD_OPEN', payload: open }),
    setFloatingCardPosition: (position: { x: number; y: number }) => dispatch({ type: 'SET_FLOATING_CARD_POSITION', payload: position }),
    setFloatingCardDragging: (dragging: boolean) => dispatch({ type: 'SET_FLOATING_CARD_DRAGGING', payload: dragging }),
    setQuickBuyEnabled: (enabled: boolean) => dispatch({ type: 'SET_QUICK_BUY_ENABLED', payload: enabled }),
    setQuickBuyAmount: (amount: number) => dispatch({ type: 'SET_QUICK_BUY_AMOUNT', payload: amount }),
    setQuickBuyMinAmount: (amount: number) => dispatch({ type: 'SET_QUICK_BUY_MIN_AMOUNT', payload: amount }),
    setQuickBuyMaxAmount: (amount: number) => dispatch({ type: 'SET_QUICK_BUY_MAX_AMOUNT', payload: amount }),
    setUseQuickBuyRange: (useRange: boolean) => dispatch({ type: 'SET_USE_QUICK_BUY_RANGE', payload: useRange }),
    setIframeData: (data: { tradingStats: any; solPrice: number | null; currentWallets: any[]; recentTrades: { type: 'buy' | 'sell'; address: string; tokensAmount: number; avgPrice: number; solAmount: number; timestamp: number; signature: string; }[]; tokenPrice: { tokenPrice: number; tokenMint: string; timestamp: number; tradeType: 'buy' | 'sell'; volume: number; } | null; } | null) => dispatch({ type: 'SET_IFRAME_DATA', payload: data })
  }), []);

  // Separate callbacks for config updates to prevent unnecessary re-renders
  const configCallbacks = useMemo(() => ({
    setBuyAmount: (amount: string) => dispatch({ type: 'SET_CONFIG', payload: { ...state.config, buyAmount: amount } }),
    setSellAmount: (amount: string) => dispatch({ type: 'SET_CONFIG', payload: { ...state.config, sellAmount: amount } }),
    setSelectedDex: (dex: string) => dispatch({ type: 'SET_CONFIG', payload: { ...state.config, selectedDex: dex } }),
    setIsDropdownOpen: (open: boolean) => dispatch({ type: 'SET_CONFIG', payload: { ...state.config, isDropdownOpen: open } })
  }), [state.config]);

  // Monitor iframe data for whitelist trades and update wallet balances
  useEffect(() => {
    if (state.iframeData?.recentTrades && state.iframeData.recentTrades.length > 0) {
      const latestTrade = state.iframeData.recentTrades[0];
      
      // Find the wallet that made the trade
      const tradingWallet = state.wallets.find(wallet => wallet.address === latestTrade.address);
      
      if (tradingWallet) {
        // Get current balances
        const currentSolBalance = state.solBalances.get(latestTrade.address) || 0;
        const currentTokenBalance = state.tokenBalances.get(latestTrade.address) || 0;
        
        // Calculate new balances based on trade type
        let newSolBalance = currentSolBalance;
        let newTokenBalance = currentTokenBalance;
        
        if (latestTrade.type === 'buy') {
          // For buy trades: decrease SOL, increase tokens
          newSolBalance = Math.max(0, currentSolBalance - latestTrade.solAmount);
          newTokenBalance = currentTokenBalance + latestTrade.tokensAmount;
        } else if (latestTrade.type === 'sell') {
          // For sell trades: increase SOL, decrease tokens
          newSolBalance = currentSolBalance + latestTrade.solAmount;
          newTokenBalance = Math.max(0, currentTokenBalance - latestTrade.tokensAmount);
        }
        
        // Update balances if they changed
        if (newSolBalance !== currentSolBalance || newTokenBalance !== currentTokenBalance) {
          dispatch({
            type: 'UPDATE_BALANCE',
            payload: {
              address: latestTrade.address,
              solBalance: newSolBalance,
              tokenBalance: newTokenBalance
            }
          });
          
          console.log(`Updated balances for wallet ${formatAddress(latestTrade.address)}: SOL ${currentSolBalance.toFixed(4)} → ${newSolBalance.toFixed(4)}, Tokens ${currentTokenBalance.toFixed(4)} → ${newTokenBalance.toFixed(4)}`);
        }
      }
    }
  }, [state.iframeData?.recentTrades]); // Removed state.wallets to prevent triggering on wallet selection changes



  // DEX options for trading
  const dexOptions = [
    { value: 'auto', label: '⭐ Auto', icon: '⭐' },
    { value: 'pumpfun', label: 'PumpFun' },
    { value: 'moonshot', label: 'Moonshot' },
    { value: 'pumpswap', label: 'PumpSwap' },
    { value: 'raydium', label: 'Raydium' },
    { value: 'launchpad', label: 'Launchpad' },
    { value: 'boopfun', label: 'BoopFun' },
  ];

  // Handle trade submission
  const handleTradeSubmit = async (wallets: WalletType[], isBuyMode: boolean, dex?: string, buyAmount?: string, sellAmount?: string) => {
    memoizedCallbacks.setIsRefreshing(true);
    
    if (!state.tokenAddress) {
      showToast("Please select a token first", "error");
      memoizedCallbacks.setIsRefreshing(false);
      return;
    }
    
    // Use the selected DEX or the dex parameter if provided
    const dexToUse = dex || state.config.selectedDex;
    await originalHandleTradeSubmit(dexToUse, wallets, isBuyMode, buyAmount, sellAmount);
  };

  // Simplified trade submit function using TradingLogic module
  const originalHandleTradeSubmit = async (dex: string, wallets: WalletType[], isBuyMode: boolean, buyAmount?: string, sellAmount?: string) => {
    try {
      const config = {
        tokenAddress: state.tokenAddress,
        solAmount: isBuyMode ? parseFloat(buyAmount || state.config.buyAmount) : undefined,
        sellPercent: !isBuyMode ? parseFloat(sellAmount || state.config.sellAmount) : undefined
      };
      
      console.log(`Executing ${dex} ${isBuyMode ? 'Buy' : 'Sell'} for ${state.tokenAddress}`);
      
      const result = await executeTrade(dex, wallets, config, isBuyMode, state.solBalances);
      
      if (result.success) {
        const dexLabel = dexOptions.find(d => d.value === dex)?.label || dex;
        showToast(`${dexLabel} ${isBuyMode ? 'Buy' : 'Sell'} transactions submitted successfully`, "success");
        handleRefresh(); // Refresh balances
      } else {
        showToast(`${dex} ${isBuyMode ? 'Buy' : 'Sell'} failed: ${result.error}`, "error");
      }
    } catch (error) {
      console.error(`${dex} ${isBuyMode ? 'Buy' : 'Sell'} error:`, error);
      showToast(`Error: ${error.message}`, "error");
    } finally {
      memoizedCallbacks.setIsRefreshing(false);
    }
  };



  // Extract API key from URL
  useEffect(() => {
    handleApiKeyFromUrl(memoizedCallbacks.setConfig, saveConfigToCookies, showToast);
  }, [memoizedCallbacks.setConfig]);

  // Read tokenAddress from URL parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('tokenAddress');
    if (tokenFromUrl) {
      memoizedCallbacks.setTokenAddress(tokenFromUrl);
    }
  }, [memoizedCallbacks.setTokenAddress]);

  // Update URL when tokenAddress changes
  useEffect(() => {
    const url = new URL(window.location.href);
    if (state.tokenAddress) {
      url.searchParams.set('tokenAddress', state.tokenAddress);
    } else {
      url.searchParams.delete('tokenAddress');
    }
    window.history.replaceState({}, '', url.toString());
  }, [state.tokenAddress]);


  
  // Initialize app on mount
  useEffect(() => {
    const initializeApp = () => {
      // Load saved config
      const savedConfig = loadConfigFromCookies();
      if (savedConfig) {
        memoizedCallbacks.setConfig(savedConfig);
        
        // Create connection after loading config
        try {
          const conn = new Connection(savedConfig.rpcEndpoint);
          memoizedCallbacks.setConnection(conn);
        } catch (error) {
          console.error('Error creating connection:', error);
        }
      }
      
      // Load saved wallets
      const savedWallets = loadWalletsFromCookies();
      if (savedWallets && savedWallets.length > 0) {
        memoizedCallbacks.setWallets(savedWallets);
      }
      
      // Load saved quick buy preferences
      const savedQuickBuyPreferences = loadQuickBuyPreferencesFromCookies();
      if (savedQuickBuyPreferences) {
        memoizedCallbacks.setQuickBuyEnabled(savedQuickBuyPreferences.quickBuyEnabled);
        memoizedCallbacks.setQuickBuyAmount(savedQuickBuyPreferences.quickBuyAmount);
        memoizedCallbacks.setQuickBuyMinAmount(savedQuickBuyPreferences.quickBuyMinAmount);
        memoizedCallbacks.setQuickBuyMaxAmount(savedQuickBuyPreferences.quickBuyMaxAmount);
        memoizedCallbacks.setUseQuickBuyRange(savedQuickBuyPreferences.useQuickBuyRange);
      }
    };

    initializeApp();
  }, [memoizedCallbacks]);

  // Save wallets when they change
  useEffect(() => {
    if (state.wallets.length > 0) {
      saveWalletsToCookies(state.wallets);
    }
  }, [state.wallets]);

  // Save quick buy preferences when they change
  useEffect(() => {
    const preferences = {
      quickBuyEnabled: state.quickBuyEnabled,
      quickBuyAmount: state.quickBuyAmount,
      quickBuyMinAmount: state.quickBuyMinAmount,
      quickBuyMaxAmount: state.quickBuyMaxAmount,
      useQuickBuyRange: state.useQuickBuyRange
    };
    saveQuickBuyPreferencesToCookies(preferences);
  }, [state.quickBuyEnabled, state.quickBuyAmount, state.quickBuyMinAmount, state.quickBuyMaxAmount, state.useQuickBuyRange]);

  // Fetch SOL balances when wallets change or connection is established
  useEffect(() => {
    if (state.connection && state.wallets.length > 0) {
      fetchSolBalances(state.connection, state.wallets, memoizedCallbacks.setSolBalances);
    }
  }, [state.connection, state.wallets.length, memoizedCallbacks.setSolBalances]);

  // Fetch token balances when token address changes or wallets change
  useEffect(() => {
    if (state.connection && state.wallets.length > 0 && state.tokenAddress) {
      fetchTokenBalances(state.connection, state.wallets, state.tokenAddress, memoizedCallbacks.setTokenBalances);
    }
  }, [state.connection, state.wallets.length, state.tokenAddress, memoizedCallbacks.setTokenBalances]);

  // Update connection when RPC endpoint changes
  useEffect(() => {
    try {
      const conn = new Connection(state.config.rpcEndpoint);
      memoizedCallbacks.setConnection(conn);
    } catch (error) {
      console.error('Error creating connection:', error);
    }
  }, [state.config.rpcEndpoint, memoizedCallbacks.setConnection]);

  // Refresh balances on load
  useEffect(() => {
    if (state.connection && state.wallets.length > 0) {
      handleRefresh();
    }
  }, [state.connection, state.wallets.length]);

  // Add effect to refresh balances when token address changes
  useEffect(() => {
    if (state.connection && state.wallets.length > 0 && state.tokenAddress) {
      handleRefresh();
    }
  }, [state.tokenAddress, state.connection, state.wallets.length]);

  // Trigger tick animation when wallet count changes
  useEffect(() => {
    memoizedCallbacks.setTickEffect(true);
    const timer = setTimeout(() => memoizedCallbacks.setTickEffect(false), 500);
    return () => clearTimeout(timer);
  }, [state.wallets.length, memoizedCallbacks.setTickEffect]);

  // Helper functions
  const handleRefresh = useCallback(async () => {
    if (!state.connection) return;
    
    memoizedCallbacks.setIsRefreshing(true);
    
    try {
      // Fetch SOL balances
      await fetchSolBalances(state.connection, state.wallets, memoizedCallbacks.setSolBalances);
      
      // Fetch token balances if token address is provided
      if (state.tokenAddress) {
        await fetchTokenBalances(state.connection, state.wallets, state.tokenAddress, memoizedCallbacks.setTokenBalances);
      }
    } catch (error) {
      console.error('Error refreshing balances:', error);
    } finally {
      // Set refreshing to false
      memoizedCallbacks.setIsRefreshing(false);
    }
  }, [state.connection, state.wallets, state.tokenAddress, memoizedCallbacks.setIsRefreshing, memoizedCallbacks.setSolBalances, memoizedCallbacks.setTokenBalances]);

  const handleConfigChange = useCallback((key: keyof ConfigType, value: string) => {
    const newConfig = { ...state.config, [key]: value };
    saveConfigToCookies(newConfig);
    memoizedCallbacks.setConfig(newConfig);
  }, [memoizedCallbacks.setConfig, state.config]);

  const handleSaveSettings = useCallback(() => {
    saveConfigToCookies(state.config);
    memoizedCallbacks.setIsSettingsOpen(false);
  }, [state.config, memoizedCallbacks.setIsSettingsOpen]);

  const handleDeleteWallet = useCallback((id: number) => {
    const walletToDelete = state.wallets.find(w => w.id === id);
    if (walletToDelete) {
      // Remove from balances maps
      const newSolBalances = new Map(state.solBalances);
      newSolBalances.delete(walletToDelete.address);
      memoizedCallbacks.setSolBalances(newSolBalances);
      
      const newTokenBalances = new Map(state.tokenBalances);
      newTokenBalances.delete(walletToDelete.address);
      memoizedCallbacks.setTokenBalances(newTokenBalances);
    }
    
    const updatedWallets = deleteWallet(state.wallets, id);
    memoizedCallbacks.setWallets(updatedWallets);
  }, [state.wallets, state.solBalances, state.tokenBalances, memoizedCallbacks.setSolBalances, memoizedCallbacks.setTokenBalances, memoizedCallbacks.setWallets]);

  // Modal action handlers
  const openSettingsModal = useCallback(() => memoizedCallbacks.setIsSettingsOpen(true), [memoizedCallbacks.setIsSettingsOpen]);
  const closeSettingsModal = useCallback(() => memoizedCallbacks.setIsSettingsOpen(false), [memoizedCallbacks.setIsSettingsOpen]);
  const openWalletOverview = useCallback(() => memoizedCallbacks.setIsModalOpen(true), [memoizedCallbacks.setIsModalOpen]);
  const closeWalletOverview = useCallback(() => memoizedCallbacks.setIsModalOpen(false), [memoizedCallbacks.setIsModalOpen]);
  const openWalletsPage = useCallback(() => memoizedCallbacks.setCurrentPage('wallets'), [memoizedCallbacks.setCurrentPage]);
  const openChartPage = useCallback(() => memoizedCallbacks.setCurrentPage('chart'), [memoizedCallbacks.setCurrentPage]);
  const openActionsPage = useCallback(() => memoizedCallbacks.setCurrentPage('actions'), [memoizedCallbacks.setCurrentPage]);

  const handleBurn = async (amount: string) => {
    try {
      console.log('burn', amount, 'SOL to');
      showToast('Burn successful', 'success');
    } catch (error) {
      showToast('Burn failed', 'error');
    }
  };

  const handleDeploy = async (data: any) => {
    try {
      console.log('Deploy executed:', data);
      showToast('Token deployment initiated successfully', 'success');
    } catch (error) {
      console.error('Error:', error);
      showToast('Token deployment failed', 'error');
    }
  };

  const handleCleaner = async (data: any) => {
    try {
      console.log('Cleaning', data);
      showToast('Cleaning successfully', 'success');
    } catch (error) {
      showToast('Failed to clean', 'error');
    }
  };

  const handleCustomBuy = async (data: any) => {
    try {
      console.log('Custom buy executed:', data);
      showToast('Custom buy completed successfully', 'success');
    } catch (error) {
      showToast('Custom buy failed', 'error');
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0f1419] text-[#93c5fd] glassmorphism-bg">
      {/* Cyberpunk scanline effect */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-10"></div>
      

      
      {/* Top Navigation */}
      <nav className="relative border-b border-blue-500/30 px-4 py-1 backdrop-blur-md bg-transparent z-20 modern-card rounded-none border-l-0 border-r-0 border-t-0">
        <div className="flex items-center gap-2">

        <ServiceSelector />
          
          <div className="relative flex-1 mx-4">
            <input
              type="text"
              placeholder="TOKEN ADDRESS"
              value={state.tokenAddress}
              onChange={(e) => memoizedCallbacks.setTokenAddress(e.target.value)}
              className="w-full bg-transparent border border-blue-500/30 rounded-md px-3 py-1 text-xs text-slate-100 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-mono tracking-wider smooth-transition"
            />
            <div className="absolute right-3 top-1.5 text-blue-400/40 text-xs font-mono">SOL</div>
          </div>
          
          <WalletTooltip content="Paste from clipboard" position="bottom">
            <button
              className="p-1.5 border border-blue-500/30 hover:border-blue-400 bg-transparent rounded-md smooth-transition hover:shadow-lg hover:shadow-blue-400/20"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) {
                    memoizedCallbacks.setTokenAddress(text);
                    showToast("Token address pasted from clipboard", "success");
                  }
                } catch (err) {
                  showToast("Failed to read from clipboard", "error");
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
            </button>
          </WalletTooltip>          
          
          <WalletTooltip content="Open Settings" position="bottom">
            <button 
              className="p-1.5 border border-blue-500/30 hover:border-blue-400 bg-transparent rounded-md smooth-transition hover:shadow-lg hover:shadow-blue-400/20"
              onClick={() => memoizedCallbacks.setIsSettingsOpen(true)}
            >
              <Settings size={16} className="text-blue-400" />
            </button>
          </WalletTooltip>

          <div className="flex items-center ml-2">
            <div className="flex flex-col items-start">
              <div className="text-xs text-blue-200 font-mono uppercase tracking-wider">WALLETS</div>
              <div className={`text-sm font-bold text-blue-400 font-mono ${state.tickEffect ? 'scale-110 transition-transform' : 'transition-transform'}`}>
                {state.wallets.length}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Modern Single Page Layout */}
        <div className="h-full flex flex-col lg:flex-row gap-6 p-6">


          {/* Left Sidebar - Wallets Overview */}
          <div className="lg:w-80 xl:w-96 flex flex-col gap-6">
            <div className="h-full modern-card p-6">

              {state.connection && (
                <div className="h-full overflow-y-auto overflow-x-hidden">
                  <WalletsPage
                    wallets={state.wallets}
                    setWallets={memoizedCallbacks.setWallets}
                    handleRefresh={handleRefresh}
                    isRefreshing={state.isRefreshing}
                    setIsModalOpen={memoizedCallbacks.setIsModalOpen}
                    tokenAddress={state.tokenAddress}
                    sortDirection={state.sortDirection}
                    handleSortWallets={() => handleSortWallets(state.wallets, state.sortDirection, memoizedCallbacks.setSortDirection, state.solBalances, memoizedCallbacks.setWallets)}
                    connection={state.connection}
                    solBalances={state.solBalances}
                    tokenBalances={state.tokenBalances}
                    quickBuyEnabled={state.quickBuyEnabled}
                    setQuickBuyEnabled={memoizedCallbacks.setQuickBuyEnabled}
                    quickBuyAmount={state.quickBuyAmount}
                    setQuickBuyAmount={memoizedCallbacks.setQuickBuyAmount}
                    quickBuyMinAmount={state.quickBuyMinAmount}
                    setQuickBuyMinAmount={memoizedCallbacks.setQuickBuyMinAmount}
                    quickBuyMaxAmount={state.quickBuyMaxAmount}
                    setQuickBuyMaxAmount={memoizedCallbacks.setQuickBuyMaxAmount}
                    useQuickBuyRange={state.useQuickBuyRange}
                    setUseQuickBuyRange={memoizedCallbacks.setUseQuickBuyRange}
                    currentMarketCap={state.currentMarketCap}
                    totalSolBalance={memoizedBalances.totalSolBalance}
                    totalTokenBalance={memoizedBalances.totalTokenBalance}
                    totalTokenValue={memoizedBalances.totalTokenBalance * (state.currentMarketCap || 0)}
                    totalPortfolioValue={memoizedBalances.totalSolBalance + (memoizedBalances.totalTokenBalance * (state.currentMarketCap || 0))}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Center Content Area - Chart */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Chart Section */}
            <div className="h-full modern-card p-6">
              <ChartPage
                isLoadingChart={state.isLoadingChart}
                tokenAddress={state.tokenAddress}
                wallets={state.wallets}
                onDataUpdate={memoizedCallbacks.setIframeData}
              />
            </div>
          </div>

          {/* Right Sidebar - Quick Actions */}
          <div className="lg:w-80 xl:w-96 flex flex-col gap-6">
            <div className="modern-card p-6">

              <ActionsPage
                tokenAddress={state.tokenAddress}
                transactionFee={state.config.transactionFee}
                handleRefresh={handleRefresh}
                wallets={state.wallets}
                solBalances={state.solBalances}
                tokenBalances={state.tokenBalances}
                currentMarketCap={state.currentMarketCap}
                setBurnModalOpen={memoizedCallbacks.setBurnModalOpen}
                setCalculatePNLModalOpen={memoizedCallbacks.setCalculatePNLModalOpen}
                setDeployModalOpen={memoizedCallbacks.setDeployModalOpen}
                setCleanerTokensModalOpen={memoizedCallbacks.setCleanerTokensModalOpen}
                setCustomBuyModalOpen={memoizedCallbacks.setCustomBuyModalOpen}
                onOpenFloating={() => memoizedCallbacks.setFloatingCardOpen(true)}
                isFloatingCardOpen={state.floatingCard.isOpen}
                iframeData={state.iframeData}
              />
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <MobileLayout
          currentPage={state.currentPage}
          setCurrentPage={memoizedCallbacks.setCurrentPage}
          children={{
            WalletsPage: (
              state.connection ? (
                <WalletsPage
                  wallets={state.wallets}
                  setWallets={memoizedCallbacks.setWallets}
                  handleRefresh={handleRefresh}
                  isRefreshing={state.isRefreshing}
                  setIsModalOpen={memoizedCallbacks.setIsModalOpen}
                  tokenAddress={state.tokenAddress}
                  sortDirection={state.sortDirection}
                  handleSortWallets={() => handleSortWallets(state.wallets, state.sortDirection, memoizedCallbacks.setSortDirection, state.solBalances, memoizedCallbacks.setWallets)}
                  connection={state.connection}
                  solBalances={state.solBalances}
                  tokenBalances={state.tokenBalances}
                  quickBuyEnabled={state.quickBuyEnabled}
                  setQuickBuyEnabled={memoizedCallbacks.setQuickBuyEnabled}
                  quickBuyAmount={state.quickBuyAmount}
                  setQuickBuyAmount={memoizedCallbacks.setQuickBuyAmount}
                  quickBuyMinAmount={state.quickBuyMinAmount}
                  setQuickBuyMinAmount={memoizedCallbacks.setQuickBuyMinAmount}
                  quickBuyMaxAmount={state.quickBuyMaxAmount}
                  setQuickBuyMaxAmount={memoizedCallbacks.setQuickBuyMaxAmount}
                  useQuickBuyRange={state.useQuickBuyRange}
                  setUseQuickBuyRange={memoizedCallbacks.setUseQuickBuyRange}
                  currentMarketCap={state.currentMarketCap}
                  totalSolBalance={memoizedBalances.totalSolBalance}
                  totalTokenBalance={memoizedBalances.totalTokenBalance}
                  totalTokenValue={memoizedBalances.totalTokenBalance * (state.currentMarketCap || 0)}
                  totalPortfolioValue={memoizedBalances.totalSolBalance + (memoizedBalances.totalTokenBalance * (state.currentMarketCap || 0))}
                />
              ) : (
                <div className="p-4 text-center text-blue-200">
                  <div className="loading-anim inline-block">
                    <div className="h-4 w-4 rounded-full bg-blue-400 mx-auto"></div>
                  </div>
                  <p className="mt-2 font-mono">CONNECTING TO NETWORK...</p>
                </div>
              )
            ),
            ChartPage: (
              <ChartPage
                isLoadingChart={state.isLoadingChart}
                tokenAddress={state.tokenAddress}
                wallets={state.wallets}
                onDataUpdate={memoizedCallbacks.setIframeData}
              />
            ),
            ActionsPage: (
              <ActionsPage
                tokenAddress={state.tokenAddress}
                transactionFee={state.config.transactionFee}
                handleRefresh={handleRefresh}
                wallets={state.wallets}
                solBalances={state.solBalances}
                tokenBalances={state.tokenBalances}
                currentMarketCap={state.currentMarketCap}
                setBurnModalOpen={memoizedCallbacks.setBurnModalOpen}
                setCalculatePNLModalOpen={memoizedCallbacks.setCalculatePNLModalOpen}
                setDeployModalOpen={memoizedCallbacks.setDeployModalOpen}
                setCleanerTokensModalOpen={memoizedCallbacks.setCleanerTokensModalOpen}
                setCustomBuyModalOpen={memoizedCallbacks.setCustomBuyModalOpen}
                onOpenFloating={() => memoizedCallbacks.setFloatingCardOpen(true)}
                isFloatingCardOpen={state.floatingCard.isOpen}
                iframeData={state.iframeData}
              />
            )
          }}
        />
      </div>
  
      {/* Enhanced Settings Modal */}
      <EnhancedSettingsModal
        isOpen={state.isSettingsOpen}
        onClose={() => memoizedCallbacks.setIsSettingsOpen(false)}
        config={state.config}
        onConfigChange={handleConfigChange}
        onSave={handleSaveSettings}
        wallets={state.wallets}
        setWallets={memoizedCallbacks.setWallets}
        connection={state.connection}
        solBalances={state.solBalances}
        setSolBalances={memoizedCallbacks.setSolBalances}
        tokenBalances={state.tokenBalances}
        setTokenBalances={memoizedCallbacks.setTokenBalances}
        tokenAddress={state.tokenAddress}
        showToast={showToast}
        activeTab={state.activeTab}
        setActiveTab={memoizedCallbacks.setActiveTab}
      />
  
      {/* Enhanced Wallet Overview */}
      <EnhancedWalletOverview
        isOpen={state.isModalOpen}
        onClose={() => memoizedCallbacks.setIsModalOpen(false)}
        wallets={state.wallets}
        setWallets={memoizedCallbacks.setWallets}
        solBalances={state.solBalances}
        tokenBalances={state.tokenBalances}
        tokenAddress={state.tokenAddress}
        connection={state.connection}
        handleRefresh={handleRefresh}
        isRefreshing={state.isRefreshing}
        showToast={showToast}
        onOpenSettings={() => {
          memoizedCallbacks.setIsModalOpen(false); // Close wallet overview first
          memoizedCallbacks.setActiveTab('wallets');
          memoizedCallbacks.setIsSettingsOpen(true);
        }}
      />

      {/* Modals */}
      <BurnModal
        isOpen={state.modals.burnModalOpen}
        onBurn={handleBurn}
        onClose={() => memoizedCallbacks.setBurnModalOpen(false)}
        handleRefresh={handleRefresh}
        tokenAddress={state.tokenAddress}
        solBalances={state.solBalances} 
        tokenBalances={state.tokenBalances}
      />

      <PnlModal
        isOpen={state.modals.calculatePNLModalOpen}
        onClose={() => memoizedCallbacks.setCalculatePNLModalOpen(false)}
        handleRefresh={handleRefresh}    
        tokenAddress={state.tokenAddress}
      />
      
      <DeployModal
        isOpen={state.modals.deployModalOpen}
        onClose={() => memoizedCallbacks.setDeployModalOpen(false)}
        handleRefresh={handleRefresh} 
        solBalances={state.solBalances} 
        onDeploy={handleDeploy}    
      />
      
      <CleanerTokensModal
        isOpen={state.modals.cleanerTokensModalOpen}
        onClose={() => memoizedCallbacks.setCleanerTokensModalOpen(false)}
        onCleanerTokens={handleCleaner}
        handleRefresh={handleRefresh}
        tokenAddress={state.tokenAddress}
        solBalances={state.solBalances} 
        tokenBalances={state.tokenBalances}
      />
      
      <CustomBuyModal
        isOpen={state.modals.customBuyModalOpen}
        onClose={() => memoizedCallbacks.setCustomBuyModalOpen(false)}
        onCustomBuy={handleCustomBuy}
        handleRefresh={handleRefresh}
        tokenAddress={state.tokenAddress}
        solBalances={state.solBalances} 
        tokenBalances={state.tokenBalances}
      />
      
      <FloatingTradingCard
        isOpen={state.floatingCard.isOpen}
        onClose={() => memoizedCallbacks.setFloatingCardOpen(false)}
        position={state.floatingCard.position}
        onPositionChange={memoizedCallbacks.setFloatingCardPosition}
        isDragging={state.floatingCard.isDragging}
        onDraggingChange={memoizedCallbacks.setFloatingCardDragging}
        tokenAddress={state.tokenAddress}
        wallets={state.wallets}
        selectedDex={state.config.selectedDex}
        setSelectedDex={configCallbacks.setSelectedDex}
        isDropdownOpen={state.config.isDropdownOpen}
        setIsDropdownOpen={configCallbacks.setIsDropdownOpen}
        buyAmount={state.config.buyAmount}
        setBuyAmount={configCallbacks.setBuyAmount}
        sellAmount={state.config.sellAmount}
        setSellAmount={configCallbacks.setSellAmount}
        handleTradeSubmit={handleTradeSubmit}
        isLoading={state.isRefreshing}
        dexOptions={dexOptions}
        validateActiveWallets={validateActiveWallets}
        getScriptName={getScriptName}
        countActiveWallets={countActiveWallets}
        maxWalletsConfig={maxWalletsConfig}
        currentMarketCap={state.currentMarketCap}
        tokenBalances={state.tokenBalances}
        iframeData={state.iframeData}
      />
    </div>
  );
};

export default WalletManager;