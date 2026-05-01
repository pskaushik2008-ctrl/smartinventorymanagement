const itemForm = document.getElementById("itemForm");
const itemIdInput = document.getElementById("itemId");
const nameInput = document.getElementById("name");
const quantityInput = document.getElementById("quantity");
const priceInput = document.getElementById("price");
const amountInput = document.getElementById("amount");
const formTitle = document.getElementById("formTitle");
const cancelBtn = document.getElementById("cancelBtn");
const clearBtn = document.getElementById("clearBtn");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const exportBtn = document.getElementById("exportBtn");
const importFile = document.getElementById("importFile");
const messageBox = document.getElementById("message");
const tableBody = document.getElementById("itemsTableBody");
const statItems = document.getElementById("statItems");
const statQuantity = document.getElementById("statQuantity");
const statValue = document.getElementById("statValue");

const STORAGE_KEY = "grocery_inventory_items";
const COUNTER_KEY = "grocery_inventory_last_id";

let items = [];

function showMessage(text, type = "success") {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;

  setTimeout(() => {
    messageBox.textContent = "";
    messageBox.className = "message";
  }, 3000);
}

function validateForm(name, quantity, price) {
  if (!name || name.trim().length < 2) {
    return "Product name must be at least 2 characters.";
  }

  const parsedQuantity = Number(quantity);
  if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
    return "Quantity must be a whole number greater than 0.";
  }

  const parsedPrice = Number(price);
  if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
    return "Price must be a valid number 0 or greater.";
  }

  return null;
}

function loadFromStorage() {
  const storedItems = localStorage.getItem(STORAGE_KEY);
  const parsed = storedItems ? JSON.parse(storedItems) : [];

  // Convert any old shape safely to new shape
  items = parsed.map((item) => {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.price || 0);
    return {
      id: Number(item.id),
      name: item.name || `Product ${item.id || ""}`.trim(),
      quantity,
      price,
      amount: Number(item.amount || quantity * price),
      createdAt: item.createdAt || new Date().toISOString()
    };
  });
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function getNextId() {
  const rawLastId = Number(localStorage.getItem(COUNTER_KEY));
  // Keep base as 1 so the first generated ID becomes 2.
  const lastId = Number.isInteger(rawLastId) && rawLastId >= 1 ? rawLastId : 1;
  const nextId = lastId + 1;
  localStorage.setItem(COUNTER_KEY, String(nextId));
  return nextId;
}

function resetForm() {
  itemForm.reset();
  itemIdInput.value = "";
  amountInput.value = "";
  formTitle.textContent = "Add New Entry";
  cancelBtn.classList.add("hidden");
}

function calculateLiveAmount() {
  const quantity = Number(quantityInput.value || 0);
  const price = Number(priceInput.value || 0);
  amountInput.value = (quantity * price).toFixed(2);
}

function updateStats() {
  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const totalAmount = items.reduce((sum, item) => sum + Number(item.amount), 0);

  statItems.textContent = String(totalItems);
  statQuantity.textContent = String(totalQuantity);
  statValue.textContent = totalAmount.toFixed(2);
}

function getFilteredAndSortedItems() {
  const searchValue = searchInput.value.trim();
  const sortValue = sortSelect.value;

  let list = [...items];
  if (searchValue) {
    const searchTerm = searchValue.toLowerCase();
    list = list.filter(
      (item) =>
        String(item.id).includes(searchTerm) ||
        String(item.name || "")
          .toLowerCase()
          .includes(searchTerm)
    );
  }

  if (sortValue === "oldest") {
    list.sort((a, b) => a.id - b.id);
  } else if (sortValue === "highAmount") {
    list.sort((a, b) => b.amount - a.amount);
  } else if (sortValue === "lowAmount") {
    list.sort((a, b) => a.amount - b.amount);
  } else {
    list.sort((a, b) => b.id - a.id);
  }

  return list;
}

function getStockStatus(quantity) {
  if (quantity <= 5) {
    return { label: "Low", className: "stock-badge low" };
  }
  if (quantity <= 15) {
    return { label: "Medium", className: "stock-badge medium" };
  }
  return { label: "Good", className: "stock-badge high" };
}

