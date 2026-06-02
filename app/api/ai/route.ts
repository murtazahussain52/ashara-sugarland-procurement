import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

async function authed() {
  const c = await cookies();
  return c.get("auth")?.value === "1";
}

export async function POST(req: NextRequest) {
  if (!(await authed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });

  const { items, mode } = await req.json();

  const systemPrompt = `You are a procurement expert for a non-profit NGO event called Ashara Sugarland. 
Your job is to analyze procurement items and suggest the CHEAPEST and most practical vendor for each item from this list: Amazon, Costco, Sam's Club, Walmart Business, Restaurant Depot, Home Depot, Best Buy, Target, Uline.

Rules:
- For bulk food/disposables → Restaurant Depot or Costco/Sam's Club
- For electronics/AV → Amazon usually beats Best Buy on price
- For cleaning/janitorial → Costco bulk or Uline for industrial
- For general supplies → Amazon or Walmart Business
- For construction/hardware → Home Depot
- Always consider that NGOs benefit from bulk pricing
- Give realistic estimated unit prices in USD based on current market rates
- Be concise and practical`;

  let userPrompt = "";

  if (mode === "single" && items.length === 1) {
    const item = items[0];
    userPrompt = `For this procurement item, suggest the cheapest vendor and estimate the unit price:
Item: "${item.name}"
Department: ${item.dept}
Current vendor: ${item.vendor}
Current price: ${item.price ? "$" + item.price : "unknown"}

Respond in this exact JSON format:
{
  "vendor": "vendor name",
  "estimatedPrice": 12.99,
  "savings": "saves ~$X vs current" or "best price available",
  "reasoning": "one sentence why",
  "alternativeVendor": "second best option",
  "alternativePrice": 14.99,
  "tip": "practical buying tip"
}`;
  } else {
    userPrompt = `Analyze these ${items.length} procurement items for an NGO event and suggest the cheapest vendor for each:

${items.map((i: any, idx: number) => `${idx + 1}. "${i.name}" (${i.dept}) - current: ${i.vendor}, price: ${i.price ? "$" + i.price : "unknown"}`).join("\n")}

Respond ONLY with a valid JSON array (no markdown, no extra text):
[
  {
    "itemName": "exact item name",
    "recommendedVendor": "vendor name",
    "estimatedPrice": 12.99,
    "currentPrice": null or number,
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
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Groq API error: ${err}` }, { status: 500 });
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || "";

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Could not parse AI response", raw: text }, { status: 500 });

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ result: parsed, mode });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
