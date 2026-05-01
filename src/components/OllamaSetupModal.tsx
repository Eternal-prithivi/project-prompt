import React, { useState, useEffect } from 'react';
import {
  getSystemInfo,
  getInstallInstructions,
  getModelRecommendations,
  loadUserHardwareSelection,
  saveUserHardwareSelection,
  type GPUType,
  type MacChipType,
  type ModelRecommendation,
} from '../services/systemInfo';

interface OllamaSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const MAC_CHIP_OPTIONS: MacChipType[] = [
  'M1', 'M1 Pro', 'M1 Max',
  'M2', 'M2 Pro', 'M2 Max',
  'M3', 'M3 Pro', 'M3 Max',
  'M4', 'M4 Pro', 'M4 Max',
];

export const OllamaSetupModal: React.FC<OllamaSetupModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'check' | 'hardware' | 'install' | 'waiting' | 'models'>('check');
  const [installInstructions, setInstallInstructions] = useState('');
  const [copied, setCopied] = useState(false);
  const [userSelectedRAM, setUserSelectedRAM] = useState<number>(8);
  const [userSelectedGPU, setUserSelectedGPU] = useState<GPUType>('none');
  const [userSelectedChip, setUserSelectedChip] = useState<MacChipType | undefined>(undefined);
  const [recommendations, setRecommendations] = useState<ModelRecommendation[]>([]);

  useEffect(() => {
    if (isOpen) {
      checkSystem();
    }
  }, [isOpen]);

  const checkSystem = async () => {
    setLoading(true);
    try {
      const info = await getSystemInfo();
      setSystemInfo(info);

      // Load previously saved hardware selection
      const savedSelection = loadUserHardwareSelection();
      if (savedSelection.ramGB && savedSelection.gpuType) {
        setUserSelectedRAM(savedSelection.ramGB);
        setUserSelectedGPU(savedSelection.gpuType);
        if (savedSelection.chipType) {
          setUserSelectedChip(savedSelection.chipType);
        }
        const recs = getModelRecommendations(savedSelection.ramGB, savedSelection.gpuType, savedSelection.chipType);
        setRecommendations(recs);
        setInstallInstructions(getInstallInstructions(info.os, recs[0]?.model));

        // If Ollama already running, skip to models; else to install
        if (info.ollamaRunning) {
          setStep('models');
        } else if (info.canRunOllama) {
          setStep('install');
        } else {
          setStep('check');
        }
      } else {
        // No saved selection, need to ask user about hardware
        if (info.canRunOllama) {
          setStep('hardware');
        } else {
          setStep('check');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleHardwareSelect = (ram: number, gpu: GPUType, chip?: MacChipType) => {
    setUserSelectedRAM(ram);
    setUserSelectedGPU(gpu);
    if (chip) {
      setUserSelectedChip(chip);
    }
    const recs = getModelRecommendations(ram, gpu, chip);
    setRecommendations(recs);
    setInstallInstructions(getInstallInstructions(systemInfo.os, recs[0]?.model));
    saveUserHardwareSelection(ram, gpu, chip);
    setStep('install');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20">
        {/* Header - Modern Gradient */}
        <div className="bg-gradient-to-br from-emerald-600 via-green-500 to-teal-600 p-8 border-b border-white/10">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">🚀</span>
                <h2 className="text-3xl font-bold text-white">Ollama Setup</h2>
              </div>
              <p className="text-green-100 text-sm font-medium">Run powerful AI models locally on your computer</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close Ollama setup"
              className="text-white/80 hover:text-white text-2xl font-bold hover:scale-110 transition-transform"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block">
                <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
              </div>
              <p className="text-gray-600 mt-4">Checking your system...</p>
            </div>
          ) : step === 'check' && !systemInfo?.canRunOllama ? (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-semibold">⚠️ System Not Compatible</p>
                <p className="text-red-700 mt-2">{systemInfo?.reason}</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-blue-900 mb-3">💡 Alternative: Try Cloud AI (Free)</p>
                <div className="space-y-2">
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2 bg-white border border-blue-200 rounded hover:bg-blue-50 text-blue-600"
                  >
                    → Google Gemini (Free tier available)
                  </a>
                  <a
                    href="https://console.anthropic.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2 bg-white border border-blue-200 rounded hover:bg-blue-50 text-blue-600"
                  >
                    → Claude (Free $5 credits)
                  </a>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium"
              >
                Close
              </button>
            </div>
          ) : step === 'hardware' ? (
            <div className="space-y-6">
              {/* System Detection Summary - Premium Card */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-200 shadow-sm">
                <p className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-xl">✓</span> Detected System
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white/70 rounded-lg p-3 backdrop-blur">
                    <p className="text-blue-600 font-medium text-xs uppercase tracking-wide">OS</p>
                    <p className="font-mono text-gray-900 text-base mt-1">{systemInfo?.os}</p>
                  </div>
                  {systemInfo?.chipType && systemInfo?.os === 'Mac' && (
                    <div className="bg-white/70 rounded-lg p-3 backdrop-blur">
                      <p className="text-blue-600 font-medium text-xs uppercase tracking-wide">Chip</p>
                      <p className="font-mono text-gray-900 text-base mt-1">{systemInfo?.chipType}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* RAM Selection with Slider - Premium */}
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <label className="font-semibold text-gray-900 flex items-center gap-2">
                    <span className="text-xl">💾</span> RAM Memory
                  </label>
                  <div className="bg-gradient-to-r from-green-100 to-emerald-100 px-4 py-2 rounded-lg border border-green-300">
                    <p className="text-lg font-bold text-green-700">{userSelectedRAM}GB</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <input
                    type="range"
                    min="1"
                    max="128"
                    step="1"
                    value={userSelectedRAM}
                    onChange={(e) => {
                      const newRAM = parseInt(e.target.value);
                      setUserSelectedRAM(newRAM);
                      const recs = getModelRecommendations(newRAM, userSelectedGPU, userSelectedChip);
                      setRecommendations(recs);
                    }}
                    className="w-full h-3 bg-gradient-to-r from-gray-300 to-green-400 rounded-full appearance-none cursor-pointer accent-green-600 shadow-sm"
                  />
                  <div className="flex justify-between text-xs font-medium text-gray-600 px-1">
                    <span>1GB</span>
                    <span>128GB</span>
                  </div>
                </div>
              </div>

              {/* Mac Chip Selection - Premium */}
              {systemInfo?.os === 'Mac' && (
                <div className="space-y-3">
                  <label className="font-semibold text-gray-900 flex items-center gap-2">
                    <span className="text-xl">🍎</span> Mac Chip Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {MAC_CHIP_OPTIONS.map((chip) => (
                      <button
                        key={chip}
                        onClick={() => {
                          setUserSelectedChip(chip);
                          const recs = getModelRecommendations(userSelectedRAM, userSelectedGPU, chip);
                          setRecommendations(recs);
                        }}
                        className={`p-3 rounded-lg border-2 text-sm font-medium transition-all duration-200 ${
                          userSelectedChip === chip
                            ? 'bg-emerald-100 border-emerald-500 text-emerald-900 shadow-md'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* GPU Selection - Premium Cards */}
              <div className="space-y-3">
                <label className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-xl">🎮</span> GPU Support
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'none' as const, label: 'CPU Only', desc: 'No GPU', icon: '💻' },
                    { value: 'apple-metal' as const, label: 'Apple Metal', desc: 'Built-in acceleration', icon: '🍎' },
                    { value: 'nvidia' as const, label: 'NVIDIA GPU', desc: 'CUDA 11.8+ required', icon: '⚙️' },
                    { value: 'amd' as const, label: 'AMD GPU', desc: 'ROCm 5.2+ required', icon: '⚙️' },
                    { value: 'intel-arc' as const, label: 'Intel Arc', desc: 'GPU driver required', icon: '⚙️' },
                  ].map((gpu) => (
                    <button
                      key={gpu.value}
                      onClick={() => {
                        setUserSelectedGPU(gpu.value);
                        const recs = getModelRecommendations(userSelectedRAM, gpu.value, userSelectedChip);
                        setRecommendations(recs);
                      }}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                        userSelectedGPU === gpu.value
                          ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-400 shadow-md'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{gpu.icon}</span>
                          <div>
                            <p className={`font-semibold ${userSelectedGPU === gpu.value ? 'text-emerald-900' : 'text-gray-900'}`}>
                              {gpu.label}
                            </p>
                            <p className="text-xs text-gray-600">{gpu.desc}</p>
                          </div>
                        </div>
                        {userSelectedGPU === gpu.value && (
                          <span className="text-lg">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Recommendations - Premium */}
              {recommendations.length > 0 && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-200 shadow-sm">
                  <p className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-xl">🎯</span> Recommended Models
                  </p>
                  <div className="space-y-3">
                    {recommendations.slice(0, 3).map((rec, idx) => (
                      <div key={rec.model} className="bg-white rounded-lg p-3 border border-indigo-100 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`font-mono text-sm ${
                              idx === 0 ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                            }`}>
                              {idx === 0 ? '⭐ ' : '• '}{rec.model}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">{rec.reason}</p>
                            {rec.driverWarning && (
                              <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                                <span>⚠️</span> {rec.driverWarning}
                              </p>
                            )}
                          </div>
                          <div className="text-right ml-3 bg-gradient-to-br from-green-50 to-emerald-50 px-3 py-2 rounded-lg">
                            <p className="text-sm font-bold text-green-700">{rec.speedEstimate}</p>
                            <p className="text-xs text-gray-600">per response</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Button - Premium */}
              <button
                onClick={() => {
                  if (userSelectedRAM && userSelectedGPU) {
                    handleHardwareSelect(userSelectedRAM, userSelectedGPU, userSelectedChip);
                  }
                }}
                disabled={!userSelectedRAM || !userSelectedGPU}
                className={`w-full px-6 py-4 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                  userSelectedRAM && userSelectedGPU
                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:shadow-lg hover:scale-105'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>➜</span> Proceed to Installation
              </button>
            </div>
          ) : step === 'install' ? (
            <div className="space-y-6">
              {/* System Info - Premium Card */}
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-5 border border-cyan-200 shadow-sm">
                <p className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-xl">✓</span> Your Configuration
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/70 rounded-lg p-3 backdrop-blur">
                    <p className="text-cyan-600 font-medium text-xs uppercase tracking-wide">OS</p>
                    <p className="font-mono text-gray-900 text-base mt-1">{systemInfo?.os}</p>
                  </div>
                  <div className="bg-white/70 rounded-lg p-3 backdrop-blur">
                    <p className="text-cyan-600 font-medium text-xs uppercase tracking-wide">RAM</p>
                    <p className="font-mono text-gray-900 text-base mt-1">{userSelectedRAM}GB</p>
                  </div>
                  <div className="bg-white/70 rounded-lg p-3 backdrop-blur">
                    <p className="text-cyan-600 font-medium text-xs uppercase tracking-wide">GPU</p>
                    <p className="font-mono text-gray-900 text-base mt-1">{userSelectedGPU === 'none' ? 'CPU' : userSelectedGPU.split('-')[0].toUpperCase()}</p>
                  </div>
                  {userSelectedChip && (
                    <div className="bg-white/70 rounded-lg p-3 backdrop-blur">
                      <p className="text-cyan-600 font-medium text-xs uppercase tracking-wide">Chip</p>
                      <p className="font-mono text-gray-900 text-base mt-1">{userSelectedChip}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Edit Button */}
              <button
                onClick={() => setStep('hardware')}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 rounded-lg hover:shadow-md font-medium text-sm transition-all border border-blue-200"
              >
                ⚙️ Modify Configuration
              </button>

              {/* Recommended Models - Premium */}
              {recommendations.length > 0 && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-200 shadow-sm">
                  <p className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-xl">🎯</span> Recommended Models
                  </p>
                  <div className="space-y-2">
                    {recommendations.slice(0, 3).map((rec, idx) => (
                      <div key={rec.model} className={`rounded-lg p-3 border-2 ${
                        idx === 0
                          ? 'bg-white border-emerald-300 shadow-sm'
                          : 'bg-white border-indigo-100'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`font-mono text-sm ${
                              idx === 0 ? 'text-emerald-700 font-bold' : 'text-gray-700'
                            }`}>
                              {idx === 0 ? '⭐ RECOMMENDED' : '•'} {rec.model}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">{rec.reason}</p>
                          </div>
                          <div className="text-right ml-3 bg-gradient-to-br from-green-50 to-emerald-50 px-3 py-1.5 rounded-lg border border-green-200">
                            <p className="text-sm font-bold text-emerald-700">{rec.speedEstimate}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Installation Steps - Premium */}
              <div className="space-y-3">
                <p className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-xl">📋</span> Installation Steps
                </p>
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-300 rounded-xl p-5 space-y-3 font-mono text-sm">
                  {installInstructions.split('\n').map((line, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <span className="text-gray-400 font-bold min-w-6">{idx + 1}.</span>
                      <p className="text-gray-800 leading-relaxed">{line}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Download Button - Premium */}
              <a
                href="https://ollama.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full block text-center px-6 py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>📥</span> Download Ollama
              </a>

              {/* Copy Command Button - Premium */}
              <button
                onClick={() => copyToClipboard('ollama serve')}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 rounded-lg hover:shadow-md font-medium border border-blue-200 transition-all flex items-center justify-center gap-2"
              >
                <span>{copied ? '✓' : '📋'}</span> {copied ? 'Copied to clipboard!' : 'Copy "ollama serve" command'}
              </button>

              {/* Next Button - Premium */}
              <button
                onClick={() => setStep('waiting')}
                className="w-full px-6 py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 font-semibold flex items-center justify-center gap-2"
              >
                <span>✓</span> Done! Start Ollama
              </button>
            </div>
          ) : step === 'waiting' ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-900 font-semibold">⏳ Waiting for Ollama...</p>
                <p className="text-blue-800 mt-2">Make sure you've run: ollama serve</p>
              </div>

              <button
                onClick={checkSystem}
                className="w-full px-4 py-3 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
              >
                ✓ Check if Ollama is Running
              </button>

              <button
                onClick={() => setStep('install')}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium"
              >
                Back
              </button>
            </div>
          ) : step === 'models' ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-900 font-semibold">✅ Ollama Detected!</p>
                <p className="text-green-800 mt-2">Now select a model to download</p>
              </div>

              <button
                onClick={onComplete}
                className="w-full px-4 py-3 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
              >
                Next: Choose Models
              </button>

              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium"
              >
                Close
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
