import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { MenuPreferences, WeeklyMenuWithItems } from "@/lib/types";
import MenuGenerator from "@/components/MenuGenerator";
import WeeklyMenuView from "@/components/WeeklyMenuView";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";

const DEFAULT_PREFS: MenuPreferences = {
  max_time_minutes: null,
  max_red_meat: 3,
  min_fish: 1,
  min_vegetarian: 2,
  max_carbs: 5,
  diet_flags: [],
};

export default async function MenuPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: savedPrefs } = await supabase
    .from("user_menu_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const initialPrefs: MenuPreferences = savedPrefs ? {
    max_time_minutes: savedPrefs.max_time_minutes,
    max_red_meat: savedPrefs.max_red_meat,
    min_fish: savedPrefs.min_fish,
    min_vegetarian: savedPrefs.min_vegetarian,
    max_carbs: savedPrefs.max_carbs,
    diet_flags: savedPrefs.diet_flags ?? [],
  } : DEFAULT_PREFS;

  const { data: latestMenu } = await supabase
    .from("weekly_menus")
    .select("*, menu_items(*, recipe:recipes(*))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: history } = await supabase
    .from("weekly_menus")
    .select("id, week_start, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>Menú semanal</Typography>
        <Link href="/recipes"><Button variant="outlined">Mis recetas</Button></Link>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <MenuGenerator initialPrefs={initialPrefs} />

        {latestMenu && (
          <>
            <Divider />
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Menú actual — semana del {fmt(latestMenu.week_start)}
              </Typography>
              <WeeklyMenuView menu={latestMenu as WeeklyMenuWithItems} />
            </Box>
          </>
        )}

        {history && history.length > 1 && (
          <>
            <Divider />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Historial</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {history.slice(1).map(m => (
                  <Link key={m.id} href={`/menu/${m.id}`} style={{ textDecoration: "none" }}>
                    <Typography variant="body2" color="primary" sx={{ "&:hover": { textDecoration: "underline" } }}>
                      Semana del {fmt(m.week_start)}
                    </Typography>
                  </Link>
                ))}
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Container>
  );
}
