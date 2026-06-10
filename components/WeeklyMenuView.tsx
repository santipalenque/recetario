"use client";

import { useState } from "react";
import Link from "next/link";
import type { WeeklyMenuWithItems, MenuItemWithRecipe } from "@/lib/types";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ShuffleIcon from "@mui/icons-material/Shuffle";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function WeeklyMenuView({ menu }: { menu: WeeklyMenuWithItems }) {
  const [items, setItems] = useState(menu.menu_items);
  const [shuffling, setShuffling] = useState<string | null>(null);

  async function handleShuffle(item: MenuItemWithRecipe) {
    setShuffling(item.id);
    try {
      const res = await fetch("/api/shuffle-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuId: menu.id, itemId: item.id }),
      });
      if (!res.ok) return;
      const { item: updated } = await res.json();
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    } finally {
      setShuffling(null);
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {DAYS.map((dayName, dayIdx) => {
        const dayItems = items.filter(i => i.day === dayIdx);
        return (
          <Card key={dayIdx} variant="outlined">
            <CardContent sx={{ py: "12px !important" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {dayName}
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                {(["almuerzo", "cena"] as const).map(slot => {
                  const item = dayItems.find(i => i.slot === slot);
                  const isShuffling = item && shuffling === item.id;
                  return (
                    <Box key={slot} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip label={slot} size="small" variant="outlined" sx={{ width: 80, fontSize: "0.7rem" }} />
                      {item?.recipe ? (
                        <Link href={`/recipes/${item.recipe.id}`} style={{ flex: 1, textDecoration: "none" }}>
                          <Typography variant="body2" sx={{ color: "text.primary", "&:hover": { color: "primary.main" } }}>
                            {item.recipe.title}
                          </Typography>
                        </Link>
                      ) : (
                        <Typography variant="body2" color="text.disabled" sx={{ flex: 1 }}>Sin asignar</Typography>
                      )}
                      {item && (
                        <Tooltip title="Cambiar plato">
                          <span>
                            <IconButton size="small" onClick={() => handleShuffle(item)} disabled={!!shuffling}>
                              {isShuffling ? <CircularProgress size={14} /> : <ShuffleIcon sx={{ fontSize: 16 }} />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
