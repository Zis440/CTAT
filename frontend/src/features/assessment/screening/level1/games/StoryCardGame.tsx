import React, { useState } from 'react';

interface StoryCard {
  id: string;
  image: string;
  alt: string;
}

interface StoryEntry {
  card_id: string;
  story_text: string;
  movement_count: number;
  completion_time_seconds: number;
}

interface StoryCardGameProps {
  onComplete: (data: {
    game_type: string;
    score: number;
    movement_count: number;
    completion_time_seconds: number;
    story_assessments: StoryEntry[];
  }) => Promise<void> | void;
}

const ALL_STORY_CARDS: StoryCard[] = [
  { id: 'card_1', image: '/story_cards/Card%203.webp', alt: 'Scene 1' },
  { id: 'card_2', image: '/story_cards/Card%206.webp', alt: 'Scene 2' },
  { id: 'card_3', image: '/story_cards/Card%2011.webp', alt: 'Scene 3' },
  { id: 'card_4', image: '/story_cards/Card%2028.webp', alt: 'Scene 4' },
];

const FALLBACK_SCENES: Record<string, string> = {
  card_1: 'Two people stand facing each other in a dimly lit room. One holds a folder tightly; the other has crossed arms. A window shows a stormy sky.',
  card_2: 'A solitary figure sits at a large table, surrounded by empty chairs. Papers are scattered across the surface. The clock shows late evening.',
  card_3: 'A person stands at a fork in the road. One path leads uphill through fog; the other to a sunlit valley. They hold a torn map.',
  card_4: 'A figure is seen crying or in deep distress. The environment around them is dark and moody.',
};

const StoryCardGame: React.FC<StoryCardGameProps> = ({ onComplete }) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [stories, setStories] = useState<StoryEntry[]>([]);
  const [currentStory, setCurrentStory] = useState('');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = async () => {
    const storyEntry: StoryEntry = {
      card_id: ALL_STORY_CARDS[currentCardIndex].id,
      story_text: currentStory,
      movement_count: 0,
      completion_time_seconds: 0,
    };

    const newStories = [...stories, storyEntry];
    setStories(newStories);

    if (currentCardIndex < ALL_STORY_CARDS.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setCurrentStory('');
    } else {
      setIsSubmitting(true);
      await onComplete({
        game_type: 'STORY',
        score: 0,
        movement_count: 0,
        completion_time_seconds: 0,
        story_assessments: newStories,
      });
      setIsSubmitting(false);
    }
  };

  const card = ALL_STORY_CARDS[currentCardIndex];
  const wordCount = currentStory.split(/\s+/).filter(w => w.length > 0).length;

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-bold">Story Assessment — Card {currentCardIndex + 1}/{ALL_STORY_CARDS.length}</h3>
      <p className="text-muted-foreground text-sm">
        Look at the image below and write a story: What is happening? What led up to this? What are the characters feeling? What will happen next?
      </p>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/2">
          <div className="bg-muted/50 border border-border rounded-xl p-3 flex items-center justify-center min-h-[280px]">
            {imageErrors[card.id] ? (
              <div className="text-center p-4">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Scene Description</div>
                <p className="text-muted-foreground italic leading-relaxed">{FALLBACK_SCENES[card.id]}</p>
              </div>
            ) : (
              <img
                src={card.image}
                alt={card.alt}
                className="max-w-full max-h-72 object-contain rounded-lg filter contrast-110"
                onError={() => setImageErrors(prev => ({ ...prev, [card.id]: true }))}
              />
            )}
          </div>
        </div>

        <div className="w-full md:w-1/2 flex flex-col">
          <textarea
            className="flex-grow w-full p-4 border border-input bg-background rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none h-64 text-foreground leading-relaxed"
            placeholder="Write your story here... Include what happened before, what is happening now, what will happen next, and what the characters are feeling."
            value={currentStory}
            onChange={(e) => setCurrentStory(e.target.value)}
          />
          <div className="text-xs text-muted-foreground text-right mt-1">
            {wordCount} words {wordCount < 20 && '(aim for at least 50-100 words)'}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border border-border">
        <div className="text-sm text-muted-foreground space-x-3">
          <span>Card: <strong className="text-foreground">{currentCardIndex + 1}/{ALL_STORY_CARDS.length}</strong></span>
          <span>Words: <strong className="text-foreground">{wordCount}</strong></span>
        </div>
        <button onClick={handleNext} disabled={currentStory.trim().length < 10 || isSubmitting}
          className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 text-sm">
          {isSubmitting ? 'Submitting...' : currentCardIndex < ALL_STORY_CARDS.length - 1 ? 'Next Card →' : 'Submit All Stories'}
        </button>
      </div>
    </div>
  );
};

export default StoryCardGame;
