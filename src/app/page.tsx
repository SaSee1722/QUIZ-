"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Play, Shield, Zap, Sparkles, Orbit } from "lucide-react";

export default function Home() {
    const [pin, setPin] = useState("");
    const [nickname, setNickname] = useState("");
    const router = useRouter();

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin && nickname) {
            router.push(`/play/${pin}?name=${encodeURIComponent(nickname)}`);
        }
    };

    const handleHost = () => {
        router.push("/host");
    };

    return (
        <main className="flex flex-col items-center justify-center min-vh-100 p-6 overflow-hidden">
            {/* Animated background elements */}
            <motion.div
                animate={{
                    rotate: 360,
                    scale: [1, 1.1, 1],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="fixed -top-20 -right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
            />
            <motion.div
                animate={{
                    rotate: -360,
                    scale: [1, 1.2, 1],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="fixed -bottom-20 -left-20 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-3xl"
            />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center mb-16 relative z-10"
            >
                <div className="flex items-center justify-center gap-4 mb-4">
                    <Orbit className="text-primary animate-pulse" size={48} />
                    <h1 className="text-7xl font-black title-gradient tracking-tighter">
                        PHYJAX
                    </h1>
                </div>
                <p className="text-gray-400 text-xl font-medium flex items-center justify-center gap-2">
                    <Sparkles size={20} className="text-primary" />
                    Enter the Physics Singularity
                    <Sparkles size={20} className="text-primary" />
                </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl w-full relative z-10">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ y: -5 }}
                    className="glass p-10 flex flex-col items-center gap-8 border-t-primary/20"
                >
                    <div className="p-5 bg-primary/10 rounded-2xl ring-1 ring-primary/20">
                        <Play className="text-primary" size={40} />
                    </div>
                    <div className="text-center">
                        <h2 className="text-3xl font-bold mb-2">Join Event</h2>
                        <p className="text-gray-500 text-sm">Enter the arena PIN to begin</p>
                    </div>

                    <form onSubmit={handleJoin} className="flex flex-col gap-6 w-full">
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="000000"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.toUpperCase())}
                                maxLength={6}
                                className="w-full text-center text-3xl tracking-[0.8em] font-black placeholder:opacity-20"
                            />
                            <input
                                type="text"
                                placeholder="YOUR NICKNAME"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                className="w-full text-center font-bold tracking-widest text-sm"
                            />
                        </div>
                        <button type="submit" className="btn-primary w-full text-lg shadow-primary/20">
                            INITIALIZE JOIN
                        </button>
                    </form>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ y: -5 }}
                    className="glass p-10 flex flex-col items-center justify-between gap-8 border-t-secondary/20"
                >
                    <div className="flex flex-col items-center gap-8">
                        <div className="p-5 bg-secondary/10 rounded-2xl ring-1 ring-secondary/20">
                            <Shield className="text-secondary" size={40} />
                        </div>
                        <div className="text-center">
                            <h2 className="text-3xl font-bold mb-2">Forge Arena</h2>
                            <p className="text-gray-500 text-sm">Create and host your own physics simulation</p>
                        </div>
                        <div className="space-y-4 text-center">
                            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                                Challenge friends across the cosmos with real-time physics quizzes and interactive simulations.
                            </p>
                        </div>
                    </div>
                    <button onClick={handleHost} className="btn-secondary w-full text-lg hover:border-secondary transition-all">
                        CREATE LOBBY
                    </button>
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 2 }}
                className="mt-20 flex flex-wrap justify-center gap-12 text-gray-500 font-medium"
            >
                <div className="flex items-center gap-3 hover:text-primary transition-colors cursor-default">
                    <Zap size={18} className="text-primary" />
                    <span className="text-sm tracking-widest">REAL-TIME SYNC</span>
                </div>
                <div className="flex items-center gap-3 hover:text-primary transition-colors cursor-default">
                    <Zap size={18} className="text-primary" />
                    <span className="text-sm tracking-widest">GRAVITY ENGINE</span>
                </div>
                <div className="flex items-center gap-3 hover:text-primary transition-colors cursor-default">
                    <Zap size={18} className="text-primary" />
                    <span className="text-sm tracking-widest">QUANTUM UI</span>
                </div>
            </motion.div>
        </main>
    );
}
