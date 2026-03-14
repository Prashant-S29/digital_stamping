export default function VerifyPage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground text-sm">
        Verify [{params.id}] — implemented in M12
      </p>
    </main>
  );
}