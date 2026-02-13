const CART_KEY = "sourdough-cart";

document.querySelectorAll("[data-product-id]").forEach((button) => {
  button.addEventListener("click", () => {
    let previous = null;
    try {
      const previousRaw = localStorage.getItem(CART_KEY);
      previous = previousRaw ? JSON.parse(previousRaw) : null;
    } catch {
      previous = null;
    }
    const product = {
      id: button.dataset.productId,
      name: button.dataset.productName,
      price: Number(button.dataset.productPrice),
      quantity: 1,
    };

    if (previous && previous.id === product.id) {
      product.quantity = Math.max(1, Number(previous.quantity || 1)) + 1;
    }

    localStorage.setItem(CART_KEY, JSON.stringify(product));
    window.location.href = "./cart.html";
  });
});
