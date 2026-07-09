import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LIBRARY_FILE = path.join(__dirname, "library.json");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });

    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // Game state (in-memory)
    const lobbies = new Map();

    const QUIZ_LIBRARY = {
        "dsa": {
            title: "Data Structures & Algorithms",
            questions: [
                { type: "QUIZ", question: "What is the time complexity of searching in a Hash Map?", options: ["O(1)", "O(n)", "O(log n)", "O(n²)"], answer: 0, time: 20 },
                { type: "TRUE_FALSE", question: "A Stack follows the First-In-First-Out (FIFO) principle.", options: ["True", "False"], answer: 1, time: 15 },
                { type: "TYPE_ANSWER", question: "What is the worst-case time complexity of Quick Sort (e.g., O(n^2))?", options: [], answer: "O(n^2)", time: 25 }
            ]
        },
        "web": {
            title: "Web Development",
            questions: [
                { type: "QUIZ", question: "What does CSS stand for?", options: ["Creative Style Sheets", "Cascading Style Sheets", "Computer Style Sheets", "Colorful Style Sheets"], answer: 1, time: 15 },
                { type: "TYPE_ANSWER", question: "Which HTML tag is used to create a hyperlink?", options: [], answer: "a", time: 10 },
                { type: "TRUE_FALSE", question: "React is a backend framework.", options: ["True", "False"], answer: 1, time: 15 }
            ]
        },
        "os": {
            title: "Operating Systems",
            questions: [
                { type: "QUIZ", question: "What is a deadlock?", options: ["A fast process", "A state where processes are waiting for each other", "A finished process", "An operating system crash"], answer: 1, time: 25 },
                { type: "TRUE_FALSE", question: "Linux is an open-source operating system.", options: ["True", "False"], answer: 0, time: 15 },
                { type: "TYPE_ANSWER", question: "What is the acronym for 'Basic Input/Output System'?", options: [], answer: "BIOS", time: 20 }
            ]
        },
        "dbms": {
            title: "Database Systems",
            questions: [
                { type: "QUIZ", question: "What does SQL stand for?", options: ["Structured Query Language", "Simple Query Language", "Strong Quality Language", "Sorted Query Language"], answer: 0, time: 15 },
                { type: "TYPE_ANSWER", question: "What is the command to delete all records from a table without deleting the table structure?", options: [], answer: "TRUNCATE", time: 20 },
                { type: "TRUE_FALSE", question: "MongoDB is a relational database.", options: ["True", "False"], answer: 1, time: 15 }
            ]
        },
        "gk": {
            title: "General Tech Trivia",
            questions: [
                { type: "QUIZ", question: "Who is known as the father of Computers?", options: ["Alan Turing", "Charles Babbage", "Bill Gates", "Steve Jobs"], answer: 1, time: 15 },
                { type: "TYPE_ANSWER", question: "What was the first version of Android called?", options: [], answer: "Alpha", time: 20 },
                { type: "TRUE_FALSE", question: "The first computer mouse was made of wood.", options: ["True", "False"], answer: 0, time: 15 }
            ]
        }
    };

    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        socket.on("create-lobby", (customQuiz) => {
            const pin = Math.floor(100000 + Math.random() * 900000).toString();
            
            // If customQuiz is provided, use it. Otherwise, default to mechanics for now.
            // In a real app, the host would select a quiz first.
            const quizData = customQuiz || QUIZ_LIBRARY["dsa"];
            
            lobbies.set(pin, {
                host: socket.id,
                players: [],
                currentQuestion: -1,
                state: "LOBBY",
                quiz: quizData
            });
            console.log(`Lobby created: PIN=${pin}, Host=${socket.id}`);
            socket.join(pin);
            socket.emit("lobby-created", { pin, categories: QUIZ_LIBRARY });
        });

        socket.on("select-quiz", ({ pin, quizId, customQuiz }) => {
            const lobby = lobbies.get(pin);
            if (lobby && lobby.host === socket.id) {
                const quizData = customQuiz || QUIZ_LIBRARY[quizId];
                if (quizData) {
                    lobby.quiz = quizData;
                    io.to(pin).emit("quiz-selected", quizData.title);
                }
            }
        });

        socket.on("join-lobby", ({ pin, nickname }) => {
            console.log(`Join attempt: PIN=${pin}, Nickname=${nickname}, TypeOfPin=${typeof pin}`);
            const lobby = lobbies.get(pin);
            if (lobby) {
                console.log(`Lobby found for PIN=${pin}`);
                lobby.players.push({ id: socket.id, nickname, score: 0 });
                socket.join(pin);
                io.to(pin).emit("player-joined", lobby.players);
                socket.emit("join-success", { pin, nickname, quizTitle: lobby.quiz.title });
            } else {
                console.log(`Lobby NOT found for PIN=${pin}. Available PINs:`, Array.from(lobbies.keys()));
                socket.emit("join-error", "Invalid PIN");
            }
        });

        socket.on("start-game", (pin) => {
            const lobby = lobbies.get(pin);
            if (lobby && lobby.host === socket.id) {
                lobby.state = "STARTING";
                lobby.currentQuestion = 0;
                lobby.answers = new Map();
                io.to(pin).emit("game-starting");

                setTimeout(() => {
                    sendQuestion(pin);
                }, 3000);
            }
        });

        function sendQuestion(pin) {
            const lobby = lobbies.get(pin);
            if (!lobby) return;

            const question = lobby.quiz.questions[lobby.currentQuestion];
            lobby.state = "QUESTION";
            lobby.answers.clear();

            io.to(pin).emit("new-question", {
                type: question.type || "QUIZ",
                question: question.question,
                options: question.options,
                image: question.image || null,
                time: question.time,
                index: lobby.currentQuestion,
                total: lobby.quiz.questions.length
            });

            lobby.timer = setTimeout(() => {
                showResults(pin);
            }, question.time * 1000);
        }

        socket.on("submit-answer", ({ pin, answerIndex, answerText }) => {
            const lobby = lobbies.get(pin);
            if (lobby && lobby.state === "QUESTION") {
                const question = lobby.quiz.questions[lobby.currentQuestion];
                const player = lobby.players.find(p => p.id === socket.id);

                if (player && !lobby.answers.has(socket.id)) {
                    let isCorrect = false;
                    
                    if (question.type === "TYPE_ANSWER") {
                        const submitted = (answerText || "").toString().trim().toLowerCase();
                        if (Array.isArray(question.answer)) {
                            isCorrect = question.answer.some(ans => 
                                ans.toString().trim() !== "" && 
                                ans.toString().trim().toLowerCase() === submitted
                            );
                        } else {
                            isCorrect = submitted === question.answer.toString().trim().toLowerCase();
                        }
                    } else {
                        isCorrect = answerIndex === question.answer;
                    }

                    const pointsEarned = isCorrect ? (question.points || 1000) : 0;
                    if (isCorrect) {
                        player.score += pointsEarned;
                    }
                    
                    lobby.answers.set(socket.id, { 
                        answer: question.type === "TYPE_ANSWER" ? answerText : answerIndex, 
                        isCorrect 
                    });

                    // Tell the player: correct/wrong + points earned + their total
                    socket.emit("answer-acknowledged", {
                        isCorrect,
                        pointsEarned,
                        totalScore: player.score
                    });

                    // Tell the host: how many have answered so far
                    const hostSocketId = lobby.host;
                    const answerCount = lobby.answers.size;
                    io.to(hostSocketId).emit("answer-submitted", answerCount);

                    if (lobby.answers.size === lobby.players.length) {
                        clearTimeout(lobby.timer);
                        showResults(pin);
                    }
                }
            }
        });

        function showResults(pin) {
            const lobby = lobbies.get(pin);
            if (!lobby) return;

            lobby.state = "RESULTS";
            const sortedPlayers = lobby.players.sort((a, b) => b.score - a.score);

            const question = lobby.quiz.questions[lobby.currentQuestion];
            const answerCounts = new Array(question.options ? question.options.length : 0).fill(0);
            let correctTypeCount = 0;
            let incorrectTypeCount = 0;

            lobby.answers.forEach((ansVal) => {
                if (question.type === "TYPE_ANSWER") {
                    if (ansVal.isCorrect) {
                        correctTypeCount++;
                    } else {
                        incorrectTypeCount++;
                    }
                } else {
                    const idx = ansVal.answer;
                    if (idx >= 0 && idx < answerCounts.length) {
                        answerCounts[idx]++;
                    }
                }
            });

            // Send results to HOST only (so they see the "between questions" screen)
            io.to(lobby.host).emit("question-results", {
                players: sortedPlayers,
                correctAnswer: question.answer,
                answerCounts: question.type === "TYPE_ANSWER" 
                    ? { correct: correctTypeCount, incorrect: incorrectTypeCount } 
                    : answerCounts
            });

            // Send specific rank & score details to each player
            lobby.players.forEach(p => {
                if (p.id !== lobby.host) {
                    const rank = sortedPlayers.findIndex(player => player.id === p.id) + 1;
                    io.to(p.id).emit("question-results", {
                        rank,
                        totalPlayers: sortedPlayers.length,
                        score: p.score
                    });
                }
            });
        }

        socket.on("save-to-library", (newQuiz) => {
            try {
                let library = [];
                if (fs.existsSync(LIBRARY_FILE)) {
                    library = JSON.parse(fs.readFileSync(LIBRARY_FILE, "utf-8"));
                }
                
                const existingIndex = library.findIndex(q => q.id === newQuiz.id);
                if (existingIndex > -1) {
                    library[existingIndex] = newQuiz;
                } else {
                    library.unshift(newQuiz);
                }
                
                fs.writeFileSync(LIBRARY_FILE, JSON.stringify(library, null, 2));
                socket.emit("save-success", newQuiz.id);
                console.log("Quiz saved to server:", newQuiz.title);
            } catch (error) {
                console.error("Failed to save quiz:", error);
                socket.emit("save-error", "Server storage failure");
            }
        });

        socket.on("get-library", () => {
            try {
                if (fs.existsSync(LIBRARY_FILE)) {
                    const library = JSON.parse(fs.readFileSync(LIBRARY_FILE, "utf-8"));
                    socket.emit("library-data", library);
                } else {
                    socket.emit("library-data", []);
                }
            } catch (error) {
                console.error("Failed to read library:", error);
                socket.emit("library-data", []);
            }
        });

        socket.on("delete-from-library", (id) => {
            try {
                if (fs.existsSync(LIBRARY_FILE)) {
                    let library = JSON.parse(fs.readFileSync(LIBRARY_FILE, "utf-8"));
                    library = library.filter(q => q.id !== id);
                    fs.writeFileSync(LIBRARY_FILE, JSON.stringify(library, null, 2));
                    socket.emit("library-data", library);
                }
            } catch (error) {
                console.error("Failed to delete quiz:", error);
            }
        });

        socket.on("next-question", (pin) => {
            const lobby = lobbies.get(pin);
            if (lobby && lobby.host === socket.id && lobby.state === "RESULTS") {
                lobby.currentQuestion++;
                if (lobby.currentQuestion < lobby.quiz.questions.length) {
                    sendQuestion(pin);
                } else {
                    lobby.state = "FINISHED";
                    const sortedPlayers = lobby.players.sort((a, b) => b.score - a.score);
                    io.to(lobby.host).emit("game-over", sortedPlayers);
                    lobby.players.forEach(p => {
                        if (p.id !== lobby.host) {
                            io.to(p.id).emit("game-over", []);
                        }
                    });
                }
            }
        });

        socket.on("end-session", (pin) => {
            const lobby = lobbies.get(pin);
            if (lobby && lobby.host === socket.id) {
                console.log(`Host ended session for PIN=${pin}`);
                if (lobby.timer) clearTimeout(lobby.timer);
                // Broadcast to all players in the room before deleting lobby
                io.to(pin).emit("host-ended-session");
                lobbies.delete(pin);
            }
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
            // If host disconnects without explicitly ending session, still notify players
            for (const [pin, lobby] of lobbies.entries()) {
                if (lobby.host === socket.id) {
                    console.log(`Host disconnected unexpectedly for PIN=${pin}`);
                    if (lobby.timer) clearTimeout(lobby.timer);
                    io.to(pin).emit("host-ended-session");
                    lobbies.delete(pin);
                    break;
                }
            }
        });
    });

    httpServer
        .once("error", (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
        });
});
