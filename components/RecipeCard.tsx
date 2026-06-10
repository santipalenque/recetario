"use client";

import Link from "next/link";
import type { Recipe } from "@/lib/types";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import ShareRecipeButton from "@/components/ShareRecipeButton";

type Props = {
  recipe: Recipe;
  showShare?: boolean;
};

export default function RecipeCard({ recipe, showShare = false }: Props) {
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardActionArea component={Link} href={`/recipes/${recipe.id}`} sx={{ flex: 1 }}>
        {recipe.image_url && (
          <CardMedia
            component="img"
            height={160}
            image={recipe.image_url}
            alt={recipe.title}
          />
        )}
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ lineHeight: 1.3 }}>
            {recipe.title}
          </Typography>
          {recipe.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
            >
              {recipe.description}
            </Typography>
          )}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {recipe.servings && <Chip size="small" label={`${recipe.servings} porciones`} />}
            {totalTime > 0 && <Chip size="small" label={`${totalTime} min`} />}
            {recipe.is_public && (
              <Chip size="small" label="Pública" color="success" variant="outlined" />
            )}
          </Box>
        </CardContent>
      </CardActionArea>
      {showShare && (
        <CardActions sx={{ borderTop: 1, borderColor: "divider", px: 2 }}>
          <ShareRecipeButton recipeId={recipe.id} recipeName={recipe.title} size="small" />
        </CardActions>
      )}
    </Card>
  );
}
