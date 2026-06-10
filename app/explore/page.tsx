import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Recipe } from "@/lib/types";
import RecipeCard from "@/components/RecipeCard";
import RecipeSearch from "@/components/RecipeSearch";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let recipes: Recipe[] = [];

  if (query) {
    const { data: ingredientMatches } = await supabase
      .from("ingredients")
      .select("recipe_id")
      .ilike("name", `%${query}%`);

    const ingredientIds = (ingredientMatches ?? []).map((i) => i.recipe_id);

    let dbQuery = supabase
      .from("recipes")
      .select("*")
      .eq("is_public", true)
      .neq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (ingredientIds.length > 0) {
      dbQuery = dbQuery.or(
        `title.ilike.%${query}%,id.in.(${ingredientIds.join(",")})`
      );
    } else {
      dbQuery = dbQuery.ilike("title", `%${query}%`);
    }

    const { data } = await dbQuery;
    recipes = (data as Recipe[]) ?? [];
  } else {
    const { data } = await supabase
      .from("recipes")
      .select("*")
      .eq("is_public", true)
      .neq("user_id", user.id)
      .order("created_at", { ascending: false });
    recipes = (data as Recipe[]) ?? [];
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Explorar</h1>
            <p className="text-muted-foreground text-sm mt-1">Recetas públicas de otros usuarios</p>
          </div>
          <Link href="/recipes">
            <Button variant="outline">Mis recetas</Button>
          </Link>
        </div>

        <div className="mb-6">
          <Suspense>
            <RecipeSearch />
          </Suspense>
        </div>

        {recipes.length === 0 ? (
          <div className="text-center py-20">
            {query ? (
              <p className="text-muted-foreground text-lg">
                No se encontraron recetas públicas para <strong>&ldquo;{query}&rdquo;</strong>.
              </p>
            ) : (
              <p className="text-muted-foreground text-lg">
                Todavía no hay recetas públicas de otros usuarios.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
