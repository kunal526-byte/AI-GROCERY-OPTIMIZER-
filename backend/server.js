import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const PORT = process.env.PORT || 5000;

const SYSTEM_PROMPT = `You are a grocery budget optimiser for shoppers in India (prices in INR).
You receive a grocery list and a budget. Each item's "price" is the TOTAL price for its current quantity.

Goals, in order:
1. Get the total at or under the budget.
2. Keep or improve protein per rupee.
3. Keep the list balanced (grains, protein, dairy, vegetables, fruits).

For EVERY input item, return exactly one decision:
- "keep":   unchanged
- "reduce": same item, smaller quantity (give newQuantity, a whole number >= 1 and less than the original)
- "remove": drop the item
- "swap":   replace with a cheaper or higher-protein alternative (give swapName, swapPrice as the total price for that item, swapProtein in grams, and swapUnit)

Rules:
- Never invent prices for items that are kept or reduced; the server calculates those.
- For swaps, give a realistic Indian retail price estimate.
- Do not change anything if the list is already within budget and well balanced; return "keep" for all.
- Give a short, specific reason (max 15 words) for each decision.
- Also give 2 to 3 insights, each with a short title and one sentence.

Respond with ONLY valid JSON, no markdown, in this exact shape:
{
  "decisions": [
    { "id": 1, "action": "keep|reduce|remove|swap", "newQuantity": 1,
      "swapName": "", "swapPrice": 0, "swapProtein": 0, "swapUnit": "", "reason": "" }
  ],
  "insights": [ { "title": "", "text": "" } ]
}`;

function parseJson(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

function validateInput(body) {
  const { items, budget } = body ?? {};
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    return "items must be a non-empty array (max 100)";
  }
  if (typeof budget !== "number" || !(budget > 0)) {
    return "budget must be a positive number";
  }
  for (const i of items) {
    if (
      i.id === undefined ||
      typeof i.name !== "string" ||
      !Number.isFinite(i.price) ||
      !Number.isFinite(i.quantity) ||
      i.quantity < 1
    ) {
      return "each item needs id, name, price and quantity";
    }
  }
  return null;
}

// Build the final list on the server so the maths is never left to the AI.
function applyDecisions(items, decisions) {
  const byId = new Map(decisions.map((d) => [String(d.id), d]));

  return items
    .map((item) => {
      const d = byId.get(String(item.id)) ?? { action: "keep", reason: "" };
      const base = { id: item.id, reason: d.reason || "" };

      switch (d.action) {
        case "remove":
          return null;

        case "reduce": {
          const q = Math.min(
            Math.max(1, Math.round(Number(d.newQuantity) || item.quantity)),
            item.quantity
          );
          const ratio = q / item.quantity;
          return {
            ...base,
            action: q === item.quantity ? "keep" : "reduce",
            name: item.name,
            unit: item.unit,
            category: item.category,
            quantity: q,
            price: Math.round(item.price * ratio),
            protein: Math.round((item.protein ?? 0) * ratio),
          };
        }

        case "swap":
          if (!d.swapName || !(Number(d.swapPrice) > 0)) break; // fall through to keep
          return {
            ...base,
            action: "swap",
            name: d.swapName,
            replaces: item.name,
            unit: d.swapUnit || item.unit,
            category: item.category,
            quantity: item.quantity,
            price: Math.round(Number(d.swapPrice)),
            protein: Math.round(Number(d.swapProtein) || 0),
            estimated: true, // price is an AI estimate
          };
      }

      return {
        ...base,
        action: "keep",
        name: item.name,
        unit: item.unit,
        category: item.category,
        quantity: item.quantity,
        price: item.price,
        protein: item.protein ?? 0,
      };
    })
    .filter(Boolean);
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/optimise", async (req, res) => {
  const error = validateInput(req.body);
  if (error) return res.status(400).json({ error });

  const { items, budget } = req.body;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: JSON.stringify({
        budget,
        items: items.map(
          ({ id, name, quantity, unit, price, category, protein }) => ({
            id, name, quantity, unit, price, category, protein,
          })
        ),
      }),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const text = response.text;

    const parsed = parseJson(text);
    if (!Array.isArray(parsed.decisions)) throw new Error("Bad AI response shape");

    const optimised = applyDecisions(items, parsed.decisions);

    const originalCost = items.reduce((s, i) => s + i.price, 0);
    const optimisedCost = optimised.reduce((s, i) => s + i.price, 0);
    const originalProtein = items.reduce((s, i) => s + (i.protein ?? 0), 0);
    const optimisedProtein = optimised.reduce((s, i) => s + i.protein, 0);

    res.json({
      items: optimised,
      insights: Array.isArray(parsed.insights) ? parsed.insights.slice(0, 3) : [],
      summary: {
        budget,
        originalCost,
        optimisedCost,
        savings: Math.max(originalCost - optimisedCost, 0),
        originalProtein,
        optimisedProtein,
        withinBudget: optimisedCost <= budget,
      },
    });
  } catch (err) {
    console.error("Optimise failed:", err?.message || err);
    const status = (err?.status === 429 || /429|quota|RESOURCE_EXHAUSTED/i.test(String(err?.message))) ? 429 : 502;
    res.status(status).json({
      error:
        status === 429
          ? "Too many requests, please try again shortly."
          : "Could not optimise your list right now. Please try again.",
    });
  }
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));