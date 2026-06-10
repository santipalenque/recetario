import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import type { RecipeWithDetails } from "@/lib/types";
import { getRecipeWithDetails } from "@/utils/actions";
import RecipeForm from "@/components/RecipeForm";

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: recipe } = await getRecipeWithDetails(supabase, id);
  if (!recipe) notFound();

  const r = recipe as RecipeWithDetails;
  r.ingredients = [...r.ingredients].sort((a, b) => a.order_index - b.order_index);
  r.steps = [...r.steps].sort((a, b) => a.order_index - b.order_index);

  return <RecipeForm recipe={r} />;
}
