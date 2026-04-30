import Link from "next/link";
import type { Recipe } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  return (
    <Link href={`/recipes/${recipe.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
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
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
