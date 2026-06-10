"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MenuPreferences } from "@/lib/types";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

const TIME_OPTIONS = [
  { value: 0, label: "Sin límite" },
  { value: 30, label: "30 minutos" },
  { value: 45, label: "45 minutos" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1.5 horas" },
];

const DIET_FLAGS = ["vegetariano", "vegano", "sin gluten", "sin lácteos"];

export default function MenuGenerator({ initialPrefs }: { initialPrefs: MenuPreferences }) {
  const router = useRouter();
  const [prefs, setPrefs] = useState<MenuPreferences>(initialPrefs);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof MenuPreferences>(key: K, value: MenuPreferences[K]) {
    setPrefs(prev => ({ ...prev, [key]: value }));
  }

  function toggleFlag(flag: string) {
    set("diet_flags", prefs.diet_flags.includes(flag)
      ? prefs.diet_flags.filter(f => f !== flag)
      : [...prefs.diet_flags, flag]);
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: prefs }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.push(`/menu/${data.menuId}`);
      router.refresh();
    } catch {
      setError("Error de red al generar el menú");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Preferencias del menú</Typography>

        <TextField select label="Tiempo máximo por receta" size="small"
          value={prefs.max_time_minutes ?? 0}
          onChange={e => set("max_time_minutes", Number(e.target.value) || null)}>
          {TIME_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <TextField label="Máx. carne roja / semana" type="number" size="small"
            slotProps={{ htmlInput: { min: 0, max: 14 } }}
            value={prefs.max_red_meat}
            onChange={e => set("max_red_meat", Math.max(0, parseInt(e.target.value) || 0))} />
          <TextField label="Mín. pescado / semana" type="number" size="small"
            slotProps={{ htmlInput: { min: 0, max: 14 } }}
            value={prefs.min_fish}
            onChange={e => set("min_fish", Math.max(0, parseInt(e.target.value) || 0))} />
          <TextField label="Mín. vegetariano / semana" type="number" size="small"
            slotProps={{ htmlInput: { min: 0, max: 14 } }}
            value={prefs.min_vegetarian}
            onChange={e => set("min_vegetarian", Math.max(0, parseInt(e.target.value) || 0))} />
          <TextField label="Máx. carbohidratos / semana" type="number" size="small"
            slotProps={{ htmlInput: { min: 0, max: 14 } }}
            value={prefs.max_carbs}
            onChange={e => set("max_carbs", Math.max(0, parseInt(e.target.value) || 0))} />
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Restricciones dietéticas</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
            {DIET_FLAGS.map(flag => (
              <FormControlLabel key={flag} label={<Typography variant="body2">{flag}</Typography>}
                control={<Checkbox size="small" checked={prefs.diet_flags.includes(flag)} onChange={() => toggleFlag(flag)} />} />
            ))}
          </Box>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Button variant="contained" size="large" onClick={handleGenerate} disabled={generating}>
          {generating ? "Generando menú con IA..." : "Generar menú semanal"}
        </Button>
      </CardContent>
    </Card>
  );
}
