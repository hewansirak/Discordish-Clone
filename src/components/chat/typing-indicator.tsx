export function TypingIndicator({ usernames }: { usernames: string[] | undefined }) {
  if (!usernames || usernames.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <div className="flex gap-1" aria-hidden>
        {[0, 150, 300].map((delay) => (
          <div
            key={delay}
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
      <span>
        {usernames.join(", ")} {usernames.length === 1 ? "is" : "are"} typing...
      </span>
    </div>
  );
}
