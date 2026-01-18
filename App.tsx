
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HashRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, Search, BookOpen, Plus, X, Heart, Info,
  ChevronLeft, Camera, Trash2, RefreshCw, Zap, ArrowRight, ShieldAlert,
  Dna, Activity, History, TrendingUp, Star
} from 'lucide-react';
import { FoodLog, RecoveryStage, Recipe, MedicalTip } from './types';
import { RECIPES, MEDICAL_TIPS, RANDOM_MESSAGES } from './constants';
import { checkFoodSafety } from './geminiService';

// --- Supabase 설정 (환경변수 사용) ---
// 실제 배포 시 Vercel 설정에서 값을 넣어줘야 합니다.
const SUPABASE_URL = (window as any).process?.env?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (window as any).process?.env?.SUPABASE_ANON_KEY || '';

// --- Helper Functions ---
const getDailySeed = () => {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
};

const shuffleArray = (array: any[], seed: number) => {
  let m = array.length, t, i;
  while (m) {
    i = Math.floor(Math.abs(Math.sin(seed++)) * m--);
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }
  return [...array];
};

// --- Components ---

const Navbar = () => (
  <nav className="fixed bottom-0 left-0 w-full bg-black border-t-4 border-white z-50 px-6 py-4 flex justify-around items-center">
    <Link to="/" className="flex flex-col items-center gap-1 group">
      <CalendarIcon className="w-6 h-6 group-hover:text-pink-500 transition-colors" />
      <span className="text-[10px] font-bold text-shadow text-white">기록</span>
    </Link>
    <Link to="/search" className="flex flex-col items-center gap-1 group">
      <Search className="w-6 h-6 group-hover:text-pink-500 transition-colors" />
      <span className="text-[10px] font-bold text-shadow text-white">검색</span>
    </Link>
    <Link to="/recipes" className="flex flex-col items-center gap-1 group">
      <BookOpen className="w-6 h-6 group-hover:text-pink-500 transition-colors" />
      <span className="text-[10px] font-bold text-shadow text-white">식단</span>
    </Link>
    <Link to="/info" className="flex flex-col items-center gap-1 group">
      <Info className="w-6 h-6 group-hover:text-pink-500 transition-colors" />
      <span className="text-[10px] font-bold text-shadow text-white">팁</span>
    </Link>
  </nav>
);

const Popup = ({ isOpen, onClose, message }: { isOpen: boolean; onClose: () => void; message: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      <div className="kitsch-border bg-black p-8 max-w-sm w-full text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-pink-500 animate-pulse"></div>
        <h2 className="font-unbounded text-2xl mb-4 text-pink-500">HI CHINGU!</h2>
        <p className="text-lg mb-6 leading-relaxed font-semibold text-white">{message}</p>
        <button onClick={onClose} className="kitsch-button px-8 py-2 font-bold w-full uppercase">알겠어요!</button>
      </div>
    </div>
  );
};

// --- Pages ---

