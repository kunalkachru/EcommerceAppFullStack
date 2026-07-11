import { getApiBaseUrl } from "./api";

export const CATEGORY_3D_MODELS = {
  footwear: "models/footwear/model.glb",
  electronics: "models/electronics/model.glb",
  watches: "models/watches/model.glb",
  "bags-accessories": "models/bags-accessories/model.glb",
  "home-kitchen": "models/home-kitchen/model.glb",
  "mens-clothing": "models/mens-clothing/model.glb",
  "womens-clothing": "models/womens-clothing/model.glb",
  "beauty-fragrances": "models/beauty-fragrances/model.glb",
  "sports-fitness": "models/sports-fitness/model.glb",
  automotive: "models/automotive/model.glb",
  groceries: "models/groceries/model.glb",
  jewelry: "models/jewelry/model.glb",
};

export function resolveCategoryModelUrl(category) {
  const relativePath = CATEGORY_3D_MODELS[category];
  if (!relativePath) return null;
  return `${getApiBaseUrl()}/assets/${relativePath}`;
}
