import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

async function authed() {
  const c = await cookies();
  return c.get("auth")?.value === "1";
}

export async function POST(req: NextRequest) {
  if (!(await authed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return NextResponse.json({ error: "GROQ_API_KEY not configured in Vercel environment variables." }, { status: 500 });

  const { items, mode, dept } = await req.json();

  const systemPrompt = `You are a procurement expert for Ashara Sugarland, a non-profit NGO event in Houston, Texas.
You analyze procurement items and recommend the CHEAPEST, most practical vendor from this approved list:
- Amazon (best for: electronics, cables, misc supplies, anything under $50)
- Costco (best for: bulk food, paper goods, cleaning, medical, large quantities)
- Sam's Club (best for: bulk food, beverages, snacks, similar to Costco)
- Walmart Business (best for: general supplies, volume orders, everyday items)
- Restaurant Depot (best for: commercial food, disposables, serving supplies, beverages)
- Home Depot (best for: hardware, tools, extension cords, barriers, construction)
- Best Buy (best for: premium electronics, cameras, AV equipment, warranties)
- Target (best for: décor, children's items, basic electronics)
- Uline (best for: industrial packaging, trash bags, janitorial, safety equipment)

Key rules:
- NGOs get Costco Business membership pricing — factor that in
- For food/beverage in bulk: Restaurant Depot > Sam's Club > Costco
- For electronics: Amazon usually 15-30% cheaper than Best Buy
- For cables/AV accessories: Amazon almost always cheapest
- For janitorial/cleaning in bulk: Uline or Costco
- For children's activities: Target or Amazon
- Always provide realistic 2026 US market price estimates
- Respond ONLY with valid JSON, no markdown, no extra text`;

  let userPrompt = "";

  if (mode === "single") {
    const item = items[0];
    userPrompt = `Analyze this single procurement item for the cheapest vendor:
Item: "${item.name}"
Department: ${item.dept}
Quantity needed: ${item.qty} ${item.unit || "units"}
Current vendor: ${item.vendor}
Current price: ${item.price ? "$" + item.price + " per unit" : "not set"}

Return ONLY this JSON:
{
  "vendor": "cheapest vendor name",
  "estimatedPrice": 12.99,
  "savings": "saves ~$X vs [current vendor]" or "best price available",
  "reasoning": "one clear sentence explaining why this vendor is cheapest",
  "alternativeVendor": "second best option",
  "alternativePrice": 14.99,
  "tip": "one practical buying tip for an NGO (bulk deals, membership, etc)"
}`;

  } else if (mode === "dept") {
    userPrompt = `Analyze ALL procurement items for the "${dept}" department of an NGO event.
For each item, find the single cheapest vendor and estimate the unit price.

Items to analyze:
${items.map((i: any, idx: number) => `${idx + 1}. "${i.name}" | qty: ${i.qty} ${i.unit || ""} | current vendor: ${i.vendor} | current price: ${i.price ? "$" + i.price : "unknown"}`).join("\n")}

Return ONLY a JSON array (no markdown):
[
  {
    "itemName": "exact item name from above",
    "recommendedVendor": "vendor name",
    "estimatedPrice": 12.99,
    "currentPrice": null,
    "savingsNote": "saves ~$X" or "already optimal" or "no current price set",
    "reasoning": "brief reason (max 8 words)",
    "alternativeVendor": "second option",
    "alternativePrice": 14.99
  }
]`;

  } else {
    // bulk - all items
    userPrompt = `Analyze these ${items.length} procurement items across all departments for an NGO event. Find cheapest vendor for each.

${items.map((i: any, idx: number) => `${idx + 1}. "${i.name}" (${i.dept}) | qty: ${i.qty} ${i.unit || ""} | current: ${i.vendor} @ ${i.price ? "$" + i.price : "unknown"}`).join("\n")}

Return ONLY a JSON array:
[
  {
    "itemName": "exact item name",
    "recommendedVendor": "vendor name",
    "estimatedPrice": 12.99,
    "currentPrice": null,
    "savingsNote": "saves ~$X" or "already optimal",
    "reasoning": "brief reason"
  }
]`;
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Groq API error: ${err}` }, { status: 500 });
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || "";
    const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Could not parse AI response", raw: text }, { status: 500 });
    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ result: parsed, mode });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