const LogPage = () => {
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLog, setNewLog] = useState({ menuName: '', description: '', photoUrl: '' });
  const [loading, setLoading] = useState(true);

  // 데이터 불러오기 (초기 로드 시 localStorage에서 가져오고, 나중에 Supabase로 교체 가능하도록 설계)
  useEffect(() => {
    const saved = localStorage.getItem('stomachy_logs');
    if (saved) setLogs(JSON.parse(saved));
    setLoading(false);
  }, []);

  const saveLog = () => {
    if (!newLog.menuName) return;
    const log: FoodLog = {
      id: Math.random().toString(36).substr(2, 9),
      date: selectedDate,
      timestamp: Date.now(),
      ...newLog
    };
    const updated = [log, ...logs];
    setLogs(updated);
    localStorage.setItem('stomachy_logs', JSON.stringify(updated));
    setIsModalOpen(false);
    setNewLog({ menuName: '', description: '', photoUrl: '' });
  };

  const deleteLog = (id: string) => {
    if (!confirm('기록을 삭제할까요?')) return;
    const updated = logs.filter(l => l.id !== id);
    setLogs(updated);
    localStorage.setItem('stomachy_logs', JSON.stringify(updated));
  };

  const dailyLogs = useMemo(() => logs.filter(l => l.date === selectedDate), [logs, selectedDate]);
  
  const historyData = useMemo(() => {
    const groups: { [key: string]: FoodLog[] } = {};
    logs.forEach(log => {
      if (!groups[log.date]) groups[log.date] = [];
      groups[log.date].push(log);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [logs]);

  return (
    <div className="p-6 pb-24 animate-in fade-in duration-500">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-black text-white leading-none">회복<br /><span className="text-pink-500">도복</span></h1>
          <p className="text-xs font-bold mt-2 uppercase tracking-widest text-zinc-400 font-unbounded">Vol. {logs.length}</p>
        </div>
        <div className="bg-pink-500 kitsch-border p-2 text-center rotate-3">
          <div className="text-[10px] font-black text-white uppercase leading-tight">Recovery<br/>Day {Math.max(1, historyData.length)}</div>
        </div>
      </header>

      <section className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-pink-500" />
          <h2 className="font-unbounded text-xs uppercase tracking-tighter text-zinc-400">Selected Day Log</h2>
        </div>
        
        <div className="kitsch-border p-4 bg-black">
          <div className="flex items-center justify-between mb-4">
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-black text-white font-unbounded text-sm focus:outline-none border-b border-zinc-800 pb-1"
            />
            <button 
              onClick={() => setIsModalOpen(true)}
              className="kitsch-button p-2 rounded-none"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="py-12 text-center text-pink-500 font-bold animate-pulse">Loading Archive...</div>
            ) : dailyLogs.length === 0 ? (
              <div className="py-12 text-center text-zinc-600 font-bold border-2 border-dashed border-zinc-800">
                선택한 날짜의 기록이 없어요.<br/>"+" 버튼을 눌러 추가해봐요!
              </div>
            ) : (
              dailyLogs.map(log => (
                <div key={log.id} className="border-b-2 border-zinc-800 pb-4 last:border-0 animate-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-unbounded text-pink-500 text-sm uppercase">{log.menuName}</h3>
                    <button onClick={() => deleteLog(log.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {log.photoUrl && (
                    <div className="relative mb-2 group">
                      <img src={log.photoUrl} className="w-full h-40 object-cover border-2 border-white" />
                      <div className="absolute inset-0 bg-pink-500/10 group-hover:bg-transparent transition-colors"></div>
                    </div>
                  )}
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{log.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="mb-8">
        <div className="flex items-center gap-2 mb-6">
          <History className="w-4 h-4 text-zinc-500" />
          <h2 className="font-unbounded text-xs uppercase tracking-tighter text-zinc-500">Recovery Archive</h2>
        </div>

        <div className="space-y-8 relative pl-4 border-l-2 border-zinc-900">
          {historyData.map(([date, dateLogs]) => (
            <div key={date} className="relative">
              <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-zinc-900 border-4 border-black group-hover:bg-pink-500 transition-colors"></div>
              <div 
                className="cursor-pointer group"
                onClick={() => {
                  setSelectedDate(date);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <div className="font-unbounded text-[10px] text-zinc-600 group-hover:text-pink-500 transition-colors mb-2">{date}</div>
                <div className="flex flex-wrap gap-2">
                  {dateLogs.map(log => (
                    <div key={log.id} className="bg-zinc-900/50 border border-zinc-800 px-3 py-1 text-[10px] font-bold text-zinc-300 hover:border-pink-500 transition-colors">
                      {log.menuName}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-16 text-center border-t-2 border-zinc-900 pt-10">
        <Activity className="w-8 h-8 mx-auto text-pink-500 mb-4 animate-pulse" />
        <p className="font-unbounded text-[10px] text-zinc-600 uppercase tracking-widest leading-relaxed">
          Cloud Sync Active<br/>
          Keeping it Hip & Healthy
        </p>
      </footer>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4">
          <div className="kitsch-border bg-black w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-unbounded text-xl text-pink-500 text-shadow uppercase">Add Daily Record</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white"><X /></button>
            </div>
            <div className="space-y-4">
              <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Menu Name</div>
              <input 
                type="text" 
                placeholder="어떤 음식을 먹었나요?"
                className="w-full bg-transparent border-b-2 border-white p-2 focus:border-pink-500 outline-none font-bold text-white"
                value={newLog.menuName}
                onChange={e => setNewLog({...newLog, menuName: e.target.value})}
              />
              <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-4 mb-1">Condition & Details</div>
              <textarea 
                placeholder="오늘의 소화 상태나 기분을 남겨보세요."
                className="w-full bg-zinc-900 border-2 border-white p-3 h-32 focus:border-pink-500 outline-none text-sm text-white"
                value={newLog.description}
                onChange={e => setNewLog({...newLog, description: e.target.value})}
              />
              <div className="flex gap-4 items-center py-2">
                <div className="flex-1 text-[10px] font-bold text-zinc-500 uppercase truncate text-white">
                  {newLog.photoUrl ? "✓ Photo attached" : "No photo selected"}
                </div>
                <button 
                  onClick={() => setNewLog({...newLog, photoUrl: `https://picsum.photos/seed/${Math.random()}/600/400`})}
                  className="bg-zinc-800 p-2 border border-white hover:bg-pink-500 transition-colors text-white"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>
              <button 
                onClick={saveLog}
                className="kitsch-button w-full py-4 font-unbounded text-lg mt-4 uppercase"
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Other components and logic remain identical to previous clean version ---
const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setResult(''); 
    try {
      const res = await checkFoodSafety(query);
      setResult(res || '분석 결과를 가져올 수 없습니다.');
    } catch (e) {
      setResult('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 pb-24 animate-in fade-in duration-500">
      <h1 className="text-4xl font-black mb-6 uppercase leading-tight text-white">이거 <span className="text-pink-500 text-shadow">먹어도</span><br/>될까?</h1>
      <div className="flex gap-2 mb-8">
        <input 
          type="text" 
          placeholder="음식 이름을 검색하세요..."
          className="flex-1 bg-black kitsch-border p-4 font-bold outline-none focus:border-pink-500 text-sm text-white"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSearch()}
        />
        <button 
          onClick={handleSearch}
          className="kitsch-button p-4"
          disabled={loading}
        >
          {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <Search className="text-white" />}
        </button>
      </div>

      {loading ? (
        <div className="text-center font-unbounded text-pink-500 animate-pulse py-12">
          AI 분석 중...
        </div>
      ) : result ? (
        <div className="kitsch-border bg-zinc-900 p-6 overflow-hidden">
          <h2 className="font-unbounded text-lg mb-4 text-pink-500 flex items-center gap-2">
             <Heart className="w-5 h-5 fill-current" /> 분석 결과
          </h2>
          <div className="whitespace-pre-line text-sm leading-relaxed border-t border-white/20 pt-4 font-semibold text-zinc-100">
            {result}
          </div>
        </div>
      ) : (
        <div className="text-zinc-500 font-bold text-center py-12 border-2 border-zinc-800 border-dashed">
          음식의 안전성을 AI가 알려드려요.
        </div>
      )}
    </div>
  );
};

const RecipesPage = () => {
  const [stage, setStage] = useState<RecoveryStage>(RecoveryStage.EARLY);
  const [recommendedRecipe, setRecommendedRecipe] = useState<Recipe | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const navigate = useNavigate();

  const filteredRecipes = useMemo(() => RECIPES.filter(r => r.stage === stage), [stage]);

  const pickRandomRecipe = useCallback(() => {
    setIsSpinning(true);
    setRecommendedRecipe(null);
    
    setTimeout(() => {
      const random = filteredRecipes[Math.floor(Math.random() * filteredRecipes.length)];
      setRecommendedRecipe(random);
      setIsSpinning(false);
    }, 800);
  }, [filteredRecipes]);

  useEffect(() => {
    setRecommendedRecipe(null);
  }, [stage]);

  return (
    <div className="p-6 pb-24 animate-in fade-in duration-500">
      <h1 className="text-4xl font-black mb-6 uppercase leading-none text-white">HIP <br/><span className="text-pink-500 text-shadow">회복 식단</span></h1>
      
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 custom-scrollbar">
        {Object.values(RecoveryStage).map(s => (
          <button 
            key={s}
            onClick={() => setStage(s)}
            className={`whitespace-nowrap px-4 py-2 font-bold text-[10px] kitsch-border transition-all ${stage === s ? 'bg-pink-500 translate-x-1 translate-y-1 shadow-none border-white text-white' : 'bg-black hover:bg-zinc-900 border-zinc-700 text-zinc-400'}`}
          >
            {s.split(' ')[1]}
          </button>
        ))}
      </div>

      <div className="mb-10 text-center">
        <button 
          onClick={pickRandomRecipe}
          disabled={isSpinning}
          className="kitsch-button px-6 py-4 w-full font-unbounded text-sm flex items-center justify-center gap-3 active:scale-95"
        >
          {isSpinning ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
          오늘 뭐 먹지?
        </button>
      </div>

      {recommendedRecipe && (
        <div className="mb-10 animate-in zoom-in duration-300">
          <Link to={`/recipe/${recommendedRecipe.id}`} className="block kitsch-border bg-pink-500 p-5 group">
            <h2 className="font-unbounded text-lg text-white group-hover:underline">{recommendedRecipe.title}</h2>
            <p className="text-[10px] text-white/80 mt-2 flex items-center gap-1">레시피 확인하기 <ArrowRight className="w-3 h-3" /></p>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredRecipes.map(recipe => (
          <Link 
            to={`/recipe/${recipe.id}`} 
            key={recipe.id} 
            className="kitsch-border bg-black p-5 hover:bg-zinc-900 transition-all flex justify-between items-center group"
          >
            <div>
              <h2 className="font-unbounded text-sm text-white group-hover:text-pink-500 transition-colors uppercase">{recipe.title}</h2>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-pink-500" />
          </Link>
        ))}
      </div>
    </div>
  );
};

const RecipeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const recipe = RECIPES.find(r => r.id === id);

  if (!recipe) return <div className="p-10 text-center font-unbounded text-white">Not found</div>;

  return (
    <div className="min-h-screen bg-black p-6 pb-24 animate-in slide-in-from-right duration-300">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 font-unbounded text-xs text-zinc-500 mb-8 hover:text-pink-500"><ChevronLeft /> BACK</button>
      <header className="mb-10">
        <div className="text-pink-500 font-black text-xs uppercase mb-2">{recipe.stage}</div>
        <h1 className="text-4xl font-black text-white leading-[0.9] uppercase border-l-8 border-pink-500 pl-4">{recipe.title}</h1>
      </header>
      <div className="space-y-12">
        <section>
          <h2 className="font-unbounded text-xl mb-4 text-pink-500">준비물</h2>
          <ul className="space-y-3">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="kitsch-border border-white/20 bg-zinc-900/50 p-4 text-sm font-semibold text-white">{ing}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="font-unbounded text-xl mb-4 text-pink-500">요리과정</h2>
          <div className="space-y-6">
            {recipe.steps.map((step, i) => (
              <div key={i} className="relative pl-10">
                <div className="absolute left-0 top-0 font-unbounded text-2xl text-zinc-800 font-black">0{i + 1}</div>
                <p className="text-sm text-zinc-200">{step}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="kitsch-border bg-pink-500 p-6">
          <p className="text-sm font-bold text-white italic">" {recipe.tip} "</p>
        </section>
      </div>
    </div>
  );
};

const InfoPage = () => {
  const dailySeed = useMemo(() => getDailySeed(), []);
  const rotatedTips = useMemo(() => shuffleArray([...MEDICAL_TIPS], dailySeed), [dailySeed]);
  const todayTopTip = rotatedTips[0];
  const secondaryTips = rotatedTips.slice(1, 4);

  return (
    <div className="p-6 pb-24 animate-in fade-in duration-500 overflow-x-hidden text-white">
      <h1 className="text-4xl font-black mb-10 uppercase leading-none">TODAY'S <br/><span className="text-pink-500 text-shadow">GURUS</span></h1>
      <div className="mb-16">
        <div className="kitsch-border bg-pink-500 p-10 relative overflow-hidden group">
          <div className="absolute top-[-40px] right-[-40px] opacity-10 group-hover:scale-110 transition-transform">
             <Star className="w-48 h-48 text-black fill-current" />
          </div>
          <h2 className="font-unbounded text-3xl mb-6 text-white leading-[0.9] uppercase font-black underline decoration-white decoration-4 underline-offset-8">{todayTopTip.title}</h2>
          <p className="text-base font-bold text-black/90">{todayTopTip.content}</p>
        </div>
      </div>
      <div className="space-y-12">
        {secondaryTips.map((tip, i) => (
          <div key={i} className="relative pl-12 group">
            <div className="absolute left-0 top-0 font-unbounded text-4xl text-zinc-800 font-black opacity-30 group-hover:text-pink-500 transition-all">0{i + 2}</div>
            <h2 className="font-unbounded text-lg mb-3 text-white group-hover:text-pink-500 transition-colors uppercase font-black">{tip.title}</h2>
            <p className="text-sm font-semibold text-zinc-400">{tip.content}</p>
          </div>
        ))}
      </div>
      <div className="mt-20 text-center bg-zinc-900 kitsch-border p-8 border-dashed">
        <Dna className="w-10 h-10 mx-auto text-pink-500 mb-4 animate-pulse" />
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Expert guidance refreshed daily.</p>
      </div>
    </div>
  );
};

function App() {
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  useEffect(() => {
    const lastShown = localStorage.getItem('last_popup_date');
    const today = new Date().toISOString().split('T')[0];
    if (lastShown !== today) {
      const randomMsg = RANDOM_MESSAGES[Math.floor(Math.random() * RANDOM_MESSAGES.length)];
      setPopupMessage(randomMsg);
      const timer = setTimeout(() => setPopupOpen(true), 1500);
      localStorage.setItem('last_popup_date', today);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <Router>
      <div className="max-w-md mx-auto min-h-screen bg-black border-x-2 border-zinc-900 shadow-2xl relative overflow-x-hidden">
        <Routes>
          <Route path="/" element={<LogPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          <Route path="/info" element={<InfoPage />} />
        </Routes>
        <Navbar />
        <Popup isOpen={popupOpen} onClose={() => setPopupOpen(false)} message={popupMessage} />
      </div>
    </Router>
  );
}

export default App;
