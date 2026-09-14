import React, { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';

interface WalletInputProps {
  currentAddress: string;
  onSearch: (address: string) => void;
  isLoading: boolean;
}

export const WalletInput: React.FC<WalletInputProps> = ({ currentAddress, onSearch, isLoading }) => {
  const [inputVal, setInputVal] = useState(currentAddress);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputVal.trim();
    if (!clean) {
      setErrorMsg('Please enter an EVM wallet address.');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(clean)) {
      setErrorMsg('Enter a valid Ethereum address (0x + 40 hex characters).');
      return;
    }
    setErrorMsg(null);
    onSearch(clean);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-2.5 sm:items-stretch">
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="0x000000...000"
            className="input input-mono pr-11"
            spellCheck={false}
            autoComplete="off"
            autoFocus
          />
          {inputVal && (
            <button
              type="button"
              onClick={() => setInputVal('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#6c6f75] hover:text-white hover:bg-white/10 transition-colors"
              title="Clear"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <button type="submit" disabled={isLoading} className="btn shrink-0 justify-center !rounded-[12px]">
          {isLoading ? 'Checking…' : 'Inspect'}
          {!isLoading && <ArrowRight size={14} strokeWidth={2.6} />}
        </button>
      </div>

      {errorMsg && (
        <p className="mt-3 flex items-center gap-2 text-sm font-medium text-[#f03277] animate-fadeIn" role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <path d="M12 8v5M12 16.5v.5" /><circle cx="12" cy="12" r="9" />
          </svg>
          {errorMsg}
        </p>
      )}
    </form>
  );
};
