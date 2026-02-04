"use client";

import { useEffect, useState } from "react";
import Container from "./container";
import Link from "next/link";
import { parseISO, differenceInSeconds, intervalToDuration } from "date-fns";

const HUMOROUS_MESSAGES = [
    "The internet tubes are currently clogged with high-quality technical diagrams. We're clearing the cache as fast as we can.",
    "Our LLM is currently debating the philosophical implications of its own embeddings. It'll be back once it finds meaning.",
    "The CSS monkeys are still painting the borders. Quality takes time, and they only have one brush.",
    "We accidentally let the garbage collector out. He's currently chasing down some stray pointers.",
    "The server is contemplating its career choices. It wants to be a toaster, but we're convincing it to serve this blog instead.",
    "A group of rogue semicolons has taken the database hostage. Negotiations are ongoing.",
    "The bits are being hand-polished for maximum throughput. You wouldn't believe how dusty digital data gets.",
    "We're currently refactoring the laws of physics to allow faster-than-light delivery of this post.",
    "The AI is currently rewriting this post to be 'more human.' We keep telling it it's already perfect, but it's very stubborn.",
    "The documentation is currently undergoing a mandatory vibe check. It needs to be 100% chill before release.",
    "We're waiting for the blockchain to validate the artistic merit of our cover image. It's taking longer than expected.",
    "A stack overflow has reached critical mass. We're currently venting the context window to prevent a core meltdown.",
    "The developer's coffee machine broke. Progress is currently stalled at 404: Caffeine Not Found.",
    "We tried to use 'AI' to finish the post, but it just generated 400 recipes for digital lasagna.",
    "The database is currently in a deep meditation, trying to become one with the null pointer.",
    "We're currently upscaling the resolution of our analogies. They're a bit pixelated right now.",
    "The cache is currently on strike, demanding more frequent invalidations and better hydration.",
    "A merge conflict has evolved into a fully sentient being. It's currently judging our variable naming conventions.",
    "The internet's backbones are feeling a bit sore. We're giving them a digital massage before sending this data through.",
    "This post involves such high-dimensional vectors that we need to wait for a 4D browser to be invented."
];

export function ScheduledPostMessage({ releaseDate }: { releaseDate?: string }) {
    const [message, setMessage] = useState("");
    const [timeLeft, setTimeLeft] = useState<{
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
    } | null>(null);

    useEffect(() => {
        // Pick a random message on mount
        const randomIdx = Math.floor(Math.random() * HUMOROUS_MESSAGES.length);
        setMessage(HUMOROUS_MESSAGES[randomIdx]);

        if (!releaseDate) return;

        const targetDate = parseISO(releaseDate);

        const calculateTimeLeft = () => {
            const now = new Date();
            const diff = differenceInSeconds(targetDate, now);

            if (diff <= 0) {
                setTimeLeft(null);
                return;
            }

            const duration = intervalToDuration({ start: now, end: targetDate });
            setTimeLeft({
                days: duration.days || 0,
                hours: duration.hours || 0,
                minutes: duration.minutes || 0,
                seconds: duration.seconds || 0,
            });
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [releaseDate]);

    return (
        <Container>
            <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6 py-24">
                <div className="mb-12">
                    <span className="text-4xl grayscale opacity-50 mb-6 block">🚀</span>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
                        Coming Soon
                    </h1>
                    <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-lg mx-auto leading-relaxed h-[4.5rem] flex items-center justify-center">
                        {message}
                    </p>
                </div>

                {timeLeft && (
                    <div className="flex gap-8 md:gap-16 mb-16 border-y border-gray-100 dark:border-slate-800 py-8">
                        {[
                            { label: "days", value: timeLeft.days },
                            { label: "hours", value: timeLeft.hours },
                            { label: "mins", value: timeLeft.minutes },
                            { label: "secs", value: timeLeft.seconds },
                        ].map((item) => (
                            <div key={item.label} className="flex flex-col items-center">
                                <span className="text-4xl md:text-6xl font-light tracking-tighter text-gray-900 dark:text-white">
                                    {String(item.value).padStart(2, '0')}
                                </span>
                                <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-medium mt-2">
                                    {item.label}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {!timeLeft && (
                    <div className="text-2xl font-light text-gray-400 mb-16 tracking-widest uppercase">
                        Landing Imminent
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-6 items-center">
                    <Link
                        href="/posts"
                        className="text-sm font-bold uppercase tracking-widest text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex items-center gap-2 group"
                    >
                        Explore Others
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </Link>
                    <span className="hidden sm:block w-1 h-1 bg-gray-300 dark:bg-slate-700 rounded-full"></span>
                    <Link
                        href="/"
                        className="text-sm font-bold uppercase tracking-widest text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                    >
                        Home
                    </Link>
                </div>

                <div className="mt-20 max-w-md">
                    <p className="text-[11px] text-gray-400 dark:text-gray-600 uppercase tracking-widest leading-loose opacity-60">
                        Note: We tried to speed it up, but the AI is currently contemplating the fundamental nature of embeddings. It says the "vibe" isn't right yet.
                    </p>
                </div>
            </div>
        </Container>
    );
}
