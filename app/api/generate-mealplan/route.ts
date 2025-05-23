import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

interface DailyMealPlan {
  Breakfast?: string;
  Lunch?: string;
  Dinner?: string;
  Snacks?: string;
}

const openAI = new OpenAI({
  apiKey: process.env.OPEN_ROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// Optional: Retry helper for rate-limited calls
async function retry<T>(fn: () => Promise<T>, retries = 2, delay = 2000): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (i === retries || err.status !== 429) throw err;
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error("Retry function failed unexpectedly.");
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { dietType, calories, allergies, cuisine, snacks } = await request.json();

    const prompt = `
      You are a professional nutritionist. Create a 7-day meal plan for an individual following a ${dietType} diet aiming for ${calories} calories per day.
      
      Allergies or restrictions: ${allergies || "none"}.
      Preferred cuisine: ${cuisine || "no preference"}.
      Snacks included: ${snacks ? "yes" : "no"}.
      
      For each day, provide:
        - Breakfast
        - Lunch
        - Dinner
        ${snacks ? "- Snacks" : ""}
      
      Use simple ingredients and provide brief instructions. Include approximate calorie counts for each meal.
      
      Structure the response as a JSON object where each day is a key, and each meal (breakfast, lunch, dinner, snacks) is a sub-key. Example:
      
      {
        "Monday": {
          "Breakfast": "Oatmeal with fruits - 350 calories",
          "Lunch": "Grilled chicken salad - 500 calories",
          "Dinner": "Steamed vegetables with quinoa - 600 calories",
          "Snacks": "Greek yogurt - 150 calories"
        },
        ...
      }

      Return just the JSON with no extra commentaries and no backticks.
    `;

    // Use retry to avoid 429 rate-limit errors
    const response = await retry(() =>
      openAI.chat.completions.create({
        model: "meta-llama/llama-3.2-3b-instruct:free",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      })
    );

    let aiContent = response.choices[0].message.content?.trim() || "";

    // Remove ```json or ``` and trim whitespace
    aiContent = aiContent.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();

    let parsedMealPlan: { [day: string]: DailyMealPlan };

    try {
      parsedMealPlan = JSON.parse(aiContent);
    } catch (parseError) {
      console.error("Error parsing AI response as JSON:", parseError);
      return NextResponse.json(
        { error: "Failed to parse meal plan. Please try again." },
        { status: 500 }
      );
    }

    if (typeof parsedMealPlan !== "object" || parsedMealPlan === null) {
      return NextResponse.json(
        { error: "Failed to parse meal plan. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ mealPlan: parsedMealPlan });

  } catch (error: any) {
    console.error("Error generating meal plan:", error);

    // Handle rate limit error
    if (error.status === 429) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate meal plan. Please try again later." },
      { status: 500 }
    );
  }
}
