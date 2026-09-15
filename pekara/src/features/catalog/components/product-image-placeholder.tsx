type ProductImagePlaceholderProps = {
  productName: string;
};

export function ProductImagePlaceholder({
  productName,
}: ProductImagePlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={`Slika za proizvod „${productName}“ nije dostupna`}
      className="flex size-full items-center justify-center bg-amber-50 text-amber-900"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 64 64"
        fill="none"
        className="size-20"
      >
        <path
          d="M12 38c0-7.73 6.27-14 14-14h12c7.73 0 14 6.27 14 14v8a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4v-8Z"
          fill="currentColor"
          opacity=".16"
        />
        <path
          d="M16 38c0-5.52 4.48-10 10-10h12c5.52 0 10 4.48 10 10M12 42h40M20 28c0-5 3-10 7-14M32 28c0-6 0-11 3-16M43 29c1-5 0-9-2-13"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
