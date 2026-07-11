export function resolveClipIndexTarget({ minIndex, catalogCount }) {
  const safeMinIndex = Number(minIndex) || 0;
  const safeCatalogCount = Number(catalogCount) || 0;

  if (safeCatalogCount > 0) {
    return Math.min(safeMinIndex, safeCatalogCount);
  }

  return safeMinIndex;
}
