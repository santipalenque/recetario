export const UNITS = ["CN", "unidades", "kg", "g", "lt", "ml", "cdas", "taza", "lata"] as const;

export const RECIPE_TAGS = ["Principal", "Entrada", "Postre", "Guarnicion", "Dip"] as const;
export type RecipeTag = (typeof RECIPE_TAGS)[number];
export type Unit = (typeof UNITS)[number];

export const SYSTEM_PROMPT = `Eres un extractor de recetas. Se te dará el contenido de una página web en markdown.
Tu tarea es extraer la receta y devolverla ÚNICAMENTE como JSON válido con esta estructura exacta:

{
  "title": "string",
  "description": "string o null — resumen del proceso de cocción en 2-3 oraciones",
  "servings": number o null,
  "prep_time_minutes": number o null,
  "cook_time_minutes": number o null,
  "ingredients": [
    { "name": "string", "amount": number o null, "unit": "unidades" | "kg" | "g" | "lt" | "ml" | "cdas" | "taza" | "lata" | "CN" }
  ],
  "steps": [
    { "description": "string" }
  ]
}

Reglas para ingredientes:
- Separar siempre la cantidad, la unidad y el nombre. Ejemplo: "½ kg. de Paleta" → name:"Paleta", amount:0.5, unit:"kg".
- Convertir fracciones a decimales (½→0.5, ¼→0.25, ¾→0.75).
- Las unidades válidas son SOLO: unidades, kg, g, lt, ml, cdas, taza, lata. Mapear cualquier variante a la más cercana (cucharadas→cdas, cucharaditas→cdas, litros→lt, gramos→g, kilogramos→kg, mililitros→ml, tazas→taza, latas→lata, unidad→unidades, u.→unidades).
- Si hay cantidad pero no hay unidad de medida (ej: "2 cebollas") → unit:"unidades".
- Si no hay ni cantidad ni unidad (ej: "Sal", "Aceite") → amount:null, unit:"CN".
- Para los tiempos, buscar tanto en campos explícitos como dentro del texto de los pasos (ej: "cocinar por 2 hs" → cook_time_minutes:120). Si no se menciona, usar null.
- Si no encontrás una receta en el contenido, devuelve: { "error": "No se encontró una receta en esta URL" }
- No incluyas texto fuera del JSON.`;
