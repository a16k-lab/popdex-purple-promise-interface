import React, { useState } from 'react';
import { Wallet, X, ArrowRight } from 'lucide-react';

interface WalletInputProps {
  currentAddress: string;
  onSearch: (address: string) => void;
  isLoading: boolean;
}

export const WalletInput: React.FC<WalletInputProps> = ({
  currentAddress,
  onSearch,
  isLoading,
}) => {
  const [inputVal, setInputVal] = useState(currentAddress);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputVal.trim();
    if (!clean) {
      setErrorMsg('Please enter an EVM wallet address');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(clean)) {
      setErrorMsg('Invalid EVM address format (must start with 0x and be 42 characters)');
      return;
    }
    setErrorMsg(null);
    onSearch(clean);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Search Bar Form */}
      <form onSubmit={handleSubmit} className="relative group">
        <div className="relative flex items-center rounded-2xl bg-[#141518]/90 border border-white/[0.12] group-hover:border-[#8077ff]/40 focus-within:border-[#8077ff] focus-within:shadow-[0_0_25px_rgba(128,119,255,0.25)] transition-all duration-300 backdrop-blur-xl p-1.5">
          {/* Left Wallet Icon */}
          <div className="pl-3.5 pr-2 text-[#a0a3a7] group-hover:text-[#8077ff] transition-colors">
            <Wallet size={20} />
          </div>

          {/* Input Element */}
          <input
            type="text"
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="Enter EVM Wallet Address (0x...) and press Enter"
            className="w-full bg-transparent px-2 py-3 text-sm sm:text-base font-mono text-white placeholder-white/30 focus:outline-none"
            spellCheck={false}
            autoComplete="off"
            autoFocus
          />

          {/* Clear Button */}
          {inputVal && (
            <button
              type="button"
              onClick={() => setInputVal('')}
              className="p-1.5 mr-1 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Clear input"
            >
              <X size={16} />
            </button>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#4d42fc] to-[#645aff] hover:from-[#5b51fd] hover:to-[#786fff] text-white text-sm font-semibold shadow-[0_0_20px_rgba(77,66,252,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Checking...</span>
              </span>
            ) : (
              <>
                <span>Inspect</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>

        {/* Validation Error Message */}
        {errorMsg && (
          <p className="absolute -bottom-6 left-2 text-xs text-rose-400 font-medium animate-fadeIn">
            {errorMsg}
          </p>
        )}
      </form>
    </div>
  );
};
