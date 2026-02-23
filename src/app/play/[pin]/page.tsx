"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";

let socket: Socket;

export default function PlayerPage({ params }: { params: { pin: string } }) {
    const searchParams = useSearchParams();
    const nickname = searchParams.get("name");
    const [status, setStatus] = useState<"JOINING" | "LOBBY" | "STARTING" | "QUESTION" | "RESULTS" | "ERROR">("JOINING");
    const [error, setError] = useState<string | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<any>(null);
    const [feedback, setFeedback] = useState<"CORRECT" | "INCORRECT" | null>(null);
    const [hasAnswered, setHasAnswered] = useState(false);

    useEffect(() => {
        socket = io();

        socket.on("connect", () => {
            socket.emit("join-lobby", { pin: params.pin, nickname });
        });

        socket.on("join-success", () => {
            setStatus("LOBBY");
        });

        socket.on("join-error", (msg) => {
            setStatus("ERROR");
            setError(msg);
        });

        socket.on("game-starting", () => {
            setStatus("STARTING");
        });

        socket.on("new-question", (questionData) => {
            setStatus("QUESTION");
            setCurrentQuestion(questionData);
            setFeedback(null);
            setHasAnswered(false);
        });

        socket.on("answer-acknowledged", (isCorrect) => {
            setFeedback(isCorrect ? "CORRECT" : "INCORRECT");
            setHasAnswered(true);
        });

        socket.on("question-results", () => {
            setStatus("RESULTS");
        });

        return () => {
            socket.disconnect();
        };
    }, [params.pin, nickname]);

    const submitAnswer = (index: number) => {
        if (!hasAnswered) {
            socket.emit("submit-answer", { pin: params.pin, answerIndex: index });
        }
    };

    if (status === "JOINING") {
        return (
            <div className="flex flex-col items-center justify-center min-vh-100 p-6">
                <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="text-2xl font-bold opacity-50"
                >
                    Connecting to Arena...
                </motion.div>
            </div>
        );
    }

    if (status === "ERROR") {
        return (
            <div className="flex flex-col items-center justify-center min-vh-100 p-6 text-center">
                <AlertCircle size={64} className="text-secondary mb-6" />
                <h1 className="text-3xl font-bold mb-4">Oops!</h1>
                <p className="text-gray-400 mb-8">{error}</p>
                <button onClick={() => window.location.href = "/"} className="btn-primary">
                    Back to Home
                </button>
            </div>
        );
    }

    return (
        <main className="min-vh-100 p-6 flex flex-col items-center justify-center text-center">
            {status === "LOBBY" && (
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-8"
                >
                    <div className="p-6 bg-accent/20 rounded-full">
                        <CheckCircle2 size={64} className="text-accent" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold mb-2">You're in!</h1>
                        <p className="text-gray-400 text-lg">See your name on screen?</p>
                    </div>
                    <div className="glass p-6 w-full max-w-sm">
                        <p className="text-sm text-gray-500 uppercase tracking-widest mb-2">Playing as</p>
                        <p className="text-2xl font-bold">{nickname}</p>
                    </div>
                </motion.div>
            )}

            {status === "STARTING" && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-6xl font-black title-gradient italic"
                >
                    GET READY!
                </motion.div>
            )}

            {status === "QUESTION" && currentQuestion && (
                <div className="w-full flex-1 flex flex-col items-center justify-center gap-6">
                    {!hasAnswered ? (
                        <div className="grid grid-cols-2 gap-4 w-full h-full max-w-lg">
                            {currentQuestion.options.map((_: any, i: number) => (
                                <button
                                    key={i}
                                    onClick={() => submitAnswer(i)}
                                    className={`glass h-48 text-6xl font-black bg-white/5 hover:bg-white/10 transition-colors border-b-4 ${i === 0 ? 'border-primary' : i === 1 ? 'border-secondary' : i === 2 ? 'border-accent' : 'border-warning'
                                        }`}
                                >
                                    {i === 0 ? '▲' : i === 1 ? '◆' : i === 2 ? '●' : '■'}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`w-full max-w-lg h-96 flex flex-col items-center justify-center rounded-3xl ${feedback === "CORRECT" ? 'bg-accent/20 border-accent' : 'bg-secondary/20 border-secondary'
                                } border-4`}
                        >
                            <h2 className="text-5xl font-black mb-4">
                                {feedback === "CORRECT" ? "CORRECT!" : "INCORRECT"}
                            </h2>
                            <div className="p-4 bg-white/10 rounded-full animate-pulse">
                                {feedback === "CORRECT" ? "🎉" : "😢"}
                            </div>
                            <p className="mt-8 text-xl font-bold opacity-50">Waiting for others...</p>
                        </motion.div>
                    )}
                </div>
            )}

            {status === "RESULTS" && (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="glass p-8 rounded-3xl animate-pulse">
                        <h2 className="text-3xl font-bold italic title-gradient">CHECK THE SCREEN!</h2>
                    </div>
                </div>
            )}
        </main>
    );
}
