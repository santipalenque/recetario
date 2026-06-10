"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Formik, Form } from "formik";
import { createClient } from "@/lib/supabase/client";
import {
  createRecipe, updateRecipe,
  deleteIngredients, insertIngredients,
  deleteSteps, insertSteps,
} from "@/utils/actions";
import type { RecipeWithDetails } from "@/lib/types";
import type { FormValues } from "./types";
import ImportSection from "./components/ImportSection";
import IngredientsSection from "./components/IngredientsSection";
import StepsSection from "./components/StepsSection";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

export default function RecipeForm({ recipe }: { recipe?: RecipeWithDetails }) {
  const router = useRouter();
  const isEditing = !!recipe;
  const [importing, setImporting] = useState(false);

  const initialValues: FormValues = {
    title: recipe?.title ?? "",
    description: recipe?.description ?? "",
    servings: recipe?.servings?.toString() ?? "4",
    prepTime: recipe?.prep_time_minutes?.toString() ?? "",
    cookTime: recipe?.cook_time_minutes?.toString() ?? "",
    sourceUrl: recipe?.source_url ?? "",
    isPublic: recipe?.is_public ?? false,
    ingredients: recipe?.ingredients.map((i) => ({
      name: i.name, amount: i.amount?.toString() ?? "", unit: i.unit ?? "CN",
    })) ?? [{ name: "", amount: "", unit: "CN" }],
    steps: recipe?.steps.map((s) => ({ description: s.description })) ?? [{ description: "" }],
  };

  async function handleSubmit(
    values: FormValues,
    { setSubmitting, setStatus }: { setSubmitting: (v: boolean) => void; setStatus: (s: string) => void }
  ) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const recipeData = {
      title: values.title.trim(),
      description: values.description.trim() || null,
      servings: values.servings ? parseInt(values.servings) : null,
      prep_time_minutes: values.prepTime ? parseInt(values.prepTime) : null,
      cook_time_minutes: values.cookTime ? parseInt(values.cookTime) : null,
      source_url: values.sourceUrl.trim() || null,
      is_public: values.isPublic,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    let recipeId = recipe?.id;

    if (isEditing) {
      const { error } = await updateRecipe(supabase, recipe!.id, recipeData);
      if (error) { setStatus(error.message); setSubmitting(false); return; }
    } else {
      const { data, error } = await createRecipe(supabase, recipeData);
      if (error) { setStatus(error.message); setSubmitting(false); return; }
      recipeId = data.id;
    }

    await deleteIngredients(supabase, recipeId!);
    await deleteSteps(supabase, recipeId!);

    const validIngredients = values.ingredients
      .filter((i) => i.name.trim())
      .map((i, idx) => ({
        recipe_id: recipeId!, name: i.name.trim(),
        amount: i.amount ? parseFloat(i.amount) : null,
        unit: i.unit || null, order_index: idx,
      }));

    const validSteps = values.steps
      .filter((s) => s.description.trim())
      .map((s, idx) => ({ recipe_id: recipeId!, description: s.description.trim(), order_index: idx }));

    if (validIngredients.length > 0) await insertIngredients(supabase, validIngredients);
    if (validSteps.length > 0) await insertSteps(supabase, validSteps);

    router.push(`/recipes/${recipeId}`);
    router.refresh();
  }

  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit}>
      {({ values, setFieldValue, isSubmitting, status }) => (
        <Box component={Form} sx={{ maxWidth: 680, mx: "auto", p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="h5" sx={{ fontWeight: "bold" }}>
              {isEditing ? "Editar receta" : "Nueva receta"}
            </Typography>
            <Button variant="text" onClick={() => router.back()}>Cancelar</Button>
          </Box>

          {status && <Alert severity="error">{status}</Alert>}

          <ImportSection importing={importing} onImportingChange={setImporting} />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, opacity: importing ? 0.5 : 1, pointerEvents: importing ? "none" : "auto", transition: "opacity 0.2s" }}>
            <Card variant="outlined">
              <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Información básica</Typography>
                <TextField label="Título *" value={values.title} onChange={(e) => setFieldValue("title", e.target.value)} placeholder="Ej: Milanesas a la napolitana" required size="small" fullWidth />
                <TextField label="Descripción" value={values.description} onChange={(e) => setFieldValue("description", e.target.value)} placeholder="Descripción breve..." multiline rows={3} size="small" fullWidth />
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
                  <TextField label="Porciones" type="number" slotProps={{ htmlInput: { min: 1 } }} value={values.servings} onChange={(e) => setFieldValue("servings", e.target.value)} size="small" />
                  <TextField label="Prep (min)" type="number" slotProps={{ htmlInput: { min: 0 } }} value={values.prepTime} onChange={(e) => setFieldValue("prepTime", e.target.value)} placeholder="15" size="small" />
                  <TextField label="Cocción (min)" type="number" slotProps={{ htmlInput: { min: 0 } }} value={values.cookTime} onChange={(e) => setFieldValue("cookTime", e.target.value)} placeholder="30" size="small" />
                </Box>
                <TextField label="URL de origen" type="url" value={values.sourceUrl} onChange={(e) => setFieldValue("sourceUrl", e.target.value)} placeholder="https://..." size="small" fullWidth />
                <FormControlLabel
                  control={<Switch checked={values.isPublic} onChange={(e) => setFieldValue("isPublic", e.target.checked)} color="success" />}
                  label={values.isPublic ? "Receta pública — otros usuarios pueden verla y agregarla" : "Receta privada"}
                />
              </CardContent>
            </Card>

            <IngredientsSection />
            <StepsSection />

            <Button type="submit" variant="contained" size="large" fullWidth disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear receta"}
            </Button>
          </Box>
        </Box>
      )}
    </Formik>
  );
}
