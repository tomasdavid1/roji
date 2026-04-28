import { ProtocolOutput } from "@/components/ProtocolOutput";

export const metadata = {
  title: "Your Protocol — Roji Peptides",
};

export default function ResultsPage() {
  return (
    <main className="min-h-screen px-5 py-10 sm:py-16">
      <div className="max-w-2xl mx-auto">
        <ProtocolOutput />
      </div>
    </main>
  );
}
