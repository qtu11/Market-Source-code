// This script adds a default product to localStorage
const defaultProduct = {
  id: Date.now().toString(),
  title: "Default Product",
  description: "This is a default product.",
  price: 10000,
  category: "Website",
  image: "/placeholder.svg",
  downloadLink: "https://example.com/download",
  demoLink: "https://example.com/demo",
  tags: ["react", "javascript"],
  createdAt: new Date().toISOString(),
  createdBy: "admin@example.com"
};

// Get existing products from localStorage
let products = JSON.parse(localStorage.getItem("uploadedProducts") || "[]");

// Add the default product to the array
products.push(defaultProduct);

// Save the updated products array back to localStorage
localStorage.setItem("uploadedProducts", JSON.stringify(products));

console.log("Default product added to localStorage");
