"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import type { Ingredient, Step } from "@/lib/types";

export async function cloneRecipe(recipeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: recipe } = await supabase
    .from("recipes")
    .select("*, ingredients(*), steps(*)")
    .eq("id", recipeId)
    .eq("is_public", true)
    .single();

  if (!recipe || recipe.user_id === user.id) return;

  const { data: newRecipe } = await supabase
    .from("recipes")
    .insert({
      user_id: user.id,
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings,
      prep_time_minutes: recipe.prep_time_minutes,
      cook_time_minutes: recipe.cook_time_minutes,
      source_url: recipe.source_url,
      image_url: recipe.image_url,
      is_public: false,
    })
    .select()
    .single();

  if (!newRecipe) return;

  const ingredients = [...(recipe.ingredients as Ingredient[])].sort(
    (a, b) => a.order_index - b.order_index
  );
  if (ingredients.length > 0) {
    await supabase.from("ingredients").insert(
      ingredients.map((ing, idx) => ({
        recipe_id: newRecipe.id,
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        order_index: idx,
      }))
    );
  }

  const steps = [...(recipe.steps as Step[])].sort(
    (a, b) => a.order_index - b.order_index
  );
  if (steps.length > 0) {
    await supabase.from("steps").insert(
      steps.map((step, idx) => ({
        recipe_id: newRecipe.id,
        description: step.description,
        order_index: idx,
      }))
    );
  }

  redirect(`/recipes/${newRecipe.id}`);
}

export async function cloneSharedRecipe(token: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Fetch share + recipe via service role (recipe may be private)
  const service = createServiceClient();
  const { data: share } = await service
    .from("recipe_shares")
    .select("recipe_id, shared_with_email")
    .eq("token", token)
    .single();

  if (!share) return;

  const { data: recipe } = await service
    .from("recipes")
    .select("*, ingredients(*), steps(*)")
    .eq("id", share.recipe_id)
    .single();

  if (!recipe || recipe.user_id === user.id) return;

  const { data: newRecipe } = await supabase
    .from("recipes")
    .insert({
      user_id: user.id,
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings,
      prep_time_minutes: recipe.prep_time_minutes,
      cook_time_minutes: recipe.cook_time_minutes,
      source_url: recipe.source_url,
      image_url: recipe.image_url,
      is_public: false,
    })
    .select()
    .single();

  if (!newRecipe) return;

  const ingredients = [...(recipe.ingredients as Ingredient[])].sort(
    (a, b) => a.order_index - b.order_index
  );
  if (ingredients.length > 0) {
    await supabase.from("ingredients").insert(
      ingredients.map((ing, idx) => ({
        recipe_id: newRecipe.id,
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        order_index: idx,
      }))
    );
  }

  const steps = [...(recipe.steps as Step[])].sort(
    (a, b) => a.order_index - b.order_index
  );
  if (steps.length > 0) {
    await supabase.from("steps").insert(
      steps.map((step, idx) => ({
        recipe_id: newRecipe.id,
        description: step.description,
        order_index: idx,
      }))
    );
  }

  redirect(`/recipes/${newRecipe.id}`);
}
