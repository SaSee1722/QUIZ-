"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Play, Trophy, Zap, Clock, RefreshCw, ChevronRight, CheckCircle, AlertTriangle, Crown, Medal } from "lucide-react";

let socket: Socket;

const OPTION_COLORS = [
    "from-blue-500 to-blue-600",
    "from-purple-500 to-purple-600",
    "from-emerald-500 to-emerald-600",
    "from-orange-500 to-orange-600",
];

const OPTION_LABELS = ["A", "B", "C", "D"];

const RANK_BADGE: Record<number, { bg: string; text: string; icon: React.ReactNode }> = {
    0: { bg: "bg-amber-400", text: "text-amber-900", icon: <Crown size={18} className="fill-amber-900" /> },
    1: { bg: "bg-slate-300", text: "text-slate-700", icon: <Medal size={18} className="fill-slate-600" /> },
    2: { bg: "bg-orange-400", text: "text-orange-900", icon: <Medal size={18} className="fill-orange-900" /> },
};

export default function HostPage() {
    const router = useRouter();
    const [pin, setPin] = useState<string | null>(null);
    const [players, setPlayers] = useState<any[]>([]);
    const [gameState, setGameState] = useState<"LOBBY" | "STARTING" | "QUESTION" | "BETWEEN" | "FINISHED">("LOBBY");
    const [currentQuestion, setCurrentQuestion] = useState<any>(null);
    const [answerCount, setAnswerCount] = useState(0);
    const [categories, setCategories] = useState<any>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>("dsa");
    const [customQuiz, setCustomQuiz] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [correctAnswer, setCorrectAnswer] = useState<any>(null);
    const [answerCounts, setAnswerCounts] = useState<any>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        socket = io();

        socket.on("connect", () => {
            const targetQuizRaw = typeof window !== "undefined" ? localStorage.getItem("host_target_quiz") : null;
            const legacyQuizRaw = typeof window !== "undefined" ? localStorage.getItem("custom_quiz") : null;

            let initialData = null;
            if (targetQuizRaw) {
                try { initialData = JSON.parse(targetQuizRaw); localStorage.removeItem("host_target_quiz"); } catch { }
            } else if (legacyQuizRaw) {
                try { initialData = JSON.parse(legacyQuizRaw); } catch { }
            }

            socket.emit("create-lobby", initialData);
            if (initialData) {
                setCustomQuiz(initialData);
                setSelectedCategory("custom");
            }
        });

        socket.on("lobby-created", ({ pin, categories }: any) => {
            setPin(pin);
            setCategories(categories);
        });

        socket.on("player-joined", (updatedPlayers: any[]) => setPlayers(updatedPlayers));
        socket.on("game-starting", () => setGameState("STARTING"));

        socket.on("new-question", (questionData: any) => {
            setGameState("QUESTION");
            setCurrentQuestion(questionData);
            setAnswerCount(0);
            setTimeLeft(questionData.time);
            setCorrectAnswer(null);
            setAnswerCounts(null);

            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
                    return prev - 1;
                });
            }, 1000);
        });

        socket.on("answer-submitted", (count: number) => {
            setAnswerCount(count);
        });

        socket.on("question-results", (resultsData: any) => {
            setGameState("BETWEEN");
            setPlayers(resultsData.players);
            setCorrectAnswer(resultsData.correctAnswer);
            setAnswerCounts(resultsData.answerCounts);
            if (timerRef.current) clearInterval(timerRef.current);
        });

        socket.on("game-over", (finalPlayers: any[]) => {
            setGameState("FINISHED");
            setPlayers(finalPlayers);
            if (timerRef.current) clearInterval(timerRef.current);
        });

        return () => {
            socket.disconnect();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const handleStartGame = () => { if (pin) socket.emit("start-game", pin); };
    const handleNextQuestion = () => { if (pin) socket.emit("next-question", pin); };

    const handleSelectCategory = (id: string) => {
        if (pin) {
            setSelectedCategory(id);
            socket.emit("select-quiz", { pin, quizId: id });
        }
    };

    // ── Loading ──────────────────────────────────────────────────────────────
    if (!pin) return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center animate-pulse mx-auto mb-6">
                    <Zap className="text-indigo-600 fill-indigo-600" size={32} />
                </div>
                <h2 className="font-jakarta text-2xl font-black text-slate-900 mb-2">Initializing Session…</h2>
                <p className="text-slate-400 font-medium tracking-wide">Establishing Secure Connection</p>
            </div>
        </div>
    );

    // ── LOBBY ────────────────────────────────────────────────────────────────
    if (gameState === "LOBBY") return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-xl px-8 py-4 flex items-center justify-between sticky top-0 z-50">
                <button onClick={() => router.push("/?tab=library")} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                        <Zap className="text-white fill-white" size={20} />
                    </div>
                    <span className="font-jakarta text-xl font-black tracking-tight text-slate-900">QuizArc Forge</span>
                </button>
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => {
                            if (confirm("End this hosting session? All participants will be disconnected.")) {
                                if (pin) socket.emit("end-session", pin);
                                router.push("/?tab=library");
                            }
                        }}
                        className="text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors tracking-widest uppercase"
                    >
                        END SESSION
                    </button>
                    <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-xs font-bold border border-emerald-100 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        LIVE
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto w-full px-8 py-12 flex-1">
                <div className="grid lg:grid-cols-12 gap-12">

                    {/* Left: PIN + controls */}
                    <div className="lg:col-span-5 flex flex-col gap-8">
                        <div>
                            <span className="text-xs font-black text-indigo-500 uppercase tracking-widest block mb-3">JOIN CODE</span>
                            <h1 className="font-jakarta text-[88px] font-black text-slate-900 leading-none tracking-tighter mb-3">{pin}</h1>
                            <p className="text-slate-500 font-bold">Share this code with participants</p>
                        </div>

                        {/* Category selector (only if no custom quiz) */}
                        {!customQuiz && categories && (
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">SELECT QUIZ</span>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(categories).map(([id, cat]: any) => (
                                        <button
                                            key={id}
                                            onClick={() => handleSelectCategory(id)}
                                            className={`px-4 py-2 rounded-xl font-black text-sm transition-all ${selectedCategory === id ? "bg-indigo-600 text-white shadow-lg" : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300"}`}
                                        >
                                            {cat.title}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {customQuiz && (
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">QUIZ</span>
                                <h2 className="font-jakarta text-2xl font-black text-slate-900">{customQuiz.title}</h2>
                                <p className="text-slate-400 font-bold text-sm mt-1">{customQuiz.questions?.length} questions</p>
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <Users className="text-indigo-600" size={22} />
                            <span className="text-xl font-black text-slate-900 font-jakarta">{players.length} player{players.length !== 1 ? "s" : ""} joined</span>
                        </div>

                        <button
                            onClick={handleStartGame}
                            disabled={players.length === 0}
                            className="group w-full inline-flex items-center justify-center gap-4 bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-3xl font-black text-xl transition-all shadow-xl disabled:opacity-40"
                        >
                            <Play className="fill-white" size={24} />
                            START GAME
                        </button>
                    </div>

                    {/* Right: Player grid */}
                    <div className="lg:col-span-7">
                        <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-xl min-h-[500px]">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="font-jakarta text-xl font-bold text-slate-900">Participants ({players.length})</h3>
                                <span className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">LIVE</span>
                            </div>
                            {players.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                                    <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mb-6 animate-pulse">
                                        <Users className="text-slate-200" size={32} />
                                    </div>
                                    <p className="text-slate-300 font-bold text-lg">Waiting for players to join…</p>
                                    <p className="text-slate-300 font-medium text-sm mt-1">They need code: <strong className="text-indigo-400">{pin}</strong></p>
                                </div>
                            ) : (
                                <motion.div layout className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <AnimatePresence>
                                        {players.map((player) => (
                                            <motion.div
                                                key={player.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-3"
                                            >
                                                <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-black text-sm shrink-0">
                                                    {player.nickname[0].toUpperCase()}
                                                </div>
                                                <span className="font-bold text-slate-700 truncate text-sm">{player.nickname}</span>
                                                <CheckCircle size={14} className="text-emerald-400 ml-auto shrink-0" />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // ── QUESTION ─────────────────────────────────────────────────────────────
    if (gameState === "QUESTION" && currentQuestion) {
        const isTimeLow = timeLeft <= 5;
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col text-white">
                {/* Top bar */}
                <div className="px-10 py-6 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                            <Zap className="text-white fill-white" size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black tracking-widest text-indigo-400">QUESTION</p>
                            <h3 className="font-jakarta font-black text-lg">
                                {currentQuestion.index + 1} <span className="text-white/30">/ {currentQuestion.total}</span>
                            </h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="text-center">
                            <p className="text-[10px] font-black tracking-widest text-slate-500">ANSWERED</p>
                            <p className="font-jakarta font-black text-2xl">{answerCount}<span className="text-white/30 text-base">/{players.length}</span></p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black tracking-widest text-slate-500">TIME</p>
                            <motion.p
                                animate={isTimeLow ? { scale: [1, 1.2, 1] } : {}}
                                transition={{ duration: 0.5, repeat: Infinity }}
                                className={`font-jakarta font-black text-4xl ${isTimeLow ? "text-rose-400" : "text-white"}`}
                            >
                                {timeLeft}
                            </motion.p>
                        </div>
                    </div>
                </div>

                {/* Question card */}
                <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-8 py-10">
                    <div className="bg-white/5 border border-white/10 rounded-[48px] p-12 mb-8 flex-shrink-0">
                        <div className="flex flex-col md:flex-row gap-8 items-center">
                            {currentQuestion.image && (
                                <div className="w-full md:w-1/3 aspect-video bg-white/5 rounded-3xl overflow-hidden border border-white/10">
                                    <img src={currentQuestion.image} alt="Question" className="w-full h-full object-contain" />
                                </div>
                            )}
                            <div className="flex-1 text-center md:text-left">
                                <p className="text-[10px] font-black tracking-widest text-indigo-400 mb-4 uppercase">
                                    {currentQuestion.type === "TYPE_ANSWER" ? "Type Answer" : currentQuestion.type === "TRUE_FALSE" ? "True / False" : "Multiple Choice"}
                                </p>
                                <h1 className="font-jakarta text-4xl md:text-5xl font-black leading-tight tracking-tight">
                                    {currentQuestion.question}
                                </h1>
                            </div>
                        </div>
                    </div>

                    {/* Options display (host sees full options) */}
                    {currentQuestion.type === "TYPE_ANSWER" ? (
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center">
                            <p className="text-slate-400 font-bold text-lg">Players are typing their answers…</p>
                            <div className="flex justify-center gap-2 mt-4">
                                {[0, 1, 2].map(i => (
                                    <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
                                        className="w-2 h-2 rounded-full bg-indigo-400" />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className={`grid gap-5 flex-1 ${currentQuestion.type === "TRUE_FALSE" ? "grid-cols-2" : "grid-cols-2"}`}>
                            {currentQuestion.options.map((opt: string, i: number) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.1 }}
                                    className={`bg-gradient-to-br ${OPTION_COLORS[i]} rounded-[36px] p-8 flex items-center justify-center text-center font-jakarta text-2xl font-black shadow-2xl`}
                                >
                                    {opt}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full bg-white/5 overflow-hidden">
                    <motion.div
                        initial={{ width: "100%" }}
                        animate={{ width: `${(timeLeft / currentQuestion.time) * 100}%` }}
                        transition={{ duration: 1, ease: "linear" }}
                        className={`h-full ${isTimeLow ? "bg-rose-500" : "bg-indigo-500"} shadow-[0_0_20px_rgba(99,102,241,0.5)]`}
                    />
                </div>
            </div>
        );
    }

    // ── BETWEEN QUESTIONS (Question Results View) ────────────────────────────
    if (gameState === "BETWEEN" && currentQuestion) {
        const isLastQuestion = currentQuestion.index + 1 === currentQuestion.total;
        
        // Sum all option answers (for multiple choice) or use the sum of correct + incorrect (for typed answers)
        const totalResponses = answerCounts 
            ? (Array.isArray(answerCounts) 
                ? answerCounts.reduce((a: number, b: number) => a + b, 0) 
                : ((answerCounts.correct || 0) + (answerCounts.incorrect || 0)))
            : 0;

        return (
            <div className="min-h-screen bg-slate-950 flex flex-col text-white">
                {/* Top header bar */}
                <div className="px-10 py-6 flex items-center justify-between border-b border-white/5 sticky top-0 bg-slate-950/80 backdrop-blur-xl z-50">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-500/25">
                            <Zap className="text-indigo-400 fill-indigo-400" size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black tracking-widest text-indigo-400">QUESTION RESULTS</p>
                            <h3 className="font-jakarta font-black text-lg">
                                {currentQuestion.index + 1} <span className="text-white/30">/ {currentQuestion.total}</span>
                            </h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-black tracking-widest text-slate-500">TOTAL RESPONSES</p>
                            <p className="font-jakarta font-black text-2xl">
                                {totalResponses} <span className="text-white/30 text-sm">/ {players.length}</span>
                            </p>
                        </div>
                        <button
                            onClick={handleNextQuestion}
                            className="group inline-flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white px-8 py-4 rounded-2xl font-black text-base shadow-xl transition-all shadow-indigo-500/20"
                        >
                            {isLastQuestion ? "Show Final Standings" : "Next Question"}
                            <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Main Results View */}
                <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-8 py-10">
                    {/* Question Card */}
                    <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 mb-8 flex-shrink-0">
                        <div className="flex flex-col md:flex-row gap-6 items-center">
                            {currentQuestion.image && (
                                <div className="w-full md:w-1/3 aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                                    <img src={currentQuestion.image} alt="Question" className="w-full h-full object-contain" />
                                </div>
                            )}
                            <div className="flex-1 text-center md:text-left">
                                <p className="text-[10px] font-black tracking-widest text-indigo-400 mb-2 uppercase">
                                    {currentQuestion.type === "TYPE_ANSWER" ? "Type Answer" : currentQuestion.type === "TRUE_FALSE" ? "True / False" : "Multiple Choice"}
                                </p>
                                <h1 className="font-jakarta text-3xl font-black leading-tight tracking-tight">
                                    {currentQuestion.question}
                                </h1>
                            </div>
                        </div>
                    </div>

                    {/* Chart / Options Distribution */}
                    <div className="flex-1">
                        {currentQuestion.type === "TYPE_ANSWER" ? (
                            <div className="flex flex-col gap-6">
                                {/* Correct answer card */}
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[32px] p-8 text-center shadow-[0_0_50px_rgba(16,185,129,0.05)]">
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">CORRECT ANSWER</p>
                                    <h3 className="font-jakarta text-3xl md:text-4xl font-black text-emerald-400 tracking-tight leading-none">
                                        {Array.isArray(correctAnswer) ? correctAnswer.join(" / ") : correctAnswer}
                                    </h3>
                                </div>

                                {/* Correct vs Incorrect breakdown */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[28px] p-6 text-center">
                                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-widest px-3 py-1 rounded-full">
                                            CORRECT
                                        </span>
                                        <h4 className="font-jakarta text-[54px] font-black text-emerald-400 mt-2 leading-none">
                                            {answerCounts?.correct || 0}
                                        </h4>
                                        <p className="text-slate-500 font-bold text-sm mt-1">players got it right</p>
                                    </div>
                                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-[28px] p-6 text-center">
                                        <span className="bg-rose-500/20 text-rose-400 text-[10px] font-black tracking-widest px-3 py-1 rounded-full">
                                            INCORRECT
                                        </span>
                                        <h4 className="font-jakarta text-[54px] font-black text-rose-400 mt-2 leading-none">
                                            {answerCounts?.incorrect || 0}
                                        </h4>
                                        <p className="text-slate-500 font-bold text-sm mt-1">players got it wrong</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={`grid gap-5 mb-8 ${currentQuestion.type === "TRUE_FALSE" ? "grid-cols-2" : "grid-cols-2"}`}>
                                {currentQuestion.options.map((opt: string, i: number) => {
                                    const isCorrect = correctAnswer === i;
                                    const count = answerCounts ? (answerCounts[i] || 0) : 0;
                                    const pct = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
                                    
                                    return (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: i * 0.08 }}
                                            className={`relative overflow-hidden rounded-[28px] p-6 border transition-all duration-300 flex flex-col justify-between min-h-[140px] z-10
                                                ${isCorrect 
                                                    ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.15)] text-white" 
                                                    : "bg-white/5 border-white/10 text-white/60"
                                                }`}
                                        >
                                            {/* Progress fill background */}
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 0.8, ease: "easeOut" }}
                                                className={`absolute inset-y-0 left-0 -z-10
                                                    ${isCorrect ? "bg-emerald-500/10" : "bg-white/[0.03]"}`}
                                            />

                                            <div className="flex items-start justify-between z-10">
                                                <span className={`text-xs font-black tracking-widest px-2.5 py-0.5 rounded-md
                                                    ${isCorrect ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" : "bg-white/10 text-white/40 border border-white/10"}`}>
                                                    {OPTION_LABELS[i] || String.fromCharCode(65 + i)}
                                                </span>
                                                {isCorrect && (
                                                    <span className="bg-emerald-500 text-slate-950 text-[10px] font-black tracking-widest px-3 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-emerald-500/20">
                                                        <CheckCircle size={10} className="fill-slate-950" /> CORRECT
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-4 font-jakarta text-2xl font-black leading-snug z-10">
                                                {opt}
                                            </div>

                                            <div className="mt-4 flex items-center justify-between z-10 border-t border-white/5 pt-3">
                                                <span className="text-xs font-bold text-slate-400">
                                                    {count} response{count !== 1 ? "s" : ""}
                                                </span>
                                                <span className="font-jakarta font-black text-lg">
                                                    {Math.round(pct)}%
                                                </span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Mini scoreboard standings ticker at the bottom */}
                    {players.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-[28px] p-6 flex flex-col md:flex-row items-center justify-between gap-4 mt-auto">
                            <div className="flex items-center gap-3">
                                <Crown size={20} className="text-amber-400" />
                                <span className="font-jakarta text-base font-black text-slate-200 uppercase tracking-wider">Lobby Standings</span>
                            </div>
                            <div className="flex flex-wrap gap-4 items-center justify-center">
                                {players.slice(0, 3).map((player, idx) => (
                                    <div key={player.id} className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs
                                            ${idx === 0 ? "bg-amber-400 text-amber-950" : idx === 1 ? "bg-slate-300 text-slate-800" : "bg-orange-400 text-orange-950"}`}>
                                            {idx + 1}
                                        </span>
                                        <span className="font-bold text-slate-300 text-sm truncate max-w-[100px]">{player.nickname}</span>
                                        <span className="font-black text-indigo-400 text-sm ml-1 shrink-0">{player.score} pts</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── FINISHED (Full Leaderboard) ──────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-950 text-white overflow-auto">
            <div className="max-w-4xl mx-auto px-8 py-16">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
                    <div className="w-20 h-20 bg-amber-400 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-xl">
                        <Trophy className="text-white fill-white" size={40} />
                    </div>
                    <h1 className="font-jakarta text-6xl font-black mb-3 tracking-tight">Final Results</h1>
                    <p className="text-slate-400 font-bold text-lg">Game Over — Here are the final standings</p>
                </motion.div>

                {/* Podium top 3 */}
                {players.length >= 1 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/30 rounded-[48px] p-10 mb-8 text-center"
                    >
                        <Crown className="text-amber-400 fill-amber-400 mx-auto mb-4" size={36} />
                        <p className="text-amber-400 font-black text-[10px] uppercase tracking-widest mb-2">🥇 CHAMPION</p>
                        <div className="w-20 h-20 bg-amber-400 rounded-[24px] flex items-center justify-center mx-auto mb-4 shadow-xl">
                            <span className="text-white font-black text-3xl">{players[0]?.nickname?.[0]?.toUpperCase()}</span>
                        </div>
                        <h2 className="font-jakarta text-5xl font-black text-white mb-2">{players[0]?.nickname}</h2>
                        <p className="font-jakarta text-3xl font-black text-amber-400">{players[0]?.score} pts</p>
                    </motion.div>
                )}

                {/* Full ranked list */}
                <div className="space-y-3">
                    {players.map((player, i) => {
                        const badge = RANK_BADGE[i];
                        return (
                            <motion.div
                                key={player.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.07 }}
                                className={`flex items-center justify-between px-8 py-5 rounded-[28px] border transition-all
                                    ${i === 0 ? "bg-white/10 border-amber-400/40 shadow-[0_0_30px_rgba(251,191,36,0.1)]"
                                        : i < 3 ? "bg-white/5 border-white/10 shadow-xl"
                                        : "bg-white/[0.03] border-white/5"}`}
                            >
                                <div className="flex items-center gap-6">
                                    {/* Rank number */}
                                    <div className="flex flex-col items-center w-10">
                                        <span className={`font-jakarta font-black text-3xl leading-none ${i < 3 ? "text-white" : "text-white/30"}`}>{i + 1}</span>
                                    </div>

                                    {/* Badge */}
                                    {badge && (
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${badge.bg}`}>
                                            {badge.icon}
                                        </div>
                                    )}

                                    {/* Avatar */}
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl
                                        ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-800" : i === 2 ? "bg-orange-400 text-white" : "bg-white/10 text-white"}`}>
                                        {player.nickname[0].toUpperCase()}
                                    </div>

                                    <div>
                                        <h3 className={`font-jakarta font-black text-2xl ${i < 3 ? "text-white" : "text-white/70"}`}>{player.nickname}</h3>
                                        {i === 0 && <span className="text-amber-400 text-[10px] font-black tracking-widest uppercase">Champion 🏆</span>}
                                        {i === 1 && <span className="text-slate-300 text-[10px] font-black tracking-widest uppercase">Runner-up 🥈</span>}
                                        {i === 2 && <span className="text-orange-400 text-[10px] font-black tracking-widest uppercase">3rd Place 🥉</span>}
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className={`font-jakarta font-black text-3xl ${i === 0 ? "text-amber-400" : i < 3 ? "text-white" : "text-white/50"}`}>
                                        {player.score}
                                    </span>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">pts</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    onClick={() => router.push("/?tab=library")}
                    className="mt-14 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-6 rounded-[32px] font-black text-xl shadow-xl flex items-center justify-center gap-4 transition-all"
                >
                    <RefreshCw size={22} /> BACK TO LIBRARY
                </motion.button>
            </div>
        </div>
    );
}
