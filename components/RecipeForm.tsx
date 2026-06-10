"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { IngredientInput, RecipeWithDetails, StepInput } from "@/lib/types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import LinearProgress from "@mui/material/LinearProgress";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";

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
            unit: i.unit ?? "CN",
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

    if (validIngredients.length > 0) await supabase.from("ingredients").insert(validIngredients);
    if (validSteps.length > 0) await supabase.from("steps").insert(validSteps);

    router.push(`/recipes/${recipeId}`);
    router.refresh();
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 680, mx: "auto", p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          {isEditing ? "Editar receta" : "Nueva receta"}
        </Typography>
        <Button variant="text" onClick={() => router.back()}>Cancelar</Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {/* URL importer */}
      <Card variant="outlined">
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Importar desde URL</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              type="url"
              placeholder="https://..."
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleImport())}
              disabled={importing}
              size="small"
              fullWidth
            />
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={importing || !importUrl.trim()}
              sx={{ whiteSpace: "nowrap" }}
            >
              {importing ? "Importando..." : "Importar"}
            </Button>
          </Box>
          {progress > 0 && <LinearProgress variant="determinate" value={progress} />}
          {importError && <Alert severity="error" sx={{ py: 0 }}>{importError}</Alert>}
        </CardContent>
      </Card>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, opacity: importing ? 0.5 : 1, pointerEvents: importing ? "none" : "auto", transition: "opacity 0.2s" }}>

        {/* Basic info */}
        <Card variant="outlined">
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Información básica</Typography>
            <TextField
              label="Título *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Milanesas a la napolitana"
              required
              size="small"
              fullWidth
            />
            <TextField
              label="Descripción"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción breve de la receta..."
              multiline
              rows={3}
              size="small"
              fullWidth
            />
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
              <TextField
                label="Porciones"
                type="number"
                slotProps={{ htmlInput: { min: 1 } }}
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                size="small"
              />
              <TextField
                label="Prep (min)"
                type="number"
                slotProps={{ htmlInput: { min: 0 } }}
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="15"
                size="small"
              />
              <TextField
                label="Cocción (min)"
                type="number"
                slotProps={{ htmlInput: { min: 0 } }}
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                placeholder="30"
                size="small"
              />
            </Box>
            <TextField
              label="URL de origen"
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              size="small"
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  color="success"
                />
              }
              label={isPublic ? "Receta pública — otros usuarios pueden verla y agregarla" : "Receta privada"}
            />
          </CardContent>
        </Card>

        {/* Ingredients */}
        <Card variant="outlined">
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Ingredientes</Typography>
            {ingredients.map((ing, idx) => (
              <Box key={idx} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                <TextField
                  placeholder="Ingrediente"
                  value={ing.name}
                  onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <TextField
                  placeholder="Cant."
                  value={ing.amount}
                  onChange={(e) => updateIngredient(idx, "amount", e.target.value)}
                  size="small"
                  sx={{ width: 90 }}
                />
                <TextField
                  select
                  value={ing.unit}
                  onChange={(e) => updateIngredient(idx, "unit", e.target.value)}
                  size="small"
                  sx={{ width: 110 }}
                >
                  {UNITS.map((u) => (
                    <MenuItem key={u} value={u}>{u}</MenuItem>
                  ))}
                </TextField>
                <IconButton
                  size="small"
                  onClick={() => removeIngredient(idx)}
                  disabled={ingredients.length === 1}
                  sx={{ mt: 0.5 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={addIngredient} sx={{ alignSelf: "flex-start" }}>
              Agregar ingrediente
            </Button>
          </CardContent>
        </Card>

        {/* Steps */}
        <Card variant="outlined">
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Pasos</Typography>
            {steps.map((step, idx) => (
              <Box key={idx} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, minWidth: 24, fontWeight: 600 }}>
                  {idx + 1}.
                </Typography>
                <TextField
                  placeholder={`Paso ${idx + 1}...`}
                  value={step.description}
                  onChange={(e) => updateStep(idx, e.target.value)}
                  multiline
                  rows={2}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <IconButton
                  size="small"
                  onClick={() => removeStep(idx)}
                  disabled={steps.length === 1}
                  sx={{ mt: 0.5 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={addStep} sx={{ alignSelf: "flex-start" }}>
              Agregar paso
            </Button>
          </CardContent>
        </Card>

        <Button type="submit" variant="contained" size="large" fullWidth disabled={saving}>
          {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear receta"}
        </Button>

      </Box>
    </Box>
  );
}
