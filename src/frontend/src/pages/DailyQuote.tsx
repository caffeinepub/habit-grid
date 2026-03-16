const QUOTES = [
  "Small steps every day lead to big changes.",
  "Consistency is the key to excellence.",
  "You don't have to be extreme, just consistent.",
  "Progress, not perfection.",
  "One day at a time builds a lifetime.",
  "Discipline is the bridge between goals and achievement.",
  "The secret of getting ahead is getting started.",
  "Show up even when you don't feel like it.",
  "Habits are the compound interest of self-improvement.",
  "Make each day your masterpiece.",
  "Don't count the days, make the days count.",
  "Success is the sum of small efforts repeated daily.",
  "You are what you repeatedly do.",
  "Energy and persistence conquer all things.",
  "It's not about having time, it's about making time.",
  "The pain of discipline is far less than the pain of regret.",
  "Every action you take is a vote for the person you want to become.",
  "Do the thing and you'll have the power.",
  "Start where you are, use what you have, do what you can.",
  "Your only competition is who you were yesterday.",
  "Motivation gets you started, habit keeps you going.",
  "The goal is not to be perfect, but to be better than yesterday.",
  "Winners are not people who never fail, but who never quit.",
  "Begin now, not tomorrow.",
  "A little progress each day adds up to big results.",
  "Nothing great was ever achieved without enthusiasm.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Believe you can and you're halfway there.",
  "Focus on progress, not perfection.",
  "Today's actions are tomorrow's results.",
];

interface DailyQuoteProps {
  dateKey: string;
}

export default function DailyQuote({ dateKey }: DailyQuoteProps) {
  // Pick quote by day-of-year so it changes daily
  const dayOfYear = (() => {
    const d = new Date(`${dateKey}T00:00:00`);
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  })();
  const quote = QUOTES[dayOfYear % QUOTES.length];

  return (
    <div className="px-4 py-2 border-b border-border bg-muted/30">
      <p className="text-xs text-muted-foreground italic text-center">
        <span className="opacity-50">✦</span> {quote}{" "}
        <span className="opacity-50">✦</span>
      </p>
    </div>
  );
}
