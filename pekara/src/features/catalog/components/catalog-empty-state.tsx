export function CatalogEmptyState() {
  return (
    <div className="border-border bg-surface-muted rounded-xl border px-6 py-12 text-center sm:px-10">
      <h2 className="text-foreground text-xl font-semibold">
        Ponuda se trenutno priprema
      </h2>
      <p className="text-muted mx-auto mt-3 max-w-xl leading-7">
        Trenutno nema proizvoda za prikaz. Posetite nas ponovo uskoro ili nas
        kontaktirajte za informacije o današnjoj ponudi.
      </p>
    </div>
  );
}
