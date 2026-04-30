# Recipe App — Plan de Ataque

## Objetivo
Construir una web app de recetas con Next.js que permita crear recetas manualmente y parsear recetas desde URLs usando AI. Desplegada en Vercel, accesible públicamente para uso familiar.

## Stack
- **Frontend/Backend:** Next.js 14 (App Router) + TypeScript
- **Estilos:** Tailwind CSS + shadcn/ui
- **Base de datos + Auth + Storage:** Supabase
- **AI parsing:** Anthropic Claude API (claude-sonnet-4-5)
- **Scraping:** Jina AI Reader (fetch de `https://r.jina.ai/{url}`)
- **Deploy:** Vercel

---

## Fase 1 — Core CRUD + Deploy

### Base de datos (Supabase)
Crear las siguientes tablas en Supabase:

```sql
-- Usuarios manejados por Supabase Auth

create table recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  servings integer default 4,
  prep_time_minutes integer,
  cook_time_minutes integer,
  image_url text,
  source_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references recipes(id) on delete cascade,
  name text not null,
  amount numeric,
  unit text,
  order_index integer default 0
);

create table steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references recipes(id) on delete cascade,
  description text not null,
  order_index integer default 0
);

-- RLS: cada usuario solo ve sus recetas
alter table recipes enable row level security;
alter table ingredients enable row level security;
alter table steps enable row level security;

create policy "Users can manage own recipes" on recipes
  for all using (auth.uid() = user_id);

create policy "Users can manage own ingredients" on ingredients
  for all using (
    recipe_id in (select id from recipes where user_id = auth.uid())
  );

create policy "Users can manage own steps" on steps
  for all using (
    recipe_id in (select id from recipes where user_id = auth.uid())
  );
```

### Estructura de carpetas
```
/app
  /auth
    /login/page.tsx
    /signup/page.tsx
  /recipes
    /page.tsx              ← listado
    /new/page.tsx          ← crear manual
    /[id]/page.tsx         ← detalle
    /[id]/edit/page.tsx    ← editar
  /api
    /parse-url/route.ts    ← endpoint de parsing
/components
  /RecipeForm.tsx
  /RecipeCard.tsx
  /IngredientList.tsx
  /StepList.tsx
/lib
  /supabase.ts
  /anthropic.ts
```

### Funcionalidades Fase 1
1. Auth completo: login, signup, logout con Supabase Auth (magic link o email+password)
2. Listado de recetas del usuario autenticado
3. Formulario de creación/edición manual con:
   - Campos básicos: título, descripción, porciones, tiempos
   - Lista dinámica de ingredientes (agregar/quitar/reordenar)
   - Lista dinámica de pasos (agregar/quitar/reordenar)
   - Upload de imagen a Supabase Storage
4. Página de detalle de receta
5. Eliminar receta
6. Deploy en Vercel con variables de entorno configuradas

---

## Fase 2 — Parser de URLs con AI

### Endpoint `/api/parse-url`
```typescript
// Flujo:
// 1. Recibe { url: string }
// 2. Fetch a https://r.jina.ai/{url} → markdown limpio
// 3. Manda el markdown a Claude con este system prompt:
// 4. Devuelve el JSON estructurado

const SYSTEM_PROMPT = `
Eres un extractor de recetas. Se te dará el contenido de una página web en markdown.
Tu tarea es extraer la receta y devolverla ÚNICAMENTE como JSON válido con esta estructura exacta:

{
  "title": "string",
  "description": "string o null",
  "servings": number o null,
  "prep_time_minutes": number o null,
  "cook_time_minutes": number o null,
  "ingredients": [
    { "name": "string", "amount": number o null, "unit": "string o null" }
  ],
  "steps": [
    { "description": "string" }
  ]
}

Si no encontrás una receta en el contenido, devuelve: { "error": "No se encontró una receta en esta URL" }
No incluyas texto fuera del JSON.
`;
```

### UX del parser
- Input de URL en la página de creación (botón "Importar desde URL")
- Loading state mientras procesa
- El JSON resultante pre-llena el formulario de edición
- El usuario puede modificar cualquier campo antes de guardar
- Guardar `source_url` en la receta para referencia

---

## Fase 3 — UX y organización

1. **Colecciones/categorías:** tabla `collections` con relación many-to-many a recetas
2. **Búsqueda:** full-text search con Postgres `tsvector` o simplemente `ilike`
3. **Escalar porciones:** multiplicar cantidades de ingredientes dinámicamente en el detalle
4. **Tags:** desayuno, almuerzo, cena, postre, vegano, etc.

---

## Variables de entorno necesarias

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

---

## Notas de implementación

- Usar `@supabase/ssr` para el cliente de Supabase en Next.js App Router (no el legacy `@supabase/auth-helpers-nextjs`)
- shadcn/ui components sugeridos: `Card`, `Button`, `Input`, `Textarea`, `Dialog`, `Toast`, `Skeleton`
- Para el drag-and-drop de ingredientes/pasos usar `@dnd-kit/core`
- El modelo de Claude a usar: `claude-sonnet-4-5` (balance costo/calidad para parsing)
- Manejar rate limiting en el endpoint de parsing: máximo 1 request cada 3 segundos por usuario
- Jina Reader es gratuito, sin API key necesaria para empezar

## Orden de implementación sugerido
1. Setup Next.js + Tailwind + shadcn
2. Conectar Supabase + crear tablas + configurar RLS
3. Auth (login/signup/logout)
4. CRUD de recetas (sin imágenes primero)
5. Deploy en Vercel + verificar que funciona en producción
6. Upload de imágenes
7. Parser de URLs
8. Colecciones y búsqueda
