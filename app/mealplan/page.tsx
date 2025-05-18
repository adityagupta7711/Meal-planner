"use client";

interface DailyMealPlan {
  Breakfast?: string;
  Lunch?: string;
  Dinner?: string;
  Snacks?: string;
}

interface WeeklyMealPlan {
  [day: string]: DailyMealPlan;
}

interface MealPlanResponse {
  mealPlan?: WeeklyMealPlan;
  error?: string;
}

interface MealPlanInput {
  dietType: string;
  calories: number;
  allergies: string;
  cuisine: string;
  snacks: string;
  days?: number;
}

export default function MealPlanDashboard() {

    function handleSubmit(event: React.FormEvent<HTMLFormElement>){
        event.preventDefault()

        const formData = new FormData(event.currentTarget)

        const payload: MealPlanInput = {
                dietType: formData.get("dietType")?.toString() || "",
                calories: Number(formData.get("calories"))|| 2000,
                allergies: formData.get("allergies")?.toString() || "",
                cuisine: formData.get("cuisine")?.toString() || "",
                snacks: formData.get("snacks")?.toString() || "",
                days: 7,
        };

        console.log(payload)
    }

  return (
    <div>
      {" "}
      <div>
        {" "}
        <div>
          {" "}
          <h1>AI Meal Plan Generator</h1>
          <form onSubmit={handleSubmit}>
            <div>
            <label htmlFor="dietType">Diet Type</label>
            <input
              type="text"
              id="dietType"
              name="dietType"
              required
              placeholder="e.g. Vegetarian, Vegan, Keto, Mediterranean..."
            />
            </div>
            <div>
            <label htmlFor="calories">Daily Calorie Goal</label>
            <input
              type="number"
              id="calories"
              name="calories"
              required
              min={500}
              max={15000}
              placeholder="e.g. 2000"
            />
            </div>
            <div>
            <label htmlFor="allergies">Allergies</label>
            <input
              type="text"
              id="allergies"
              name="allergies"
              required
              placeholder="e.g. Nuts, Dairy, None..."
            />
            </div>
            <div>
            <label htmlFor="cuisine">Preferred Cuisine</label>
            <input
              type="text"
              id="cuisine"
              name="cuisine"
              required
              placeholder="e.g. Indian, Chinese, No preference..."
            />
            </div>
            <div>
            <input
              type="Checkbox"
              id="snacks"
              name="snacks"
            />
            <label htmlFor="snacks">Include Snacks</label>
            </div>

            //submit button
            <div>
                <button type="submit"> Generate Meal Plan</button>
            </div>
          </form>
        </div>
        <div>
            <h2>
                Weekly Meal Plan
            </h2>
        </div>
      </div>
    </div>
  );
}
