import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpDown, X, CheckCircle, DollarSign, Info, Search, ChevronRight } from 'lucide-react';
import { 
  Connection, 
  PublicKey, 
  Keypair, 
  VersionedTransaction, 
  TransactionMessage,
  MessageV0
} from '@solana/web3.js';
import bs58 from 'bs58';
import { useToast } from "./Notifications";
import { WalletType } from './Utils';
import { Buffer } from 'buffer';
import { sendToJitoBundleService } from './utils/jitoService';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletType[];
  solBalances: Map<string, number>;
  connection: Connection;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  wallets,
  solBalances,
  connection
}) => {
  // States for the modal
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const { showToast } = useToast();

  // States for transfer operation
  const [sourceWallet, setSourceWallet] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [selectedToken, setSelectedToken] = useState('');
  const [amount, setAmount] = useState('');
  
  // States for enhanced functionality
  const [sourceSearchTerm, setSourceSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('address');
  const [sortDirection, setSortDirection] = useState('asc');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [showInfoTip, setShowInfoTip] = useState(false);
  const [useJitoBundle, setUseJitoBundle] = useState(false);

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

  // Get wallet by privateKey
  const getWalletByPrivateKey = (privateKey: string) => {
    return wallets.find(wallet => wallet.privateKey === privateKey);
  };

  // Reset form state
  const resetForm = () => {
    setCurrentStep(0);
    setIsConfirmed(false);
    setSourceWallet('');
    setReceiverAddress('');
    setSelectedToken('');
    setAmount('');
    setSourceSearchTerm('');
    setSortOption('address');
    setSortDirection('asc');
    setBalanceFilter('all');
    setUseJitoBundle(false);
  };

  // Handle transfer operation with local signing and direct RPC submission
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;
    setIsSubmitting(true);

    try {
      const selectedWalletObj = getWalletByPrivateKey(sourceWallet);
      if (!selectedWalletObj) {
        throw new Error('Source wallet not found');
      }

      const baseUrl = (window as any).tradingServerUrl.replace(/\/+$/, '');
      
      // Step 1: Request the transaction from the backend
      const buildResponse = await fetch(`${baseUrl}/api/tokens/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderPublicKey: selectedWalletObj.address,  // Send public key only
          receiver: receiverAddress,
          tokenAddress: selectedToken,
          amount: amount,
        }),
      });

      if (!buildResponse.ok) {
        throw new Error(`HTTP error! status: ${buildResponse.status}`);
      }

      const buildResult = await buildResponse.json();
      if (!buildResult.success) {
        throw new Error(buildResult.error);
      }

      // Step 2: Deserialize the transaction message from Base58
      const transactionBuffer = Buffer.from(bs58.decode(buildResult.data.transaction));
      const messageV0 = MessageV0.deserialize(transactionBuffer);
      
      // Step 3: Create and sign the versioned transaction
      const transaction = new VersionedTransaction(messageV0);
      
      // Create keypair from private key
      const keypair = Keypair.fromSecretKey(bs58.decode(sourceWallet));
      
      // Sign the transaction
      transaction.sign([keypair]);
      
      // Step 4: Send the signed transaction via Jito Bundle Service
      const serializedTransaction = bs58.encode(transaction.serialize());
      const jitoResult = await sendToJitoBundleService(serializedTransaction);
      
      // Extract signature from Jito result
      const signature = jitoResult.signature || jitoResult.txid || 'Unknown';
      
      // Success message with transfer type from the build result
      showToast(`${buildResult.data.transferType} transfer completed successfully.`, "success");
      resetForm();
      onClose();
    } catch (error) {
      console.error('Transfer error:', error);
      
      // Extract meaningful error message to show to user
      let errorMessage = 'Transfer failed';
      
      if (error instanceof Error) {
        // Try to parse detailed error message which might be JSON
        if (error.message.includes('{') && error.message.includes('}')) {
          try {
            // Sometimes error messages contain JSON from the API
            const errorJson = JSON.parse(error.message.substring(
              error.message.indexOf('{'), 
              error.message.lastIndexOf('}') + 1
            ));
            
            if (errorJson.error) {
              errorMessage = `${errorMessage}: ${errorJson.error}`;
            } else {
              errorMessage = `${errorMessage}: ${error.message}`;
            }
          } catch (e) {
            // If we can't parse JSON, just use the original message
            errorMessage = `${errorMessage}: ${error.message}`;
          }
        } else {
          errorMessage = `${errorMessage}: ${error.message}`;
        }
      } else {
        errorMessage = `${errorMessage}: Unknown error`;
      }
      
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter and sort wallets based on search term and other criteria
  const filterWallets = (walletList: WalletType[], search: string) => {
    // First filter out wallets with zero balance
    let filtered = walletList.filter(wallet => (getWalletBalance(wallet.address) || 0) > 0);
    
    // Then apply search filter
    if (search) {
      filtered = filtered.filter(wallet => 
        wallet.address.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Then apply additional balance filter
    if (balanceFilter !== 'all') {
      if (balanceFilter === 'highBalance') {
        filtered = filtered.filter(wallet => (getWalletBalance(wallet.address) || 0) >= 0.1);
      } else if (balanceFilter === 'lowBalance') {
        filtered = filtered.filter(wallet => (getWalletBalance(wallet.address) || 0) < 0.1);
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

  // Get the selected wallet address
  const selectedWalletAddress = getWalletByPrivateKey(sourceWallet)?.address || '';

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
    
    @keyframes fadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    
    @keyframes scale-in {
      0% { transform: scale(0); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(modalStyleElement);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm modal-cyberpunk-container" style={{backgroundColor: 'rgba(5, 10, 14, 0.85)'}}>
      <div className="relative bg-[#050a0e] border border-[#02b36d40] rounded-lg shadow-lg w-full max-w-md md:max-w-xl overflow-hidden transform modal-cyberpunk-content modal-glow">
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
              <ArrowUpDown size={16} className="text-[#02b36d]" />
            </div>
            <h2 className="text-lg font-semibold text-[#e4fbf2] font-mono">
              <span className="text-[#02b36d]">/</span> TRANSFER SOL <span className="text-[#02b36d]">/</span>
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
        <div className="relative w-full h-1 bg-[#091217] progress-bar-cyberpunk">
          <div 
            className="h-full bg-[#02b36d] transition-all duration-300"
            style={{ width: currentStep === 0 ? '50%' : '100%' }}
          ></div>
        </div>

        {/* Content */}
        <div className="relative z-10 p-5 space-y-5">
          {currentStep === 0 && (
            <div className="animate-[fadeIn_0.3s_ease]">
              {/* Source Wallet Selection */}
              <div className="group">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-[#7ddfbd] group-hover:text-[#02b36d] transition-colors duration-200 font-mono uppercase tracking-wider">
                    <span className="text-[#02b36d]">&#62;</span> Source Wallet <span className="text-[#02b36d]">&#60;</span>
                  </label>
                  {sourceWallet && (
                    <div className="flex items-center gap-1 text-xs">
                      <DollarSign size={10} className="text-[#7ddfbd]" />
                      <span className="text-[#02b36d] font-medium font-mono">
                        {formatSolBalance(getWalletBalance(selectedWalletAddress))} SOL
                      </span>
                    </div>
                  )}
                </div>

                {/* Source Search and Filters */}
                <div className="mb-2 flex space-x-2">
                  <div className="relative flex-grow">
                    <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7ddfbd]" />
                    <input
                      type="text"
                      value={sourceSearchTerm}
                      onChange={(e) => setSourceSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-[#091217] border border-[#02b36d30] rounded-lg text-sm text-[#e4fbf2] focus:outline-none focus:border-[#02b36d] transition-all modal-input-cyberpunk font-mono"
                      placeholder="SEARCH WALLETS..."
                    />
                  </div>
                  
                  <select 
                    className="bg-[#091217] border border-[#02b36d30] rounded-lg px-2 text-sm text-[#e4fbf2] focus:outline-none focus:border-[#02b36d] modal-input-cyberpunk font-mono"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                  >
                    <option value="address">ADDRESS</option>
                    <option value="balance">BALANCE</option>
                  </select>
                  
                  <button
                    className="p-2 bg-[#091217] border border-[#02b36d30] rounded-lg text-[#7ddfbd] hover:text-[#02b36d] hover:border-[#02b36d] transition-all modal-btn-cyberpunk"
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto border border-[#02b36d20] rounded-lg shadow-inner bg-[#091217] transition-all duration-200 group-hover:border-[#02b36d40] scrollbar-thin">
                  {filterWallets(wallets, sourceSearchTerm).length > 0 ? (
                    filterWallets(wallets, sourceSearchTerm).map((wallet) => (
                      <div 
                        key={wallet.id}
                        className={`flex items-center p-2.5 hover:bg-[#0a1419] cursor-pointer transition-all duration-200 border-b border-[#02b36d20] last:border-b-0
                                  ${sourceWallet === wallet.privateKey ? 'bg-[#02b36d10] border-[#02b36d30]' : ''}`}
                        onClick={() => setSourceWallet(wallet.privateKey)}
                      >
                        <div className={`w-5 h-5 mr-3 rounded flex items-center justify-center transition-all duration-300
                                        ${sourceWallet === wallet.privateKey
                                          ? 'bg-[#02b36d] shadow-md shadow-[#02b36d40]' 
                                          : 'border border-[#02b36d30] bg-[#091217]'}`}>
                          {sourceWallet === wallet.privateKey && (
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
                      {sourceSearchTerm ? "NO WALLETS FOUND WITH BALANCE > 0" : "NO WALLETS AVAILABLE WITH BALANCE > 0"}
                    </div>
                  )}
                </div>
                {sourceWallet && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium pl-1">
                    <span className="text-[#7ddfbd] font-mono">CURRENT BALANCE:</span>
                    <span className="text-[#02b36d] font-semibold font-mono">{formatSolBalance(getWalletBalance(selectedWalletAddress) || 0)} SOL</span>
                  </div>
                )}
              </div>
              
              {/* Recipient Address */}
              <div className="group mt-5">
                <label className="block text-sm font-medium text-[#7ddfbd] mb-1.5 group-hover:text-[#02b36d] transition-colors duration-200 font-mono uppercase tracking-wider">
                  <span className="text-[#02b36d]">&#62;</span> Recipient Address <span className="text-[#02b36d]">&#60;</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={receiverAddress}
                    onChange={(e) => setReceiverAddress(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#091217] backdrop-blur-sm border border-[#02b36d30] rounded-lg text-[#e4fbf2] shadow-inner focus:border-[#02b36d] focus:ring-1 focus:ring-[#02b36d50] focus:outline-none transition-all duration-200 modal-input-cyberpunk font-mono tracking-wider"
                    placeholder="ENTER RECIPIENT ADDRESS"
                  />
                  <div className="absolute inset-0 rounded-lg pointer-events-none border border-transparent group-hover:border-[#02b36d30] transition-all duration-300"></div>
                </div>
                {solBalances.has(receiverAddress) && (
                  <div className="mt-1.5 flex items-center text-xs font-medium pl-1">
                    <span className="text-[#7ddfbd] font-mono mr-1">RECIPIENT BALANCE:</span>
                    <span className="text-[#02b36d] font-semibold font-mono">{formatSolBalance(getWalletBalance(receiverAddress))} SOL</span>
                  </div>
                )}
              </div>
              
              {/* Token Address */}
              <div className="group mt-5">
                <div className="flex items-center gap-1 mb-1.5">
                  <label className="text-sm font-medium text-[#7ddfbd] group-hover:text-[#02b36d] transition-colors duration-200 font-mono uppercase tracking-wider">
                    <span className="text-[#02b36d]">&#62;</span> Token Address <span className="text-[#02b36d]">&#60;</span>
                  </label>
                  <div className="relative" onMouseEnter={() => setShowInfoTip(true)} onMouseLeave={() => setShowInfoTip(false)}>
                    <Info size={14} className="text-[#7ddfbd] cursor-help" />
                    {showInfoTip && (
                      <div className="absolute left-0 bottom-full mb-2 p-2 bg-[#091217] backdrop-blur-sm border border-[#02b36d30] rounded shadow-lg text-xs text-[#e4fbf2] w-48 z-10 font-mono">
                        Leave empty to transfer SOL instead of a token
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedToken}
                    onChange={(e) => setSelectedToken(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#091217] backdrop-blur-sm border border-[#02b36d30] rounded-lg text-[#e4fbf2] shadow-inner focus:border-[#02b36d] focus:ring-1 focus:ring-[#02b36d50] focus:outline-none transition-all duration-200 modal-input-cyberpunk font-mono tracking-wider"
                    placeholder="ENTER TOKEN ADDRESS (LEAVE EMPTY FOR SOL)"
                  />
                  <div className="absolute inset-0 rounded-lg pointer-events-none border border-transparent group-hover:border-[#02b36d30] transition-all duration-300"></div>
                </div>
              </div>
              
              {/* Amount */}
              <div className="group mt-5">
                <div className="flex items-center gap-1 mb-2">
                  <label className="text-sm font-medium text-[#7ddfbd] group-hover:text-[#02b36d] transition-colors duration-200 font-mono uppercase tracking-wider">
                    <span className="text-[#02b36d]">&#62;</span> Amount <span className="text-[#02b36d]">&#60;</span>
                  </label>
                  <div className="relative" onMouseEnter={() => setShowInfoTip(true)} onMouseLeave={() => setShowInfoTip(false)}>
                    <Info size={14} className="text-[#7ddfbd] cursor-help" />
                    {showInfoTip && (
                      <div className="absolute left-0 bottom-full mb-2 p-2 bg-[#091217] backdrop-blur-sm border border-[#02b36d30] rounded shadow-lg text-xs text-[#e4fbf2] w-48 z-10 font-mono">
                        Enter the amount to transfer
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
                    className="w-full px-4 py-2.5 bg-[#091217] backdrop-blur-sm border border-[#02b36d30] rounded-lg text-[#e4fbf2] shadow-inner focus:border-[#02b36d] focus:ring-1 focus:ring-[#02b36d50] focus:outline-none transition-all duration-200 modal-input-cyberpunk font-mono tracking-wider"
                    placeholder="ENTER AMOUNT TO TRANSFER"
                  />
                  <div className="absolute inset-0 rounded-lg pointer-events-none border border-transparent group-hover:border-[#02b36d30] transition-all duration-300"></div>
                </div>
              </div>
              
              {/* Transfer Summary */}
              {sourceWallet && receiverAddress && amount && (
                <div className="p-3 bg-[#091217] backdrop-blur-sm border border-[#02b36d30] rounded-lg mt-5 animate-[fadeIn_0.3s_ease]">
                  <div className="flex justify-between items-center text-sm font-mono">
                    <span className="text-[#7ddfbd]">TRANSFER:</span>
                    <span className="text-[#02b36d] font-medium">
                      {amount} {selectedToken ? 'TOKENS' : 'SOL'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1 font-mono">
                    <span className="text-[#7ddfbd]">FROM:</span>
                    <span className="text-[#e4fbf2]">{formatAddress(selectedWalletAddress)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1 font-mono">
                    <span className="text-[#7ddfbd]">TO:</span>
                    <span className="text-[#e4fbf2]">{formatAddress(receiverAddress)}</span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-[#e4fbf2] bg-[#091217] backdrop-blur-sm border border-[#02b36d30] hover:bg-[#0a1419] hover:border-[#02b36d] rounded-lg transition-all duration-200 shadow-md font-mono tracking-wider modal-btn-cyberpunk"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => setCurrentStep(1)}
                  disabled={!sourceWallet || !receiverAddress || !amount}
                  className={`px-5 py-2.5 text-[#050a0e] rounded-lg shadow-lg flex items-center transition-all duration-300 font-mono tracking-wider 
                            ${!sourceWallet || !receiverAddress || !amount
                              ? 'bg-[#02b36d50] cursor-not-allowed opacity-50' 
                              : 'bg-[#02b36d] hover:bg-[#02b36d] transform hover:-translate-y-0.5 modal-btn-cyberpunk'}`}
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
              <div className="bg-[#091217] backdrop-blur-sm border border-[#02b36d30] rounded-lg p-4 mb-5">
                <h3 className="text-base font-semibold text-[#e4fbf2] mb-3 font-mono tracking-wider">TRANSACTION SUMMARY</h3>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-[#7ddfbd] text-sm font-mono mb-1">TRANSFER AMOUNT:</p>
                    <div className="p-2.5 bg-[#0a1419] backdrop-blur-sm rounded border border-[#02b36d20] shadow-inner">
                      <p className="text-[#02b36d] font-mono text-sm font-semibold">
                        {amount} {selectedToken ? 'TOKENS' : 'SOL'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[#7ddfbd] text-sm font-mono mb-1">FROM WALLET:</p>
                    <div className="p-2.5 bg-[#0a1419] backdrop-blur-sm rounded border border-[#02b36d20] shadow-inner">
                      <p className="text-[#e4fbf2] font-mono text-sm break-all">
                        {selectedWalletAddress}
                      </p>
                      <div className="flex items-center mt-1 text-xs text-[#7ddfbd]">
                        <DollarSign size={12} className="mr-0.5" />
                        BALANCE: {formatSolBalance(getWalletBalance(selectedWalletAddress) || 0)} SOL
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-[#7ddfbd] text-sm font-mono mb-1">TO RECIPIENT:</p>
                    <div className="p-2.5 bg-[#0a1419] backdrop-blur-sm rounded border border-[#02b36d20] shadow-inner">
                      <p className="text-[#e4fbf2] font-mono text-sm break-all">
                        {receiverAddress}
                      </p>
                      {solBalances.has(receiverAddress) && (
                        <div className="flex items-center mt-1 text-xs text-[#7ddfbd]">
                          <DollarSign size={12} className="mr-0.5" />
                          CURRENT: {formatSolBalance(getWalletBalance(receiverAddress) || 0)} SOL
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {selectedToken && (
                    <div>
                      <p className="text-[#7ddfbd] text-sm font-mono mb-1">TOKEN:</p>
                      <div className="p-2.5 bg-[#0a1419] backdrop-blur-sm rounded border border-[#02b36d20] shadow-inner">
                        <p className="text-[#e4fbf2] font-mono text-sm break-all">
                          {selectedToken}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Local signing section */}
                  <div className="mt-3 p-3 bg-[#0a1419] backdrop-blur-sm rounded border border-[#02b36d40]">
                    <p className="text-sm text-[#02b36d] font-medium mb-2 font-mono">LOCAL TRANSACTION SIGNING</p>
                    <p className="text-xs text-[#e4fbf2] font-mono">
                      YOUR PRIVATE KEY WILL REMAIN SECURE ON YOUR DEVICE. THE TRANSACTION WILL BE SIGNED LOCALLY AND SUBMITTED DIRECTLY TO THE SOLANA NETWORK VIA RPC.
                    </p>
                  </div>

                  {/* Estimated balances after transfer (only for SOL transfers) */}
                  {!selectedToken && (
                    <div className="mt-3 p-3 bg-[#0a1419] backdrop-blur-sm rounded border border-[#02b36d40]">
                      <p className="text-sm text-[#7ddfbd] mb-2 font-mono">ESTIMATED BALANCES AFTER TRANSFER:</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#7ddfbd] font-mono">SOURCE WALLET:</span>
                        <span className="text-xs text-[#e4fbf2] font-mono">
                          {(getWalletBalance(selectedWalletAddress) - parseFloat(amount)).toFixed(4)} SOL
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-[#7ddfbd] font-mono">RECIPIENT WALLET:</span>
                        <span className="text-xs text-[#e4fbf2] font-mono">
                          {(getWalletBalance(receiverAddress) + parseFloat(amount)).toFixed(4)} SOL
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Confirmation Checkbox */}
              <div className="flex items-center px-3 py-3 bg-[#091217] backdrop-blur-sm rounded-lg border border-[#02b36d30] mb-5">
                <div className="relative mx-1">
                  <input
                    type="checkbox"
                    id="confirmTransfer"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 border border-[#02b36d40] rounded peer-checked:bg-[#02b36d] peer-checked:border-0 transition-all"></div>
                  <CheckCircle size={14} className={`absolute top-0.5 left-0.5 text-[#050a0e] transition-all ${isConfirmed ? 'opacity-100' : 'opacity-0'}`} />
                </div>
                <label htmlFor="confirmTransfer" className="text-[#e4fbf2] text-sm ml-2 cursor-pointer select-none font-mono">
                  I CONFIRM THIS TRANSFER TRANSACTION
                </label>
              </div>
              
              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setCurrentStep(0)}
                  className="px-5 py-2.5 text-[#e4fbf2] bg-[#091217] backdrop-blur-sm border border-[#02b36d30] hover:bg-[#0a1419] hover:border-[#02b36d] rounded-lg transition-all duration-200 shadow-md font-mono tracking-wider modal-btn-cyberpunk"
                >
                  BACK
                </button>
                <button
                  onClick={handleTransfer}
                  disabled={!isConfirmed || isSubmitting}
                  className={`px-5 py-2.5 rounded-lg shadow-lg flex items-center transition-all duration-300 font-mono tracking-wider
                            ${!isConfirmed || isSubmitting
                              ? 'bg-[#02b36d50] text-[#050a0e80] cursor-not-allowed opacity-50' 
                              : 'bg-[#02b36d] text-[#050a0e] hover:bg-[#02b36d] transform hover:-translate-y-0.5 modal-btn-cyberpunk'}`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-[#050a0e80] border-t-transparent animate-spin mr-2"></div>
                      PROCESSING...
                    </>
                  ) : (
                    "TRANSFER"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Cyberpunk decorative corner elements */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#02b36d] opacity-70"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#02b36d] opacity-70"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#02b36d] opacity-70"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#02b36d] opacity-70"></div>
      </div>
    </div>,
    document.body
  );
};