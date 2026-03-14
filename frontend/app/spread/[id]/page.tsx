export default function SpreadPage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground text-sm">
        Spread Map [{params.id}] — implemented in M14
      </p>
    </main>
  );
}