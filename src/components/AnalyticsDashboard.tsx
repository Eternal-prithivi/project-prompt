import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, BarChart2, Activity, Zap, Coins, Trophy, Hash } from 'lucide-react';
import { Button } from './ui/Button';
import { getTelemetryData, TelemetryData } from '../services/utils/telemetryService';

interface AnalyticsDashboardProps {
  onClose: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onClose }) => {
  const [data, setData] = useState<TelemetryData | null>(null);

  useEffect(() => {
    setData(getTelemetryData());
    
    // Optional: Auto-refresh data every 5 seconds if left open
    const interval = setInterval(() => {
      setData(getTelemetryData());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return null;

  const totalProviders = Object.values(data.providerUsage).reduce((a, b) => a + b, 0);
  const providerEntries = Object.entries(data.providerUsage).sort((a, b) => b[1] - a[1]);
  
  const totalBattles = Object.values(data.battleWins).reduce((a, b) => a + b, 0);
  const battleEntries = Object.entries(data.battleWins).sort((a, b) => b[1] - a[1]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Analytics & Telemetry</h2>
              <p className="text-sm text-gray-400">Local usage metrics and estimated cost savings</p>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {/* Top Level Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/30 border border-white/5 rounded-xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Zap className="w-24 h-24" />
              </div>
              <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl mb-3">
                <Zap className="w-6 h-6" />
              </div>
              <p className="text-gray-400 text-sm font-medium mb-1">Total Prompts Executed</p>
              <h3 className="text-3xl font-bold text-white tracking-tight">{data.totalPromptsRun}</h3>
            </div>
            
            <div className="bg-black/30 border border-white/5 rounded-xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Hash className="w-24 h-24" />
              </div>
              <div className="p-3 bg-green-500/20 text-green-400 rounded-xl mb-3">
                <Hash className="w-6 h-6" />
              </div>
              <p className="text-gray-400 text-sm font-medium mb-1">Tokens Compressed</p>
              <h3 className="text-3xl font-bold text-white tracking-tight">{data.totalTokensCompressed.toLocaleString()}</h3>
            </div>
            
            <div className="bg-black/30 border border-white/5 rounded-xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Coins className="w-24 h-24" />
              </div>
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl mb-3">
                <Coins className="w-6 h-6" />
              </div>
              <p className="text-gray-400 text-sm font-medium mb-1">Estimated Cost Saved</p>
              <h3 className="text-3xl font-bold text-white tracking-tight">${data.estimatedCostSaved.toFixed(3)}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Provider Usage */}
            <div className="bg-black/20 border border-white/5 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart2 className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-medium text-white">Provider Usage</h3>
              </div>
              
              {providerEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No provider data yet</div>
              ) : (
                <div className="space-y-4">
                  {providerEntries.map(([provider, count]) => {
                    const percentage = Math.round((count / totalProviders) * 100);
                    return (
                      <div key={provider} className="relative">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300 font-medium capitalize">{provider}</span>
                          <span className="text-gray-400">{count} runs ({percentage}%)</span>
                        </div>
                        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="h-full bg-blue-500 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Battle Arena Leaderboard */}
            <div className="bg-black/20 border border-white/5 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-medium text-white">Arena Win Leaderboard</h3>
              </div>
              
              {battleEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No battle arena wins yet</div>
              ) : (
                <div className="space-y-4">
                  {battleEntries.map(([model, wins], idx) => {
                    const percentage = Math.round((wins / totalBattles) * 100);
                    return (
                      <div key={model} className="flex items-center gap-4 bg-gray-800/50 p-3 rounded-lg border border-white/5">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 border border-white/10 text-white font-bold">
                          #{idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{model}</p>
                          <div className="w-full bg-gray-900 h-1.5 mt-2 rounded-full overflow-hidden">
                             <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1, delay: 0.3 }}
                                className="h-full bg-amber-500 rounded-full"
                              />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">{wins}</div>
                          <div className="text-xs text-gray-400 uppercase tracking-wider">Wins</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          <p className="text-xs text-center text-gray-500 mt-4">
            Data is stored locally on your device. We do not transmit telemetry to any external servers.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