function renderTable() {
  const list = getFilteredAndSortedItems();

  if (list.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8">No records found.</td>
      </tr>
    `;
    updateStats();
    return;
  }

  tableBody.innerHTML = list
    .map(
      (item) => {
        const stock = getStockStatus(Number(item.quantity));
        return `
      <tr>
        <td>${item.id}</td>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td><span class="${stock.className}">${stock.label}</span></td>
        <td>${Number(item.price).toFixed(2)}</td>
        <td>${Number(item.amount).toFixed(2)}</td>
        <td>${new Date(item.createdAt).toLocaleDateString()}</td>
        <td>
          <button class="edit-btn" onclick="editItem(${item.id})">Edit</button>
          <button class="delete-btn" onclick="deleteItem(${item.id})">Delete</button>
        </td>
      </tr>
    `;
      }
    )
    .join("");

  updateStats();
}

function editItem(id) {
  const item = items.find((currentItem) => currentItem.id === id);
  if (!item) {
    showMessage("Selected item not found.", "error");
    return;
  }

  itemIdInput.value = item.id;
  nameInput.value = item.name;
  quantityInput.value = item.quantity;
  priceInput.value = item.price;
  amountInput.value = Number(item.amount).toFixed(2);
  formTitle.textContent = `Edit Item #${item.id}`;
  cancelBtn.classList.remove("hidden");
}

function deleteItem(id) {
  const confirmed = window.confirm("Are you sure you want to delete this item?");
  if (!confirmed) return;

  items = items.filter((item) => item.id !== id);
  saveToStorage();
  renderTable();
  showMessage("Item deleted successfully.");
}

itemForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const id = itemIdInput.value;
  const name = nameInput.value.trim();
  const quantity = quantityInput.value;
  const price = priceInput.value;
  const amount = Number(quantity) * Number(price);

  const validationError = validateForm(name, quantity, price);
  if (validationError) {
    showMessage(validationError, "error");
    return;
  }

  if (id) {
    items = items.map((item) =>
      item.id === Number(id)
        ? { ...item, name, quantity: Number(quantity), price: Number(price), amount }
        : item
    );
    showMessage("Entry updated successfully.");
  } else {
    const newItem = {
      id: getNextId(),
      name,
      quantity: Number(quantity),
      price: Number(price),
      amount,
      createdAt: new Date().toISOString()
    };
    items.unshift(newItem);
    showMessage("Entry added successfully.");
  }

  saveToStorage();
  renderTable();
  resetForm();
});

cancelBtn.addEventListener("click", () => {
  resetForm();
});

clearBtn.addEventListener("click", () => {
  const confirmed = window.confirm("Clear all records? This action cannot be undone.");
  if (!confirmed) return;

  items = [];
  saveToStorage();
  renderTable();
  resetForm();
  showMessage("All records cleared.");
});

searchInput.addEventListener("input", renderTable);
sortSelect.addEventListener("change", renderTable);
quantityInput.addEventListener("input", calculateLiveAmount);
priceInput.addEventListener("input", calculateLiveAmount);

exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "inventory-data.json";
  anchor.click();
  URL.revokeObjectURL(url);
  showMessage("Data exported successfully.");
});

importFile.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const content = await file.text();
    const imported = JSON.parse(content);
    if (!Array.isArray(imported)) {
      throw new Error("Invalid file format.");
    }

    items = imported.map((item) => {
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      return {
        id: Number(item.id),
        name: item.name || `Product ${item.id || ""}`.trim(),
        quantity,
        price,
        amount: Number(item.amount || quantity * price),
        createdAt: item.createdAt || new Date().toISOString()
      };
    });

    const maxId = items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
    localStorage.setItem(COUNTER_KEY, String(maxId));

    saveToStorage();
    renderTable();
    resetForm();
    showMessage("Data imported successfully.");
  } catch (error) {
    showMessage(error.message || "Import failed.", "error");
  } finally {
    event.target.value = "";
  }
});

// Initialize app on page load
loadFromStorage();
renderTable();
