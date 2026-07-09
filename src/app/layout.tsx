import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "QuizArc | CSE Stream Event",
    description: "The ultimate real-time quiz platform for CSE stream challenges and technical events.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="antialiased selection:bg-indigo-100 selection:text-indigo-900">
                {children}
            </body>
        </html>
    );
}
