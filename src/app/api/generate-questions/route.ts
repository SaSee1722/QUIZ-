import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { syllabus, questionType, count, level, apiKey: clientApiKey } = body;
        
        const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ 
                error: "Gemini API key is required. Please configure GEMINI_API_KEY in your environment." 
            }, { status: 400 });
        }
        
        // Gemini API URL
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        // Detailed prompt instruction
        const prompt = `Generate exactly ${count || 5} questions based on the following syllabus/topics:
"${syllabus}"

The difficulty level of all generated questions must be strictly: ${level || "MEDIUM"}.
- If level is 'EASY', generate straightforward, entry-level recall questions.
- If level is 'MEDIUM', generate standard concept-application questions.
- If level is 'HARD', generate deep, complex analytical questions requiring advanced understanding.

The questions must be of type: ${questionType === "MIXED" ? "a balanced mix of QUIZ, TRUE_FALSE, and TYPE_ANSWER" : questionType}.
- If the type is 'QUIZ', every question must be a standard 4-option multiple-choice question.
- If the type is 'TRUE_FALSE', every question must be a true or false question.
- If the type is 'TYPE_ANSWER', every question must be an open-ended question where the user types a short answer.

Provide clear, accurate questions and correct options/answers. Return the response adhering to the JSON schema.`;

        // Request body using Gemini structured response schema
        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: prompt }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        questions: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    type: {
                                        type: "STRING",
                                        enum: ["QUIZ", "TRUE_FALSE", "TYPE_ANSWER"]
                                    },
                                    question: { type: "STRING" },
                                    options: {
                                        type: "ARRAY",
                                        items: { type: "STRING" },
                                        description: "For QUIZ: exactly 4 options. For TRUE_FALSE: exactly ['True', 'False']. For TYPE_ANSWER: empty array []."
                                    },
                                    correct_option_index: {
                                        type: "INTEGER",
                                        description: "Only for QUIZ and TRUE_FALSE: 0-based index of the correct option. For TYPE_ANSWER: set to 0."
                                    },
                                    accepted_answers: {
                                        type: "ARRAY",
                                        items: { type: "STRING" },
                                        description: "Only for TYPE_ANSWER: array of correct text responses (e.g. ['cpu', 'central processing unit']). For QUIZ and TRUE_FALSE: empty array []."
                                    },
                                    time: {
                                        type: "INTEGER",
                                        description: "Time limit in seconds (10, 15, 20, 30)."
                                    },
                                    points: {
                                        type: "INTEGER",
                                        description: "Points value (500 or 1000)."
                                    }
                                },
                                required: ["type", "question", "options", "correct_option_index", "accepted_answers", "time", "points"]
                            }
                        }
                    },
                    required: ["questions"]
                }
            }
        };

        const response = await fetch(geminiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Gemini API Error Response:", errText);
            try {
                const errJson = JSON.parse(errText);
                if (errJson.error && errJson.error.message) {
                    return NextResponse.json({ 
                        error: `Gemini API Error: ${errJson.error.message}` 
                    }, { status: response.status });
                }
            } catch (e) {
                // Ignore JSON parsing failure and fallback
            }
            return NextResponse.json({ 
                error: `Gemini API returned an error: ${response.status} ${response.statusText}` 
            }, { status: 502 });
        }

        const data = await response.json();
        
        // Extract the generated text
        const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!contentText) {
            return NextResponse.json({ error: "Failed to receive a valid response from the Gemini model." }, { status: 500 });
        }

        const parsedContent = JSON.parse(contentText);
        
        // Map to Phyjax format
        const questions = parsedContent.questions.map((q: any) => {
            let answer: any = 0;
            if (q.type === "TYPE_ANSWER") {
                const acc = q.accepted_answers || [];
                // Provide 4 slot array to match standard editor input
                answer = [
                    acc[0] || "",
                    acc[1] || "",
                    acc[2] || "",
                    acc[3] || ""
                ];
            } else {
                answer = typeof q.correct_option_index === "number" ? q.correct_option_index : 0;
            }

            return {
                type: q.type,
                question: q.question,
                options: q.type === "TRUE_FALSE" ? ["True", "False"] : 
                          q.type === "TYPE_ANSWER" ? [] : q.options,
                answer,
                time: q.time || 20,
                points: q.points || 500
            };
        });

        return NextResponse.json({ questions });

    } catch (error: any) {
        console.error("API handler error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
