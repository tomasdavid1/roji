import { ProtocolWizard } from "@/components/ProtocolWizard";

export const metadata = {
  title: "Protocol Builder — Roji Peptides",
};

export default function ProtocolPage() {
  return (
    <main className="min-h-screen">
      <ProtocolWizard />
    </main>
  );
}
