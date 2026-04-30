"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { IngredientInput, RecipeWithDetails, StepInput } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  recipe?: RecipeWithDetails;
};

export default function RecipeForm({ recipe }: Props) {
  const router = useRouter();
  const isEditing = !!recipe;

  const [title, setTitle] = useState(recipe?.title ?? "");
  const [description, setDescription] = useState(recipe?.description ?? "");
  const [servings, setServings] = useState(recipe?.servings?.toString() ?? "4");
  const [prepTime, setPrepTime] = useState(recipe?.prep_time_minutes?.toString() ?? "");
  const [cookTime, setCookTime] = useState(recipe?.cook_time_minutes?.toString() ?? "");
  const [sourceUrl, setSourceUrl] = useState(recipe?.source_url ?? "");

  const [ingredients, setIngredients] = useState<IngredientInput[]>(
    recipe?.ingredients.map((i) => ({
      name: i.name,
      amount: i.amount?.toString() ?? "",
      unit: i.unit ?? "",
    })) ?? [{ name: "", amount: "", unit: "" }]
  );

  const [steps, setSteps] = useState<StepInput[]>(
    recipe?.steps.map((s) => ({ description: s.description })) ?? [{ description: "" }]
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addIngredient() {
    setIngredients([...ingredients, { name: "", amount: "", unit: "" }]);
  }

  function removeIngredient(index: number) {
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  function updateIngredient(index: number, field: keyof IngredientInput, value: string) {
    setIngredients(ingredients.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)));
  }

  function addStep() {
    setSteps([...steps, { description: "" }]);
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index));
  }

  function updateStep(index: number, value: string) {
    setSteps(steps.map((s, i) => (i === index ? { description: value } : s)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const recipeData = {
      title: title.trim(),
      description: description.trim() || null,
      servings: servings ? parseInt(servings) : null,
      prep_time_minutes: prepTime ? parseInt(prepTime) : null,
      cook_time_minutes: cookTime ? parseInt(cookTime) : null,
      source_url: sourceUrl.trim() || null,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    let recipeId = recipe?.id;

    if (isEditing) {
      const { error } = await supabase.from("recipes").update(recipeData).eq("id", recipe!.id);
      if (error) { setError(error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("recipes").insert(recipeData).select().single();
      if (error) { setError(error.message); setSaving(false); return; }
      recipeId = data.id;
    }

    // Replace ingredients and steps
    await supabase.from("ingredients").delete().eq("recipe_id", recipeId!);
    await supabase.from("steps").delete().eq("recipe_id", recipeId!);

    const validIngredients = ingredients
      .filter((i) => i.name.trim())
      .map((i, idx) => ({
        recipe_id: recipeId!,
        name: i.name.trim(),
        amount: i.amount ? parseFloat(i.amount) : null,
        unit: i.unit.trim() || null,
        order_index: idx,
      }));

    const validSteps = steps
      .filter((s) => s.description.trim())
      .map((s, idx) => ({
        recipe_id: recipeId!,
        description: s.description.trim(),
        order_index: idx,
      }));

    if (validIngredients.length > 0) {
      await supabase.from("ingredients").insert(validIngredients);
    }
    if (validSteps.length > 0) {
      await supabase.from("steps").insert(validSteps);
    }

    router.push(`/recipes/${recipeId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEditing ? "Editar receta" : "Nueva receta"}</h1>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded">{error}</p>}

      {/* Basic info */}
      <Card>
        <CardHeader><CardTitle>Información básica</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Milanesas a la napolitana"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción breve de la receta..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="servings">Porciones</Label>
              <Input
                id="servings"
                type="number"
                min="1"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prep">Prep (min)</Label>
              <Input
                id="prep"
                type="number"
                min="0"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="15"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cook">Cocción (min)</Label>
              <Input
                id="cook"
                type="number"
                min="0"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                placeholder="30"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">URL de origen</Label>
            <Input
              id="source"
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Ingredients */}
      <Card>
        <CardHeader><CardTitle>Ingredientes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {ingredients.map((ing, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                className="flex-1"
                placeholder="Ingrediente"
                value={ing.name}
                onChange={(e) => updateIngredient(idx, "name", e.target.value)}
              />
              <Input
                className="w-24"
                placeholder="Cant."
                value={ing.amount}
                onChange={(e) => updateIngredient(idx, "amount", e.target.value)}
              />
              <Input
                className="w-24"
                placeholder="Unidad"
                value={ing.unit}
                onChange={(e) => updateIngredient(idx, "unit", e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeIngredient(idx)}
                disabled={ingredients.length === 1}
              >
                ✕
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
            + Agregar ingrediente
          </Button>
        </CardContent>
      </Card>

      {/* Steps */}
      <Card>
        <CardHeader><CardTitle>Pasos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <span className="mt-2 text-sm font-medium text-muted-foreground w-6 shrink-0">
                {idx + 1}.
              </span>
              <Textarea
                className="flex-1"
                placeholder={`Paso ${idx + 1}...`}
                value={step.description}
                onChange={(e) => updateStep(idx, e.target.value)}
                rows={2}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeStep(idx)}
                disabled={steps.length === 1}
              >
                ✕
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addStep}>
            + Agregar paso
          </Button>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear receta"}
      </Button>
    </form>
  );
}
