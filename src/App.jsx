import { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  // Night mode: remembers your choice, otherwise follows the device setting
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
    } catch {
      /* storage not available */
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });
  const searchRef = useRef(null);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [optimized, setOptimized] = useState(false);

  // CHANGE 1: state for the real AI result
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [budget, setBudget] = useState(2000);

  const [newItem, setNewItem] = useState({
    name: "",
    quantity: 1,
    price: "",
    category: "Groceries",
  });

  const [groceryItems, setGroceryItems] = useState([
    {
      id: 1,
      name: "Rice",
      quantity: 2,
      unit: "kg",
      price: 120,
      category: "Grains",
      protein: 8,
      checked: true,
    },
    {
      id: 2,
      name: "Toor Dal",
      quantity: 1,
      unit: "kg",
      price: 140,
      category: "Protein",
      protein: 90,
      checked: true,
    },
    {
      id: 3,
      name: "Eggs",
      quantity: 2,
      unit: "6 pcs",
      price: 96,
      category: "Protein",
      protein: 36,
      checked: true,
    },
    {
      id: 4,
      name: "Chicken Breast",
      quantity: 2,
      unit: "500g",
      price: 360,
      category: "Protein",
      protein: 155,
      checked: false,
    },
    {
      id: 5,
      name: "Milk",
      quantity: 2,
      unit: "1L",
      price: 112,
      category: "Dairy",
      protein: 32,
      checked: true,
    },
    {
      id: 6,
      name: "Paneer",
      quantity: 1,
      unit: "200g",
      price: 90,
      category: "Dairy",
      protein: 36,
      checked: false,
    },
    {
      id: 7,
      name: "Spinach",
      quantity: 2,
      unit: "250g",
      price: 40,
      category: "Vegetables",
      protein: 7,
      checked: true,
    },
    {
      id: 8,
      name: "Bananas",
      quantity: 1,
      unit: "dozen",
      price: 60,
      category: "Fruits",
      protein: 13,
      checked: false,
    },
  ]);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    try {
      localStorage.setItem("theme", darkMode ? "dark" : "light");
    } catch {
      /* storage not available */
    }
  }, [darkMode]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------------- CALCULATIONS ---------------- */

  const totalCost = groceryItems.reduce(
    (total, item) => total + item.price,
    0
  );

  const totalProtein = groceryItems.reduce(
    (total, item) => total + item.protein,
    0
  );

  // CHANGE 2: real numbers from the backend instead of hardcoded 250
  const estimatedSavings = optimized && result ? result.summary.savings : 0;

  const optimizedCost =
    optimized && result ? result.summary.optimisedCost : totalCost;

  const budgetRemaining = budget - optimizedCost;

  const budgetPercentage = Math.min(
    (optimizedCost / budget) * 100,
    100
  );

  /* ---------------- SEARCH ---------------- */

  const filteredItems = groceryItems.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  /* ---------------- FUNCTIONS ---------------- */

  const toggleItem = (id) => {
    setGroceryItems(
      groceryItems.map((item) =>
        item.id === id
          ? { ...item, checked: !item.checked }
          : item
      )
    );
  };

  const deleteItem = (id) => {
    setGroceryItems(
      groceryItems.filter((item) => item.id !== id)
    );
  };

  const changeQuantity = (id, amount) => {
    setGroceryItems(
      groceryItems.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: Math.max(1, item.quantity + amount),
            }
          : item
      )
    );
  };

  const addItem = (e) => {
    e.preventDefault();

    if (!newItem.name || !newItem.price) {
      return;
    }

    const item = {
      id: Date.now(),
      name: newItem.name,
      quantity: Number(newItem.quantity),
      unit: "unit",
      price: Number(newItem.price),
      category: newItem.category,
      protein: 20,
      checked: false,
    };

    setGroceryItems([...groceryItems, item]);

    setNewItem({
      name: "",
      quantity: 1,
      price: "",
      category: "Groceries",
    });

    setShowModal(false);
  };

  // CHANGE 3: real call to the backend
  const optimizeList = async () => {
    setLoading(true);
    setError("");
    setOptimized(false);

    try {
      const res = await fetch("/api/optimise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: groceryItems, budget }),
      });

      // Read the reply safely: an empty reply usually means the backend is not running
      const raw = await res.text();
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!res.ok || !data) {
        throw new Error(
          data?.error ||
            "Cannot reach the backend. Make sure it is running (open a terminal, run: cd backend, then npm run dev)."
        );
      }

      setResult(data);
      setOptimized(true);
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- SIDEBAR ---------------- */

  const menuItems = [
    ["🏠", "Dashboard"],
    ["🛒", "My Grocery List"],
    ["🤖", "AI Optimizer"],
    ["💰", "Budget Planner"],
    ["🥗", "Nutrition"],
    ["📊", "Analytics"],
    ["⚙️", "Settings"],
  ];

  return (
    <div className={darkMode ? "app dark" : "app"}>

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="logo">
          <div className="logo-icon">🛒</div>

          <div>
            <h2>AI Grocery</h2>
            <span>Optimizer</span>
          </div>
        </div>

        <div className="menu-title">
          MAIN MENU
        </div>

        <nav>
          {menuItems.map(([icon, name]) => (
            <button
              key={name}
              className={
                activeTab === name
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => setActiveTab(name)}
            >
              <span>{icon}</span>
              {name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">

          <div className="ai-mini-card">
            <span className="sparkle">✨</span>

            <strong>Smart Shopping</strong>

            <p>
              Let AI optimize your grocery budget.
            </p>

            <button onClick={optimizeList}>
              Optimize Now →
            </button>
          </div>

          <div className="user-mini">
            <div className="avatar">K</div>

            <div>
              <strong>Kunal</strong>
              <small>BSc AI Student</small>
            </div>

            <span>•••</span>
          </div>

        </div>
      </aside>

      {/* MAIN CONTENT */}

      <main className="main">

        {/* HEADER */}

        <header className="header">

          <div className="mobile-logo">
            🛒 AI Grocery
          </div>

          <div className="search-box">
            <span>🔍</span>

            <input
              ref={searchRef}
              type="text"
              placeholder="Search groceries... (Ctrl + K)"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

            <kbd>Ctrl K</kbd>
          </div>

          <div className="header-actions">

            <button
              className="theme-button"
              onClick={() => setDarkMode(!darkMode)}
              aria-label="Toggle night mode"
              aria-pressed={darkMode}
              title={darkMode ? "Switch to day mode" : "Switch to night mode"}
            >
              <span className="theme-track">
                <span className="theme-thumb">
                  {darkMode ? "🌙" : "☀️"}
                </span>
              </span>
              <span className="theme-label">
                {darkMode ? "Night" : "Day"}
              </span>
            </button>

            <button className="notification">
              🔔
              <span></span>
            </button>

            <div className="profile">
              <div className="avatar">
                K
              </div>

              <div className="profile-info">
                <strong>Kunal</strong>
                <small>Student</small>
              </div>

              <span>⌄</span>
            </div>

          </div>

        </header>

        {/* CONTENT */}

        <section className="content">

          {activeTab === "Dashboard" && (
            <>
              {/* PAGE TITLE */}

              <div className="page-heading">

                <div>
                  <span className="welcome">
                    Welcome back 👋
                  </span>

                  <h1>
                    Grocery Dashboard
                  </h1>

                  <p>
                    Plan smarter. Shop better. Save more.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={() =>
                    setShowModal(true)
                  }
                >
                  + Add Grocery
                </button>

              </div>

              {/* SUMMARY CARDS */}

              <div className="summary-grid">

                <div className="summary-card green">

                  <div className="card-top">
                    <div className="card-icon">
                      🛒
                    </div>

                    <span className="trend positive">
                      {groceryItems.filter((i) => i.checked).length} selected
                    </span>
                  </div>

                  <p>Total Grocery Items</p>

                  <h2>
                    {groceryItems.length}
                  </h2>

                  <small>
                    Items in your list
                  </small>

                </div>

                <div className="summary-card blue">

                  <div className="card-top">
                    <div className="card-icon">
                      💰
                    </div>

                    <span className="trend">
                      {Math.round((optimizedCost / Math.max(budget, 1)) * 100)}% of budget
                    </span>
                  </div>

                  <p>Estimated Cost</p>

                  <h2>
                    ₹{optimizedCost.toLocaleString()}
                  </h2>

                  <small>
                    Before shopping
                  </small>

                </div>

                <div className="summary-card purple">

                  <div className="card-top">
                    <div className="card-icon">
                      🥩
                    </div>

                    <span className="trend positive">
                      {Math.round(totalProtein / Math.max(groceryItems.length, 1))}g / item
                    </span>
                  </div>

                  <p>Total Protein</p>

                  <h2>
                    {totalProtein}g
                  </h2>

                  <small>
                    Across all items
                  </small>

                </div>

                <div className="summary-card orange">

                  <div className="card-top">
                    <div className="card-icon">
                      💸
                    </div>

                    <span className="trend positive">
                      {optimized ? "Optimised" : "Run AI"}
                    </span>
                  </div>

                  <p>AI Estimated Savings</p>

                  <h2>
                    ₹{estimatedSavings}
                  </h2>

                  <small>
                    Potential savings
                  </small>

                </div>

              </div>

              {/* MAIN TWO COLUMN AREA */}

              <div className="main-grid">

                {/* CURRENT LIST */}

                <section className="panel grocery-panel">

                  <div className="panel-header">

                    <div>
                      <div className="title-row">
                        <h2>
                          🛒 Current Grocery List
                        </h2>

                        <span className="item-count">
                          {groceryItems.length} items
                        </span>
                      </div>

                      <p>
                        Manage your grocery items
                        before optimization.
                      </p>
                    </div>

                    <button
                      className="outline-button"
                      onClick={() =>
                        setShowModal(true)
                      }
                    >
                      + Add Item
                    </button>

                  </div>

                  <div className="grocery-list">

                    {filteredItems.length === 0 ? (
                      <div className="empty">
                        No grocery items found.
                      </div>
                    ) : (
                      filteredItems.map((item) => (

                        <div
                          className={
                            item.checked
                              ? "grocery-item checked"
                              : "grocery-item"
                          }
                          key={item.id}
                        >

                          <button
                            className="check-button"
                            onClick={() =>
                              toggleItem(item.id)
                            }
                          >
                            {item.checked ? "✓" : ""}
                          </button>

                          <div className="item-details">

                            <strong>
                              {item.name}
                            </strong>

                            <div className="item-meta">

                              <span className="category">
                                {item.category}
                              </span>

                              <span>
                                {item.protein}g protein
                              </span>

                            </div>

                          </div>

                          <div className="quantity-control">

                            <button
                              onClick={() =>
                                changeQuantity(
                                  item.id,
                                  -1
                                )
                              }
                            >
                              −
                            </button>

                            <span>
                              {item.quantity}
                            </span>

                            <button
                              onClick={() =>
                                changeQuantity(
                                  item.id,
                                  1
                                )
                              }
                            >
                              +
                            </button>

                          </div>

                          <div className="item-price">
                            ₹{item.price}
                          </div>

                          <button
                            className="delete-button"
                            onClick={() =>
                              deleteItem(item.id)
                            }
                          >
                            🗑️
                          </button>

                        </div>

                      ))
                    )}

                  </div>

                  <div className="list-footer">

                    <span>
                      {groceryItems.filter(
                        (item) => item.checked
                      ).length}{" "}
                      of {groceryItems.length} items
                      selected
                    </span>

                    <button
                      onClick={() =>
                        setShowModal(true)
                      }
                    >
                      Manage List →
                    </button>

                  </div>

                </section>

                {/* AI RECOMMENDATION */}

                <section className="panel ai-panel">

                  <div className="ai-header">

                    <div className="ai-title">

                      <div className="robot-icon">
                        🤖
                      </div>

                      <div>
                        <h2>
                          AI Recommendation
                        </h2>

                        <span>
                          ✨ Optimized for you
                        </span>
                      </div>

                    </div>

                    <span className="ai-status">
                      ● AI Active
                    </span>

                  </div>

                  <div className="ai-message">

                    <p>
                      Your current list is{" "}
                      <strong>
                        ₹{totalCost.toLocaleString()}
                      </strong>.
                    </p>

                    <p>
                      Based on your{" "}
                      <strong>
                        ₹{budget.toLocaleString()}
                      </strong>{" "}
                      budget, AI can optimize
                      the list to approximately{" "}
                      <strong>
                        ₹
                        {result
                          ? result.summary.optimisedCost.toLocaleString()
                          : "—"}
                      </strong>.
                    </p>

                  </div>

                  <div className="optimization-box">

                    <div>
                      <span>
                        Current cost
                      </span>

                      <strong>
                        ₹{totalCost}
                      </strong>
                    </div>

                    <div className="arrow">
                      →
                    </div>

                    <div>
                      <span>
                        AI optimized
                      </span>

                      <strong className="green-text">
                        ₹{result ? result.summary.optimisedCost : "—"}
                      </strong>
                    </div>

                  </div>

                  {/* CHANGE 5: real optimized list from the backend */}
                  {optimized && result && (
                    <div className="optimized-list">

                      <div className="optimized-title">
                        <span>✨</span>
                        <strong>
                          Optimized List
                        </strong>
                      </div>

                      {result.items.map((item) => (
                        <div className="optimized-item" key={item.id}>
                          <div className="optimized-info">
                            <span className="optimized-name">
                              {item.name} × {item.quantity}
                            </span>
                            <small className="optimized-reason">
                              {item.action === "swap" && item.replaces
                                ? `Replaces ${item.replaces}. `
                                : ""}
                              {item.reason}
                            </small>
                          </div>
                          <span className={`action-badge ${item.action}`}>
                            {item.action}
                          </span>
                          <strong>
                            ₹{item.price}
                            {item.estimated && "~"}
                          </strong>
                        </div>
                      ))}

                      {(() => {
                        const removed = groceryItems.filter(
                          (g) => !result.items.some((r) => r.id === g.id)
                        );
                        return (
                          removed.length > 0 && (
                            <div className="removed-note">
                              🗑️ Removed: {removed.map((r) => r.name).join(", ")}
                            </div>
                          )
                        );
                      })()}

                    </div>
                  )}

                  {error && (
                    <div className="ai-note error">
                      <span>⚠️</span>
                      <p>{error}</p>
                    </div>
                  )}

                  <button
                    className="optimize-button"
                    onClick={optimizeList}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner" /> Optimizing...
                      </>
                    ) : (
                      <>
                        ✨ Optimize My List
                        <span>→</span>
                      </>
                    )}
                  </button>

                  <div className="ai-note">
                    <span>💡</span>

                    <p>
                      AI considers your budget,
                      protein requirements and
                      item value to create a
                      smarter grocery combination.
                    </p>
                  </div>

                </section>

              </div>

              {/* BOTTOM SECTION */}

              <div className="bottom-grid">

                {/* AI INSIGHT */}

                <section className="panel insight-panel">

                  <div className="section-heading">

                    <div className="section-icon">
                      💡
                    </div>

                    <div>
                      <h2>
                        AI Insight
                      </h2>

                      <p>
                        Why AI made this recommendation
                      </p>
                    </div>

                  </div>

                  {/* CHANGE 6: real AI insights (falls back to defaults) */}
                  <div className="insight-content">

                    {(result?.insights?.length
                      ? result.insights
                      : [
                          {
                            title: "Protein efficiency",
                            text: "Chicken, eggs and dal provide better protein value within your budget.",
                          },
                          {
                            title: "Budget optimization",
                            text: "AI reduces lower-priority items to keep your shopping within budget.",
                          },
                          {
                            title: "Balanced selection",
                            text: "The recommended combination balances cost and nutrition.",
                          },
                        ]
                    ).map((insight, i) => (
                      <div className="insight-item" key={i}>
                        <span>{["🥩", "💰", "⚖️"][i] || "💡"}</span>

                        <p>
                          <strong>{insight.title}</strong>
                          <br />
                          {insight.text}
                        </p>
                      </div>
                    ))}

                  </div>

                </section>

                {/* BUDGET */}

                <section className="panel budget-panel">

                  <div className="section-heading">

                    <div className="section-icon">
                      💰
                    </div>

                    <div>
                      <h2>
                        Budget Progress
                      </h2>

                      <p>
                        Your grocery budget
                      </p>
                    </div>

                  </div>

                  <div className="budget-values">

                    <div>
                      <span>
                        Used
                      </span>

                      <strong>
                        ₹{optimizedCost}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Budget
                      </span>

                      <strong>
                        ₹{budget}
                      </strong>
                    </div>

                  </div>

                  <div className="progress">

                    <div
                      className="progress-bar"
                      style={{
                        width:
                          `${budgetPercentage}%`,
                      }}
                    ></div>

                  </div>

                  <div className="budget-bottom">

                    <span>
                      {budgetRemaining >= 0
                        ? `₹${budgetRemaining} remaining`
                        : `₹${Math.abs(
                            budgetRemaining
                          )} over budget`}
                    </span>

                    <span>
                      {Math.round(
                        budgetPercentage
                      )}%
                    </span>

                  </div>

                  <div className="budget-input">

                    <label>
                      Set your budget
                    </label>

                    <div>
                      <span>₹</span>

                      <input
                        type="number"
                        value={budget}
                        onChange={(e) =>
                          setBudget(
                            Number(e.target.value)
                          )
                        }
                      />
                    </div>

                  </div>

                </section>

              </div>

            </>
          )}

          {/* OTHER TABS */}

          {activeTab !== "Dashboard" && (

            <div className="placeholder-page">

              <div className="placeholder-icon">
                {menuItems.find(
                  (item) => item[1] === activeTab
                )?.[0]}
              </div>

              <h1>
                {activeTab}
              </h1>

              <p>
                This section is ready for your
                next feature.
              </p>

              {activeTab === "AI Optimizer" && (
                <button
                  className="primary-button"
                  onClick={optimizeList}
                >
                  ✨ Optimize Grocery List
                </button>
              )}

            </div>

          )}

        </section>

      </main>

      {/* ADD ITEM MODAL */}

      {showModal && (

        <div
          className="modal-overlay"
          onClick={() =>
            setShowModal(false)
          }
        >

          <div
            className="modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>
                <span className="modal-icon">
                  🛒
                </span>

                <div>
                  <h2>
                    Add Grocery Item
                  </h2>

                  <p>
                    Add an item to your list
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  setShowModal(false)
                }
              >
                ✕
              </button>

            </div>

            <form onSubmit={addItem}>

              <label>
                Item Name

                <input
                  type="text"
                  placeholder="e.g. Apples"
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      name: e.target.value,
                    })
                  }
                />

              </label>

              <div className="form-row">

                <label>
                  Quantity

                  <input
                    type="number"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        quantity:
                          e.target.value,
                      })
                    }
                  />

                </label>

                <label>
                  Price

                  <input
                    type="number"
                    placeholder="₹"
                    value={newItem.price}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        price:
                          e.target.value,
                      })
                    }
                  />

                </label>

              </div>

              <label>
                Category

                <select
                  value={newItem.category}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      category:
                        e.target.value,
                    })
                  }
                >
                  <option>Groceries</option>
                  <option>Protein</option>
                  <option>Dairy</option>
                  <option>Vegetables</option>
                  <option>Fruits</option>
                  <option>Grains</option>
                </select>

              </label>

              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={() =>
                    setShowModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  + Add Item
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;