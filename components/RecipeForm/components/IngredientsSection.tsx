"use client";

import { useFormikContext, FieldArray } from "formik";
import { UNITS } from "@/utils/constants";
import type { FormValues } from "../types";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

export default function IngredientsSection() {
  const { values, setFieldValue } = useFormikContext<FormValues>();

  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Ingredientes</Typography>
        <FieldArray name="ingredients">
          {({ push, remove }) => (
            <>
              {values.ingredients.map((ing, idx) => (
                <Box key={idx} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                  <TextField
                    placeholder="Ingrediente"
                    value={ing.name}
                    onChange={(e) => setFieldValue(`ingredients.${idx}.name`, e.target.value)}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    placeholder="Cant."
                    value={ing.amount}
                    onChange={(e) => setFieldValue(`ingredients.${idx}.amount`, e.target.value)}
                    size="small"
                    sx={{ width: 90 }}
                  />
                  <TextField
                    select
                    value={ing.unit}
                    onChange={(e) => setFieldValue(`ingredients.${idx}.unit`, e.target.value)}
                    size="small"
                    sx={{ width: 110 }}
                  >
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
  );
}
