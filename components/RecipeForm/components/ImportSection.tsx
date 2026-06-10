"use client";

import { useState, useEffect, useRef } from "react";
import { useFormikContext } from "formik";
import { parseRecipeFromUrl } from "@/utils/actions";
import type { FormValues } from "../types";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import LinearProgress from "@mui/material/LinearProgress";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

type Props = {
  importing: boolean;
  onImportingChange: (v: boolean) => void;
};

export default function ImportSection({ importing, onImportingChange }: Props) {
  const { setValues } = useFormikContext<FormValues>();
  const [importUrl, setImportUrl] = useState("");
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

  async function handleImport() {
    if (!importUrl.trim()) return;
    onImportingChange(true);
    setImportError(null);
    try {
      const data = await parseRecipeFromUrl(importUrl.trim());
      if (data.error) { setImportError(data.error); return; }
      setValues((prev) => ({
        ...prev,
        title: data.title ?? prev.title,
        description: data.description ?? prev.description,
        servings: data.servings != null ? String(data.servings) : prev.servings,
        prepTime: data.prep_time_minutes != null ? String(data.prep_time_minutes) : prev.prepTime,
        cookTime: data.cook_time_minutes != null ? String(data.cook_time_minutes) : prev.cookTime,
        sourceUrl: importUrl.trim(),
        ingredients: data.ingredients?.length
          ? data.ingredients.map((i: { name: string; amount: number | null; unit: string | null }) => ({
              name: i.name, amount: i.amount != null ? String(i.amount) : "", unit: i.unit ?? "CN",
            }))
          : prev.ingredients,
        steps: data.steps?.length
          ? data.steps.map((s: { description: string }) => ({ description: s.description }))
          : prev.steps,
      }));
      setImportUrl("");
    } catch {
      setImportError("Error de red al importar");
    } finally {
      onImportingChange(false);
    }
  }

  return (
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
          <Button variant="contained" onClick={handleImport} disabled={importing || !importUrl.trim()} sx={{ whiteSpace: "nowrap" }}>
            {importing ? "Importando..." : "Importar"}
          </Button>
        </Box>
        {progress > 0 && <LinearProgress variant="determinate" value={progress} />}
        {importError && <Alert severity="error" sx={{ py: 0 }}>{importError}</Alert>}
      </CardContent>
    </Card>
  );
}
