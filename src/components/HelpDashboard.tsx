import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, Settings2, Play, Swords, Minimize2, BarChart2, ShieldAlert, Zap, Layers, Server } from 'lucide-react';
import { Button } from './ui/Button';

interface HelpDashboardProps {
  onClose: () => void;
}

type TabType = 'getting-started' | 'features' | 'privacy';

export const HelpDashboard: React.FC<HelpDashboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('getting-started');

  const tabs = [
    { id: 'getting-started', label: 'Getting Started', icon: <Zap className="w-4 h-4" /> },
    { id: 'features', label: 'Core Features', icon: <Layers className="w-4 h-4" /> },
    { id: 'privacy', label: 'Privacy & Data', icon: <ShieldAlert className="w-4 h-4" /> },
  ];

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
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Help & User Guide</h2>
              <p className="text-sm text-gray-400">Master Prompt Architect's workflows and features.</p>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="md:w-64 border-r border-white/10 bg-black/10 p-4 space-y-2 overflow-y-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white border border-white/5 shadow-inner'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar bg-[#0B0D17]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                {activeTab === 'getting-started' && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-white mb-6">Getting Started</h3>
                      
                      <div className="bg-black/30 border border-white/5 p-6 rounded-xl space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400"><Settings2 className="w-5 h-5"/></div>
                          <h4 className="text-lg font-semibold text-white">1. Configure a Provider</h4>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">
                          Before running prompts, open the <strong className="text-gray-300">SETTINGS</strong> menu in the top right. 
                          You can connect to cloud providers (like Gemini or ChatGPT) using your API keys, or select 
                          <strong className="text-gray-300"> Local (Ollama)</strong> to run models completely offline on your own machine.
                        </p>
                      </div>

                      <div className="bg-black/30 border border-white/5 p-6 rounded-xl space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400"><Play className="w-5 h-5"/></div>
                          <h4 className="text-lg font-semibold text-white">2. Initialize a Prompt</h4>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">
                          Enter your raw idea or goal into the main input box. The system will use your connected LLM to break 
                          your idea down into a structured framework (Role, Task, Context, Format, Constraints).
                        </p>
                      </div>

                      <div className="bg-black/30 border border-white/5 p-6 rounded-xl space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="bg-amber-500/20 p-2 rounded-lg text-amber-400"><Layers className="w-5 h-5"/></div>
                          <h4 className="text-lg font-semibold text-white">3. Generate Variations</h4>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">
                          Once your components are structured, click <strong className="text-gray-300">Generate Variations</strong>. 
                          The tool will propose multiple distinct approaches to your prompt, allowing you to test which phrasing yields the best results.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'features' && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-white mb-6">Core Features</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-black/20 border border-white/5 p-5 rounded-xl">
                          <div className="flex items-center gap-2 text-amber-400 mb-3">
                            <Swords className="w-5 h-5"/>
                            <h4 className="font-bold">Battle Arena</h4>
                          </div>
                          <p className="text-sm text-gray-400">
                            Select exactly two prompt variations and click <strong className="text-gray-300">Start Arena Battle</strong>. 
                            The LLM will test both side-by-side, act as an impartial judge, and declare a winner based on which output better meets your constraints.
                          </p>
                        </div>

                        <div className="bg-black/20 border border-white/5 p-5 rounded-xl">
                          <div className="flex items-center gap-2 text-cyan-400 mb-3">
                            <Minimize2 className="w-5 h-5"/>
                            <h4 className="font-bold">Token Compression</h4>
                          </div>
                          <p className="text-sm text-gray-400">
                            Long prompts cost more API credits. Use the <strong className="text-gray-300">COMPRESS</strong> tool to minimize 
                            the token count of your prompt while preserving the exact semantic meaning and keywords.
                          </p>
                        </div>

                        <div className="bg-black/20 border border-white/5 p-5 rounded-xl">
                          <div className="flex items-center gap-2 text-pink-400 mb-3">
                            <BarChart2 className="w-5 h-5"/>
                            <h4 className="font-bold">Analytics Dashboard</h4>
                          </div>
                          <p className="text-sm text-gray-400">
                            Track your prompt engineering efficiency. See how much estimated money you've saved via compression, 
                            which providers you use most, and which models dominate the Battle Arena.
                          </p>
                        </div>

                        <div className="bg-black/20 border border-white/5 p-5 rounded-xl">
                          <div className="flex items-center gap-2 text-emerald-400 mb-3">
                            <Server className="w-5 h-5"/>
                            <h4 className="font-bold">Local Ollama Support</h4>
                          </div>
                          <p className="text-sm text-gray-400">
                            Fully offline support. Run models like <code className="text-xs bg-black/40 px-1 py-0.5 rounded">llama3.1</code> locally. 
                            Ensure you run Ollama with <code className="text-xs bg-black/40 px-1 py-0.5 rounded">OLLAMA_ORIGINS="*"</code> to allow browser connections.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'privacy' && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-white mb-6">Privacy & Data Handling</h3>
                      
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-xl">
                        <h4 className="text-lg font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                          <ShieldAlert className="w-5 h-5"/> Local-First Architecture
                        </h4>
                        <p className="text-gray-300 text-sm leading-relaxed mb-4">
                          Prompt Architect is designed to respect your privacy and protect your intellectual property. 
                          <strong className="text-white"> We do not have a backend server.</strong>
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-sm text-gray-400">
                          <li><strong className="text-gray-300">API Keys</strong> are encrypted using AES-256 and stored exclusively in your browser's local storage.</li>
                          <li><strong className="text-gray-300">Prompts & Outputs</strong> are saved to your browser's IndexedDB. They are never transmitted anywhere except directly to your chosen LLM provider.</li>
                          <li><strong className="text-gray-300">Analytics</strong> are calculated entirely on your machine. No telemetry is sent back to the developers.</li>
                        </ul>
                      </div>
                      
                      <div className="bg-black/30 border border-white/5 p-6 rounded-xl mt-4">
                        <h4 className="text-base font-semibold text-white mb-2">Offline Mode</h4>
                        <p className="text-gray-400 text-sm">
                          If you disconnect from the internet, the app will instantly block all requests to cloud providers (Gemini, ChatGPT, etc.) 
                          to prevent hanging. However, if you have Ollama running locally, you can continue to use the application with zero disruption.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
