"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Play, Settings, Share2 } from "lucide-react";

let socket: Socket;

export default function HostPage() {
    const [pin, setPin] = useState<string | null>(null);
    const [players, setPlayers] = useState<any[]>([]);
    const [gameState, setGameState] = useState<"LOBBY" | "STARTING" | "QUESTION" | "RESULTS" | "FINISHED">("LOBBY");
    const [currentQuestion, setCurrentQuestion] = useState<any>(null);
    const [results, setResults] = useState<any>(null);

    useEffect(() => {
        socket = io();

        socket.on("connect", () => {
            socket.emit("create-lobby");
        });

        socket.on("lobby-created", (newPin) => {
            setPin(newPin);
        });

        socket.on("player-joined", (updatedPlayers) => {
            setPlayers(updatedPlayers);
        });

        socket.on("game-starting", () => {
            setGameState("STARTING");
        });

        socket.on("new-question", (questionData) => {
            setGameState("QUESTION");
            setCurrentQuestion(questionData);
            setResults(null);
        });

        socket.on("question-results", (resultsData) => {
            setGameState("RESULTS");
            setResults(resultsData);
            setPlayers(resultsData.players);
        });

        socket.on("game-over", (finalPlayers) => {
            setGameState("FINISHED");
            setPlayers(finalPlayers);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const handleStartGame = () => {
        if (pin) {
            socket.emit("start-game", pin);
        }
    };

    if (!pin) {
        return (
            <div className="flex items-center justify-center min-vh-100">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
                />
            </div>
        );
    }

    return (
        <main className="min-vh-100 p-8 flex flex-col items-center">
            {gameState === "LOBBY" && (
                <>
                    <div className="max-w-6xl w-full flex justify-between items-start mb-12">
                        <div className="glass p-6 px-10">
                            <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Join at phyjax.com</p>
                            <h1 className="text-6xl font-bold tracking-tighter text-primary">{pin}</h1>
                        </div>

                        <div className="flex gap-4">
                            <button className="btn-secondary flex items-center gap-2">
                                <Settings size={20} /> Settings
                            </button>
                            <button
                                onClick={handleStartGame}
                                disabled={players.length === 0}
                                className={`btn-primary flex items-center gap-2 px-12 ${players.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Play size={20} /> START GAME
                            </button>
                        </div>
                    </div>

                    <div className="w-full flex-1 flex flex-col items-center">
                        <div className="mb-8 flex items-center gap-3">
                            <Users className="text-secondary" />
                            <h2 className="text-2xl font-semibold">{players.length} Players Joined</h2>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 w-full">
                            <AnimatePresence>
                                {players.map((player) => (
                                    <motion.div
                                        key={player.id}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="glass p-4 text-center font-bold text-lg"
                                    >
                                        {player.nickname}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </>
            )}

            {gameState === "STARTING" && (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <motion.h1
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: [1, 1.2, 1], opacity: 1 }}
                        className="text-[12rem] font-black title-gradient italic"
                    >
                        3
                    </motion.h1>
                    <p className="text-2xl text-gray-400">Prepare for Launch...</p>
                </div>
            )}

            {gameState === "QUESTION" && currentQuestion && (
                <div className="w-full max-w-4xl flex-1 flex flex-col items-center justify-center">
                    <div className="mb-12 text-center">
                        <p className="text-primary font-bold mb-2">Question {currentQuestion.index + 1} of {currentQuestion.total}</p>
                        <h1 className="text-5xl font-bold">{currentQuestion.question}</h1>
                    </div>

                    <div className="grid grid-cols-2 gap-6 w-full mb-12">
                        {currentQuestion.options.map((opt: string, i: number) => (
                            <div key={i} className="glass p-8 text-2xl font-bold text-center border-l-8 border-l-primary">
                                {opt}
                            </div>
                        ))}
                    </div>

                    <div className="glass p-4 px-12 rounded-full text-4xl font-black">
                        {currentQuestion.time}
                    </div>
                </div>
            )}

            {gameState === "RESULTS" && results && (
                <div className="w-full max-w-2xl flex-1 flex flex-col items-center py-12">
                    <h2 className="text-4xl font-bold mb-8 title-gradient">Leaderboard</h2>
                    <div className="w-full flex flex-col gap-4">
                        {players.slice(0, 5).map((p, i) => (
                            <motion.div
                                key={p.id}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="glass p-6 flex justify-between items-center"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl font-black text-gray-500 w-8">{i + 1}</span>
                                    <span className="text-xl font-bold">{p.nickname}</span>
                                </div>
                                <span className="text-2xl font-black text-primary">{p.score}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {gameState === "FINISHED" && (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <h1 className="text-7xl font-black mb-12 title-gradient">GRAND CHAMPION</h1>
                    <div className="glass p-12 mb-12 backdrop-blur-3xl animate-bounce">
                        <h2 className="text-5xl font-bold">{players[0]?.nickname}</h2>
                        <p className="text-2xl text-gray-400 mt-2">{players[0]?.score} Points</p>
                    </div>
                    <button onClick={() => window.location.reload()} className="btn-primary px-16 text-xl">
                        PLAY AGAIN
                    </button>
                </div>
            )}
        </main>
    );
}
