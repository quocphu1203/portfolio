import FantasyIslandClient from "../FantasyIslandCanvas";

export default function LocaleHomePage() {
  return (
    <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-black">
      <main className="w-full">
        <FantasyIslandClient />
      </main>
    </div>
  );
}
