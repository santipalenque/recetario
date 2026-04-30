import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { RecipeWithDetails } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DeleteRecipeButton from "@/components/DeleteRecipeButton";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: recipe } = await supabase
    .from("recipes")
    .select("*, ingredients(*), steps(*)")
    .eq("id", id)
    .single();

  if (!recipe) notFound();

  const r = recipe as RecipeWithDetails;
  const ingredients = [...r.ingredients].sort((a, b) => a.order_index - b.order_index);
  const steps = [...r.steps].sort((a, b) => a.order_index - b.order_index);
  const totalTime = (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/recipes">
            <Button variant="ghost">← Volver</Button>
          </Link>
          <div className="flex gap-2">
            <Link href={`/recipes/${id}/edit`}>
              <Button variant="outline">Editar</Button>
            </Link>
            <DeleteRecipeButton recipeId={id} />
          </div>
        </div>

        {/* Image */}
        {r.image_url && (
          <img
            src={r.image_url}
            alt={r.title}
            className="w-full h-64 object-cover rounded-lg"
          />
        )}

        {/* Title & meta */}
        <div>
          <h1 className="text-3xl font-bold mb-3">{r.title}</h1>
          <div className="flex gap-2 flex-wrap">
            {r.servings && <Badge variant="secondary">{r.servings} porciones</Badge>}
            {r.prep_time_minutes && <Badge variant="secondary">Prep: {r.prep_time_minutes} min</Badge>}
            {r.cook_time_minutes && <Badge variant="secondary">Cocción: {r.cook_time_minutes} min</Badge>}
            {totalTime > 0 && <Badge>Total: {totalTime} min</Badge>}
          </div>
          {r.description && (
            <p className="mt-3 text-muted-foreground">{r.description}</p>
          )}
          {r.source_url && (
            <a
              href={r.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 underline mt-1 block"
            >
              Ver receta original
            </a>
          )}
        </div>

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-3">Ingredientes</h2>
            <ul className="space-y-1">
              {ingredients.map((ing) => (
                <li key={ing.id} className="flex gap-2">
                  <span className="font-medium">
                    {ing.amount && `${ing.amount} `}{ing.unit && `${ing.unit} `}
                  </span>
                  <span>{ing.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Steps */}
        {steps.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-3">Preparación</h2>
            <ol className="space-y-4">
              {steps.map((step, idx) => (
                <li key={step.id} className="flex gap-3">
                  <span className="font-bold text-muted-foreground shrink-0">{idx + 1}.</span>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
