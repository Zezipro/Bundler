import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DollarSign, X, CheckCircle, Wallet, Info, Search, ChevronRight } from 'lucide-react';
import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { useToast } from "./Notifications";
import { WalletType } from './Utils';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletType[];
  solBalances: Map<string, number>;
  connection: Connection;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  wallets,
  solBalances,
  connection
}) => {
  // States for deposit operation
  const [publicKey, setPublicKey] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('address');
  const [sortDirection, setSortDirection] = useState('asc');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [showInfoTip, setShowInfoTip] = useState(false);
  const { showToast } = useToast();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Format SOL balance for display
  const formatSolBalance = (balance: number) => {
    return balance.toFixed(4);
  };

  // Format wallet address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Get wallet SOL balance by address
  const getWalletBalance = (address: string): number => {
    return solBalances.has(address) ? (solBalances.get(address) ?? 0) : 0;
  };

  // Reset form state
  const resetForm = () => {
    setCurrentStep(0);
    setSelectedWallet('');
    setAmount('');
    setIsConfirmed(false);
    setSearchTerm('');
    setSortOption('address');
    setSortDirection('asc');
    setBalanceFilter('all');
    // Don't reset publicKey as the user might want to make multiple deposits
  };

  // Function to get recent blockhash (for deposit operation)
  const getRecentBlockhash = async () => {
    const { blockhash } = await connection.getLatestBlockhash('finalized');
    return blockhash;
  };

  // Connect to Phantom wallet
  const connectPhantomWallet = async () => {
    try {
      const { solana } = window as any;
      if (!solana?.isPhantom) {
        throw new Error("Phantom wallet not found");
      }
      
      const response = await solana.connect();
      setPublicKey(response.publicKey.toString());
      return true;
    } catch (error) {
      console.error('Error connecting to Phantom wallet:', error);
      showToast("Failed to connect to Phantom wallet", "error");
      return false;
    }
  };

  // Handle deposit operation
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet || !amount || !publicKey || !isConfirmed) return;
 
    setIsSubmitting(true);
    try {
      const { solana } = window as any;
      if (!solana?.isPhantom) {
        throw new Error("Phantom wallet not found");
      }
 
      // Convert string public keys to PublicKey objects
      const fromPubkey = new PublicKey(publicKey);
      const toPubkey = new PublicKey(selectedWallet);
     
      // Create transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL)
      });
 
      // Get recent blockhash
      const recentBlockhash = await getRecentBlockhash();
 
      // Create new transaction
      const transaction = new Transaction({
        recentBlockhash,
        feePayer: fromPubkey
      });
 
      // Add transfer instruction to transaction
      transaction.add(transferInstruction);
 
      // Get transaction buffer
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      });
 
      // Convert to base58
      const encodedTransaction = bs58.encode(serializedTransaction);
 
      // Send transaction request to Phantom
      const signature = await solana.request({
        method: 'signAndSendTransaction',
        params: {
          message: encodedTransaction
        }
      });
 
      // Show success message
      showToast("Transaction sent successfully!", "success");
     
      // Reset form and close modal
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      showToast("Deposit failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter and sort wallets based on search term and other criteria
  const filterWallets = (walletList: WalletType[], search: string) => {
    // First apply search filter
    let filtered = walletList;
    if (search) {
      filtered = filtered.filter(wallet => 
        wallet.address.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Then apply balance filter
    if (balanceFilter !== 'all') {
      if (balanceFilter === 'nonZero') {
        filtered = filtered.filter(wallet => (getWalletBalance(wallet.address) || 0) > 0);
      } else if (balanceFilter === 'highBalance') {
        filtered = filtered.filter(wallet => (getWalletBalance(wallet.address) || 0) >= 0.1);
      } else if (balanceFilter === 'lowBalance') {
        filtered = filtered.filter(wallet => (getWalletBalance(wallet.address) || 0) < 0.1 && (getWalletBalance(wallet.address) || 0) > 0);
      }
    }
    
    // Finally, sort the wallets
    return filtered.sort((a, b) => {
      if (sortOption === 'address') {
        return sortDirection === 'asc' 
          ? a.address.localeCompare(b.address)
          : b.address.localeCompare(a.address);
      } else if (sortOption === 'balance') {
        const balanceA = getWalletBalance(a.address) || 0;
        const balanceB = getWalletBalance(b.address) || 0;
        return sortDirection === 'asc' ? balanceA - balanceB : balanceB - balanceA;
      }
      return 0;
    });
  };

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  // Animation keyframes for cyberpunk elements
  const modalStyleElement = document.createElement('style');
  modalStyleElement.textContent = `
    @keyframes modal-pulse {
      0% { box-shadow: 0 0 5px rgba(2, 179, 109, 0.5), 0 0 15px rgba(2, 179, 109, 0.2); }
      50% { box-shadow: 0 0 15px rgba(2, 179, 109, 0.8), 0 0 25px rgba(2, 179, 109, 0.4); }
      100% { box-shadow: 0 0 5px rgba(2, 179, 109, 0.5), 0 0 15px rgba(2, 179, 109, 0.2); }
    }
    
    @keyframes modal-fade-in {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    
    @keyframes modal-slide-up {
      0% { transform: translateY(20px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes modal-scan-line {
      0% { transform: translateY(-100%); opacity: 0.3; }
      100% { transform: translateY(100%); opacity: 0; }
    }
    
    .modal-cyberpunk-container {
      animation: modal-fade-in 0.3s ease;
    }
    
    .modal-cyberpunk-content {
      animation: modal-slide-up 0.4s ease;
      position: relative;
    }
    
    .modal-cyberpunk-content::before {
      content: "";
      position: absolute;
      width: 100%;
      height: 5px;
      background: linear-gradient(to bottom, 
        transparent 0%,
        rgba(2, 179, 109, 0.2) 50%,
        transparent 100%);
      z-index: 10;
      animation: modal-scan-line 8s linear infinite;
      pointer-events: none;
    }
    
    .modal-glow {
      animation: modal-pulse 4s infinite;
    }
    
    .modal-input-cyberpunk:focus {
      box-shadow: 0 0 0 1px rgba(2, 179, 109, 0.7), 0 0 15px rgba(2, 179, 109, 0.5);
      transition: all 0.3s ease;
    }
    
    .modal-btn-cyberpunk {
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    
    .modal-btn-cyberpunk::after {
      content: "";
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(
        to bottom right,
        rgba(2, 179, 109, 0) 0%,
        rgba(2, 179, 109, 0.3) 50%,
        rgba(2, 179, 109, 0) 100%
      );
      transform: rotate(45deg);
      transition: all 0.5s ease;
      opacity: 0;
    }
    
    .modal-btn-cyberpunk:hover::after {
      opacity: 1;
      transform: rotate(45deg) translate(50%, 50%);
    }
    
    .modal-btn-cyberpunk:active {
      transform: scale(0.95);
    }
    
    .progress-bar-cyberpunk {
      position: relative;
      overflow: hidden;
    }
    
    .progress-bar-cyberpunk::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(2, 179, 109, 0.7) 50%,
        transparent 100%
      );
      width: 100%;
      height: 100%;
      transform: translateX(-100%);
      animation: progress-shine 3s infinite;
    }
    
    @keyframes progress-shine {
      0% { transform: translateX(-100%); }
      20% { transform: translateX(100%); }
      100% { transform: translateX(100%); }
    }
    
    .glitch-text:hover {
      text-shadow: 0 0 2px #02b36d, 0 0 4px #02b36d;
      animation: glitch 2s infinite;
    }
    
    @keyframes glitch {
      2%, 8% { transform: translate(-2px, 0) skew(0.3deg); }
      4%, 6% { transform: translate(2px, 0) skew(-0.3deg); }
      62%, 68% { transform: translate(0, 0) skew(0.33deg); }
      64%, 66% { transform: translate(0, 0) skew(-0.33deg); }
    }
  `;
  document.head.appendChild(modalStyleElement);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm modal-cyberpunk-container" style={{backgroundColor: 'rgba(5, 10, 14, 0.85)'}}>
      <div className="relative bg-slate-900/20 backdrop-blur-xl border border-blue-500/30 rounded-lg shadow-lg w-full max-w-md overflow-hidden transform modal-cyberpunk-content modal-glow">
        {/* Ambient grid background */}
        <div className="absolute inset-0 z-0 opacity-10"
             style={{
               backgroundImage: 'linear-gradient(rgba(2, 179, 109, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(2, 179, 109, 0.2) 1px, transparent 1px)',
               backgroundSize: '20px 20px',
               backgroundPosition: 'center center',
             }}>
        </div>

        {/* Header */}
        <div className="relative z-10 p-4 flex justify-between items-center border-b border-[#02b36d40]">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#02b36d20] mr-3">
              <DollarSign size={16} className="text-[#02b36d]" />
            </div>
            <h2 className="text-lg font-semibold text-[#e4fbf2] font-mono">
              <span className="text-[#02b36d]">/</span> DEPOSIT SOL <span className="text-[#02b36d]">/</span>
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-[#7ddfbd] hover:text-[#02b36d] transition-colors p-1 hover:bg-[#02b36d20] rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="relative w-full h-1 bg-slate-800/30 backdrop-blur-sm progress-bar-cyberpunk">
          <div 
            className="h-full bg-[#02b36d] transition-all duration-300"
            style={{ width: currentStep === 0 ? '50%' : '100%' }}
          ></div>
        </div>

        {/* Content */}
        <div className="relative z-10 p-5 space-y-5">
          {currentStep === 0 && (
            <div className="animate-[fadeIn_0.3s_ease]">
              <div>
                <button
                  onClick={connectPhantomWallet}
                  className="w-full px-4 py-3 bg-slate-800/30 backdrop-blur-sm border border-blue-400/30 hover:border-blue-400 text-slate-100 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-blue-400/30 transform hover:-translate-y-0.5 modal-btn-cyberpunk"
                >
                  <svg width="22" height="22" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="128" height="128" rx="64" fill="#050a0e"/>
                    <path d="M110.584 64.9142H99.142C99.142 41.8335 80.2231 23 57.142 23C36.3226 23 18.7929 38.8944 15.6294 59.0563C15.2463 61.2766 15.0547 63.5605 15.0547 65.8019C15.0547 67.693 17.0548 69.142 18.9496 69.142H41.0038C42.2774 69.142 43.3791 68.2511 43.6484 67.002C43.8341 66.1368 44.0274 65.2393 44.3292 64.3971C46.5275 57.427 52.3790 52.4294 59.2648 52.4294C67.7598 52.4294 74.6521 59.3214 74.6521 67.8164C74.6521 76.3113 67.7598 83.2037 59.2648 83.2037C55.9574 83.2037 52.8709 82.0949 50.3999 80.1855C49.431 79.4954 48.1363 79.5393 47.2752 80.3996L32.0447 95.6302C30.8197 96.8548 31.5636 99 33.2599 99C34.9026 99 36.5454 98.8781 38.142 98.6553C44.9556 97.6553 51.2356 94.8281 56.3762 90.642C58.6555 88.7861 61.0457 86.7567 63.7865 85.0392C63.9501 84.9312 64.114 84.8231 64.3322 84.7151C76.4899 79.4954 85.7462 68.6714 87.4429 55.4348C87.6739 53.7519 87.7891 52.0158 87.7891 50.2259C87.7891 48.9332 88.5024 47.7629 89.6275 47.2292L106.396 39.3163C108.364 38.4161 110.584 39.8481 110.584 41.9863V64.9142Z" fill="#02b36d"/>
                    <path d="M110.584 64.9142H99.142C99.142 41.8335 80.2231 23 57.142 23C36.3226 23 18.7929 38.8944 15.6294 59.0563C15.2463 61.2766 15.0547 63.5605 15.0547 65.8019C15.0547 67.693 17.0548 69.142 18.9496 69.142H41.0038C42.2774 69.142 43.3791 68.2511 43.6484 67.002C43.8341 66.1368 44.0274 65.2393 44.3292 64.3971C46.5275 57.427 52.3790 52.4294 59.2648 52.4294C67.7598 52.4294 74.6521 59.3214 74.6521 67.8164C74.6521 76.3113 67.7598 83.2037 59.2648 83.2037C55.9574 83.2037 52.8709 82.0949 50.3999 80.1855C49.431 79.4954 48.1363 79.5393 47.2752 80.3996L32.0447 95.6302C30.8197 96.8548 31.5636 99 33.2599 99C34.9026 99 36.5454 98.8781 38.142 98.6553C44.9556 97.6553 51.2356 94.8281 56.3762 90.642C58.6555 88.7861 61.0457 86.7567 63.7865 85.0392C63.9501 84.9312 64.114 84.8231 64.3322 84.7151C76.4899 79.4954 85.7462 68.6714 87.4429 55.4348C87.6739 53.7519 87.7891 52.0158 87.7891 50.2259C87.7891 48.9332 88.5024 47.7629 89.6275 47.2292L106.396 39.3163C108.364 38.4161 110.584 39.8481 110.584 41.9863V64.9142Z" fill="url(#paint0_linear_phantom)"/>
                    <defs>
                      <linearGradient id="paint0_linear_phantom" x1="62.8196" y1="23" x2="62.8196" y2="99" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#7ddfbd"/>
                        <stop offset="1" stopColor="#02b36d"/>
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="font-mono tracking-wider">CONNECT PHANTOM</span>
                </button>
                {publicKey && (
                  <div className="mt-3 p-3 bg-slate-800/30 backdrop-blur-sm rounded-lg border border-blue-400/20 text-sm font-mono text-slate-100 break-all shadow-inner animate-[fadeIn_0.3s_ease]">
                    <div className="text-xs text-[#7ddfbd] mb-1 font-mono uppercase">Connected:</div>
                    {publicKey}
                  </div>
                )}
              </div>
              
              <div className="group mt-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-[#7ddfbd] group-hover:text-[#02b36d] transition-colors duration-200 font-mono uppercase tracking-wider">
                    <span className="text-[#02b36d]">&#62;</span> Select Recipient <span className="text-[#02b36d]">&#60;</span>
                  </label>
                  {selectedWallet && (
                    <div className="flex items-center gap-1 text-xs">
                      <DollarSign size={10} className="text-[#7ddfbd]" />
                      <span className="text-[#02b36d] font-medium font-mono">
                        {formatSolBalance(getWalletBalance(selectedWallet))} SOL
                      </span>
                    </div>
                  )}
                </div>

                {/* Search, Sort, and Filter Options */}
                <div className="mb-2 flex space-x-2">
                  <div className="relative flex-grow">
                    <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7ddfbd]" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-800/30 backdrop-blur-sm border border-blue-400/20 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-400 transition-all modal-input-cyberpunk font-mono"
                      placeholder="SEARCH WALLETS..."
                    />
                  </div>
                  
                  <select 
                    className="bg-slate-800/30 backdrop-blur-sm border border-blue-400/20 rounded-lg px-2 text-sm text-slate-100 focus:outline-none focus:border-blue-400 modal-input-cyberpunk font-mono"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                  >
                    <option value="address">ADDRESS</option>
                    <option value="balance">BALANCE</option>
                  </select>
                  
                  <button
                    className="p-2 bg-slate-800/30 backdrop-blur-sm border border-blue-400/20 rounded-lg text-blue-300 hover:text-blue-400 hover:border-blue-400 transition-all modal-btn-cyberpunk"
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto border border-blue-400/10 rounded-lg shadow-inner bg-slate-800/30 backdrop-blur-sm transition-all duration-200 group-hover:border-blue-400/30 scrollbar-thin">
                  {filterWallets(wallets, searchTerm).length > 0 ? (
                    filterWallets(wallets, searchTerm).map((wallet) => (
                      <div 
                        key={wallet.id}
                        className={`flex items-center p-2.5 hover:bg-[#0a1419] cursor-pointer transition-all duration-200 border-b border-[#02b36d20] last:border-b-0
                                  ${selectedWallet === wallet.address ? 'bg-[#02b36d10] border-[#02b36d30]' : ''}`}
                        onClick={() => setSelectedWallet(wallet.address)}
                      >
                        <div className={`w-5 h-5 mr-3 rounded flex items-center justify-center transition-all duration-300
                                        ${selectedWallet === wallet.address
                                          ? 'bg-[#02b36d] shadow-md shadow-[#02b36d40]' 
                                          : 'border border-blue-400/20 bg-slate-800/30'}`}>
                          {selectedWallet === wallet.address && (
                            <CheckCircle size={14} className="text-[#050a0e] animate-[fadeIn_0.2s_ease]" />
                          )}
                        </div>
                        <div className="flex-1 flex flex-col">
                          <span className="font-mono text-sm text-[#e4fbf2] glitch-text">{formatAddress(wallet.address)}</span>
                          <div className="flex items-center mt-0.5">
                            <DollarSign size={12} className="text-[#7ddfbd] mr-1" />
                            <span className="text-xs text-[#7ddfbd] font-mono">{formatSolBalance(getWalletBalance(wallet.address) || 0)} SOL</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-[#7ddfbd] text-center font-mono">
                      {searchTerm ? "NO WALLETS FOUND" : "NO WALLETS AVAILABLE"}
                    </div>
                  )}
                </div>
                {selectedWallet && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium pl-1">
                    <span className="text-[#7ddfbd] font-mono">CURRENT BALANCE:</span>
                    <span className="text-[#02b36d] font-semibold font-mono">{formatSolBalance(getWalletBalance(selectedWallet) || 0)} SOL</span>
                  </div>
                )}
              </div>
              
              <div className="group mt-5">
                <div className="flex items-center gap-1 mb-2">
                  <label className="text-sm font-medium text-[#7ddfbd] group-hover:text-[#02b36d] transition-colors duration-200 font-mono uppercase tracking-wider">
                    <span className="text-[#02b36d]">&#62;</span> Amount (SOL) <span className="text-[#02b36d]">&#60;</span>
                  </label>
                  <div className="relative" onMouseEnter={() => setShowInfoTip(true)} onMouseLeave={() => setShowInfoTip(false)}>
                    <Info size={14} className="text-[#7ddfbd] cursor-help" />
                    {showInfoTip && (
                      <div className="absolute left-0 bottom-full mb-2 p-2 bg-slate-800/30 backdrop-blur-sm border border-blue-400/20 rounded shadow-lg text-xs text-slate-100 w-48 z-10 font-mono">
                        Enter the amount of SOL to deposit
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setAmount(value);
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-slate-800/30 backdrop-blur-sm border border-blue-400/20 rounded-lg text-slate-100 shadow-inner focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 focus:outline-none transition-all duration-200 modal-input-cyberpunk font-mono tracking-wider"
                    placeholder="ENTER AMOUNT TO DEPOSIT"
                  />
                  <div className="absolute inset-0 rounded-lg pointer-events-none border border-transparent group-hover:border-[#02b36d30] transition-all duration-300"></div>
                </div>
                {selectedWallet && amount && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium pl-1">
                    <span className="text-[#7ddfbd] font-mono">NEW BALANCE AFTER DEPOSIT:</span>
                    <span className="text-[#02b36d] font-semibold font-mono">
                      {(parseFloat(formatSolBalance(getWalletBalance(selectedWallet) || 0)) + parseFloat(amount || '0')).toFixed(4)} SOL
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-slate-100 bg-slate-800/30 backdrop-blur-sm border border-blue-400/20 hover:bg-slate-700/40 hover:border-blue-400 rounded-lg transition-all duration-200 shadow-md font-mono tracking-wider modal-btn-cyberpunk"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => setCurrentStep(1)}
                  disabled={!publicKey || !selectedWallet || !amount}
                  className={`px-5 py-2.5 text-[#050a0e] rounded-lg shadow-lg flex items-center transition-all duration-300 font-mono tracking-wider 
                            ${!publicKey || !selectedWallet || !amount
                              ? 'bg-[#02b36d50] cursor-not-allowed opacity-50' 
                              : 'bg-[#02b36d] hover:bg-[#01a35f] transform hover:-translate-y-0.5 modal-btn-cyberpunk'}`}
                >
                  <span>REVIEW</span>
                  <ChevronRight size={16} className="ml-1" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="animate-[fadeIn_0.3s_ease]">
              {/* Review Summary */}
              <div className="bg-slate-800/30 backdrop-blur-sm border border-blue-400/20 rounded-lg p-4 mb-5">
                <h3 className="text-base font-semibold text-[#e4fbf2] mb-3 font-mono tracking-wider">TRANSACTION SUMMARY</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#7ddfbd] font-mono">FROM:</span>
                    <div className="flex items-center bg-[#0a1419] px-2 py-1 rounded border border-[#02b36d20]">
                      <span className="text-sm font-mono text-[#e4fbf2] glitch-text">{formatAddress(publicKey)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#7ddfbd] font-mono">TO WALLET:</span>
                    <div className="flex items-center bg-[#0a1419] px-2 py-1 rounded border border-[#02b36d20]">
                      <span className="text-sm font-mono text-[#e4fbf2] glitch-text">{formatAddress(selectedWallet)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#7ddfbd] font-mono">RECIPIENT BALANCE:</span>
                    <span className="text-sm text-[#e4fbf2] font-mono">{formatSolBalance(getWalletBalance(selectedWallet) || 0)} SOL</span>
                  </div>
                  
                  <div className="pt-2 border-t border-[#02b36d20] flex items-center justify-between">
                    <span className="text-sm font-medium text-[#7ddfbd] font-mono">AMOUNT TO DEPOSIT:</span>
                    <span className="text-sm font-semibold text-[#02b36d] font-mono">{parseFloat(amount).toFixed(4)} SOL</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#7ddfbd] font-mono">NEW BALANCE:</span>
                    <span className="text-sm text-[#e4fbf2] font-mono">
                      {(getWalletBalance(selectedWallet) + parseFloat(amount)).toFixed(4)} SOL
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Confirmation Checkbox */}
              <div className="flex items-center px-3 py-3 bg-slate-800/30 backdrop-blur-sm rounded-lg border border-blue-400/20 mb-5">
                <div className="relative mx-1">
                  <input
                    type="checkbox"
                    id="confirmDeposit"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 border border-[#02b36d40] rounded peer-checked:bg-[#02b36d] peer-checked:border-0 transition-all"></div>
                  <CheckCircle size={14} className={`absolute top-0.5 left-0.5 text-[#050a0e] transition-all ${isConfirmed ? 'opacity-100' : 'opacity-0'}`} />
                </div>
                <label htmlFor="confirmDeposit" className="text-[#e4fbf2] text-sm ml-2 cursor-pointer select-none font-mono">
                  I CONFIRM THIS DEPOSIT TRANSACTION
                </label>
              </div>
              
              {/* Back/Deposit Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setCurrentStep(0)}
                  className="px-5 py-2.5 text-slate-100 bg-slate-800/30 backdrop-blur-sm border border-blue-400/20 hover:bg-slate-700/40 hover:border-blue-400 rounded-lg transition-all duration-200 shadow-md font-mono tracking-wider modal-btn-cyberpunk"
                >
                  BACK
                </button>
                <button
                  onClick={handleDeposit}
                  disabled={!isConfirmed || isSubmitting}
                  className={`px-5 py-2.5 rounded-lg shadow-lg flex items-center transition-all duration-300 font-mono tracking-wider
                            ${!isConfirmed || isSubmitting
                              ? 'bg-[#02b36d50] text-[#050a0e80] cursor-not-allowed opacity-50' 
                              : 'bg-[#02b36d] text-[#050a0e] hover:bg-[#01a35f] transform hover:-translate-y-0.5 modal-btn-cyberpunk'}`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-[#050a0e80] border-t-transparent animate-spin mr-2"></div>
                      PROCESSING...
                    </>
                  ) : (
                    "DEPOSIT SOL"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Cyberpunk decorative corner elements */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-400 opacity-70"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-400 opacity-70"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-400 opacity-70"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-400 opacity-70"></div>
      </div>
    </div>,
    document.body
  );
};