import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

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

    const io = new Server(httpServer);

    // Game state (in-memory for now)
    const lobbies = new Map();

    const QUESTIONS = [
        {
            question: "What is the acceleration due to gravity on Earth?",
            options: ["9.8 m/s²", "1.6 m/s²", "12 m/s²", "5.4 m/s²"],
            answer: 0,
            time: 20
        },
        {
            question: "Which of Newton's laws states F = ma?",
            options: ["First Law", "Second Law", "Third Law", "Law of Gravitation"],
            answer: 1,
            time: 20
        },
        {
            question: "What is the speed of light in a vacuum?",
            options: ["300,000 km/s", "150,000 km/s", "1,000,000 km/s", "500,000 km/s"],
            answer: 0,
            time: 15
        }
    ];

    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        socket.on("create-lobby", () => {
            const pin = Math.floor(100000 + Math.random() * 900000).toString();
            lobbies.set(pin, {
                host: socket.id,
                players: [],
                currentQuestion: -1,
                state: "LOBBY" // LOBBY, STARTING, QUESTION, RESULTS, FINISHED
            });
            socket.join(pin);
            socket.emit("lobby-created", pin);
        });

        socket.on("join-lobby", ({ pin, nickname }) => {
            const lobby = lobbies.get(pin);
            if (lobby) {
                lobby.players.push({ id: socket.id, nickname, score: 0 });
                socket.join(pin);
                io.to(pin).emit("player-joined", lobby.players);
                socket.emit("join-success", { pin, nickname });
            } else {
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

            const question = QUESTIONS[lobby.currentQuestion];
            lobby.state = "QUESTION";
            lobby.answers.clear();

            io.to(pin).emit("new-question", {
                question: question.question,
                options: question.options,
                time: question.time,
                index: lobby.currentQuestion,
                total: QUESTIONS.length
            });

            // Timer logic could be added here, but for MVP we rely on client or a simple timeout
            lobby.timer = setTimeout(() => {
                showResults(pin);
            }, question.time * 1000);
        }

        socket.on("submit-answer", ({ pin, answerIndex }) => {
            const lobby = lobbies.get(pin);
            if (lobby && lobby.state === "QUESTION") {
                const question = QUESTIONS[lobby.currentQuestion];
                const player = lobby.players.find(p => p.id === socket.id);

                if (player && !lobby.answers.has(socket.id)) {
                    const isCorrect = answerIndex === question.answer;
                    if (isCorrect) {
                        player.score += 1000; // Simplified scoring
                    }
                    lobby.answers.set(socket.id, { answerIndex, isCorrect });
                    socket.emit("answer-acknowledged", isCorrect);

                    // If all players answered, show results early
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
            const question = QUESTIONS[lobby.currentQuestion];

            io.to(pin).emit("question-results", {
                correctAnswer: question.answer,
                players: lobby.players.sort((a, b) => b.score - a.score)
            });

            setTimeout(() => {
                lobby.currentQuestion++;
                if (lobby.currentQuestion < QUESTIONS.length) {
                    sendQuestion(pin);
                } else {
                    lobby.state = "FINISHED";
                    io.to(pin).emit("game-over", lobby.players);
                }
            }, 5000);
        }

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
            // Handle player removal if needed
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
