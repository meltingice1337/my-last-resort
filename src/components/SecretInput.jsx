import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function SecretInput({
    secretText,
    onSecretChange,
    numShares,
    onNumSharesChange,
    threshold,
    onThresholdChange,
    onGenerate
}) {
    return (
        <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 md:p-8 backdrop-blur">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">This is my last recovery plan</h2>
            <p className="text-sm text-gray-300 mb-4">Split this secret into secure shares with people I trust.</p>

            <div className="mb-4 sm:mb-6">
                <label className="block text-sm font-semibold mb-2 text-gray-300">Your Secret Information</label>
                <textarea
                    value={secretText}
                    onChange={(e) => onSecretChange(e.target.value)}
                    placeholder="Example:&#10;&#10;My Wallet Keys&#10;Main seed phrase: witch collapse practice feed shame...&#10;&#10;Cold Storage Instructions&#10;Location: Safe deposit box&#10;Pin: ...&#10;&#10;Emergency Access&#10;Email passwords, backup codes, etc."
                    className="w-full h-48 sm:h-56 md:h-64 bg-slate-900 border border-slate-700 rounded-lg p-3 sm:p-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-base resize-none touch-manipulation"
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">
                        How many people?
                    </label>
                    <input
                        type="number"
                        value={numShares}
                        onChange={(e) => onNumSharesChange(Math.max(2, Math.min(10, parseInt(e.target.value) || 2)))}
                        min="2"
                        max="10"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 text-base touch-manipulation"
                    />
                    <p className="text-xs text-gray-400 mt-1">Number of people who will hold a piece (2-10)</p>
                </div>

                <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">
                        How many to unlock?
                    </label>
                    <input
                        type="number"
                        value={threshold}
                        onChange={(e) => onThresholdChange(Math.max(2, Math.min(numShares, parseInt(e.target.value) || 2)))}
                        min="2"
                        max={numShares}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 text-base touch-manipulation"
                    />
                    <p className="text-xs text-gray-400 mt-1">Minimum pieces needed to recover (must have all {threshold})</p>
                </div>
            </div>

            <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="flex gap-2 sm:gap-3">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs sm:text-sm text-blue-200">
                        <strong>Sweet spot:</strong> 5 people with 3 needed. One person loses their piece? Still safe. Two don't show up? Still works. You're covered either way.
                    </div>
                </div>
            </div>

            <button
                onClick={onGenerate}
                disabled={!secretText.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 active:from-purple-500 active:to-pink-500 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg transition-all transform active:scale-95 sm:hover:scale-105 touch-manipulation"
            >
                Create Your Recovery Plan
            </button>
        </div>
    );
}
