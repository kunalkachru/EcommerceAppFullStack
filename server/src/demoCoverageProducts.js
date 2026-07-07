/**
 * Curated products that fill common search-demo gaps in merged public catalogs.
 * Keeps jumbled/LLM queries like "laptop 500-900" and "gaming monitor under 240"
 * from falling back to unrelated items when public APIs lack in-range inventory.
 */
const { enrichCatalogProduct } = require("./catalogMetadata");

function buildDummyJsonGallery(url) {
  const match = String(url || "").match(
    /^(https:\/\/cdn\.dummyjson\.com\/product-images\/.+)\/thumbnail\.(webp|png|jpe?g)$/i
  );
  if (!match) {
    return url ? [url] : [];
  }

  const [, base, ext] = match;
  return [
    url,
    `${base}/1.${ext}`,
    `${base}/2.${ext}`,
    `${base}/3.${ext}`,
  ];
}

function withPremiumGallery(product) {
  const hasGallery = Array.isArray(product.images) && product.images.length > 0;
  if (hasGallery) {
    return product;
  }

  return {
    ...product,
    images: buildDummyJsonGallery(product.image),
  };
}

const RAW_DEMO_COVERAGE_PRODUCTS = [
  {
    id: "demo-laptop-649",
    title: "HP Pavilion 15 Laptop",
    description:
      "15.6 inch laptop notebook with Intel Core i5, 8GB RAM, and 512GB SSD. Reliable everyday laptop for work, school, and browsing.",
    category: "laptops",
    price: 649.99,
    image:
      "https://cdn.dummyjson.com/product-images/laptops/lenovo-yoga-920/thumbnail.webp",
    images: [
      "https://cdn.dummyjson.com/product-images/laptops/lenovo-yoga-920/thumbnail.webp",
      "https://cdn.dummyjson.com/product-images/laptops/lenovo-yoga-920/1.webp",
      "https://cdn.dummyjson.com/product-images/laptops/lenovo-yoga-920/2.webp",
      "https://cdn.dummyjson.com/product-images/laptops/lenovo-yoga-920/3.webp",
    ],
    rating: 4.4,
    brand: "HP",
    tags: ["laptop", "notebook", "computer", "electronics"],
    source: "demo-coverage",
  },
  {
    id: "demo-laptop-749",
    title: "Lenovo IdeaPad Slim 7 Laptop",
    description:
      "Slim ultrabook laptop with 14 inch display, 16GB RAM, and fast SSD storage. Lightweight notebook for professionals.",
    category: "laptops",
    price: 749.99,
    image:
      "https://cdn.dummyjson.com/product-images/laptops/huawei-matebook-x-pro/thumbnail.webp",
    images: [
      "https://cdn.dummyjson.com/product-images/laptops/huawei-matebook-x-pro/thumbnail.webp",
      "https://cdn.dummyjson.com/product-images/laptops/huawei-matebook-x-pro/1.webp",
      "https://cdn.dummyjson.com/product-images/laptops/huawei-matebook-x-pro/2.webp",
      "https://cdn.dummyjson.com/product-images/laptops/huawei-matebook-x-pro/3.webp",
    ],
    rating: 4.5,
    brand: "Lenovo",
    tags: ["laptop", "notebook", "ultrabook", "computer"],
    source: "demo-coverage",
  },
  {
    id: "demo-laptop-849",
    title: "Dell Inspiron 15 Laptop",
    description:
      "15 inch laptop with dedicated graphics, 16GB RAM, and 1TB SSD. Strong performance laptop for creators and students.",
    category: "laptops",
    price: 849.99,
    image:
      "https://cdn.dummyjson.com/product-images/laptops/new-dell-xps-13-9300-laptop/thumbnail.webp",
    images: [
      "https://cdn.dummyjson.com/product-images/laptops/new-dell-xps-13-9300-laptop/thumbnail.webp",
      "https://cdn.dummyjson.com/product-images/laptops/new-dell-xps-13-9300-laptop/1.webp",
      "https://cdn.dummyjson.com/product-images/laptops/new-dell-xps-13-9300-laptop/2.webp",
      "https://cdn.dummyjson.com/product-images/laptops/new-dell-xps-13-9300-laptop/3.webp",
    ],
    rating: 4.3,
    brand: "Dell",
    tags: ["laptop", "notebook", "computer", "electronics"],
    source: "demo-coverage",
  },
  {
    id: "demo-laptop-899",
    title: "Acer Swift Go 14 Laptop",
    description:
      "14 inch laptop with Intel Core Ultra performance, 16GB RAM, and sharp display. Premium portable computer for work trips and everyday use.",
    category: "laptops",
    price: 899.99,
    image:
      "https://cdn.dummyjson.com/product-images/laptops/apple-macbook-pro-14-inch-space-grey/thumbnail.webp",
    images: [
      "https://cdn.dummyjson.com/product-images/laptops/apple-macbook-pro-14-inch-space-grey/thumbnail.webp",
      "https://cdn.dummyjson.com/product-images/laptops/apple-macbook-pro-14-inch-space-grey/1.webp",
      "https://cdn.dummyjson.com/product-images/laptops/apple-macbook-pro-14-inch-space-grey/2.webp",
      "https://cdn.dummyjson.com/product-images/laptops/apple-macbook-pro-14-inch-space-grey/3.webp",
    ],
    rating: 4.5,
    brand: "Acer",
    tags: ["laptop", "notebook", "portable", "computer"],
    source: "demo-coverage",
  },
  {
    id: "demo-monitor-gaming-179",
    title: "LG UltraGear 24 Gaming Monitor",
    description:
      "24 inch Full HD gaming monitor with 144Hz refresh rate, 1ms response time, and AMD FreeSync for smooth PC gaming.",
    category: "electronics",
    price: 179.99,
    image: "https://fakestoreapi.com/img/81QpkIctqPL._AC_SX679_t.png",
    rating: 4.6,
    brand: "LG",
    tags: ["monitor", "gaming", "display", "144hz", "electronics"],
    source: "demo-coverage",
  },
  {
    id: "demo-monitor-gaming-219",
    title: "Acer Nitro 24 Gaming Monitor 144Hz",
    description:
      "24 inch curved gaming monitor with 144Hz refresh rate, HDR10, and low-latency mode for competitive gaming setups.",
    category: "electronics",
    price: 219.99,
    image: "https://fakestoreapi.com/img/81QpkIctqPL._AC_SX679_t.png",
    rating: 4.5,
    brand: "Acer",
    tags: ["monitor", "gaming", "display", "144hz", "electronics"],
    source: "demo-coverage",
  },
  {
    id: "demo-monitor-office-149",
    title: "Dell 24 Full HD Office Monitor",
    description:
      "24 inch Full HD computer monitor with thin bezels and adjustable stand. Ideal home office display for laptops and desktops.",
    category: "electronics",
    price: 149.99,
    image: "https://fakestoreapi.com/img/81QpkIctqPL._AC_SX679_t.png",
    rating: 4.2,
    brand: "Dell",
    tags: ["monitor", "display", "office", "electronics"],
    source: "demo-coverage",
  },
  {
    id: "demo-headphones-59",
    title: "Anker Soundcore Over-Ear Headphones",
    description:
      "Wireless over-ear headphones with long battery life, soft ear cushions, and clear sound for commuting or study sessions.",
    category: "electronics",
    price: 59.99,
    image: "https://cdn.dummyjson.com/product-images/mobile-accessories/beats-flex-wireless-earphones/thumbnail.webp",
    images: [
      "https://cdn.dummyjson.com/product-images/mobile-accessories/beats-flex-wireless-earphones/thumbnail.webp",
      "https://cdn.dummyjson.com/product-images/mobile-accessories/beats-flex-wireless-earphones/1.webp",
      "https://cdn.dummyjson.com/product-images/mobile-accessories/beats-flex-wireless-earphones/2.webp",
      "https://cdn.dummyjson.com/product-images/mobile-accessories/beats-flex-wireless-earphones/3.webp",
    ],
    rating: 4.3,
    brand: "Anker",
    tags: ["headphones", "wireless", "audio", "electronics"],
    source: "demo-coverage",
  },
  {
    id: "demo-headphones-69",
    title: "JBL Tune Flex Wireless Earbuds",
    description:
      "Compact wireless earbuds with punchy bass and a comfortable fit. Easy budget audio pick for phone calls and music.",
    category: "electronics",
    price: 69.99,
    image: "https://cdn.dummyjson.com/product-images/mobile-accessories/beats-flex-wireless-earphones/thumbnail.webp",
    images: [
      "https://cdn.dummyjson.com/product-images/mobile-accessories/beats-flex-wireless-earphones/thumbnail.webp",
      "https://cdn.dummyjson.com/product-images/mobile-accessories/beats-flex-wireless-earphones/1.webp",
      "https://cdn.dummyjson.com/product-images/mobile-accessories/beats-flex-wireless-earphones/2.webp",
      "https://cdn.dummyjson.com/product-images/mobile-accessories/beats-flex-wireless-earphones/3.webp",
    ],
    rating: 4.2,
    brand: "JBL",
    tags: ["earbuds", "wireless", "headphones", "audio"],
    source: "demo-coverage",
  },
  {
    id: "demo-headphones-89",
    title: "Sony WH-CH720N Wireless Headphones",
    description:
      "Noise-reducing wireless headphones with balanced sound and all-day battery life. Great under one-hundred-dollar audio option.",
    category: "electronics",
    price: 89.99,
    image: "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods-max-silver/thumbnail.webp",
    images: [
      "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods-max-silver/thumbnail.webp",
      "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods-max-silver/1.webp",
      "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods-max-silver/2.webp",
      "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods-max-silver/3.webp",
    ],
    rating: 4.6,
    brand: "Sony",
    tags: ["headphones", "wireless", "audio", "noise cancelling"],
    source: "demo-coverage",
  },
  {
    id: "demo-jacket-blue-49",
    title: "Seabreeze Blue Rain Jacket",
    description:
      "Blue lightweight rain jacket with hood, sealed seams, and easy layering fit. Built for city commutes and weekend travel.",
    category: "women's clothing",
    price: 49.99,
    image: "https://fakestoreapi.com/img/71HblAHs5xL._AC_UY879_-2t.png",
    rating: 4.4,
    brand: "Seabreeze",
    tags: ["blue", "jacket", "raincoat", "women"],
    source: "demo-coverage",
  },
  {
    id: "demo-jacket-blue-54",
    title: "Alpine Blue Packable Windbreaker",
    description:
      "Blue windbreaker jacket with packable design and water-resistant shell. A travel-friendly outer layer under sixty dollars.",
    category: "women's clothing",
    price: 54.99,
    image: "https://fakestoreapi.com/img/71HblAHs5xL._AC_UY879_-2t.png",
    rating: 4.3,
    brand: "Alpine",
    tags: ["blue", "windbreaker", "jacket", "women"],
    source: "demo-coverage",
  },
  {
    id: "demo-jacket-blue-59",
    title: "Harbor Blue Hooded Coat",
    description:
      "Blue hooded coat with clean lines and easy everyday protection from wind and light rain. Premium-looking outerwear at a calm price.",
    category: "women's clothing",
    price: 59.99,
    image: "https://fakestoreapi.com/img/71HblAHs5xL._AC_UY879_-2t.png",
    rating: 4.1,
    brand: "Harbor",
    tags: ["blue", "coat", "jacket", "women"],
    source: "demo-coverage",
  },
  {
    id: "demo-shoes-women-39",
    title: "Riviera Women Sandals",
    description:
      "Comfortable women's sandals with slim straps and cushioned sole. Easy warm-weather footwear under forty dollars.",
    category: "shoes",
    price: 39.99,
    image: "https://cdn.dummyjson.com/product-images/womens-shoes/pampi-shoes/thumbnail.webp",
    images: [
      "https://cdn.dummyjson.com/product-images/womens-shoes/pampi-shoes/thumbnail.webp",
      "https://cdn.dummyjson.com/product-images/womens-shoes/pampi-shoes/1.webp",
      "https://cdn.dummyjson.com/product-images/womens-shoes/pampi-shoes/2.webp",
      "https://cdn.dummyjson.com/product-images/womens-shoes/pampi-shoes/3.webp",
    ],
    rating: 4.1,
    brand: "Riviera",
    tags: ["women", "sandals", "shoes", "footwear"],
    source: "demo-coverage",
  },
  {
    id: "demo-shoes-women-44",
    title: "Urban Step Women Sneakers",
    description:
      "Women's everyday sneakers with soft cushioning and clean styling. Flexible casual shoes for commuting and daily errands.",
    category: "shoes",
    price: 44.99,
    image: "https://cdn.dummyjson.com/product-images/mens-shoes/nike-air-jordan-1-red-and-black/thumbnail.webp",
    images: [
      "https://cdn.dummyjson.com/product-images/mens-shoes/nike-air-jordan-1-red-and-black/thumbnail.webp",
      "https://cdn.dummyjson.com/product-images/mens-shoes/nike-air-jordan-1-red-and-black/1.webp",
      "https://cdn.dummyjson.com/product-images/mens-shoes/nike-air-jordan-1-red-and-black/2.webp",
      "https://cdn.dummyjson.com/product-images/mens-shoes/nike-air-jordan-1-red-and-black/3.webp",
    ],
    rating: 4.4,
    brand: "Urban Step",
    tags: ["women", "sneakers", "shoes", "footwear"],
    source: "demo-coverage",
  },
  {
    id: "demo-shoes-women-49",
    title: "Everyday Women Running Shoes",
    description:
      "Breathable women's running shoes with lightweight foam sole. Versatile athletic footwear under fifty dollars.",
    category: "shoes",
    price: 49.99,
    image: "https://cdn.dummyjson.com/product-images/womens-shoes/golden-shoes-woman/thumbnail.webp",
    images: [
      "https://cdn.dummyjson.com/product-images/womens-shoes/golden-shoes-woman/thumbnail.webp",
      "https://cdn.dummyjson.com/product-images/womens-shoes/golden-shoes-woman/1.webp",
      "https://cdn.dummyjson.com/product-images/womens-shoes/golden-shoes-woman/2.webp",
      "https://cdn.dummyjson.com/product-images/womens-shoes/golden-shoes-woman/3.webp",
    ],
    rating: 4.3,
    brand: "Everyday Motion",
    tags: ["women", "running shoes", "sneakers", "footwear"],
    source: "demo-coverage",
  },
  {
    id: "demo-fragrance-64",
    title: "Soft Rose Day Fragrance",
    description:
      "Fresh floral perfume with soft rose and musk notes. An easy everyday fragrance that stays below a mid-range budget.",
    category: "fragrances",
    price: 64.99,
    image: "https://cdn.dummyjson.com/product-images/fragrances/dolce-shine-eau-de/thumbnail.webp",
    images: [
      "https://cdn.dummyjson.com/product-images/fragrances/dolce-shine-eau-de/thumbnail.webp",
      "https://cdn.dummyjson.com/product-images/fragrances/dolce-shine-eau-de/1.webp",
      "https://cdn.dummyjson.com/product-images/fragrances/dolce-shine-eau-de/2.webp",
      "https://cdn.dummyjson.com/product-images/fragrances/dolce-shine-eau-de/3.webp",
    ],
    rating: 4.2,
    brand: "Maison Rose",
    tags: ["perfume", "fragrance", "women", "floral"],
    source: "demo-coverage",
  },
  {
    id: "demo-fragrance-79",
    title: "Maison Citrus Bloom Eau de Parfum",
    description:
      "Bright citrus perfume with floral heart and clean dry-down. Premium fragrance option still under ninety dollars.",
    category: "fragrances",
    price: 79.99,
    image: "https://cdn.dummyjson.com/product-images/fragrances/calvin-klein-ck-one/thumbnail.webp",
    images: [
      "https://cdn.dummyjson.com/product-images/fragrances/calvin-klein-ck-one/thumbnail.webp",
      "https://cdn.dummyjson.com/product-images/fragrances/calvin-klein-ck-one/1.webp",
      "https://cdn.dummyjson.com/product-images/fragrances/calvin-klein-ck-one/2.webp",
      "https://cdn.dummyjson.com/product-images/fragrances/calvin-klein-ck-one/3.webp",
    ],
    rating: 4.5,
    brand: "Maison Citrus",
    tags: ["perfume", "fragrance", "cologne", "citrus"],
    source: "demo-coverage",
  },
  {
    id: "demo-backpack-89",
    title: "Transit Travel Backpack",
    description:
      "Travel backpack with laptop sleeve, bottle pocket, and clean commuter silhouette. Practical carry choice under one hundred dollars.",
    category: "bags",
    price: 89.99,
    image: "https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_t.png",
    rating: 4.5,
    brand: "Transit",
    tags: ["backpack", "bag", "travel", "laptop"],
    source: "demo-coverage",
  },
  {
    id: "demo-backpack-109",
    title: "Leather City Backpack",
    description:
      "Structured backpack with leather-look finish and padded laptop section. Elevated everyday bag for office or campus.",
    category: "bags",
    price: 109.99,
    image: "https://cdn.dummyjson.com/product-images/womens-bags/white-faux-leather-backpack/thumbnail.webp",
    rating: 4.3,
    brand: "City Form",
    tags: ["backpack", "bag", "leather", "commuter"],
    source: "demo-coverage",
  },
];

const DEMO_COVERAGE_PRODUCTS = RAW_DEMO_COVERAGE_PRODUCTS.map((product) =>
  enrichCatalogProduct(withPremiumGallery(product))
);

function getDemoCoverageProducts() {
  return DEMO_COVERAGE_PRODUCTS.map((product) => ({ ...product }));
}

module.exports = {
  DEMO_COVERAGE_PRODUCTS,
  getDemoCoverageProducts,
};
