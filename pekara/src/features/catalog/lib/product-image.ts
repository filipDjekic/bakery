export function productImageAspectRatio(
  width: number | null,
  height: number | null,
): string | undefined {
  return width && height && width > 0 && height > 0
    ? `${width} / ${height}`
    : undefined;
}
