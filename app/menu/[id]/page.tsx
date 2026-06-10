import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { WeeklyMenuWithItems } from "@/lib/types";
import WeeklyMenuView from "@/components/WeeklyMenuView";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

export default async function MenuDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: menu } = await supabase
    .from("weekly_menus")
    .select("*, menu_items(*, recipe:recipes(*))")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!menu) notFound();

  const fmt = new Date(menu.week_start + "T12:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold" }}>Semana del {fmt}</Typography>
        <Link href="/menu"><Button variant="text">← Volver</Button></Link>
      </Box>
      <WeeklyMenuView menu={menu as WeeklyMenuWithItems} />
    </Container>
  );
}
