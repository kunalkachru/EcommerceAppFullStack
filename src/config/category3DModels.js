import { getApiBaseUrl } from "./api";

export const CATEGORY_3D_MODELS = {
  footwear: "models/footwear/model.glb",
  electronics: "models/electronics/model.glb",
  watches: "models/watches/model.glb",
  "bags-accessories": "models/bags-accessories/model.glb",
};

export function resolveCategoryModelUrl(category) {
  const relativePath = CATEGORY_3D_MODELS[category];
  if (!relativePath) return null;
  return `${getApiBaseUrl()}/assets/${relativePath}`;
}
