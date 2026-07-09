"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Zap, Users, Play, Shield, Clock, BookOpen, ChevronRight, Plus,
    MoreVertical, Pencil, Share2, Edit3, Trash2, ArrowLeft, Lock
} from "lucide-react";
import { io, Socket } from "socket.io-client";

let socket: Socket;

export default function Home() {
    const [pin, setPin] = useState("");
    const [nickname, setNickname] = useState("");
    const [verifyKey, setVerifyKey] = useState("");
    const [verifyError, setVerifyError] = useState(false);
    const router = useRouter();

    const [view, setView] = useState<"LANDING" | "JOIN" | "VERIFY" | "VAULT" | "FORGE_TYPE">("LANDING");
    const [library, setLibrary] = useState<any[]>([]);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    useEffect(() => {
        // Load from localStorage immediately as fallback
        try {
            const stored = localStorage.getItem("quizarc_library");
            if (stored) {
                setLibrary(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Failed to load local library", e);
        }

        socket = io();

        socket.on("library-data", (data) => {
            setLibrary(data);
            try {
                localStorage.setItem("quizarc_library", JSON.stringify(data));
            } catch (e) {}
        });

        socket.emit("get-library");

        const params = new URLSearchParams(window.location.search);
        const isAuthorized = localStorage.getItem("quizarc_auth") === "true";

        if (params.get("tab") === "library") {
            if (isAuthorized) {
                setView("VAULT");
            } else {
                setView("VERIFY");
            }
        }

        return () => { socket.disconnect(); };
    }, []);

    const deleteQuiz = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Permanently remove this arena?")) {
            // Delete from local storage immediately
            try {
                const stored = localStorage.getItem("quizarc_library");
                if (stored) {
                    const localLib = JSON.parse(stored);
                    const updated = localLib.filter((q: any) => q.id !== id);
                    localStorage.setItem("quizarc_library", JSON.stringify(updated));
                    if (!socket.connected) {
                        setLibrary(updated);
                    }
                }
            } catch (e) {}

            if (socket && socket.connected) {
                socket.emit("delete-from-library", id);
            }
        }
    };

    const handleHost = (quiz: any) => {
        localStorage.setItem("host_target_quiz", JSON.stringify(quiz));
        router.push("/host");
    };

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin && nickname) {
            router.push(`/play/${pin}?nickname=${encodeURIComponent(nickname)}`);
        }
    };

    const handleVerify = (e: React.FormEvent) => {
        e.preventDefault();
        if (verifyKey.toUpperCase() === "STEVEBILLY") {
            localStorage.setItem("quizarc_auth", "true");
            setView("VAULT");
            setVerifyError(false);
        } else {
            setVerifyError(true);
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 relative overflow-hidden font-sans">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 -left-1/4 w-[70%] h-[70%] bg-indigo-100/30 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-0 -right-1/4 w-[60%] h-[60%] bg-purple-100/30 rounded-full blur-[100px] -z-10" />
            
            {/* Top Noise Layer */}
            <div className="absolute inset-0 noise-bg pointer-events-none -z-5" />

            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-slate-100/60 transition-all">
                <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
                    <button onClick={() => setView("LANDING")} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-xl transform rotate-3">
                            <Zap className="text-white fill-white" size={20} />
                        </div>
                        <span className="font-jakarta text-2xl font-black text-slate-900 tracking-tightest">QuizArc</span>
                    </button>
                    
                    {view !== "LANDING" && (
                        <button 
                            onClick={() => {
                                const isAuthorized = localStorage.getItem("quizarc_auth") === "true";
                                if ((view === "FORGE_TYPE" || view === "VAULT") && isAuthorized) {
                                    setView("VAULT");
                                } else {
                                    setView("LANDING");
                                }
                            }}
                            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black text-[11px] uppercase tracking-widest transition-all"
                        >
                            <ArrowLeft size={14} /> {view === "FORGE_TYPE" ? "Back to Vault" : "Back to Start"}
                        </button>
                    )}

                    <div className="hidden lg:flex items-center gap-4">
                        <button 
                            onClick={() => {
                                const isAuthorized = localStorage.getItem("quizarc_auth") === "true";
                                setView(isAuthorized ? "VAULT" : "VERIFY");
                            }} 
                            className="bg-slate-900 border border-slate-800 text-white px-6 py-3 rounded-2xl hover:bg-slate-800 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 font-bold text-xs"
                        >
                            MANAGEMENT
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 pt-12 pb-32 min-h-[calc(100vh-200px)] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                    {view === "LANDING" && (
                        <motion.div 
                            key="landing"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="text-center max-w-4xl mx-auto"
                        >
                            <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full text-indigo-600 font-black text-[10px] uppercase tracking-widest mb-8 border border-indigo-100">
                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                                CSE Stream Event Live
                            </span>
                            
                            <h1 className="font-jakarta text-[70px] lg:text-[100px] font-black leading-[0.9] text-slate-900 tracking-tightest mb-12">
                                READY TO <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 uppercase">START?</span>
                            </h1>

                            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                                <button 
                                    onClick={() => setView("JOIN")}
                                    className="group relative w-full md:w-[320px] bg-indigo-600 p-10 rounded-[48px] shadow-2xl shadow-indigo-200 hover:scale-[1.05] transition-all active:scale-95 text-left overflow-hidden"
                                >
                                    <div className="relative z-10">
                                        <Users className="text-white mb-6" size={40} />
                                        <h3 className="text-white font-jakarta text-3xl font-black mb-2">JOIN ARENA</h3>
                                        <p className="text-indigo-100 font-bold text-sm">Enter a PIN to compete</p>
                                    </div>
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform">
                                        <Play className="text-white fill-white" size={120} />
                                    </div>
                                </button>

                                <button 
                                    onClick={() => setView("VERIFY")}
                                    className="group relative w-full md:w-[320px] bg-slate-900 p-10 rounded-[48px] shadow-2xl hover:scale-[1.05] transition-all active:scale-95 text-left overflow-hidden"
                                >
                                    <div className="relative z-10">
                                        <Shield className="text-white mb-6" size={40} />
                                        <h3 className="text-white font-jakarta text-3xl font-black mb-2">CREATE ARENA</h3>
                                        <p className="text-slate-400 font-bold text-sm">Host your own session</p>
                                    </div>
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform">
                                        <Plus className="text-white" size={120} />
                                    </div>
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {view === "JOIN" && (
                        <motion.div 
                            key="join"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="max-w-[480px] mx-auto w-full"
                        >
                            <div className="text-center mb-10">
                                <h2 className="font-jakarta text-5xl font-black text-slate-900 mb-2">ENTER ARENA</h2>
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Distributed Connectivity Matrix</p>
                            </div>

                            <form onSubmit={handleJoin} className="bg-white/40 backdrop-blur-3xl p-10 rounded-[48px] border border-white/60 shadow-glass relative">
                                <div className="space-y-8">
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 pl-1">ARENA PIN</label>
                                        <input 
                                            type="text" 
                                            maxLength={6}
                                            placeholder="000000"
                                            className="w-full bg-white/60 border-2 border-slate-100 rounded-[28px] px-8 py-6 text-4xl font-black text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none tracking-tighter"
                                            value={pin}
                                            onChange={(e) => setPin(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 pl-1">COMMANDER TAG</label>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                placeholder="E.g. AlanTuring"
                                                className="w-full bg-white/60 border-2 border-slate-100 rounded-[28px] px-8 py-6 text-xl font-bold text-slate-700 placeholder:text-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                                value={nickname}
                                                onChange={(e) => setNickname(e.target.value)}
                                            />
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                                                <Zap size={18} fill="currentColor" />
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!pin || !nickname}
                                        className="group w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-3xl font-black text-xl shadow-2xl shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-4 disabled:opacity-40 disabled:shadow-none"
                                    >
                                        ESTABLISH LINK
                                        <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}

                    {view === "VERIFY" && (
                        <motion.div 
                            key="verify"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="max-w-[480px] mx-auto w-full"
                        >
                            <div className="text-center mb-10">
                                <Lock className="mx-auto text-indigo-600 mb-6" size={48} />
                                <h2 className="font-jakarta text-5xl font-black text-slate-900 mb-2">SECURE GATE</h2>
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Authorization Required</p>
                            </div>

                            <form onSubmit={handleVerify} className="bg-white/40 backdrop-blur-3xl p-10 rounded-[48px] border border-white/60 shadow-glass relative">
                                <div className="space-y-8">
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 pl-1">VERIFICATION KEY</label>
                                        <input 
                                            type="password" 
                                            placeholder="••••••••"
                                            className={`w-full bg-white/60 border-2 rounded-[28px] px-8 py-6 text-xl font-bold transition-all outline-none text-center tracking-[8px] placeholder:tracking-normal placeholder:text-slate-400 ${verifyError ? "border-rose-500 bg-rose-50" : "border-slate-100 focus:border-indigo-600"}`}
                                            value={verifyKey}
                                            onChange={(e) => {
                                                setVerifyKey(e.target.value);
                                                setVerifyError(false);
                                            }}
                                        />
                                        {verifyError && (
                                            <p className="text-rose-500 text-xs font-black uppercase tracking-widest mt-4 text-center">Unauthorized Access Attempt</p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        className="group w-full bg-slate-900 hover:bg-black text-white py-6 rounded-3xl font-black text-xl shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-4"
                                    >
                                        AUTHORIZE
                                        <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}

                    {view === "VAULT" && (
                        <motion.div 
                            key="vault"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="space-y-12"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <h2 className="font-jakarta text-5xl font-black text-slate-900 mb-2 uppercase italic tracking-tight">Management Hub</h2>
                                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest pl-1">Event Control & Quiz Repository</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => {
                                            localStorage.removeItem("quizarc_auth");
                                            setView("LANDING");
                                        }}
                                        className="text-slate-400 hover:text-rose-500 font-black text-[10px] uppercase tracking-widest transition-all px-4"
                                    >
                                        Log Out
                                    </button>
                                    <button
                                        onClick={() => setView("FORGE_TYPE")}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-[28px] font-black text-sm flex items-center gap-3 transition-all shadow-xl shadow-indigo-100 active:scale-95 self-start"
                                    >
                                        <Plus size={20} />
                                        FORGE NEW
                                    </button>
                                </div>
                            </div>

                            {library.length === 0 ? (
                                <div className="bg-white/40 border-2 border-dashed border-slate-100 rounded-[56px] p-24 text-center flex flex-col items-center justify-center">
                                    <div className="w-24 h-24 bg-white rounded-[40px] shadow-sm flex items-center justify-center mb-10">
                                        <Shield size={40} className="text-slate-100" />
                                    </div>
                                    <h3 className="font-jakarta text-2xl font-black text-slate-300 mb-4 uppercase">Repo Empty</h3>
                                    <p className="text-slate-400 font-bold max-w-xs leading-relaxed">No custom challenges detected. Begin construction of your first arena.</p>
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    <AnimatePresence>
                                        {library.map((quiz) => (
                                            <motion.div
                                                key={quiz.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="group bg-white rounded-[44px] p-10 border border-slate-100 hover:shadow-premium transition-all duration-500 relative flex flex-col h-[320px]"
                                            >
                                                <div className="flex justify-between items-start mb-8">
                                                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                                        <BookOpen size={24} />
                                                    </div>
                                                    
                                                    {/* Operations Menu */}
                                                    <div className="relative">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveMenu(activeMenu === quiz.id ? null : quiz.id);
                                                            }}
                                                            title="Quiz Options Menu"
                                                            className="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-300 hover:text-slate-900 transition-all"
                                                        >
                                                            <MoreVertical size={20} />
                                                        </button>
                                                        
                                                        {activeMenu === quiz.id && (
                                                            <motion.div 
                                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 z-50"
                                                            >
                                                                <button onClick={() => router.push(`/create?edit=${quiz.id}`)} className="w-full text-left px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center gap-3">
                                                                    <Pencil size={14} /> Edit Data
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigator.clipboard.writeText(`https://quizarc.app/join?id=${quiz.id}`);
                                                                        alert("Arena Reference Link copied to clipboard!");
                                                                        setActiveMenu(null);
                                                                    }}
                                                                    className="w-full text-left px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center gap-3"
                                                                >
                                                                    <Share2 size={14} /> Share Link
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const newName = prompt("Enter new title for this arena:", quiz.title);
                                                                        if (newName && newName !== quiz.title) {
                                                                            const updatedQuiz = { ...quiz, title: newName };
                                                                            const updated = library.map(q => q.id === quiz.id ? updatedQuiz : q);
                                                                            setLibrary(updated);
                                                                            localStorage.setItem("quizarc_library", JSON.stringify(updated));
                                                                            if (socket && socket.connected) {
                                                                                socket.emit("save-to-library", updatedQuiz);
                                                                            }
                                                                        }
                                                                        setActiveMenu(null);
                                                                    }}
                                                                    className="w-full text-left px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center gap-3"
                                                                >
                                                                    <Edit3 size={14} /> Rename
                                                                </button>
                                                                <div className="h-px bg-slate-50 my-2 mx-3" />
                                                                <button onClick={(e) => deleteQuiz(quiz.id, e)} className="w-full text-left px-5 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-50 transition-all flex items-center gap-3">
                                                                    <Trash2 size={14} /> Delete
                                                                </button>
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                </div>

                                                <h3 className="font-jakarta text-2xl font-black text-slate-900 mb-2 leading-tight flex-1">
                                                    {quiz.title}
                                                </h3>

                                                <div className="flex items-center gap-6 mb-8 text-[11px] font-black uppercase tracking-widest text-slate-300">
                                                    <div className="flex items-center gap-2">
                                                        <Zap size={12} className="text-indigo-400" />
                                                        {quiz.questionsCount} Stages
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={12} />
                                                        {new Date(quiz.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                    </div>
                                                </div>

                                                <button 
                                                    onClick={() => handleHost(quiz)}
                                                    className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-5 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all hover:shadow-[0_10px_30px_rgba(99,102,241,0.3)] active:scale-98"
                                                >
                                                    Host Arena
                                                </button>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </motion.div>
                    )}
                    {view === "FORGE_TYPE" && (
                        <motion.div 
                            key="forge-type"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="max-w-5xl mx-auto w-full"
                        >
                            <div className="text-center mb-16">
                                <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-slate-500 font-black text-[10px] uppercase tracking-widest mb-6">
                                    Construction Phase
                                </span>
                                <h2 className="font-jakarta text-6xl font-black text-slate-900 mb-4 italic tracking-tightest">SELECT MODE</h2>
                                <p className="text-slate-400 font-bold uppercase text-[11px] tracking-[4px]">Choose your arena mechanics</p>
                            </div>

                            <div className="grid md:grid-cols-3 gap-8">
                                {[
                                    { 
                                        type: "QUIZ", 
                                        title: "Quiz", 
                                        desc: "Standard 4-option multiple choice evaluation.",
                                        icon: <Users size={32} />,
                                        color: "bg-indigo-600",
                                        shadow: "shadow-indigo-100"
                                    },
                                    { 
                                        type: "TRUE_FALSE", 
                                        title: "True/False", 
                                        desc: "Binary choice rapid-fire verification.",
                                        icon: <Clock size={32} />,
                                        color: "bg-emerald-600",
                                        shadow: "shadow-emerald-100"
                                    },
                                    { 
                                        type: "TYPE_ANSWER", 
                                        title: "Type Answer", 
                                        desc: "Open-ended input for absolute precision.",
                                        icon: <Zap size={32} fill="white" />,
                                        color: "bg-purple-600",
                                        shadow: "shadow-purple-100"
                                    }
                                ].map((mode) => (
                                    <button
                                        key={mode.type}
                                        onClick={() => router.push(`/create?type=${mode.type}`)}
                                        className="group relative bg-white border border-slate-100 rounded-[56px] p-12 text-left hover:shadow-premium transition-all duration-500 hover:scale-[1.02] active:scale-95 overflow-hidden"
                                    >
                                        <div className="relative z-10 h-full flex flex-col">
                                            <div className={`w-20 h-20 ${mode.color} rounded-[28px] flex items-center justify-center text-white mb-8 shadow-2xl ${mode.shadow} group-hover:rotate-6 transition-transform`}>
                                                {mode.icon}
                                            </div>
                                            <h3 className="font-jakarta text-3xl font-black text-slate-900 mb-4 uppercase tracking-tighter italic">
                                                {mode.title}
                                            </h3>
                                            <p className="text-slate-400 font-bold leading-relaxed mb-auto">
                                                {mode.desc}
                                            </p>
                                            <div className="mt-8 flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">
                                                INITIALIZE ARENA <ChevronRight size={14} />
                                            </div>
                                        </div>
                                        {/* Decorative Element */}
                                        <div className={`absolute -right-8 -bottom-8 w-40 h-40 ${mode.color} opacity-[0.03] rounded-full group-hover:scale-150 transition-transform`} />
                                    </button>
                                ))}
                            </div>

                            <div className="mt-16 text-center">
                                <button 
                                    onClick={() => setView("VAULT")}
                                    className="text-slate-400 hover:text-slate-900 font-black text-[11px] uppercase tracking-[4px] transition-all flex items-center gap-3 mx-auto"
                                >
                                    <ArrowLeft size={16} /> ABORT INITIALIZATION
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer */}
            <footer className="border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                            <Zap className="text-white fill-white" size={14} />
                        </div>
                        <span className="font-jakarta font-bold text-slate-900">QuizArc</span>
                    </div>
                    <div className="text-sm text-slate-400 font-medium">© 2025 DeepMind Education. All rights reserved.</div>
                    <div className="flex gap-6 text-sm font-bold text-slate-600 uppercase tracking-widest text-[10px]">
                        <a href="#">Privacy</a>
                        <a href="#">Terms</a>
                        <a href="#">Contact</a>
                    </div>
                </div>
            </footer>
        </main>
    );
}
