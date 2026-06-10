"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import type { Ingredient, Step } from "@/lib/types";
import {
  getPublicRecipeWithDetails,
  getShareByToken,
  getRecipeWithDetails,
  createRecipe,
  insertIngredients,
  insertSteps,
} from "@/utils/actions";

export async function cloneRecipe(recipeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: recipe } = await getPublicRecipeWithDetails(supabase, recipeId);
  if (!recipe || recipe.user_id === user.id) return;

  const { data: newRecipe } = await createRecipe(supabase, {
    user_id: user.id,
    title: recipe.title,
    description: recipe.description,
    servings: recipe.servings,
    prep_time_minutes: recipe.prep_time_minutes,
    cook_time_minutes: recipe.cook_time_minutes,
    source_url: recipe.source_url,
    image_url: recipe.image_url,
    is_public: false,
  });
  if (!newRecipe) return;

  const sortedIngredients = [...(recipe.ingredients as Ingredient[])].sort(
    (a, b) => a.order_index - b.order_index
  );
  if (sortedIngredients.length > 0) {
    await insertIngredients(supabase, sortedIngredients.map((ing, idx) => ({
      recipe_id: newRecipe.id,
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      order_index: idx,
    })));
  }

  const sortedSteps = [...(recipe.steps as Step[])].sort(
    (a, b) => a.order_index - b.order_index
  );
  if (sortedSteps.length > 0) {
    await insertSteps(supabase, sortedSteps.map((step, idx) => ({
      recipe_id: newRecipe.id,
      description: step.description,
      order_index: idx,
    })));
  }

  redirect(`/recipes/${newRecipe.id}`);
}

export async function cloneSharedRecipe(token: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const service = createServiceClient();
  const { data: share } = await getShareByToken(service, token);
  if (!share) return;

  const { data: recipe } = await getRecipeWithDetails(service, share.recipe_id);
  if (!recipe || recipe.user_id === user.id) return;

  const { data: newRecipe } = await createRecipe(supabase, {
    user_id: user.id,
    title: recipe.title,
    description: recipe.description,
    servings: recipe.servings,
    prep_time_minutes: recipe.prep_time_minutes,
    cook_time_minutes: recipe.cook_time_minutes,
    source_url: recipe.source_url,
    image_url: recipe.image_url,
    is_public: false,
  });
  if (!newRecipe) return;

  const sortedIngredients = [...(recipe.ingredients as Ingredient[])].sort(
    (a, b) => a.order_index - b.order_index
  );
  if (sortedIngredients.length > 0) {
    await insertIngredients(supabase, sortedIngredients.map((ing, idx) => ({
      recipe_id: newRecipe.id,
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      order_index: idx,
    })));
  }

  const sortedSteps = [...(recipe.steps as Step[])].sort(
    (a, b) => a.order_index - b.order_index
  );
  if (sortedSteps.length > 0) {
    await insertSteps(supabase, sortedSteps.map((step, idx) => ({
      recipe_id: newRecipe.id,
      description: step.description,
      order_index: idx,
    })));
  }

  redirect(`/recipes/${newRecipe.id}`);
}
