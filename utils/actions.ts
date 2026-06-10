import type { SupabaseClient } from "@supabase/supabase-js";

// ---- Types ----

export type RecipeData = {
  title: string;
  description: string | null;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  source_url: string | null;
  image_url?: string | null;
  is_public: boolean;
  tags?: string[];
  user_id: string;
  updated_at?: string;
};

export type IngredientRow = {
  recipe_id: string;
  name: string;
  amount: number | null;
  unit: string | null;
  order_index: number;
};

export type StepRow = {
  recipe_id: string;
  description: string;
  order_index: number;
};

// ---- Recipes ----

export const getRecipeWithDetails = (supabase: SupabaseClient, id: string) =>
  supabase.from("recipes").select("*, ingredients(*), steps(*)").eq("id", id).single();

export const getPublicRecipeWithDetails = (supabase: SupabaseClient, id: string) =>
  supabase.from("recipes").select("*, ingredients(*), steps(*)").eq("id", id).eq("is_public", true).single();

export const getRecipeForOwner = (supabase: SupabaseClient, recipeId: string, userId: string) =>
  supabase.from("recipes").select("id, title").eq("id", recipeId).eq("user_id", userId).single();

export const getUserRecipes = (supabase: SupabaseClient) =>
  supabase.from("recipes").select("*").order("created_at", { ascending: false });

export const getPublicRecipes = (supabase: SupabaseClient, userId: string) =>
  supabase.from("recipes").select("*").eq("is_public", true).neq("user_id", userId).order("created_at", { ascending: false });

export const searchIngredientIds = async (supabase: SupabaseClient, query: string): Promise<string[]> => {
  const { data } = await supabase.from("ingredients").select("recipe_id").ilike("name", `%${query}%`);
  return (data ?? []).map((i: { recipe_id: string }) => i.recipe_id);
};

export const searchUserRecipes = (supabase: SupabaseClient, userId: string, query: string, ingredientIds: string[]) => {
  const base = supabase.from("recipes").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  return ingredientIds.length > 0
    ? base.or(`title.ilike.%${query}%,id.in.(${ingredientIds.join(",")})`)
    : base.ilike("title", `%${query}%`);
};

export const searchPublicRecipes = (supabase: SupabaseClient, userId: string, query: string, ingredientIds: string[]) => {
  const base = supabase.from("recipes").select("*").eq("is_public", true).neq("user_id", userId).order("created_at", { ascending: false });
  return ingredientIds.length > 0
    ? base.or(`title.ilike.%${query}%,id.in.(${ingredientIds.join(",")})`)
    : base.ilike("title", `%${query}%`);
};

export const createRecipe = (supabase: SupabaseClient, data: RecipeData) =>
  supabase.from("recipes").insert(data).select().single();

export const updateRecipe = (supabase: SupabaseClient, id: string, data: Partial<RecipeData>) =>
  supabase.from("recipes").update(data).eq("id", id);

export const deleteRecipe = (supabase: SupabaseClient, id: string) =>
  supabase.from("recipes").delete().eq("id", id);

// ---- Ingredients & Steps ----

export const insertIngredients = (supabase: SupabaseClient, ingredients: IngredientRow[]) =>
  supabase.from("ingredients").insert(ingredients);

export const deleteIngredients = (supabase: SupabaseClient, recipeId: string) =>
  supabase.from("ingredients").delete().eq("recipe_id", recipeId);

export const insertSteps = (supabase: SupabaseClient, steps: StepRow[]) =>
  supabase.from("steps").insert(steps);

export const deleteSteps = (supabase: SupabaseClient, recipeId: string) =>
  supabase.from("steps").delete().eq("recipe_id", recipeId);

// ---- Sharing ----

export const getShareByToken = (supabase: SupabaseClient, token: string) =>
  supabase.from("recipe_shares").select("recipe_id, shared_by, shared_with_email").eq("token", token).single();

export const createRecipeShare = (supabase: SupabaseClient, data: { recipe_id: string; shared_by: string; shared_with_email: string }) =>
  supabase.from("recipe_shares").insert(data).select("token").single();

// ---- API fetch calls ----

export async function parseRecipeFromUrl(url: string) {
  const res = await fetch("/api/parse-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return res.json();
}

export async function shareRecipeByEmail(recipeId: string, recipientEmail: string) {
  const res = await fetch("/api/share-recipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipeId, recipientEmail }),
  });
  return { ok: res.ok, data: await res.json() };
}
