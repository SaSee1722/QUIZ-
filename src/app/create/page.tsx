"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Plus, Trash2, ArrowLeft, Save, Image as ImageIcon, 
    CheckCircle, Zap, Clock, ChevronDown, Award, Copy,
    Layers, Settings, Eye, Loader2, Cloud, AlertTriangle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { io, Socket } from "socket.io-client";

let socket: Socket;

type QuestionType = "QUIZ" | "TRUE_FALSE" | "TYPE_ANSWER";

interface Question {
    type: QuestionType;
    question: string;
    options: string[];
    answer: number | string | string[];
    time: number;
    image?: string | null;
    points: number;
}

export default function CreateQuiz() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [editId, setEditId] = useState<string | null>(null);
    const [fixedType, setFixedType] = useState<QuestionType>("QUIZ");
    const [currentIdx, setCurrentIdx] = useState(0);

    const [questions, setQuestions] = useState<Question[]>([
        { type: "QUIZ", question: "", options: ["", "", "", ""], answer: 0, time: 20, points: 500 }
    ]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        socket = io();
        
        socket.on("save-success", () => {
            setIsSaving(false);
            router.push("/?tab=library");
        });

        socket.on("save-error", (msg) => {
            setIsSaving(false);
            alert("Error: " + msg);
        });

        // Load Quiz Data from Server if editing
        const params = new URLSearchParams(window.location.search);
        const editId = params.get("edit");
        const initialType = params.get("type") as QuestionType;

        if (editId) {
            socket.on("library-data", (library) => {
                const quiz = library.find((q: any) => q.id === editId);
                if (quiz) {
                    setEditId(editId);
                    setTitle(quiz.title);
                    setQuestions(quiz.questions.map((q: any) => ({ ...q, points: q.points || 500 })));
                    if (quiz.questions.length > 0) {
                        setFixedType(quiz.questions[0].type);
                    }
                }
            });
            socket.emit("get-library");
        } else if (initialType) {
            setFixedType(initialType);
            const initialOptions = initialType === "TRUE_FALSE" ? ["True", "False"] : 
                                 initialType === "TYPE_ANSWER" ? [] : ["", "", "", ""];
            const initialAnswer = initialType === "TYPE_ANSWER" ? ["", "", "", ""] : 0;
            
            setQuestions([{ 
                type: initialType, 
                question: "", 
                options: initialOptions, 
                answer: initialAnswer, 
                time: 20,
                points: 500
            }]);
        }

        return () => { socket.disconnect(); };
    }, []);

    const addQuestion = () => {
        const initialOptions = fixedType === "TRUE_FALSE" ? ["True", "False"] : 
                             fixedType === "TYPE_ANSWER" ? [] : ["", "", "", ""];
        const initialAnswer = fixedType === "TYPE_ANSWER" ? ["", "", "", ""] : 0;
        
        const newQuestions = [...questions, { 
            type: fixedType, 
            question: "", 
            options: initialOptions, 
            answer: initialAnswer, 
            time: 20,
            points: 500
        }];
        setQuestions(newQuestions);
        setCurrentIdx(newQuestions.length - 1);
    };

    const duplicateQuestion = (index: number) => {
        const q = questions[index];
        const newQuestions = [...questions];
        newQuestions.splice(index + 1, 0, { ...q, options: [...q.options] });
        setQuestions(newQuestions);
        setCurrentIdx(index + 1);
    };

    const removeQuestion = (index: number) => {
        if (questions.length <= 1) return;
        const newQuestions = questions.filter((_, i) => i !== index);
        setQuestions(newQuestions);
        if (currentIdx >= newQuestions.length) {
            setCurrentIdx(newQuestions.length - 1);
        }
    };

    const updateQuestion = (field: keyof Question, value: any) => {
        const newQuestions = [...questions];
        newQuestions[currentIdx] = { ...newQuestions[currentIdx], [field]: value };
        setQuestions(newQuestions);
    };

    const updateOption = (oIndex: number, value: string) => {
        const newQuestions = [...questions];
        newQuestions[currentIdx].options[oIndex] = value;
        setQuestions(newQuestions);
    };

    const handleSave = () => {
        if (isSaving) return;
        setIsSaving(true);
        
        const id = editId || Math.random().toString(36).substring(2, 9);
        const newQuiz = { 
            id,
            title: title || "Untitled Arena", 
            questions, 
            createdAt: new Date().toISOString(),
            questionsCount: questions.length 
        };
        
        // Use Global Intelligence (Server) instead of local memory (LocalStorage)
        socket.emit("save-to-library", newQuiz);
    };



    const compressImage = (file: File): Promise<Blob> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    let width = img.width;
                    let height = img.height;
                    const MAX_WIDTH = 1600;

                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx?.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        resolve(blob || file);
                    }, "image/jpeg", 0.85);
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleImageFile = async (file: File) => {
        if (file.size > 5 * 1024 * 1024) {
            alert("File too large! Max limit is 5MB for stability.");
            return;
        }

        // Instant Preview: Show user the image immediately
        const localPreview = URL.createObjectURL(file);
        updateQuestion("image", localPreview);
        setIsUploading(true);

        try {
            // Step 1: Optimize Image (Compression)
            const compressedBlob = await compressImage(file);
            const optimizedFile = new File([compressedBlob], file.name, { type: "image/jpeg" });

            // Step 2: Upload to Cloud
            const fileExt = "jpg";
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `questions/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('quiz-images')
                .upload(filePath, optimizedFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('quiz-images')
                .getPublicUrl(filePath);

            // Step 3: Replace local preview with permanent cloud URL
            updateQuestion("image", publicUrl);
            setIsUploading(false);
        } catch (error: any) {
            console.warn("Cloud optimization/upload failed, keeping local preview:", error);
            // We already showed the local preview, so we just stop the spinner
            setIsUploading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleImageFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleImageFile(file);
    };

    const currentQ = questions[currentIdx];

    return (
        <main className="h-screen bg-slate-50 flex flex-col overflow-hidden font-jakarta">
            {/* Top Navigation */}
            <nav className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0 z-50">
                <div className="flex items-center gap-6">
                    <button onClick={() => router.push("/?tab=library")} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-all font-black text-[10px] tracking-widest uppercase">
                        <ArrowLeft size={16} /> Exit Studio
                    </button>
                    <div className="h-6 w-px bg-slate-100" />
                    <input 
                        type="text"
                        placeholder="Enter Arena Title..."
                        className="bg-transparent border-none outline-none font-black text-lg text-slate-900 placeholder:text-slate-300 w-[300px]"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 text-slate-400 font-bold text-xs hover:bg-slate-100 transition-all">
                        <Eye size={16} /> Preview
                    </button>
                    <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-slate-400 bg-slate-50 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-100">
                        <Cloud size={14} className={isSaving ? "animate-pulse text-indigo-500" : "text-emerald-500"} />
                        {isSaving ? "Syncing..." : "Server Linked"}
                    </div>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-xl shadow-indigo-100 active:scale-95 flex items-center gap-3"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {isSaving ? "DEPLOING..." : "SAVE ARENA"}
                    </button>
                </div>
                </div>
            </nav>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar: Slides */}
                <aside className="w-[200px] border-right border-slate-100 bg-white flex flex-col overflow-hidden shrink-0 shadow-sm z-20">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {questions.map((q, idx) => (
                            <div key={idx} className="relative group">
                                <span className="absolute -left-2 top-1 text-[10px] font-black text-slate-300 group-hover:text-indigo-400 transition-colors">
                                    {idx + 1}
                                </span>
                                <button
                                    onClick={() => setCurrentIdx(idx)}
                                    className={`w-full aspect-video rounded-xl border-4 transition-all overflow-hidden relative ${currentIdx === idx ? "border-indigo-600 shadow-lg" : "border-slate-50 hover:border-slate-200"}`}
                                >
                                    <div className="absolute inset-0 bg-slate-50 flex items-center justify-center p-1">
                                        {q.image ? (
                                            <img src={q.image} className="w-full h-full object-cover rounded-md" alt="Thumb" />
                                        ) : (
                                            <div className="text-[6px] text-slate-200 font-bold text-center uppercase break-words px-2">
                                                {q.question || "No text"}
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute bottom-1 right-1 bg-white/50 backdrop-blur-sm rounded px-1 text-[8px] font-black">
                                        {q.time}s
                                    </div>
                                </button>
                                <div className="flex justify-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => duplicateQuestion(idx)} className="p-1 hover:text-indigo-600 transition-colors"><Copy size={12} /></button>
                                    <button onClick={() => removeQuestion(idx)} className="p-1 hover:text-rose-500 transition-colors"><Trash2 size={12} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-slate-50">
                        <button 
                            onClick={addQuestion}
                            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-indigo-400 hover:text-indigo-600 font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <Plus size={16} /> Add Stage
                        </button>
                    </div>
                </aside>

                {/* Center: Main Editor */}
                <section className="flex-1 bg-slate-50 p-6 overflow-y-auto flex flex-col items-center">
                    <div className="w-full max-w-4xl flex flex-col h-full gap-6">
                        {/* Question Input */}
                        <div className="bg-white rounded-[28px] p-6 shadow-sm border border-slate-100 shrink-0">
                            <textarea 
                                placeholder="Start typing your question..."
                                className="w-full bg-transparent border-none outline-none text-2xl font-black text-slate-900 placeholder:text-slate-300 text-center resize-none leading-tight"
                                rows={2}
                                value={currentQ.question}
                                onChange={(e) => updateQuestion("question", e.target.value)}
                            />
                        </div>

                        {/* Image Upload Area */}
                        <div 
                            className="flex-1 flex items-center justify-center relative min-h-0"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <input 
                                type="file" 
                                id="main-image-upload" 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={isUploading}
                            />
                            {currentQ.image ? (
                                <div className={`relative group w-full max-w-4xl h-full flex items-center justify-center bg-slate-100 shadow-xl border-2 ${isDragging ? "border-indigo-500 scale-[1.01]" : "border-slate-100"} transition-all duration-300`}>
                                    <img 
                                        src={currentQ.image} 
                                        className="w-full h-full object-contain" 
                                        alt="Arena Visual" 
                                    />
                                    <div className="absolute top-4 left-4 flex gap-2">
                                        <div className={`px-3 py-1.5 backdrop-blur-md border border-white/20 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-xl ${currentQ.image.startsWith('http') ? 'bg-emerald-500/80 text-white' : 'bg-amber-500/80 text-white'}`}>
                                            {currentQ.image.startsWith('http') ? <Cloud size={10} /> : <AlertTriangle size={10} />}
                                            {currentQ.image.startsWith('http') ? 'Cloud Sync Active' : 'Local Cache Only'}
                                        </div>
                                    </div>
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center">
                                            <Loader2 className="text-indigo-600 animate-spin" size={40} />
                                        </div>
                                    )}
                                    <label 
                                        htmlFor="main-image-upload"
                                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white font-black uppercase tracking-widest text-[10px]"
                                    >
                                        REPLACE RESOURCE
                                    </label>
                                    <button 
                                        onClick={() => updateQuestion("image", null)}
                                        className="absolute top-4 right-4 bg-white/20 backdrop-blur-md hover:bg-rose-500 text-white p-2 border border-white/20 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ) : (
                                <label 
                                    htmlFor="main-image-upload"
                                    className={`w-full max-w-4xl aspect-video bg-white border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group px-10 text-center ${isDragging ? "border-indigo-500 bg-indigo-50/50 scale-[1.01] text-indigo-600" : "border-slate-100 text-slate-200 hover:border-indigo-200 hover:text-indigo-400"}`}
                                >
                                    {isUploading ? (
                                        <Loader2 className="text-indigo-600 animate-spin" size={40} />
                                    ) : (
                                        <>
                                            <div className={`w-16 h-16 rounded-none flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner ${isDragging ? "bg-white text-indigo-600" : "bg-slate-50"}`}>
                                                <ImageIcon size={32} />
                                            </div>
                                            <span className="font-black text-[10px] uppercase tracking-[3px]">
                                                {isDragging ? "Release to Forge" : "Drop Resource Here"}
                                            </span>
                                        </>
                                    )}
                                </label>
                            )}
                        </div>

                        {/* Answers Grid */}
                        <div className="shrink-0 mt-auto">
                            {currentQ.type === "TYPE_ANSWER" ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {((currentQ.answer as string[]) || ["", "", "", ""]).map((ans, aIdx) => (
                                        <div key={aIdx} className="bg-white p-4 rounded-[20px] shadow-sm border border-slate-100 flex items-center gap-3">
                                            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                                <Zap size={16} fill="currentColor" />
                                            </div>
                                            <input 
                                                type="text"
                                                placeholder={aIdx === 0 ? "Main Answer..." : `Alternative ${aIdx}...`}
                                                className="flex-1 bg-transparent border-none outline-none font-bold text-sm text-slate-900 placeholder:text-slate-300"
                                                value={ans}
                                                onChange={(e) => {
                                                    const newAnswers = [...(currentQ.answer as string[])];
                                                    newAnswers[aIdx] = e.target.value;
                                                    updateQuestion("answer", newAnswers);
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={`grid gap-3 ${currentQ.type === "TRUE_FALSE" ? "grid-cols-2" : "grid-cols-2"}`}>
                                    {currentQ.options.map((opt, oIdx) => (
                                        <div 
                                            key={oIdx}
                                            className={`relative group flex items-center h-16 rounded-[20px] transition-all overflow-hidden border-2 p-4 ${currentQ.answer === oIdx ? "bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-100/50" : "bg-white border-white hover:border-indigo-100 shadow-sm"}`}
                                        >
                                            <input 
                                                type="text"
                                                placeholder={`Option ${oIdx + 1}`}
                                                className={`flex-1 bg-transparent border-none outline-none font-black text-sm ${currentQ.answer === oIdx ? "text-white placeholder:text-indigo-200" : "text-slate-600 placeholder:text-slate-400"}`}
                                                value={opt}
                                                readOnly={currentQ.type === "TRUE_FALSE"}
                                                onChange={(e) => updateOption(oIdx, e.target.value)}
                                            />
                                            <button 
                                                onClick={() => updateQuestion("answer", oIdx)}
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${currentQ.answer === oIdx ? "bg-white text-indigo-600 shadow-md scale-105" : "bg-slate-50 text-slate-200 hover:text-indigo-400 hover:bg-white border border-slate-100"}`}
                                            >
                                                <CheckCircle size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Right Sidebar: Properties */}
                <aside className="w-[280px] bg-white border-l border-slate-100 p-8 flex flex-col gap-10 shrink-0 z-20">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-slate-400 mb-2">
                            <Layers size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Question Format</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                            <span className="font-black text-xs text-slate-900">{fixedType.replace("_", " ")}</span>
                            <Zap size={14} className="text-indigo-600" />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-slate-400 mb-2">
                            <Clock size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Time Limit</span>
                        </div>
                        <div className="relative group/time">
                            <select 
                                className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-black text-xs appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                                value={currentQ.time}
                                onChange={(e) => updateQuestion("time", parseInt(e.target.value))}
                            >
                                {Array.from({ length: 12 }, (_, i) => (i + 1) * 5).map(val => (
                                    <option key={val} value={val}>{val} Seconds</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-slate-400 mb-2">
                            <Award size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Points Yield</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            {[
                                { label: "Standard", value: 500 },
                                { label: "Double", value: 1000 }
                            ].map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => updateQuestion("points", p.value)}
                                    className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${currentQ.points === p.value ? "bg-indigo-600 border-indigo-500 text-white shadow-lg" : "bg-white border-slate-100 text-slate-400 hover:bg-slate-50"}`}
                                >
                                    <span className="font-black text-xs">{p.label}</span>
                                    <span className="font-bold text-[10px] opacity-60">{p.value} PTS</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-auto space-y-4">
                        <div className="flex items-center gap-3 text-slate-400 mb-2">
                            <Settings size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Quick Actions</span>
                        </div>
                        <button 
                            onClick={() => duplicateQuestion(currentIdx)}
                            className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-3 shadow-xl"
                        >
                            <Copy size={16} /> Duplicate Stage
                        </button>
                        <button 
                            onClick={() => removeQuestion(currentIdx)}
                            disabled={questions.length <= 1}
                            className="w-full py-4 rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 font-black text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-3 disabled:opacity-20"
                        >
                            <Trash2 size={16} /> Delete Stage
                        </button>
                    </div>
                </aside>
            </div>
        </main>
    );
}
