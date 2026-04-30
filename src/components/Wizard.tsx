import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Sparkles, Send, RefreshCw, Copy, Check, ChevronLeft, Download, History, Play, Wand2, X, Terminal, FileJson, Library, FileCode2, Target, BarChart2, Swords, Coins, Minimize2, Settings2, ShieldAlert, Info } from 'lucide-react';
import { analyzePrompt, generateVariations, magicRefine, runPrompt, generateExamples, integrateAnswers, compressPrompt, judgeArenaOutputs, initializeProvider } from '../services/geminiService';
import { PromptComponents, PromptVariation, WizardStep, HistoryItem, JudgeVerdict } from '../types';
import { Button } from './ui/Button';
import { Card, Input, Textarea } from './ui/Inputs';
import { cn } from '../lib/utils';
import { getCredentials, saveCredentials, credentialsToConfig, StoredCredentials, isCredentialsLocked, unlockCredentials, setCredentialPassword } from '../services/credentialStore';
import { validateGeminiKey, validateDeepseekKey, validateOllamaConnection, getOllamaModels } from '../services/providers/validation';
import { ProviderConfig } from '../services/types/ILLMProvider';
import { safeErrorMessage } from '../services/utils/errors';
import { IncidentDisplay } from './IncidentDisplay';
import { OllamaSetupModal } from './OllamaSetupModal';
import { ModelGallery } from './ModelGallery';
import { getSystemInfo } from '../services/systemInfo';
import { savePreservedState, getPreservedState, clearPreservedState, hasPreservedState, restorePreservedState } from '../services/utils/statePreservation';

const MetricBar = ({ label, score }: { label: string, score: number }) => (
  <div className="bg-black/20 border border-white/5 p-3 rounded-xl flex flex-col items-center shadow-inner">
    <span className="text-[10px] uppercase text-white/50 mb-1 tracking-widest">{label}</span>
    <span className="text-xl font-mono font-bold text-indigo-400">{score}</span>
    <div className="w-full bg-white/10 h-1.5 mt-2 rounded-full overflow-hidden">
       <div className={cn("h-full transition-all duration-1000", score > 80 ? "bg-emerald-500" : score > 50 ? "bg-amber-400" : "bg-red-500")} style={{ width: `${score}%` }} />
    </div>
  </div>
);

const downloadBlob = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = filename; a.click(); URL.revokeObjectURL(url);
};

