import { Wizard } from './components/Wizard';
import { Sparkles } from 'lucide-react';

export default function App() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-[#030014] font-sans selection:bg-purple-500/30 text-slate-200">
      {/* Advanced Dynamic Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/15 blur-[150px] rounded-full mix-blend-screen animate-pulse duration-[10000ms]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-fuchsia-600/15 blur-[150px] rounded-full mix-blend-screen animate-pulse duration-[12000ms]" />
        <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] bg-blue-500/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-grain" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen w-full">
        <Wizard />
        
        <footer className="py-6 px-6 mt-auto">
          <div className="mx-auto flex justify-center items-center">
             <p className="text-white/30 text-xs text-center uppercase tracking-widest font-mono">
               Engineered with Advanced AI Frameworks
             </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
