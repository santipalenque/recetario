"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Formik, Form, FieldArray } from "formik";
import { createClient } from "@/lib/supabase/client";
import type { RecipeWithDetails } from "@/lib/types";
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

interface FormValues {
  title: string;
  description: string;
  servings: string;
  prepTime: string;
  cookTime: string;
  sourceUrl: string;
  isPublic: boolean;
  ingredients: { name: string; amount: string; unit: string }[];
  steps: { description: string }[];
}

export default function RecipeForm({ recipe }: { recipe?: RecipeWithDetails }) {
  const router = useRouter();
  const isEditing = !!recipe;

  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (importing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProgress(0);
      progressInterval.current = setInterval(() => {
        setProgress((p) => p + (85 - p) * 0.06);
      }, 200);
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
      setProgress(100);
      const t = setTimeout(() => setProgress(0), 400);
      return () => clearTimeout(t);
    }
    return () => { if (progressInterval.current) clearInterval(progressInterval.current); };
  }, [importing]);

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
      const { error } = await supabase.from("recipes").update(recipeData).eq("id", recipe!.id);
      if (error) { setStatus(error.message); setSubmitting(false); return; }
    } else {
      const { data, error } = await supabase.from("recipes").insert(recipeData).select().single();
      if (error) { setStatus(error.message); setSubmitting(false); return; }
      recipeId = data.id;
    }

    await supabase.from("ingredients").delete().eq("recipe_id", recipeId!);
    await supabase.from("steps").delete().eq("recipe_id", recipeId!);

    const validIngredients = values.ingredients
      .filter((i) => i.name.trim())
      .map((i, idx) => ({ recipe_id: recipeId!, name: i.name.trim(), amount: i.amount ? parseFloat(i.amount) : null, unit: i.unit || null, order_index: idx }));

    const validSteps = values.steps
      .filter((s) => s.description.trim())
      .map((s, idx) => ({ recipe_id: recipeId!, description: s.description.trim(), order_index: idx }));

    if (validIngredients.length > 0) await supabase.from("ingredients").insert(validIngredients);
    if (validSteps.length > 0) await supabase.from("steps").insert(validSteps);

    router.push(`/recipes/${recipeId}`);
    router.refresh();
  }

  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit}>
      {({ values, setFieldValue, setValues, isSubmitting, status }) => {

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
            if (!res.ok || data.error) { setImportError(data.error ?? "Error al importar"); return; }
            setValues((prev) => ({
              ...prev,
              title: data.title ?? prev.title,
              description: data.description ?? prev.description,
              servings: data.servings != null ? String(data.servings) : prev.servings,
              prepTime: data.prep_time_minutes != null ? String(data.prep_time_minutes) : prev.prepTime,
              cookTime: data.cook_time_minutes != null ? String(data.cook_time_minutes) : prev.cookTime,
              sourceUrl: importUrl.trim(),
              ingredients: data.ingredients?.length
                ? data.ingredients.map((i: { name: string; amount: number | null; unit: string | null }) => ({ name: i.name, amount: i.amount != null ? String(i.amount) : "", unit: i.unit ?? "CN" }))
                : prev.ingredients,
              steps: data.steps?.length
                ? data.steps.map((s: { description: string }) => ({ description: s.description }))
                : prev.steps,
            }));
            setImportUrl("");
          } catch {
            setImportError("Error de red al importar");
          } finally {
            setImporting(false);
          }
        }

        return (
          <Box component={Form} sx={{ maxWidth: 680, mx: "auto", p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                {isEditing ? "Editar receta" : "Nueva receta"}
              </Typography>
              <Button variant="text" onClick={() => router.back()}>Cancelar</Button>
            </Box>

            {status && <Alert severity="error">{status}</Alert>}

            <Card variant="outlined">
              <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Importar desde URL</Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField type="url" placeholder="https://..." value={importUrl} onChange={(e) => setImportUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleImport())} disabled={importing} size="small" fullWidth />
                  <Button variant="contained" onClick={handleImport} disabled={importing || !importUrl.trim()} sx={{ whiteSpace: "nowrap" }}>
                    {importing ? "Importando..." : "Importar"}
                  </Button>
                </Box>
                {progress > 0 && <LinearProgress variant="determinate" value={progress} />}
                {importError && <Alert severity="error" sx={{ py: 0 }}>{importError}</Alert>}
              </CardContent>
            </Card>

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

              <Card variant="outlined">
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Ingredientes</Typography>
                  <FieldArray name="ingredients">
                    {({ push, remove }) => (
                      <>
                        {values.ingredients.map((ing, idx) => (
                          <Box key={idx} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                            <TextField placeholder="Ingrediente" value={ing.name} onChange={(e) => setFieldValue(`ingredients.${idx}.name`, e.target.value)} size="small" sx={{ flex: 1 }} />
                            <TextField placeholder="Cant." value={ing.amount} onChange={(e) => setFieldValue(`ingredients.${idx}.amount`, e.target.value)} size="small" sx={{ width: 90 }} />
                            <TextField select value={ing.unit} onChange={(e) => setFieldValue(`ingredients.${idx}.unit`, e.target.value)} size="small" sx={{ width: 110 }}>
                              {UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                            </TextField>
                            <IconButton size="small" onClick={() => remove(idx)} disabled={values.ingredients.length === 1} sx={{ mt: 0.5 }}>
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                        <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => push({ name: "", amount: "", unit: "CN" })} sx={{ alignSelf: "flex-start" }}>
                          Agregar ingrediente
                        </Button>
                      </>
                    )}
                  </FieldArray>
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Pasos</Typography>
                  <FieldArray name="steps">
                    {({ push, remove }) => (
                      <>
                        {values.steps.map((step, idx) => (
                          <Box key={idx} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, minWidth: 24, fontWeight: 600 }}>{idx + 1}.</Typography>
                            <TextField placeholder={`Paso ${idx + 1}...`} value={step.description} onChange={(e) => setFieldValue(`steps.${idx}.description`, e.target.value)} multiline rows={2} size="small" sx={{ flex: 1 }} />
                            <IconButton size="small" onClick={() => remove(idx)} disabled={values.steps.length === 1} sx={{ mt: 0.5 }}>
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                        <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => push({ description: "" })} sx={{ alignSelf: "flex-start" }}>
                          Agregar paso
                        </Button>
                      </>
                    )}
                  </FieldArray>
                </CardContent>
              </Card>

              <Button type="submit" variant="contained" size="large" fullWidth disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear receta"}
              </Button>
            </Box>
          </Box>
        );
      }}
    </Formik>
  );
}