const VariationCard: React.FC<{
  result: PromptVariation,
  onUpdateContent: (id: string, newContent: string) => void,
  onToggleArena: (id: string) => void,
  isSelectedForArena: boolean,
  isArenaFull: boolean,
  selectedEngine: 'local' | 'gemini' | 'deepseek' | 'chatgpt' | 'claude' | 'grok',
  ollamaUrl?: string,
  ollamaModel?: string,
  ollamaModels?: string[],
}> = ({
  result,
  onUpdateContent,
  onToggleArena,
  isSelectedForArena,
  isArenaFull,
  selectedEngine,
  ollamaUrl,
  ollamaModel,
  ollamaModels = [],
}) => {
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<Error | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Determine available models based on selected engine
  const getDefaultModel = () => {
    if (selectedEngine === 'local' && ollamaModel) return ollamaModel;
    if (selectedEngine === 'gemini') return 'gemini-3.1-pro-preview';
    if (selectedEngine === 'deepseek') return 'deepseek-r1';
    if (selectedEngine === 'chatgpt') return 'gpt-4-turbo';
    if (selectedEngine === 'claude') return 'claude-3-opus';
    if (selectedEngine === 'grok') return 'grok-1';
    return 'gemini-3.1-pro-preview'; // fallback
  };

  const [testModel, setTestModel] = useState(getDefaultModel());

  // Update testModel when selectedEngine or ollamaModel changes
  useEffect(() => {
    setTestModel(getDefaultModel());
  }, [selectedEngine, ollamaModel, ollamaModels]);

  const getAvailableModels = () => {
    if (selectedEngine === 'local') {
      return ollamaModels.length > 0 ? ollamaModels : (ollamaModel ? [ollamaModel] : []);
    }
    if (selectedEngine === 'gemini') {
      return ['gemini-3.1-pro-preview', 'gemini-3-flash-preview'];
    }
    if (selectedEngine === 'deepseek') {
      return ['deepseek-r1', 'deepseek-chat'];
    }
    if (selectedEngine === 'chatgpt') {
      return ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
    }
    if (selectedEngine === 'claude') {
      return ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'];
    }
    if (selectedEngine === 'grok') {
      return ['grok-1', 'grok-beta'];
    }
    return [];
  };

  const getModelLabel = (model: string) => {
    if (selectedEngine === 'local') return model;
    if (model.includes('flash')) return '3.0 Flash (Fast/Cheap)';
    if (model.includes('pro')) return '3.1 Pro (Genius)';
    return model;
  };

  const getEngineLabel = () => {
    if (selectedEngine === 'local') return ollamaModel || 'Local Model';
    if (selectedEngine === 'gemini') return testModel.includes('flash') ? 'Gemini Flash' : 'Gemini Pro';
    if (selectedEngine === 'deepseek') return 'DeepSeek';
    if (selectedEngine === 'chatgpt') return 'ChatGPT';
    if (selectedEngine === 'claude') return 'Claude';
    if (selectedEngine === 'grok') return 'Grok';
    return testModel;
  };

  // Extract variables formatted as [UPPERCASE_VARS]
  const vars = useMemo(() => {
    const matches = [...result.content.matchAll(/\[([A-Z0-9_]+)\]/g)];
    return [...new Set(matches.map(m => m[1]))];
  }, [result.content]);

  // Replace content with live variable states
  const resolvedContent = useMemo(() => {
    return vars.reduce((text, v) => {
      const val = varValues[v] || `[${v}]`;
      return text.replace(new RegExp(`\\[${v}\\]`, 'g'), val);
    }, result.content);
  }, [vars, varValues, result.content]);

  // Estimate Tokens
  const estimatedTokens = Math.ceil(resolvedContent.length / 4);
  const estimatedCostPer10k = ((estimatedTokens / 10000) * 0.015).toFixed(4); // approx

  const handleTest = async () => {
    setIsTesting(true);
    setTestError(null);
    setTestResult(`Connecting to ${testModel}...`);
    try {
      if (selectedEngine === 'local') {
        const health = await validateOllamaConnection(ollamaUrl || 'http://localhost:11434');
        if (!health.valid) {
          throw new Error(health.error || 'Cannot connect to Ollama. Is it running? Try: ollama serve');
        }
      }
      const res = await runPrompt(resolvedContent, testModel);
      if (isMountedRef.current) {
        setTestResult(res);
        setTestError(null);
      }
    } catch(e: any) {
      if (isMountedRef.current) {
        setTestError(e);
        setTestResult(null);
      }
    } finally {
      if (isMountedRef.current) setIsTesting(false);
    }
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(resolvedContent);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleCompress = async () => {
    setIsCompressing(true);
    try {
      const compressed = await compressPrompt(result.content);
      onUpdateContent(result.id, compressed);
    } catch(e) {
      console.error(e);
    } finally {
      setIsCompressing(false);
    }
  };

  const exportTS = () => {
    let code = '';
    if (selectedEngine === 'local') {
      code = `// Using Ollama local model\nimport fetch from 'node-fetch';\n\nasync function run() {\n  const response = await fetch('${ollamaUrl || 'http://localhost:11434'}/api/chat', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({\n      model: '${testModel}',\n      messages: [{ role: 'user', content: \`${resolvedContent.replace(/`/g, '\\`')}\` }],\n      stream: false,\n    }),\n  });\n  const data = await response.json();\n  console.log(data.message.content);\n}\n\nrun();`;
    } else if (selectedEngine === 'gemini') {
      code = `import { GoogleGenAI } from "@google/genai";\n\nconst ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });\n\nasync function run() {\n  const response = await ai.models.generateContent({\n    model: "${testModel}",\n    contents: \`${resolvedContent.replace(/`/g, '\\`')}\`\n  });\n  console.log(response.text);\n}\n\nrun();`;
    } else if (selectedEngine === 'chatgpt') {
      code = `import OpenAI from "openai";\n\nconst openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });\n\nasync function run() {\n  const response = await openai.chat.completions.create({\n    model: "${testModel}",\n    messages: [{ role: "user", content: \`${resolvedContent.replace(/`/g, '\\`')}\` }],\n  });\n  console.log(response.choices[0].message.content);\n}\n\nrun();`;
    } else if (selectedEngine === 'claude') {
      code = `import Anthropic from "@anthropic-ai/sdk";\n\nconst client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });\n\nasync function run() {\n  const response = await client.messages.create({\n    model: "${testModel}",\n    max_tokens: 1024,\n    messages: [{ role: "user", content: \`${resolvedContent.replace(/`/g, '\\`')}\` }],\n  });\n  console.log(response.content[0].text);\n}\n\nrun();`;
    } else if (selectedEngine === 'deepseek') {
      code = `import OpenAI from "openai";\n\nconst openai = new OpenAI({\n  apiKey: process.env.DEEPSEEK_API_KEY,\n  baseURL: "https://api.deepseek.com",\n});\n\nasync function run() {\n  const response = await openai.chat.completions.create({\n    model: "${testModel}",\n    messages: [{ role: "user", content: \`${resolvedContent.replace(/`/g, '\\`')}\` }],\n  });\n  console.log(response.choices[0].message.content);\n}\n\nrun();`;
    } else if (selectedEngine === 'grok') {
      code = `import OpenAI from "openai";\n\nconst openai = new OpenAI({\n  apiKey: process.env.GROK_API_KEY,\n  baseURL: "https://api.x.ai/v1",\n});\n\nasync function run() {\n  const response = await openai.chat.completions.create({\n    model: "${testModel}",\n    messages: [{ role: "user", content: \`${resolvedContent.replace(/`/g, '\\`')}\` }],\n  });\n  console.log(response.choices[0].message.content);\n}\n\nrun();`;
    } else {
      code = `// Update with your provider endpoint and API key\n\nasync function run() {\n  const response = await fetch('your-endpoint', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({ prompt: \`${resolvedContent.replace(/`/g, '\\`')}\` }),\n  });\n  const data = await response.json();\n  console.log(data);\n}\n\nrun();`;
    }
    downloadBlob(code, `prompt_${result.type}.ts`, 'text/typescript');
  };

  const exportPY = () => {
    let code = '';
    if (selectedEngine === 'local') {
      code = `import requests\nimport json\n\nresponse = requests.post(\n    '${ollamaUrl || 'http://localhost:11434'}/api/chat',\n    json={\n        'model': '${testModel}',\n        'messages': [{'role': 'user', 'content': """${resolvedContent.replace(/"""/g, '\"\"\"')}"""}],\n        'stream': False,\n    },\n)\ndata = response.json()\nprint(data['message']['content'])`;
    } else if (selectedEngine === 'gemini') {
      code = `import os\nimport google.generativeai as genai\n\ngenai.configure(api_key=os.getenv('GEMINI_API_KEY'))\nmodel = genai.GenerativeModel('${testModel}')\n\nresponse = model.generate_content("""${resolvedContent.replace(/"""/g, '\"\"\"')}""")\nprint(response.text)`;
    } else if (selectedEngine === 'chatgpt') {
      code = `import os\nfrom openai import OpenAI\n\nclient = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))\n\nresponse = client.chat.completions.create(\n    model='${testModel}',\n    messages=[{'role': 'user', 'content': """${resolvedContent.replace(/"""/g, '\"\"\"')}"""}],\n)\nprint(response.choices[0].message.content)`;
    } else if (selectedEngine === 'claude') {
      code = `import os\nfrom anthropic import Anthropic\n\nclient = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))\n\nresponse = client.messages.create(\n    model='${testModel}',\n    max_tokens=1024,\n    messages=[{'role': 'user', 'content': """${resolvedContent.replace(/"""/g, '\"\"\"')}"""}],\n)\nprint(response.content[0].text)`;
    } else if (selectedEngine === 'deepseek') {
      code = `import os\nfrom openai import OpenAI\n\nclient = OpenAI(\n    api_key=os.getenv('DEEPSEEK_API_KEY'),\n    base_url='https://api.deepseek.com',\n)\n\nresponse = client.chat.completions.create(\n    model='${testModel}',\n    messages=[{'role': 'user', 'content': """${resolvedContent.replace(/"""/g, '\"\"\"')}"""}],\n)\nprint(response.choices[0].message.content)`;
    } else if (selectedEngine === 'grok') {
      code = `import os\nfrom openai import OpenAI\n\nclient = OpenAI(\n    api_key=os.getenv('GROK_API_KEY'),\n    base_url='https://api.x.ai/v1',\n)\n\nresponse = client.chat.completions.create(\n    model='${testModel}',\n    messages=[{'role': 'user', 'content': """${resolvedContent.replace(/"""/g, '\"\"\"')}"""}],\n)\nprint(response.choices[0].message.content)`;
    } else {
      code = `# Update with your provider endpoint and API key\n\nimport requests\n\nresponse = requests.post(\n    'your-endpoint',\n    json={'prompt': """${resolvedContent.replace(/"""/g, '\"\"\"')}"""},\n)\nprint(response.json())`;
    }
    downloadBlob(code, `prompt_${result.type}.py`, 'text/x-python');
  };

  return (
    <Card className={cn("relative group p-0 !bg-black/20 flex flex-col transition-all duration-300 border-2", isSelectedForArena ? "border-amber-500/50 shadow-amber-500/20 shadow-xl" : "border-transparent")}>
      <div className="p-6 md:px-8 bg-white/[0.02] border-b border-white/5 flex flex-col xl:flex-row xl:items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className={cn(
              "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest shadow-sm",
              result.type === 'precisionist' ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" :
              result.type === 'creative' ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30" :
              "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            )}>
              {result.type}
            </span>
            <div className="flex items-center gap-2 text-white/40 text-[10px] font-mono bg-black/40 px-2 py-1 rounded border border-white/5">
              <Coins className="w-3 h-3 text-amber-400" />
              <span>≈ {estimatedTokens} Tokens (${estimatedCostPer10k}/10k)</span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white glow-text">{result.title}</h3>
          <p className="text-white/50 text-sm max-w-2xl">{result.description}</p>
          
          <div className="flex items-center gap-2 mt-4 pt-2">
             <Button variant="ghost" size="sm" onClick={handleCompress} disabled={isCompressing} className="bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-xs border border-cyan-500/20 h-7 px-2">
               {isCompressing ? <RefreshCw className="w-3 h-3 mr-1 animate-spin"/> : <Minimize2 className="w-3 h-3 mr-1"/>} COMPRESS
             </Button>
             <Button 
                variant="ghost" size="sm" 
                onClick={() => onToggleArena(result.id)}
                disabled={!isSelectedForArena && isArenaFull}
                className={cn("text-xs border h-7 px-2 transition-all", isSelectedForArena ? "bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30" : "bg-black/20 text-white/40 border-white/10 hover:bg-white/10 hover:text-white")}
             >
                <Swords className="w-3 h-3 mr-1"/> {isSelectedForArena ? 'IN ARENA' : 'ADD TO ARENA'}
             </Button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center xl:justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => downloadBlob(resolvedContent, `prompt_${result.type}.txt`, 'text/plain')} className="bg-white/5 text-xs h-7 px-2">TXT</Button>
          <Button variant="ghost" size="sm" onClick={() => downloadBlob(JSON.stringify(result, null, 2), `prompt_${result.type}.json`, 'application/json')} className="bg-white/5 text-xs h-7 px-2">JSON</Button>
          <Button variant="ghost" size="sm" onClick={exportTS} className="bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 text-xs border border-blue-500/20 h-7 px-2"><FileCode2 className="w-3 h-3 mr-1"/> TS</Button>
          <Button variant="ghost" size="sm" onClick={exportPY} className="bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20 text-xs border border-yellow-500/20 h-7 px-2"><FileCode2 className="w-3 h-3 mr-1"/> PY</Button>
          <Button variant="primary" size="sm" onClick={copyPrompt} className="shadow-none ml-2 h-8">
            {copied ? <Check className="w-4 h-4 mr-1 text-emerald-300" /> : <Copy className="w-4 h-4 mr-1" />} COPY
          </Button>
        </div>
      </div>
      
      <div className="p-6 md:p-8 space-y-6 flex-1 flex flex-col">
        {/* Dynamic Variable Engine */}
        {vars.length > 0 && (
          <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-5 mb-2">
            <h4 className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-4">
              <Target className="w-4 h-4" /> Dynamic Variables Detected
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vars.map(v => (
                <div key={v} className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-indigo-200/50">[{v}]</label>
                  <Input 
                    value={varValues[v] || ''} 
                    onChange={e => setVarValues(prev => ({...prev, [v]: e.target.value}))}
                    placeholder={`Inject value for ${v}...`}
                    className="h-9 bg-black/40 border-indigo-500/30 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resolved Content */}
        <div className="bg-black/60 p-6 rounded-xl font-mono text-sm text-indigo-100/80 whitespace-pre-wrap border border-white/5 leading-loose max-h-[400px] overflow-y-auto selection:bg-indigo-500/40 shadow-inner">
          {resolvedContent}
        </div>

        {/* Testing Area */}
        <div className="pt-4 mt-auto">
          {!testResult && !isTesting ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 bg-black/20 p-2 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 px-3 border border-white/10 rounded-lg bg-black/40 h-10">
                  <Settings2 className="w-4 h-4 text-white/40" />
                  <select
                     value={testModel}
                     onChange={(e: any) => setTestModel(e.target.value)}
                     className="bg-transparent text-xs text-white/70 outline-none border-none py-1 focus:ring-0 cursor-pointer"
                  >
                     {getAvailableModels().map(model => (
                       <option key={model} value={model} className="bg-gray-900">
                         {getModelLabel(model)}
                       </option>
                     ))}
                  </select>
                </div>
                <Button variant="secondary" onClick={handleTest} className="gap-2 border-indigo-500/30 text-indigo-300 shadow-indigo-500/10 shadow-lg h-10">
                  <Play className="w-4 h-4 fill-current"/> Live Resilience Test
                </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 overflow-hidden shadow-emerald-500/5 shadow-2xl">
                <div className="px-4 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase tracking-widest"><Terminal className="w-4 h-4"/> Playground Out ({getEngineLabel()})</h4>
                  {isTesting ? <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin"/> : <Button variant="ghost" size="sm" onClick={()=>{setTestResult(null); setTestError(null);}} className="h-6 px-2 text-xs text-emerald-400/50 hover:text-emerald-400">CLEAR</Button>}
                </div>
                <div className="p-6 font-sans text-sm text-emerald-50 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                  {testError ? (
                    <IncidentDisplay
                      provider={selectedEngine === 'local' ? 'ollama' : selectedEngine}
                      error={testError}
                      showActions={true}
                      context="test"
                      onRetry={handleTest}
                      onSwitchModel={(model) => {
                        setTestModel(model);
                        setTimeout(() => handleTest(), 100);
                      }}
                      availableModels={getAvailableModels()}
                      onClose={() => {
                        setTestError(null);
                        setTestResult(null);
                      }}
                    />
                  ) : isTesting && !testResult?.includes("Error") ? (
                    <IncidentDisplay
                      provider={selectedEngine === 'local' ? 'ollama' : selectedEngine}
                      isLoading={true}
                    />
                  ) : (
                    testResult
                  )}
                </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export const Wizard = () => {
  const [step, setStep] = useState<WizardStep>('initial');
  const [initialInput, setInitialInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<Error | null>(null);
  const [variationsError, setVariationsError] = useState<Error | null>(null);

  // Provider management
  const [credentials, setCredentials] = useState<StoredCredentials>(getCredentials());
  const [selectedEngine, setSelectedEngine] = useState<'gemini' | 'deepseek' | 'local' | 'chatgpt' | 'claude' | 'grok'>(credentials.selectedEngine);
  const [apiKeys, setApiKeys] = useState({
    gemini: credentials.geminiKey || '',
    deepseek: credentials.deepseekKey || '',
    chatgpt: credentials.chatgptKey || '',
    claude: credentials.claudeKey || '',
    grok: credentials.grokKey || '',
  });
  const [ollamaUrl, setOllamaUrl] = useState(credentials.ollamaUrl);
  const [ollamaModel, setOllamaModel] = useState(credentials.selectedModel);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [validationStatus, setValidationStatus] = useState<Record<string, boolean>>({});
  const [isValidating, setIsValidating] = useState<string | null>(null);

  const [components, setComponents] = useState<PromptComponents>({
    role: '', task: '', context: '', format: '', constraints: '', customPersona: ''
  });
  const [results, setResults] = useState<PromptVariation[]>([]);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [interviewAnswers, setInterviewAnswers] = useState<Record<number, string>>({});

  // Arena states
  const [arenaSelections, setArenaSelections] = useState<string[]>([]);
  const [isArenaModalOpen, setIsArenaModalOpen] = useState(false);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [credentialPassword, setCredentialPasswordState] = useState('');
  const [isCredsLocked, setIsCredsLocked] = useState(false);

  // Ollama Setup Modal states
  const [isOllamaSetupOpen, setIsOllamaSetupOpen] = useState(false);
  const [isModelGalleryOpen, setIsModelGalleryOpen] = useState(false);
  const [suggestedModel, setSuggestedModel] = useState<string>('');

  // Initialize provider on mount
  useEffect(() => {
    const locked = isCredentialsLocked();
    setIsCredsLocked(locked);
    if (locked) {
      setIsSettingsOpen(true);
      setErrorMsg('Credentials are locked. Enter your encryption password in Settings to unlock.');
      return;
    }

    const creds = getCredentials();
    try {
      const config = credentialsToConfig(creds);
      initializeProvider(config);
    } catch (e: any) {
      console.warn('Provider initialization warning:', safeErrorMessage(e));
      setErrorMsg(`Provider initialization failed: ${safeErrorMessage(e)}`);
    }

    // Load history
    const saved = localStorage.getItem('prompt_history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) {}
    }

    // Load Ollama models
    if (ollamaUrl) {
      loadOllamaModels(ollamaUrl);
    }

    // Restore preserved state if available (e.g., after error recovery)
    if (hasPreservedState()) {
      const preserved = getPreservedState();
      if (preserved) {
        const restored = restorePreservedState(preserved);
        if (restored.initialInput) setInitialInput(restored.initialInput);
        if (restored.components) setComponents(restored.components);
        if (restored.interviewAnswers) setInterviewAnswers(restored.interviewAnswers);
        if (restored.results) setResults(restored.results);
        if (restored.arenaSelections) setArenaSelections(restored.arenaSelections);
        if (restored.selectedEngine) setSelectedEngine(restored.selectedEngine);
        if (restored.step) setStep(restored.step);
      }
    }
  }, []);

  const handleUnlockCredentials = () => {
    try {
      setErrorMsg(null);
      const unlocked = unlockCredentials(credentialPassword);
      setCredentials(unlocked);
      setIsCredsLocked(false);
      const config = credentialsToConfig(unlocked);
      initializeProvider(config);
      setErrorMsg(null);
    } catch (e: any) {
      setErrorMsg(`Unlock failed: ${safeErrorMessage(e)}`);
    }
  };

  const loadOllamaModels = async (url: string) => {
    try {
      const models = await getOllamaModels(url);
      setOllamaModels(models);
    } catch (e) {
      console.warn('Could not load Ollama models:', e);
    }
  };

  const handleUpdateVariationContent = (id: string, newContent: string) => {
    setResults(prev => prev.map(r => r.id === id ? { ...r, content: newContent } : r));
  };

  const toggleArenaSelection = (id: string) => {
    setArenaSelections(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const handleValidateProvider = async (provider: string) => {
    setIsValidating(provider);
    try {
      let result;
      switch (provider) {
        case 'gemini':
          result = await validateGeminiKey(apiKeys.gemini);
          break;
        case 'deepseek':
          result = await validateDeepseekKey(apiKeys.deepseek);
          break;
        case 'local':
          result = await validateOllamaConnection(ollamaUrl);
          break;
        case 'chatgpt':
        case 'claude':
        case 'grok':
          // Phase 2 providers - just check if key is provided
          result = {
            valid: provider === 'chatgpt' ? !!apiKeys.chatgpt : provider === 'claude' ? !!apiKeys.claude : !!apiKeys.grok,
            error: 'API key required'
          };
          break;
        default:
          result = { valid: false, error: 'Unknown provider' };
      }
      setValidationStatus(prev => ({ ...prev, [provider]: result.valid }));
      if (!result.valid) {
        setErrorMsg(`${provider} validation failed: ${result.error}`);
      }
    } finally {
      setIsValidating(null);
    }
  };

  const handleSaveProvider = async () => {
    try {
      setErrorMsg(null);
      const newCreds: StoredCredentials = {
        ...credentials,
        selectedEngine: selectedEngine,
        geminiKey: selectedEngine === 'gemini' ? apiKeys.gemini : credentials.geminiKey,
        deepseekKey: selectedEngine === 'deepseek' ? apiKeys.deepseek : credentials.deepseekKey,
        chatgptKey: selectedEngine === 'chatgpt' ? apiKeys.chatgpt : credentials.chatgptKey,
        claudeKey: selectedEngine === 'claude' ? apiKeys.claude : credentials.claudeKey,
        grokKey: selectedEngine === 'grok' ? apiKeys.grok : credentials.grokKey,
        ollamaUrl: ollamaUrl,
        selectedModel: ollamaModel,
      };

      // Validate before saving
      if (selectedEngine === 'gemini' && !apiKeys.gemini) {
        setErrorMsg('Please enter Gemini API key');
        return;
      }
      if (selectedEngine === 'deepseek' && !apiKeys.deepseek) {
        setErrorMsg('Please enter DeepSeek API key');
        return;
      }
      if (selectedEngine === 'chatgpt' && !apiKeys.chatgpt) {
        setErrorMsg('Please enter ChatGPT API key');
        return;
      }
      if (selectedEngine === 'claude' && !apiKeys.claude) {
        setErrorMsg('Please enter Claude API key');
        return;
      }
      if (selectedEngine === 'grok' && !apiKeys.grok) {
        setErrorMsg('Please enter Grok API key');
        return;
      }

      if (selectedEngine === 'local') {
        const health = await validateOllamaConnection(ollamaUrl || 'http://localhost:11434');
        if (!health.valid) {
          setErrorMsg(health.error || 'Cannot connect to Ollama. Is it running? Try: ollama serve');
          return;
        }
      }

      if (credentialPassword && credentialPassword.trim().length > 0) {
        setCredentialPassword(credentialPassword);
      }

      // Reinitialize provider first (so we don't persist broken settings)
      const config = credentialsToConfig(newCreds);
      initializeProvider(config);

      saveCredentials(newCreds);
      setCredentials(newCreds);
      setIsCredsLocked(false);

      if (newCreds.selectedEngine === 'local' && newCreds.ollamaUrl) {
        loadOllamaModels(newCreds.ollamaUrl);
      }

      setIsSettingsOpen(false);
      setErrorMsg(null);
    } catch (e: any) {
      setErrorMsg('Failed to save provider: ' + safeErrorMessage(e));
    }
  };

  const handleOllamaSetupComplete = async () => {
    // Get system info to find suggested model
    const systemInfo = await getSystemInfo();
    setSuggestedModel(systemInfo.suggestedModel);
    setIsOllamaSetupOpen(false);
    setIsSettingsOpen(false); // Close settings modal
    setIsModelGalleryOpen(true);
  };

  const handleOllamaCardClick = () => {
    setIsSettingsOpen(false); // Close settings modal first
    setIsOllamaSetupOpen(true);
  };

  const handleIntegrateAnswers = async () => {
    if (!components.questions) return;
    setActionLoading('answers'); setErrorMsg(null);
    const qaList = components.questions.map((q, i) => ({ q, a: interviewAnswers[i] || '' })).filter(qa => typeof qa.a === 'string' && qa.a.trim() !== '');
    try {
      const refined = await integrateAnswers(components, qaList);
      setComponents({ ...refined, questions: [] });
    } catch(e: any) {
      setErrorMsg("Failed to integrate answers: " + safeErrorMessage(e));
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartAnalysis = async () => {
    if (!initialInput.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setAnalysisError(null);
    try {
      const analyzed = await analyzePrompt(initialInput);
      setComponents(analyzed);
      setStep('refining');
      // Clear preserved state on success
      clearPreservedState();
    } catch (error: any) {
      setAnalysisError(error);
      setErrorMsg(error?.message || 'Failed to analyze prompt. Please try again.');
      // Preserve state for recovery
      savePreservedState({
        initialInput,
        selectedEngine,
        step: 'initial',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMagicRefine = async () => {
    setActionLoading('refine'); setErrorMsg(null);
    try {
      const refined = await magicRefine(components);
      setComponents(refined);
    } catch (e: any) {
      setErrorMsg("Magic refine failed: " + safeErrorMessage(e));
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateExamples = async () => {
    setActionLoading('examples'); setErrorMsg(null);
    try {
      const examples = await generateExamples(components);
      setComponents(prev => ({
        ...prev,
        format: prev.format + (prev.format ? '\\n\\n' : '') + examples
      }));
    } catch (e: any) {
      setErrorMsg("Example generation failed: " + safeErrorMessage(e));
    } finally {
      setActionLoading(null);
    }
  };

  const saveToHistory = (newVariations: PromptVariation[]) => {
    const newItem: HistoryItem = { id: Date.now().toString(), timestamp: Date.now(), input: initialInput || components.task, variations: newVariations };
    const updated = [newItem, ...history].slice(0, 50);
    setHistory(updated);
    try {
      localStorage.setItem('prompt_history', JSON.stringify(updated));
    } catch (e: any) {
      // QuotaExceededError is common on Safari/low-storage devices.
      const name = typeof e?.name === 'string' ? e.name : '';
      const msg = typeof e?.message === 'string' ? e.message : '';
      const isQuota = name === 'QuotaExceededError' || /quota/i.test(msg);

      if (isQuota) {
        // Attempt a best-effort recovery: keep only the latest 10 items.
        try {
          const trimmed = updated.slice(0, 10);
          localStorage.setItem('prompt_history', JSON.stringify(trimmed));
          setHistory(trimmed);
          setErrorMsg('Storage is full. History was trimmed to the latest 10 items. You can clear browser site data to free space.');
          return;
        } catch {
          setErrorMsg('Storage is full. Unable to save history. Clear browser site data to free space.');
          return;
        }
      }

      // Non-quota errors: don’t crash the UI, but surface it.
      setErrorMsg('Unable to save history: ' + safeErrorMessage(e));
    }
  };

  const handleGenerateVariations = async () => {
    setLoading(true);
    setErrorMsg(null);
    setVariationsError(null);
    try {
      const generated = await generateVariations(components);
      setResults(generated);
      saveToHistory(generated);
      setStep('results');
      // Clear preserved state on success
      clearPreservedState();
    } catch (error: any) {
      setVariationsError(error);
      setErrorMsg(error?.message || 'Failed to generate variations. Please try again.');
      // Preserve state for recovery
      savePreservedState({
        components,
        interviewAnswers,
        selectedEngine,
        step: 'refining',
      });
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } },
    exit: { opacity: 0, scale: 0.95 }
  };

  const renderBattleArena = () => {
    if (!isArenaModalOpen || arenaSelections.length !== 2) return null;
    const a = results.find(r => r.id === arenaSelections[0])!;
    const b = results.find(r => r.id === arenaSelections[1])!;

    const BattleView = () => {
      const [verdict, setVerdict] = useState<JudgeVerdict | null>(null);
      const [isFighting, setIsFighting] = useState(false);
      const [outputA, setOutputA] = useState('');
      const [outputB, setOutputB] = useState('');
      const [errorMenu, setErrorMenu] = useState('');
      const [battleError, setBattleError] = useState<Error | null>(null);
      const isMountedRef = useRef(true);

      useEffect(() => {
        isMountedRef.current = true;
        return () => {
          isMountedRef.current = false;
        };
      }, []);

      // Use the selected engine's model for battle testing
      const getBattleModel = () => {
        if (selectedEngine === 'local' && ollamaModel) return ollamaModel;
        if (selectedEngine === 'gemini') return 'gemini-3-flash-preview';
        if (selectedEngine === 'deepseek') return 'deepseek-r1';
        if (selectedEngine === 'chatgpt') return 'gpt-4-turbo';
        if (selectedEngine === 'claude') return 'claude-3-sonnet';
        if (selectedEngine === 'grok') return 'grok-1';
        return 'gemini-3-flash-preview'; // fallback
      };

      const battleModel = getBattleModel();
      const providerLabel = selectedEngine === 'local' ? `${battleModel}` :
                           selectedEngine === 'gemini' ? 'Gemini 3.0 Flash' :
                           selectedEngine === 'deepseek' ? 'DeepSeek R1' :
                           selectedEngine === 'chatgpt' ? 'ChatGPT' :
                           selectedEngine === 'claude' ? 'Claude Sonnet' :
                           selectedEngine === 'grok' ? 'Grok' : 'AI Model';

      const runBattle = async () => {
        setIsFighting(true);
        setVerdict(null);
        setErrorMenu('');
        setBattleError(null);
        try {
          if (selectedEngine === 'local') {
            const health = await validateOllamaConnection(ollamaUrl || 'http://localhost:11434');
            if (!health.valid) {
              throw new Error(health.error || 'Cannot connect to Ollama. Is it running? Try: ollama serve');
            }
          }
          const mockA = a.content + '\n\n(IMPORTANT: Fill in any bracketed variables with reasonable dummy examples before answering.)';
          const mockB = b.content + '\n\n(IMPORTANT: Fill in any bracketed variables with reasonable dummy examples before answering.)';

          // Run sequentially instead of Promise.all to prevent 429 rate limit errors on free tier accounts
          const resA = await runPrompt(mockA, battleModel);
          if (!isMountedRef.current) return;
          setOutputA(resA);

          const resB = await runPrompt(mockB, battleModel);
          if (!isMountedRef.current) return;
          setOutputB(resB);

          const judgeRes = await judgeArenaOutputs(components, a.content, resA, b.content, resB);
          if (!isMountedRef.current) return;
          setVerdict(judgeRes);
          // Clear preserved state on success
          clearPreservedState();
        } catch(e: any) {
          if (isMountedRef.current) {
            setBattleError(e);
            setErrorMenu(safeErrorMessage(e));
            // Preserve state for recovery
            savePreservedState({
              components,
              results,
              arenaSelections,
              selectedEngine,
              step: 'results',
            });
          }
        } finally {
          if (isMountedRef.current) setIsFighting(false);
        }
      };

      return (
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 120 }} className="fixed inset-0 bg-[#0B0D17] z-[60] flex flex-col">
           <div className="flex-1 overflow-y-auto w-full relative">
             <header className="sticky top-0 z-[70] bg-black/80 backdrop-blur-xl border-b border-amber-500/20 p-4 md:p-6 flex justify-between items-center px-4 md:px-8 shadow-2xl shadow-amber-500/10">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <Swords className="text-white w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-mono tracking-widest text-amber-500 glow-text">A/B BATTLE ARENA</h2>
                  <p className="text-amber-200/50 text-xs uppercase tracking-widest hidden md:block">Head-to-Head constraint testing via {providerLabel}</p>
                </div>
             </div>
             
             <div className="flex gap-4">
                <Button variant="primary" onClick={runBattle} disabled={isFighting} className="bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20">
                  {isFighting ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <Play className="w-5 h-5 fill-current mr-2" />} 
                  {isFighting ? 'JUDGING...' : 'FIGHT'}
                </Button>
                <Button variant="ghost" onClick={() => setIsArenaModalOpen(false)}><X className="w-6 h-6"/></Button>
             </div>
           </header>

           {battleError ? (
             <IncidentDisplay
               provider={selectedEngine === 'local' ? 'ollama' : selectedEngine}
               error={battleError}
               showActions={true}
               context="battle"
               onRetry={runBattle}
               onClose={() => {
                 setBattleError(null);
                 setErrorMenu('');
                 clearPreservedState();
               }}
             />
           ) : errorMenu && (
             <div className="bg-red-500/10 text-red-400 p-4 text-center font-mono">
               {errorMenu}
             </div>
           )}

           {verdict && (
             <motion.div initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}} className="sticky top-[88px] z-[65] mx-8 mt-8 p-6 rounded-2xl border-2 border-amber-500/50 bg-black/95 backdrop-blur-2xl shadow-[0_0_50px_rgba(245,158,11,0.2)] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Swords className="w-64 h-64 text-amber-500"/></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                   <div className="flex flex-col items-center justify-center min-w-[200px]">
                     <span className="text-[10px] font-bold text-amber-500/50 tracking-[0.3em] mb-2">VERDICT</span>
                     <div className={cn("text-6xl font-black tracking-tighter", verdict.winner === 'TIE' ? 'text-gray-400' : (verdict.winner === 'A' ? 'text-blue-400 glow-text' : 'text-fuchsia-400 glow-text'))}>
                        {verdict.winner === 'TIE' ? 'TIE' : `${verdict.winner} WINS`}
                     </div>
                   </div>
                   <div className="flex-1 bg-[#0B0D17] border border-white/5 rounded-xl p-6 border-l-4 border-l-amber-500">
                      <p className="text-amber-50/90 text-lg leading-relaxed"><span className="text-amber-500 font-bold mr-2 uppercase tracking-wider text-sm">Judge Reasoning:</span> {verdict.reasoning}</p>
                   </div>
                </div>
             </motion.div>
           )}

           <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/10 p-6 md:p-8 gap-8 lg:gap-0">
              {/* Contender A */}
              <div className="flex flex-col lg:pr-8 gap-6">
                 <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-black">A</span>
                      {a.title}
                    </h3>
                    <span className="text-xs font-mono uppercase bg-white/5 px-2 py-1 rounded text-white/50">{a.type}</span>
                 </div>
                 <div className="bg-black/40 border border-white/5 rounded-xl p-4 max-h-[300px] overflow-y-auto text-xs text-white/40 font-mono whitespace-pre-wrap">{a.content}</div>
                 <div className="flex-1 bg-black/60 border border-white/5 rounded-xl p-6 relative min-h-[300px]">
                    <span className="absolute -top-3 left-4 bg-[#0B0D17] px-2 text-[10px] font-bold tracking-widest text-white/30">OUTPUT A</span>
                    {isFighting && !outputA ? <div className="absolute inset-0 flex items-center justify-center"><RefreshCw className="w-10 h-10 text-white/10 animate-spin"/></div> : null}
                    <div className="whitespace-pre-wrap text-sm text-blue-100/80 max-h-[500px] overflow-y-auto">{outputA}</div>
                 </div>
              </div>

              {/* Contender B */}
              <div className="flex flex-col lg:pl-8 gap-6 pt-8 lg:pt-0">
                 <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center font-black">B</span>
                      {b.title}
                    </h3>
                    <span className="text-xs font-mono uppercase bg-white/5 px-2 py-1 rounded text-white/50">{b.type}</span>
                 </div>
                 <div className="bg-black/40 border border-white/5 rounded-xl p-4 max-h-[300px] overflow-y-auto text-xs text-white/40 font-mono whitespace-pre-wrap">{b.content}</div>
                 <div className="flex-1 bg-black/60 border border-white/5 rounded-xl p-6 relative min-h-[300px]">
                    <span className="absolute -top-3 left-4 bg-[#0B0D17] px-2 text-[10px] font-bold tracking-widest text-white/30">OUTPUT B</span>
                    {isFighting && !outputB ? <div className="absolute inset-0 flex items-center justify-center"><RefreshCw className="w-10 h-10 text-white/10 animate-spin"/></div> : null}
                    <div className="whitespace-pre-wrap text-sm text-fuchsia-100/80 max-h-[500px] overflow-y-auto">{outputB}</div>
                 </div>
              </div>
           </div>
          </div>
        </motion.div>
      );
    };

    return <BattleView />;
  };

  return (
    <div className="flex w-full min-h-screen relative">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isHistoryOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setIsHistoryOpen(false)} />
        )}
      </AnimatePresence>

      {/* History Sidebar */}
      <AnimatePresence>
        {isHistoryOpen && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-y-0 right-0 w-full max-w-md glass-panel z-50 p-6 border-l border-white/10 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold font-mono tracking-widest text-indigo-300">LIBRARY</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsHistoryOpen(false)}><X className="w-5 h-5"/></Button>
            </div>
            {history.length === 0 ? (
              <p className="text-white/40 text-center py-10 font-mono">No prompts saved yet.</p>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <Card key={item.id} className="p-4 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => { setResults(item.variations); setStep('results'); setIsHistoryOpen(false); }}>
                    <div className="text-xs text-indigo-400/50 font-mono mb-2">{new Date(item.timestamp).toLocaleDateString()}</div>
                    <p className="text-sm text-white/90 line-clamp-2 italic">"{item.input}"</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.variations.map(v => <span key={v.id} className="px-2 py-1 bg-white/5 rounded text-[10px] uppercase font-bold text-white/50">{v.type}</span>)}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {renderBattleArena()}
      </AnimatePresence>

      {/* Ollama Setup Modal */}
      <OllamaSetupModal
        isOpen={isOllamaSetupOpen}
        onClose={() => setIsOllamaSetupOpen(false)}
        onComplete={() => {
          setSelectedEngine('local');
          handleOllamaSetupComplete();
        }}
      />

      {/* Model Gallery Modal */}
      <ModelGallery
        isOpen={isModelGalleryOpen}
        onClose={() => setIsModelGalleryOpen(false)}
        suggestedModel={suggestedModel}
        onModelSelect={(modelName) => {
          setOllamaModel(modelName);
          // Immediately persist and reinitialize so the new model is used right away
          try {
            const newCreds = { ...credentials, selectedModel: modelName };
            const config = credentialsToConfig(newCreds);
            initializeProvider(config);
            saveCredentials(newCreds);
            setCredentials(newCreds);
            setIsModelGalleryOpen(false);
          } catch (e: any) {
            setErrorMsg(`Failed to apply model: ${safeErrorMessage(e)}`);
          }
        }}
      />

      {/* Settings Overlay */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div initial={{ y: '-10%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '-10%', opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-start justify-center p-4 pt-20">
            <div className="bg-[#0B0D17] border border-white/10 rounded-2xl w-full max-w-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden max-h-[90vh] overflow-y-auto">
               <header className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 sticky top-0">
                 <h2 className="text-xl font-bold flex items-center gap-3"><Settings2 className="w-5 h-5"/> LLM Provider Settings</h2>
                 <Button variant="ghost" size="sm" onClick={() => setIsSettingsOpen(false)}><X className="w-5 h-5"/></Button>
               </header>
               <div className="p-8 space-y-8">
                  <div className="bg-black/30 border border-white/10 rounded-xl p-5">
                    <h3 className="text-indigo-300 font-bold tracking-widest text-xs uppercase mb-3 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4"/> Credential Encryption
                    </h3>
                    <p className="text-xs text-white/50 mb-4">
                      Your encryption password is never stored. You’ll be prompted again after a refresh.
                    </p>
                    <div className="flex flex-col md:flex-row gap-3 md:items-center">
                      <Input
                        type="password"
                        placeholder={isCredsLocked ? "Enter encryption password to unlock" : "Set / enter encryption password"}
                        value={credentialPassword}
                        onChange={(e) => setCredentialPasswordState(e.target.value)}
                        className="h-9 bg-black/40 border-indigo-500/20 text-sm flex-1"
                      />
                      {isCredsLocked ? (
                        <Button
                          variant="primary"
                          onClick={handleUnlockCredentials}
                          disabled={!credentialPassword || credentialPassword.trim().length === 0}
                          className="h-9"
                        >
                          Unlock
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            try {
                              setCredentialPassword(credentialPassword);
                              setErrorMsg('Password set for this session.');
                            } catch (e: any) {
                              setErrorMsg(`Failed to set password: ${safeErrorMessage(e)}`);
                            }
                          }}
                          disabled={!credentialPassword || credentialPassword.trim().length === 0}
                          className="h-9"
                        >
                          Use Password
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                     <h3 className="text-indigo-400 font-bold tracking-widest text-xs uppercase mb-6 flex items-center gap-2">
                       <ShieldAlert className="w-4 h-4"/> Select Your LLM Provider
                     </h3>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {/* Gemini Option */}
                        <Card
                           onClick={() => setSelectedEngine('gemini')}
                           className={cn("p-4 cursor-pointer transition-all flex flex-col gap-3 relative", selectedEngine === 'gemini' ? "border-indigo-500/50 bg-indigo-500/10" : "border-white/10 bg-black/40 hover:bg-white/5")}
                        >
                           {selectedEngine === 'gemini' && <div className="absolute top-3 right-3"><Check className="w-4 h-4 text-indigo-400"/></div>}
                           <h4 className="font-bold text-white">Google Gemini</h4>
                           <span className="text-xs text-white/50">Fast and powerful</span>
                           {selectedEngine === 'gemini' && (
                             <div className="mt-3 space-y-2">
                               <Input
                                 type="password"
                                 placeholder="Enter Gemini API key"
                                 value={apiKeys.gemini}
                                 onChange={(e) => setApiKeys({...apiKeys, gemini: e.target.value})}
                                 className="h-8 bg-black/40 border-indigo-500/30 text-xs"
                               />
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handleValidateProvider('gemini')}
                                 disabled={isValidating === 'gemini' || !apiKeys.gemini}
                                 className="w-full h-7 text-xs"
                               >
                                 {isValidating === 'gemini' ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : 'Test'}
                                 {validationStatus.gemini === true && <Check className="w-3 h-3 text-green-400 ml-1" />}
                                 {validationStatus.gemini === false && <X className="w-3 h-3 text-red-400 ml-1" />}
                               </Button>
                             </div>
                           )}
                        </Card>

                        {/* DeepSeek Option */}
                        <Card
                           onClick={() => setSelectedEngine('deepseek')}
                           className={cn("p-4 cursor-pointer transition-all flex flex-col gap-3 relative", selectedEngine === 'deepseek' ? "border-blue-500/50 bg-blue-500/10" : "border-white/10 bg-black/40 hover:bg-white/5")}
                        >
                           {selectedEngine === 'deepseek' && <div className="absolute top-3 right-3"><Check className="w-4 h-4 text-blue-400"/></div>}
                           <h4 className="font-bold text-white">DeepSeek</h4>
                           <span className="text-xs text-white/50">Cheap and reliable</span>
                           {selectedEngine === 'deepseek' && (
                             <div className="mt-3 space-y-2">
                               <Input
                                 type="password"
                                 placeholder="Enter DeepSeek API key"
                                 value={apiKeys.deepseek}
                                 onChange={(e) => setApiKeys({...apiKeys, deepseek: e.target.value})}
                                 className="h-8 bg-black/40 border-blue-500/30 text-xs"
                               />
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handleValidateProvider('deepseek')}
                                 disabled={isValidating === 'deepseek' || !apiKeys.deepseek}
                                 className="w-full h-7 text-xs"
                               >
                                 {isValidating === 'deepseek' ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : 'Test'}
                                 {validationStatus.deepseek === true && <Check className="w-3 h-3 text-green-400 ml-1" />}
                                 {validationStatus.deepseek === false && <X className="w-3 h-3 text-red-400 ml-1" />}
                               </Button>
                             </div>
                           )}
                        </Card>

                        {/* Local Ollama Option */}
                        <Card
                           onClick={handleOllamaCardClick}
                           className={cn("p-4 cursor-pointer transition-all flex flex-col gap-3 relative col-span-1 md:col-span-2", selectedEngine === 'local' ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/10 bg-black/40 hover:bg-white/5")}
                        >
                           {selectedEngine === 'local' && <div className="absolute top-3 right-3"><Check className="w-4 h-4 text-emerald-400"/></div>}
                           <h4 className="font-bold text-white flex items-center gap-2">Local Ollama <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] rounded uppercase">100% Free & Offline</span></h4>
                           <span className="text-xs text-white/50">Run AI on your own hardware. No API key needed!</span>

                           {selectedEngine === 'local' && (
                             <div className="mt-3 space-y-3 bg-black/40 border border-emerald-500/20 p-3 rounded">
                                <div className="flex items-start gap-2 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded">
                                  <Info className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-emerald-200">
                                    Click the "SETUP" button below to get started. We'll detect your system and guide you through installation step-by-step.
                                  </p>
                                </div>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={handleOllamaCardClick}
                                  className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-500"
                                >
                                  🚀 SETUP OLLAMA
                                </Button>
                             </div>
                           )}
                        </Card>

                        {/* ChatGPT Option */}
                        <Card
                           onClick={() => setSelectedEngine('chatgpt')}
                           className={cn("p-4 cursor-pointer transition-all flex flex-col gap-3 relative", selectedEngine === 'chatgpt' ? "border-green-500/50 bg-green-500/10" : "border-white/10 bg-black/40 hover:bg-white/5")}
                        >
                           {selectedEngine === 'chatgpt' && <div className="absolute top-3 right-3"><Check className="w-4 h-4 text-green-400"/></div>}
                           <h4 className="font-bold text-white">ChatGPT / OpenAI</h4>
                           <span className="text-xs text-white/50">Powerful GPT models (Phase 2)</span>
                           {selectedEngine === 'chatgpt' && (
                             <div className="mt-3 space-y-2">
                               <Input
                                 type="password"
                                 placeholder="Enter OpenAI API key (sk-...)"
                                 value={apiKeys.chatgpt}
                                 onChange={(e) => setApiKeys({...apiKeys, chatgpt: e.target.value})}
                                 className="h-8 bg-black/40 border-green-500/30 text-xs"
                               />
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handleValidateProvider('chatgpt')}
                                 disabled={isValidating === 'chatgpt' || !apiKeys.chatgpt}
                                 className="w-full h-7 text-xs"
                               >
                                 {isValidating === 'chatgpt' ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : 'Test'}
                                 {validationStatus.chatgpt === true && <Check className="w-3 h-3 text-green-400 ml-1" />}
                                 {validationStatus.chatgpt === false && <X className="w-3 h-3 text-red-400 ml-1" />}
                               </Button>
                             </div>
                           )}
                        </Card>

                        {/* Claude Option */}
                        <Card
                           onClick={() => setSelectedEngine('claude')}
                           className={cn("p-4 cursor-pointer transition-all flex flex-col gap-3 relative", selectedEngine === 'claude' ? "border-purple-500/50 bg-purple-500/10" : "border-white/10 bg-black/40 hover:bg-white/5")}
                        >
                           {selectedEngine === 'claude' && <div className="absolute top-3 right-3"><Check className="w-4 h-4 text-purple-400"/></div>}
                           <h4 className="font-bold text-white">Claude / Anthropic</h4>
                           <span className="text-xs text-white/50">Advanced reasoning (Phase 2)</span>
                           {selectedEngine === 'claude' && (
                             <div className="mt-3 space-y-2">
                               <Input
                                 type="password"
                                 placeholder="Enter Anthropic API key (sk-ant-...)"
                                 value={apiKeys.claude}
                                 onChange={(e) => setApiKeys({...apiKeys, claude: e.target.value})}
                                 className="h-8 bg-black/40 border-purple-500/30 text-xs"
                               />
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handleValidateProvider('claude')}
                                 disabled={isValidating === 'claude' || !apiKeys.claude}
                                 className="w-full h-7 text-xs"
                               >
                                 {isValidating === 'claude' ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : 'Test'}
                                 {validationStatus.claude === true && <Check className="w-3 h-3 text-green-400 ml-1" />}
                                 {validationStatus.claude === false && <X className="w-3 h-3 text-red-400 ml-1" />}
                               </Button>
                             </div>
                           )}
                        </Card>

                        {/* Grok Option */}
                        <Card
                           onClick={() => setSelectedEngine('grok')}
                           className={cn("p-4 cursor-pointer transition-all flex flex-col gap-3 relative", selectedEngine === 'grok' ? "border-orange-500/50 bg-orange-500/10" : "border-white/10 bg-black/40 hover:bg-white/5")}
                        >
                           {selectedEngine === 'grok' && <div className="absolute top-3 right-3"><Check className="w-4 h-4 text-orange-400"/></div>}
                           <h4 className="font-bold text-white">Grok / xAI</h4>
                           <span className="text-xs text-white/50">Next-gen reasoning (Phase 2)</span>
                           {selectedEngine === 'grok' && (
                             <div className="mt-3 space-y-2">
                               <Input
                                 type="password"
                                 placeholder="Enter xAI API key"
                                 value={apiKeys.grok}
                                 onChange={(e) => setApiKeys({...apiKeys, grok: e.target.value})}
                                 className="h-8 bg-black/40 border-orange-500/30 text-xs"
                               />
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handleValidateProvider('grok')}
                                 disabled={isValidating === 'grok' || !apiKeys.grok}
                                 className="w-full h-7 text-xs"
                               >
                                 {isValidating === 'grok' ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : 'Test'}
                                 {validationStatus.grok === true && <Check className="w-3 h-3 text-green-400 ml-1" />}
                                 {validationStatus.grok === false && <X className="w-3 h-3 text-red-400 ml-1" />}
                               </Button>
                             </div>
                           )}
                        </Card>
                     </div>
                  </div>

                  {errorMsg && <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">{errorMsg}</div>}

                  <div className="pt-6 border-t border-white/5 flex justify-end gap-3">
                     <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
                     <Button variant="primary" onClick={handleSaveProvider}>Save & Apply</Button>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full flex flex-col">
        <header className="border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center glass-panel sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 border border-white/10">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-white tracking-widest text-sm glow-text hidden md:block">PROMPT ARCHITECT</span>
          </div>
          <div className="flex items-center gap-4">
             <Button variant="ghost" size="sm" onClick={() => setIsSettingsOpen(true)} className="gap-2 font-mono text-white/50 hover:text-white border border-transparent hover:border-white/10">
               <Settings2 className="w-4 h-4" /> <span className="hidden md:inline">SETTINGS</span>
             </Button>
            <Button variant="outline" size="sm" onClick={() => setIsHistoryOpen(true)} className="gap-2 font-mono">
              <Library className="w-4 h-4"/> <span className="hidden md:inline">LIBRARY</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 max-w-6xl mx-auto px-4 py-8 md:py-16 w-full">
          <AnimatePresence mode="wait">
            {step === 'initial' && (
              <motion.div key="initial" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-10 max-w-4xl mx-auto">
                <div className="text-center space-y-4">
                  <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-2 glow-text">Prompt Architect</h1>
                  <p className="text-indigo-200/70 text-lg md:text-xl max-w-2xl mx-auto font-light">Transform fragile ideas into high-performance structural templates.</p>
                </div>
                <Card className="p-1 md:p-2 bg-black/40">
                  <div className="flex flex-col md:flex-row items-stretch gap-2 p-3 rounded-xl">
                    <Textarea placeholder="What do you want the AI to do? E.g., 'Help me write a professional email to my boss about a raise...'" value={initialInput} onChange={(e) => setInitialInput(e.target.value)} className="bg-transparent border-none focus:ring-0 min-h-[120px] text-lg lg:text-xl" />
                    <div className="flex items-end justify-end">
                      <Button onClick={handleStartAnalysis} disabled={loading || !initialInput.trim()} className="h-14 px-8 flex gap-2 items-center text-lg w-full md:w-auto">
                        {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <>Analyze <ArrowRight className="w-6 h-6" /></>}
                      </Button>
                    </div>
                  </div>
                </Card>
                {analysisError ? (
                  <IncidentDisplay
                    provider={selectedEngine === 'local' ? 'ollama' : selectedEngine}
                    error={analysisError}
                    showActions={true}
                    context="analyze"
                    onRetry={handleStartAnalysis}
                    onClose={() => {
                      setAnalysisError(null);
                      setErrorMsg(null);
                      clearPreservedState();
                    }}
                  />
                ) : errorMsg && (
                  <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm font-mono text-center shadow-lg shadow-red-500/10">
                    {errorMsg}
                  </div>
                )}
              </motion.div>
            )}

            {step === 'refining' && (
              <motion.div key="refining" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => { setStep('initial'); clearPreservedState(); }} className="flex gap-2 items-center"><ChevronLeft className="w-5 h-5" /> BACK</Button>
                    <h2 className="text-3xl font-bold text-white glow-text hidden md:block">Refine Architecture</h2>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleGenerateExamples} disabled={!!actionLoading} className="gap-2 bg-blue-500/10 border-blue-500/40 text-blue-300 w-full md:w-auto">
                      {actionLoading === 'examples' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <>+ ADD EXAMPLES</>}
                    </Button>
                    <Button variant="outline" onClick={handleMagicRefine} disabled={!!actionLoading} className="gap-2 bg-indigo-500/10 border-indigo-500/40 text-indigo-300 w-full md:w-auto">
                      {actionLoading === 'refine' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4" /> MAGIC REFINE</>}
                    </Button>
                  </div>
                </div>

                {components.scores && (
                  <div className="bg-black/40 p-6 rounded-2xl border border-white/5 shadow-2xl">
                     <div className="flex items-center justify-between xl:justify-start xl:gap-8 mb-6">
                        <h3 className="font-bold flex items-center gap-2"><BarChart2 className="w-5 h-5 text-indigo-400"/> Initial Prompt Score</h3>
                        <p className="text-white/60 text-sm italic py-1 px-4 bg-white/5 rounded-full">"{components.scores.feedback}"</p>
                     </div>
                     <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                       <MetricBar label="Overall Edge" score={components.scores.overall} />
                       <MetricBar label="Clarity" score={components.scores.clarity} />
                       <MetricBar label="Context" score={components.scores.context} />
                       <MetricBar label="Constraints" score={components.scores.constraints} />
                       <MetricBar label="Tone" score={components.scores.tone} />
                     </div>
                  </div>
                )}

                {components.questions && components.questions.length > 0 && (
                  <div className="bg-indigo-950/20 p-6 rounded-2xl border border-indigo-500/20 shadow-xl mt-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                    <h3 className="font-bold flex items-center gap-2 mb-2 text-indigo-300">
                      <Target className="w-5 h-5"/> AI Clarification Interview
                    </h3>
                    <p className="text-sm text-indigo-200/70 mb-6 font-light">
                      The AI found some gaps. Answer these specific questions to help the engine generate a bulletproof structure for you:
                    </p>
                    <div className="grid grid-cols-1 gap-5 mb-6">
                      {components.questions.map((q, i) => (
                        <div key={i} className="flex flex-col gap-2">
                          <label className="text-xs font-bold text-indigo-300/80 uppercase tracking-widest pl-1">{q}</label>
                          <Input 
                            value={interviewAnswers[i] || ''} 
                            onChange={(e) => setInterviewAnswers({...interviewAnswers, [i]: e.target.value})} 
                            placeholder="Your insight..." 
                            className="bg-black/40 border-indigo-500/20 focus:border-indigo-400 h-10"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleIntegrateAnswers} disabled={!Object.values(interviewAnswers).some((a: any) => typeof a === 'string' && a.trim().length > 0) || actionLoading === 'answers'} className="gap-2 border-indigo-500/30 text-indigo-200">
                        {actionLoading === 'answers' ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>} 
                        Apply Insights
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                  <motion.div variants={containerVariants} className="space-y-6">
                    <div><label className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 mb-3 block px-1">Role</label><Input value={components.role} onChange={(e) => setComponents({ ...components, role: e.target.value })} placeholder="e.g., Senior Software Engineer" /></div>
                    <div><label className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 mb-3 block px-1">Task</label><Textarea value={components.task} onChange={(e) => setComponents({ ...components, task: e.target.value })} placeholder="The core objective..." className="min-h-[140px]" /></div>
                    <div><label className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 mb-3 block px-1">Context</label><Textarea value={components.context} onChange={(e) => setComponents({ ...components, context: e.target.value })} placeholder="Specific details and background..." className="min-h-[140px]" /></div>
                  </motion.div>
                  <motion.div variants={containerVariants} className="space-y-6">
                    <div><label className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 mb-3 block px-1">Format</label><Textarea value={components.format} onChange={(e) => setComponents({ ...components, format: e.target.value })} placeholder="e.g., Markdown table, JSON, Bullet points" className="min-h-[100px]"/></div>
                    <div><label className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 mb-3 block px-1">Constraints</label><Textarea value={components.constraints} onChange={(e) => setComponents({ ...components, constraints: e.target.value })} placeholder="What to avoid, length limits, etc." className="min-h-[140px]" /></div>
                    <div className="p-4 rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5">
                      <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-fuchsia-300 mb-3 px-1 flex items-center gap-2"><Sparkles className="w-3 h-3"/> Custom Persona (Optional)</label>
                      <Input value={components.customPersona || ''} onChange={(e) => setComponents({ ...components, customPersona: e.target.value })} placeholder="e.g., Cynical Technical Writer, Pirate, CEO" className="bg-black/40 border-fuchsia-500/30 focus:border-fuchsia-400" />
                    </div>
                    <div className="pt-6 space-y-4">
                      {variationsError ? (
                        <IncidentDisplay
                          provider={selectedEngine === 'local' ? 'ollama' : selectedEngine}
                          error={variationsError}
                          showActions={true}
                          context="variations"
                          onRetry={handleGenerateVariations}
                          onClose={() => {
                            setVariationsError(null);
                            setErrorMsg(null);
                            clearPreservedState();
                          }}
                        />
                      ) : errorMsg && (
                        <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
                          {errorMsg}
                        </div>
                      )}
                      <Button variant="primary" className="w-full h-16 text-lg gap-3" onClick={handleGenerateVariations} disabled={loading}>
                        {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <>Forge Final Prompts <ArrowRight className="w-6 h-6" /></>}
                      </Button>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {step === 'results' && (
              <motion.div key="results" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10 relative">
                  <div>
                    <h2 className="text-4xl font-bold text-white mb-2 glow-text">Forged Variations</h2>
                    <p className="text-indigo-200/60 font-light text-lg">Select and configure the structure that fits your workflow.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {arenaSelections.length > 0 && (
                      <Button 
                        variant="primary" 
                        onClick={() => setIsArenaModalOpen(true)}
                        disabled={arenaSelections.length !== 2}
                        className={cn("gap-2 shadow-lg transition-all", arenaSelections.length === 2 ? "bg-amber-600 hover:bg-amber-500 shadow-amber-500/20" : "opacity-80")}
                      >
                        <Swords className="w-5 h-5"/> {arenaSelections.length === 2 ? 'ENTER BATTLE ARENA' : `SELECT 2 FOR ARENA (${arenaSelections.length}/2)`}
                      </Button>
                    )}
                    <Button variant="secondary" onClick={() => { setStep('initial'); setArenaSelections([]); clearPreservedState(); }} className="w-fit">New Architecture</Button>
                  </div>
                </div>
                {errorMsg && <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm text-center">{errorMsg}</div>}
                
                <div className="grid grid-cols-1 gap-12">
                  {results.map((result: PromptVariation) => (
                    <VariationCard
                      key={result.id}
                      result={result}
                      onUpdateContent={handleUpdateVariationContent}
                      onToggleArena={toggleArenaSelection}
                      isSelectedForArena={arenaSelections.includes(result.id)}
                      isArenaFull={arenaSelections.length >= 2}
                      selectedEngine={selectedEngine}
                      ollamaUrl={ollamaUrl}
                      ollamaModel={ollamaModel}
                      ollamaModels={ollamaModels}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};