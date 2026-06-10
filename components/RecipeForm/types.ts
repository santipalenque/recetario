export interface FormValues {
  title: string;
  description: string;
  servings: string;
  prepTime: string;
  cookTime: string;
  sourceUrl: string;
  isPublic: boolean;
  tags: string[];
  ingredients: { name: string; amount: string; unit: string }[];
  steps: { description: string }[];
}
