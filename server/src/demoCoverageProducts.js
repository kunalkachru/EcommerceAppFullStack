/**
 * Curated products that fill common search-demo gaps in merged public catalogs.
 * Keeps jumbled/LLM queries like "laptop 500-900" and "gaming monitor under 240"
 * from falling back to unrelated items when public APIs lack in-range inventory.
 */
const DEMO_COVERAGE_PRODUCTS = [
  {
    id: "demo-laptop-649",
    title: "HP Pavilion 15 Laptop",
    description:
      "15.6 inch laptop notebook with Intel Core i5, 8GB RAM, and 512GB SSD. Reliable everyday laptop for work, school, and browsing.",
    category: "laptops",
    price: 649.99,
    image:
      "https://cdn.dummyjson.com/product-images/laptops/lenovo-yoga-920/thumbnail.webp",
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
    rating: 4.3,
    brand: "Dell",
    tags: ["laptop", "notebook", "computer", "electronics"],
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
];

function getDemoCoverageProducts() {
  return DEMO_COVERAGE_PRODUCTS.map((product) => ({ ...product }));
}

module.exports = {
  DEMO_COVERAGE_PRODUCTS,
  getDemoCoverageProducts,
};
