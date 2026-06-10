"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { IngredientInput, RecipeWithDetails, StepInput } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const UNITS = ["CN", "unidades", "kg", "g", "lt", "ml", "cdas", "taza", "lata"] as const;

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
  const [isPublic, setIsPublic] = useState(recipe?.is_public ?? false);

  const [ingredients, setIngredients] = useState<IngredientInput[]>(
    recipe?.ingredients.map((i) => ({
      name: i.name,
      amount: i.amount?.toString() ?? "",
      unit: i.unit ?? "CN",
    })) ?? [{ name: "", amount: "", unit: "CN" }]
  );

  const [steps, setSteps] = useState<StepInput[]>(
    recipe?.steps.map((s) => ({ description: s.description })) ?? [{ description: "" }]
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (importing) {
      setProgress(0);
      progressInterval.current = setInterval(() => {
        setProgress((p) => {
          // Ease toward 85%, slowing as it approaches
          const remaining = 85 - p;
          return p + remaining * 0.06;
        });
      }, 200);
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
      setProgress(100);
      const t = setTimeout(() => setProgress(0), 400);
      return () => clearTimeout(t);
    }
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [importing]);

  async function handleImport() {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportError(null);
    try {
      const res = await fetch("/api/parse-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setImportError(data.error ?? "Error al importar");
        return;
      }
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.servings != null) setServings(String(data.servings));
      if (data.prep_time_minutes != null) setPrepTime(String(data.prep_time_minutes));
      if (data.cook_time_minutes != null) setCookTime(String(data.cook_time_minutes));
      if (data.ingredients?.length) {
        setIngredients(
          data.ingredients.map((i: { name: string; amount: number | null; unit: string | null }) => ({
            name: i.name,
            amount: i.amount != null ? String(i.amount) : "",
            unit: i.unit ?? "",
          }))
        );
      }
      if (data.steps?.length) {
        setSteps(data.steps.map((s: { description: string }) => ({ description: s.description })));
      }
      setSourceUrl(importUrl.trim());
      setImportUrl("");
    } catch {
      setImportError("Error de red al importar");
    } finally {
      setImporting(false);
    }
  }

  function addIngredient() {
    setIngredients([...ingredients, { name: "", amount: "", unit: "CN" }]);
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
      is_public: isPublic,
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

      {/* URL importer */}
      <Card>
        <CardHeader><CardTitle>Importar desde URL</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://..."
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleImport())}
              disabled={importing}
            />
            <Button type="button" onClick={handleImport} disabled={importing || !importUrl.trim()}>
              {importing ? "Importando..." : "Importar"}
            </Button>
          </div>
          {/* Progress bar */}
          {progress > 0 && (
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-200 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          {importError && <p className="text-sm text-red-500">{importError}</p>}
        </CardContent>
      </Card>

      {/* Disable all form fields while importing */}
      <div
        className={`space-y-6 transition-opacity duration-200 ${importing ? "opacity-50 pointer-events-none select-none" : ""}`}
      >

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
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              role="checkbox"
              aria-checked={isPublic}
              onClick={() => setIsPublic(!isPublic)}
              className={`relative w-10 h-6 rounded-full transition-colors ${isPublic ? "bg-green-500" : "bg-muted-foreground/30"}`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublic ? "translate-x-4" : "translate-x-0"}`}
              />
            </div>
            <span className="text-sm font-medium">
              {isPublic ? "Receta pública — otros usuarios pueden verla y agregarla" : "Receta privada"}
            </span>
          </label>
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
              <select
                className="w-28 h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={ing.unit}
                onChange={(e) => updateIngredient(idx, "unit", e.target.value)}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
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

      </div>
    </form>
  );
}
