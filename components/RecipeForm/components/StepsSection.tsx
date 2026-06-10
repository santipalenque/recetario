"use client";

import { useFormikContext, FieldArray } from "formik";
import type { FormValues } from "../types";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

export default function StepsSection() {
  const { values, setFieldValue } = useFormikContext<FormValues>();

  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Pasos</Typography>
        <FieldArray name="steps">
          {({ push, remove }) => (
            <>
              {values.steps.map((step, idx) => (
                <Box key={idx} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, minWidth: 24, fontWeight: 600 }}>
                    {idx + 1}.
                  </Typography>
                  <TextField
                    placeholder={`Paso ${idx + 1}...`}
                    value={step.description}
                    onChange={(e) => setFieldValue(`steps.${idx}.description`, e.target.value)}
                    multiline
                    rows={2}
                    size="small"
                    sx={{ flex: 1 }}
                  />
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
  );
}
