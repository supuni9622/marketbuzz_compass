import { NarrativeBlock } from "./components/NarrativeBlock";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">MarketBuzz Compass</h1>
      <p className="mt-2 text-gray-600">Interpret. Guide. Plan. Warn.</p>

      <section className="mt-8" aria-label="Monthly Brief">
        <h2 className="text-lg font-semibold text-gray-800">
          MarketBuzz Monthly Brief
        </h2>
        <div className="mt-4">
          <NarrativeBlock
            content="Summary pending — Nova coming soon."
            placeholder
          />
        </div>
      </section>
    </main>
  );
}
