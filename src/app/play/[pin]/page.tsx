"use client";

import { use, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Clock, Wifi, Trophy, AlertTriangle, Zap, User, ArrowLeft, Send } from "lucide-react";

let socket: Socket;

const OPTION_STYLES = [
    { bg: "bg-blue-500", hover: "hover:bg-blue-600", icon: "▲", label: "A" },
    { bg: "bg-purple-500", hover: "hover:bg-purple-600", icon: "◆", label: "B" },
    { bg: "bg-emerald-500", hover: "hover:bg-emerald-600", icon: "■", label: "C" },
    { bg: "bg-orange-500", hover: "hover:bg-orange-600", icon: "●", label: "D" },
];

export default function PlayerPage({ params }: { params: Promise<{ pin: string }> }) {
    const { pin } = use(params);
    const searchParams = useSearchParams();
    const nickname = searchParams.get("nickname") ?? "Explorer";
    const router = useRouter();

    const [status, setStatus] = useState<"JOINING" | "LOBBY" | "STARTING" | "QUESTION" | "ANSWERED" | "WAITING" | "SESSION_ENDED" | "ERROR">("JOINING");
    const [error, setError] = useState<string | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<any>(null);
    const [feedback, setFeedback] = useState<"CORRECT" | "INCORRECT" | null>(null);
    const [pointsEarned, setPointsEarned] = useState<number>(0);
    const [totalScore, setTotalScore] = useState<number>(0);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [answerText, setAnswerText] = useState("");
    const [quizTitle, setQuizTitle] = useState("");
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [playerRank, setPlayerRank] = useState<{ rank: number; totalPlayers: number; score: number } | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || undefined);

        const connTimeout = setTimeout(() => {
            if (!socket.connected) {
                setStatus("ERROR");
                setError("Failed to connect to the real-time server. Please ensure the backend is running and NEXT_PUBLIC_SOCKET_URL is set correctly.");
            }
        }, 5000);

        socket.on("connect", () => {
            clearTimeout(connTimeout);
            console.log("Connected to socket, joining PIN:", pin);
            socket.emit("join-lobby", { pin, nickname });
        });

        socket.on("connect_error", () => {
            clearTimeout(connTimeout);
            setStatus("ERROR");
            setError("Connection error. The WebSocket server at " + (process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin) + " could not be reached.");
        });

        socket.on("join-success", (data) => {
            setStatus("LOBBY");
            setQuizTitle(data.quizTitle || "Quiz Arena");
        });
        socket.on("join-error", (msg) => {
            setStatus("ERROR");
            setError(msg);
        });
        socket.on("game-starting", () => setStatus("STARTING"));
        socket.on("new-question", (q) => {
            setStatus("QUESTION");
            setCurrentQuestion(q);
            setFeedback(null);
            setSelectedIndex(null);
            setHasAnswered(false);
            setAnswerText("");
            setTimeLeft(q.time);
            setPlayerRank(null);

            // Start live countdown
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        });
        socket.on("answer-acknowledged", ({ isCorrect, pointsEarned: pts, totalScore: total }) => {
            if (timerRef.current) clearInterval(timerRef.current);
            setFeedback(isCorrect ? "CORRECT" : "INCORRECT");
            setPointsEarned(pts || 0);
            setTotalScore(total || 0);
            setHasAnswered(true);
            setStatus("ANSWERED");
        });
        // After each question results phase, server will send next question or game-over
        // Show a "waiting" state between ANSWERED and next question
        socket.on("question-results", (data) => {
            setStatus("WAITING");
            if (data && data.rank) {
                setPlayerRank({
                    rank: data.rank,
                    totalPlayers: data.totalPlayers,
                    score: data.score
                });
            }
            if (timerRef.current) clearInterval(timerRef.current);
        });
        socket.on("game-over", () => {
            setStatus("WAITING");
            if (timerRef.current) clearInterval(timerRef.current);
        });
        socket.on("host-ended-session", () => {
            if (timerRef.current) clearInterval(timerRef.current);
            setStatus("SESSION_ENDED");
            // Auto-redirect to home after 3 seconds
            setTimeout(() => {
                router.push("/");
            }, 3000);
        });
        return () => {
            socket.disconnect();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [pin, nickname]);

    const submitAnswer = (index?: number, text?: string) => {
        if (!hasAnswered) {
            if (index !== undefined) setSelectedIndex(index);
            socket.emit("submit-answer", {
                pin,
                answerIndex: index,
                answerText: text
            });
            setHasAnswered(true);
        }
    };

    // ── Navbar ──────────────────────────────────────────────────────────────
    const Navbar = () => (
        <div className="fixed top-0 left-0 right-0 z-50 px-5 h-14 bg-white/90 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <User className="text-white" size={14} />
                </div>
                <span className="font-black text-slate-800 text-sm tracking-wide">{nickname.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                    <Wifi size={10} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-600 tracking-widest">{pin}</span>
                </div>
                <button
                    onClick={() => {
                        if (confirm("Exit the arena? You'll be removed from the game.")) {
                            socket?.disconnect();
                            window.location.href = "/";
                        }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-full transition-all group"
                >
                    <ArrowLeft size={11} className="text-rose-500 group-hover:-translate-x-0.5 transition-transform" />
                    <span className="text-[10px] font-black text-rose-500 tracking-widest">EXIT</span>
                </button>
            </div>
        </div>
    );

    // ── Spinner / Loading ────────────────────────────────────────────────────
    const Spinner = ({ title, desc }: { title: string; desc: string }) => (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-lg mb-8 animate-bounce">
                <Zap className="text-indigo-600 fill-indigo-600" size={32} />
            </div>
            <h2 className="font-jakarta text-2xl font-black text-slate-900 mb-2">{title}</h2>
            <p className="text-slate-400 font-bold">{desc}</p>
        </div>
    );

    // ── JOINING ──────────────────────────────────────────────────────────────
    if (status === "JOINING") return <Spinner title="Connecting…" desc="Joining the game session" />;

    // ── ERROR ────────────────────────────────────────────────────────────────
    if (status === "ERROR") return (
        <div className="min-h-screen bg-rose-50 flex items-center justify-center p-8">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-[40px] p-10 max-w-sm w-full text-center shadow-2xl">
                <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
                    <AlertTriangle size={40} className="text-rose-500" />
                </div>
                <h2 className="font-jakarta text-3xl font-black text-slate-900 mb-2">Cannot Join</h2>
                <p className="text-slate-400 font-bold mb-10 leading-relaxed">{error || "Invalid PIN or game already started."}</p>
                <button onClick={() => window.location.href = "/"} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2">
                    <ArrowLeft size={20} /> GO BACK
                </button>
            </motion.div>
        </div>
    );

    // ── LOBBY ────────────────────────────────────────────────────────────────
    if (status === "LOBBY") return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
            <Navbar />
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center shadow-2xl mb-10 relative">
                    <Zap className="text-indigo-600 fill-indigo-600" size={40} />
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full border-4 border-slate-50 animate-ping" />
                </div>
            </motion.div>
            <h2 className="font-jakarta text-4xl font-black text-slate-900 mb-2 text-center">You're In! 🎉</h2>
            <p className="text-indigo-600 font-black text-[10px] uppercase tracking-[4px] mb-6">{quizTitle}</p>
            <p className="text-slate-400 font-bold text-center mb-10">Waiting for the host to start the game…</p>
            <div className="flex gap-2">
                {[0, 1, 2].map(i => (
                    <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
                        className="w-3 h-3 rounded-full bg-indigo-400" />
                ))}
            </div>
        </div>
    );

    // ── STARTING ─────────────────────────────────────────────────────────────
    if (status === "STARTING") return (
        <div className="min-h-screen bg-indigo-600 flex items-center justify-center text-white">
            <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1.4, opacity: 1 }} transition={{ duration: 0.6 }}
                className="font-jakarta text-[110px] font-black italic tracking-tighter drop-shadow-2xl">
                GO!
            </motion.div>
        </div>
    );

    // ── QUESTION ─────────────────────────────────────────────────────────────
    // Players do NOT see the question text — only the answer options / input
    if (status === "QUESTION" && currentQuestion) {
        const isTimeLow = timeLeft <= 5;
        return (
            <div className="h-screen bg-white flex flex-col overflow-hidden">
                <Navbar />
                <div className="flex-1 flex flex-col pt-14 min-h-0">
                    {/* Timer bar */}
                    <div className="px-4 pt-4 pb-2">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Q {currentQuestion.index + 1} / {currentQuestion.total}
                            </span>
                            <motion.span
                                animate={isTimeLow ? { scale: [1, 1.2, 1] } : {}}
                                transition={{ duration: 0.5, repeat: Infinity }}
                                className={`text-2xl font-black font-jakarta ${isTimeLow ? "text-rose-500" : "text-slate-800"}`}
                            >
                                {timeLeft}s
                            </motion.span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: "100%" }}
                                animate={{ width: `${(timeLeft / currentQuestion.time) * 100}%` }}
                                transition={{ duration: 1, ease: "linear" }}
                                className={`h-full rounded-full ${isTimeLow ? "bg-rose-500" : "bg-indigo-600"}`}
                            />
                        </div>
                    </div>

                    {/* Instruction banner */}
                    <div className="mx-4 mt-3 mb-3 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-center shrink-0">
                        <p className="text-slate-500 font-bold text-sm">
                            {currentQuestion.type === "TYPE_ANSWER"
                                ? "✏️ Type your answer below"
                                : "👆 Tap the correct answer"
                            }
                        </p>
                    </div>

                    {/* Answer area — fills all remaining space */}
                    <div className="flex-1 px-4 pb-4 min-h-0">
                        {currentQuestion.type === "TYPE_ANSWER" ? (
                            <div className="flex flex-col gap-4 h-full justify-center">
                                <input
                                    type="text"
                                    placeholder="Type your answer…"
                                    className="w-full bg-slate-50 border-4 border-slate-200 rounded-[28px] px-8 py-6 text-2xl font-black text-slate-900 focus:border-indigo-500 focus:bg-white transition-all outline-none text-center"
                                    value={answerText}
                                    autoFocus
                                    disabled={hasAnswered}
                                    onChange={(e) => setAnswerText(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && answerText.trim() && submitAnswer(undefined, answerText)}
                                />
                                <button
                                    onClick={() => answerText.trim() && submitAnswer(undefined, answerText)}
                                    disabled={!answerText.trim() || hasAnswered}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white py-5 rounded-[28px] font-black text-xl shadow-xl shadow-indigo-200 transition-all disabled:opacity-40 flex items-center justify-center gap-3"
                                >
                                    <Send size={20} /> SUBMIT
                                </button>
                            </div>
                        ) : (
                            <div className={`grid gap-3 h-full ${currentQuestion.type === "TRUE_FALSE" ? "grid-cols-1" : "grid-cols-2"}`}>
                                {currentQuestion.options.map((opt: string, i: number) => {
                                    const style = OPTION_STYLES[i];
                                    const isSelected = selectedIndex === i;
                                    return (
                                        <motion.button
                                            key={i}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.08 }}
                                            onClick={() => !hasAnswered && submitAnswer(i)}
                                            disabled={hasAnswered}
                                            className={`
                                                relative flex flex-col items-center justify-center rounded-[28px] font-jakarta font-black text-white transition-all active:scale-[0.96] shadow-lg
                                                text-xl
                                                ${isSelected ? "ring-4 ring-white ring-offset-2 ring-offset-slate-100 scale-[1.02]" : ""}
                                                ${hasAnswered && !isSelected ? "opacity-50" : ""}
                                                ${style.bg} ${!hasAnswered ? style.hover : ""}
                                            `}
                                        >
                                            <span className="text-white/60 text-xs font-black tracking-widest mb-2">{style.label}</span>
                                            <span className="text-center px-4 leading-tight">{opt}</span>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── ANSWERED ─────────────────────────────────────────────────────────────
    if (status === "ANSWERED") return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
            <Navbar />
            <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="bg-white rounded-[48px] p-10 w-full max-w-sm text-center shadow-2xl border border-slate-100"
            >
                <div className="w-20 h-20 rounded-[28px] bg-indigo-50 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={48} className="text-indigo-500 animate-pulse" />
                </div>

                <h2 className="font-jakarta text-3xl font-black mb-2 text-slate-800 leading-tight">
                    ANSWER SUBMITTED!
                </h2>
                <p className="text-slate-400 font-bold text-sm mb-4">
                    Your answer has been locked in. Let's see the results when the question ends!
                </p>

                {selectedIndex !== null && currentQuestion && currentQuestion.options && (
                    <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 inline-block max-w-full">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Your Selection</p>
                        <span className="font-bold text-slate-700 text-base block truncate">
                            {OPTION_STYLES[selectedIndex]?.label}. {currentQuestion.options[selectedIndex]}
                        </span>
                    </div>
                )}

                {answerText && (
                    <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 inline-block max-w-full">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Your Typed Answer</p>
                        <span className="font-bold text-slate-700 text-base block truncate">
                            "{answerText}"
                        </span>
                    </div>
                )}

                <div className="flex justify-center gap-2 mt-8">
                    {[0, 1, 2].map(i => (
                        <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
                            className="w-2 h-2 rounded-full bg-slate-300" />
                    ))}
                </div>
                <p className="text-slate-400 font-bold text-xs mt-3">Waiting for question to end…</p>
            </motion.div>
        </div>
    );

    // ── SESSION ENDED BY HOST – auto-redirects to home ─────────────────────
    if (status === "SESSION_ENDED") return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center">
            <motion.div
                initial={{ scale: 0.85, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 22 }}
                className="bg-white rounded-[48px] p-10 w-full max-w-xs shadow-2xl"
            >
                <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-5xl mb-6"
                >
                    🚪
                </motion.div>
                <h2 className="font-jakarta text-2xl font-black text-slate-900 mb-2">Session Ended</h2>
                <p className="text-slate-400 font-bold text-sm mb-1">The host closed this arena.</p>
                <p className="text-indigo-500 font-black text-xs mt-4 animate-pulse">Redirecting to home…</p>
            </motion.div>
        </div>
    );

    // ── WAITING (between questions or after game ends) ────────────────────────
    if (status === "WAITING") {
        if (playerRank) {
            let heading = "KEEP PUSHING! 🚀";
            let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
            let borderGlow = "border-slate-200";
            
            if (playerRank.rank === 1) {
                heading = "👑 YOU ARE AT THE TOP!";
                badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
                borderGlow = "border-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.15)]";
            } else if (playerRank.rank <= 3) {
                heading = "🔥 YOU ARE IN THE TOP 3!";
                badgeColor = "bg-indigo-100 text-indigo-800 border-indigo-200";
                borderGlow = "border-indigo-200 shadow-[0_0_30px_rgba(99,102,241,0.15)]";
            } else if (playerRank.rank <= 5) {
                heading = "⚡ YOU ARE IN THE TOP 5!";
                badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                borderGlow = "border-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.15)]";
            }

            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
                    <Navbar />
                    <motion.div
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 220, damping: 20 }}
                        className={`bg-white rounded-[48px] p-10 w-full max-w-sm text-center shadow-2xl border ${borderGlow}`}
                    >
                        <span className={`inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-black tracking-widest border mb-6 ${badgeColor}`}>
                            RANK #{playerRank.rank}
                        </span>

                        <h2 className="font-jakarta text-3xl font-black mb-3 text-slate-800 leading-tight">
                            {heading}
                        </h2>

                        <div className="my-8 py-6 border-t border-b border-slate-100">
                            <div className="grid grid-cols-2 gap-4 divide-x divide-slate-100">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Your Standing</p>
                                    <p className="font-jakarta font-black text-3xl text-slate-800">
                                        {playerRank.rank} <span className="text-slate-400 text-lg">/ {playerRank.totalPlayers}</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Score</p>
                                    <p className="font-jakarta font-black text-3xl text-slate-800">
                                        {playerRank.score}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center gap-2 mb-3">
                            {[0, 1, 2].map(i => (
                                <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
                                    className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                            ))}
                        </div>
                        <p className="text-slate-400 font-bold text-xs">Waiting for host to advance…</p>
                    </motion.div>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
                <Navbar />
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-lg mb-6 animate-pulse">
                    <Clock className="text-indigo-600" size={32} />
                </div>
                <h2 className="font-jakarta text-2xl font-black text-slate-900 mb-2">Hang tight…</h2>
                <p className="text-slate-400 font-bold">The host is preparing the next question</p>
                <div className="flex gap-2 mt-6">
                    {[0, 1, 2].map(i => (
                        <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
                            className="w-2.5 h-2.5 rounded-full bg-indigo-300" />
                    ))}
                </div>
            </div>
        );
    }

    // Fallback
    return <Spinner title="Session Complete" desc="Check the host screen for final rankings." />;
}
