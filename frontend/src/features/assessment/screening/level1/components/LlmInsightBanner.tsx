import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { globalAudioPlayer } from "@/lib/audioPlayer";

interface CategoryStyle {
    bg: string;
    border: string;
    icon: string;
    accent: string;
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
    encouragement: { bg: 'from-emerald-500/10 to-teal-500/10', border: 'border-emerald-400/30', icon: '💪', accent: 'text-emerald-600' },
    fact: { bg: 'from-blue-500/10 to-indigo-500/10', border: 'border-blue-400/30', icon: '📊', accent: 'text-blue-600' },
    guidance: { bg: 'from-amber-500/10 to-orange-500/10', border: 'border-amber-400/30', icon: '🧭', accent: 'text-amber-600' },
    insight: { bg: 'from-purple-500/10 to-violet-500/10', border: 'border-purple-400/30', icon: '💡', accent: 'text-purple-600' },
    context: { bg: 'from-cyan-500/10 to-sky-500/10', border: 'border-cyan-400/30', icon: '🔍', accent: 'text-cyan-600' },
    llm: { bg: 'from-fuchsia-500/10 to-pink-500/10', border: 'border-fuchsia-400/30', icon: '✨', accent: 'text-fuchsia-600' },
};

interface Insight {
    message: string;
    category: keyof typeof CATEGORY_STYLES;
    source?: string;
}

interface LlmInsightBannerProps {
    context?: string;
    intervalMs?: number;
}

const LlmInsightBanner: React.FC<LlmInsightBannerProps> = ({
    context = 'general',
    intervalMs = 30000
}) => {
    const [insight, setInsight] = useState<Insight | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fetchInsightRef = useRef<((isManualCall?: boolean) => Promise<void>) | null>(null);

    const HARDCODED_INSIGHTS: Insight[] = [
        { message: "You are doing great, keep going!", category: "encouragement", source: "Wellness Insight" },
        { message: "Take a deep breath, you're making good progress.", category: "guidance", source: "Wellness Insight" },
        { message: "Trust your first instinct—don't overthink it.", category: "insight", source: "Wellness Insight" },
        { message: "It's normal to feel challenged by some of these questions.", category: "fact", source: "Wellness Insight" },
        { message: "Almost there! Keep up the good work.", category: "encouragement", source: "Wellness Insight" },
        { message: "Your honest answers are the most valuable part of this.", category: "guidance", source: "Wellness Insight" },
        { message: "Take your time, there is no rush.", category: "context", source: "Wellness Insight" },
        { message: "You're doing excellent. Just a few more to go.", category: "encouragement", source: "Wellness Insight" },
        { message: "Remember, there are no right or wrong answers.", category: "fact", source: "Wellness Insight" },
        { message: "Great focus! Stay with it.", category: "encouragement", source: "Wellness Insight" },
        { message: "You're moving through this at a great pace.", category: "insight", source: "Wellness Insight" },
        { message: "It's completely fine if your answers change from day to day.", category: "fact", source: "Wellness Insight" },
        { message: "Breathe in, breathe out. You're doing wonderful.", category: "guidance", source: "Wellness Insight" },
        { message: "Your effort in completing this is much appreciated.", category: "context", source: "Wellness Insight" },
        { message: "Fantastic job so far, keep it up!", category: "encouragement", source: "Wellness Insight" }
    ];

    const fetchInsight = async (_isManualCall = false) => {
        setIsLoading(true);
        try {
            // Randomly select one of the 15 insights
            const randomIndex = Math.floor(Math.random() * HARDCODED_INSIGHTS.length);
            const data = HARDCODED_INSIGHTS[randomIndex];

            setIsVisible(false); // fade out
            setTimeout(() => {
                setInsight(data);
                setIsVisible(true); // fade in with new content

                // Play the corresponding pre-generated ElevenLabs MP3
                try {
                    // +1 because array is 0-indexed but files are insight_1.mp3
                    globalAudioPlayer.play(`/audio/screening/insight_${randomIndex + 1}.mp3`);
                } catch (err) {
                    console.debug("Audio play failed:", err);
                }

            }, 400);
        } catch (err) {
            console.debug('Insight fetch failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Keep ref updated with latest function
    useEffect(() => {
        fetchInsightRef.current = fetchInsight;
    });

    useEffect(() => {
        // Fetch first insight after a 3-second delay (don't distract immediately)
        const initialDelay = setTimeout(() => {
            if (fetchInsightRef.current) fetchInsightRef.current(false);
        }, 3000);

        // Then fetch periodically
        timerRef.current = setInterval(() => {
            if (fetchInsightRef.current) fetchInsightRef.current(false);
        }, intervalMs);

        return () => {
            clearTimeout(initialDelay);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [context, intervalMs]);

    if (!insight) return null;

    const style = CATEGORY_STYLES[insight.category] || CATEGORY_STYLES.insight;

    return (
        <div
            className={`
        transition-all duration-500 ease-in-out overflow-hidden
        ${isVisible ? 'opacity-100 max-h-[500px] translate-y-0' : 'opacity-0 max-h-0 -translate-y-2'}
      `}
        >
            <div className={`
        relative bg-gradient-to-r ${style.bg} ${style.border}
        border rounded-xl px-5 py-4 flex items-start gap-3
        shadow-sm backdrop-blur-sm
      `}>
                {/* Animated sparkle icon */}
                <div className="flex-shrink-0 mt-0.5">
                    <span className="text-xl animate-pulse">{style.icon}</span>
                </div>

                {/* Message */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles size={14} className={style.accent} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${style.accent}`}>
                            {insight.source === 'ollama' ? 'AI Insight' : 'Wellness Insight'}
                        </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed font-medium">
                        {insight.message}
                    </p>
                </div>

                {/* Refresh button */}
                <button
                    onClick={() => fetchInsight(true)}
                    disabled={isLoading}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-background/50 transition-colors text-muted-foreground hover:text-foreground"
                    title="Get new insight"
                >
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>
        </div>
    );
};

export default LlmInsightBanner;