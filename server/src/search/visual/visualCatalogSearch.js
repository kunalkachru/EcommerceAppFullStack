async function runVisualCatalogSearch(imageBase64, deps, options = {}) {
  const { searchByImageBase64 } = deps;
  return searchByImageBase64(imageBase64, options);
}

module.exports = {
  runVisualCatalogSearch,
};
