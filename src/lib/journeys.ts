import { supabase, supabaseConfigured } from "./supabase";

export interface JourneyRecord {
  id: string;
  mood: string;
  duration: number;
  activity: string;
  route_title: string;
  elapsed_seconds: number;
  distance_km: number;
  post_feeling: string | null;
  breadcrumbs: { lat: number; lng: number }[];
  completed_at: string;
  steps?: number;
  route_variant?: number;
}

export async function saveJourney(journey: {
  mood: string;
  duration: number;
  activity: string;
  routeTitle: string;
  elapsedSeconds: number;
  distanceKm: number;
  breadcrumbs: { lat: number; lng: number }[];
  steps: number;
  routeVariant: number;
}): Promise<string | null> {
  if (!supabaseConfigured) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("journeys")
    .insert({
      user_id: user.id,
      mood: journey.mood,
      duration: journey.duration,
      activity: journey.activity,
      route_title: journey.routeTitle,
      elapsed_seconds: journey.elapsedSeconds,
      distance_km: journey.distanceKm,
      breadcrumbs: journey.breadcrumbs,
      steps: journey.steps,
      route_variant: journey.routeVariant,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to save journey:", error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function updateJourneyFeeling(
  journeyId: string,
  feeling: string
): Promise<void> {
  if (!supabaseConfigured) return;

  const { error } = await supabase
    .from("journeys")
    .update({ post_feeling: feeling })
    .eq("id", journeyId);

  if (error) {
    console.error("Failed to update journey feeling:", error.message);
  }
}

export async function getJourneyHistory(userId?: string): Promise<JourneyRecord[]> {
  try {
    if (!supabaseConfigured) return [];

    let activeUserId = userId;
    if (!activeUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      activeUserId = user?.id;
    }

    if (!activeUserId) return [];

    const { data, error } = await supabase
      .from("journeys")
      .select("*")
      .eq("user_id", activeUserId)
      .order("completed_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch journey history:", error.message);
      return [];
    }
    return (data as JourneyRecord[]) ?? [];
  } catch (e) {
    console.error("getJourneyHistory exception:", e);
    return [];
  }
}
