export type Recipe = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  image_url: string | null;
  source_url: string | null;
  is_public: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type Ingredient = {
  id: string;
  recipe_id: string;
  name: string;
  amount: number | null;
  unit: string | null;
  order_index: number;
};

export type Step = {
  id: string;
  recipe_id: string;
  description: string;
  order_index: number;
};

export type RecipeWithDetails = Recipe & {
  ingredients: Ingredient[];
  steps: Step[];
};

export type MenuPreferences = {
  max_time_minutes: number | null;
  max_red_meat: number;
  min_fish: number;
  min_vegetarian: number;
  max_carbs: number;
  diet_flags: string[];
};

export type WeeklyMenu = {
  id: string;
  user_id: string;
  week_start: string;
  preferences: MenuPreferences;
  created_at: string;
};

export type MenuItem = {
  id: string;
  menu_id: string;
  day: number;
  slot: "almuerzo" | "cena";
  recipe_id: string | null;
};

export type MenuItemWithRecipe = MenuItem & {
  recipe: Recipe | null;
};

export type WeeklyMenuWithItems = WeeklyMenu & {
  menu_items: MenuItemWithRecipe[];
};

export type IngredientInput = {
  name: string;
  amount: string;
  unit: string;
};

export type StepInput = {
  description: string;
};
