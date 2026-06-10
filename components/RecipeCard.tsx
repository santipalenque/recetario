import Link from "next/link";
import type { Recipe } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ShareRecipeButton from "@/components/ShareRecipeButton";

type Props = {
  recipe: Recipe;
  showShare?: boolean;
};

export default function RecipeCard({ recipe, showShare = false }: Props) {
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  return (
    <Card className="h-full hover:shadow-md transition-shadow flex flex-col">
      <Link href={`/recipes/${recipe.id}`} className="flex-1 block">
        {recipe.image_url && (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-40 object-cover rounded-t-lg"
          />
        )}
        <CardHeader className="pb-2">
          <CardTitle className="text-lg leading-tight">{recipe.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recipe.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{recipe.description}</p>
          )}
          <div className="flex gap-2 flex-wrap">
            {recipe.servings && (
              <Badge variant="secondary">{recipe.servings} porciones</Badge>
            )}
            {totalTime > 0 && (
              <Badge variant="secondary">{totalTime} min</Badge>
            )}
            {recipe.is_public && (
              <Badge variant="outline" className="text-green-600 border-green-600">Pública</Badge>
            )}
          </div>
        </CardContent>
      </Link>
      {showShare && (
        <div className="px-6 pb-4 pt-2 border-t">
          <ShareRecipeButton recipeId={recipe.id} recipeName={recipe.title} variant="outline" size="sm" />
        </div>
      )}
    </Card>
  );
}
