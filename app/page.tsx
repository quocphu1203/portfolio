import FantasyIslandClient from "./FantasyIslandCanvas";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-black">
      <main className="w-full">
        {/* Client component renders the Three.js scene */}
        <FantasyIslandClient />
      </main>
    </div>
  );
}
