import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Recipe } from "@/lib/types";
import RecipeCard from "@/components/RecipeCard";
import { Button } from "@/components/ui/button";

export default async function RecipesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: recipes } = await supabase
    .from("recipes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Mis recetas</h1>
          <div className="flex gap-3">
            <Link href="/recipes/new">
              <Button>+ Nueva receta</Button>
            </Link>
            <form action="/auth/logout" method="POST">
              <Button variant="outline" type="submit">Salir</Button>
            </form>
          </div>
        </div>

        {!recipes || recipes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg mb-4">Todavía no tenés recetas.</p>
            <Link href="/recipes/new">
              <Button>Crear mi primera receta</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(recipes as Recipe[]).map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
