import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Wind,
  Brain,
  Zap,
  Moon,
  Compass,
  Crown,
  Leaf,
  Lightbulb,
  Footprints,
  Activity,
  Play,
  Music,
  TreePine,
  Gauge,
  Quote,
  RefreshCw,
  Settings,
  X,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoodMap } from "@/components/MoodMap";

export const Route = createFileRoute("/")({
  component: MoodMiles,
});

type Mood =
  | "Calm"
  | "Clear Mind"
  | "Energy Boost"
  | "Reflective"
  | "Escape"
  | "Confidence"
  | "Recovery"
  | "Creative Spark";

type Duration = 15 | 30 | 45 | 60;
type Activity = "Walk" | "Run";
type Step = "landing" | "mood" | "time" | "activity" | "route" | "active" | "post";

const MOODS: { label: Mood; icon: React.ComponentType<{ className?: string }>; hint: string }[] = [
  { label: "Calm", icon: Wind, hint: "Settle the nervous system" },
  { label: "Clear Mind", icon: Brain, hint: "Untangle the noise" },
  { label: "Energy Boost", icon: Zap, hint: "Wake the body up" },
  { label: "Reflective", icon: Moon, hint: "Sit with your thoughts" },
  { label: "Escape", icon: Compass, hint: "Step out of routine" },
  { label: "Confidence", icon: Crown, hint: "Walk a little taller" },
  { label: "Recovery", icon: Leaf, hint: "Gentle restoration" },
  { label: "Creative Spark", icon: Lightbulb, hint: "Loosen new ideas" },
];

const DURATIONS: Duration[] = [15, 30, 45, 60];

const ROUTES: Record<Mood, {
  title: string;
  summary: string;
  pace: string;
  environment: string;
  soundtrack: string;
  prompt: string;
  musicQuery: string;
}> = {
  Calm: {
    title: "Quiet Reset Loop",
    summary:
      "A gentle route designed to reduce noise, slow your breathing, and help you decompress.",
    pace: "Easy, unhurried",
    environment: "Tree-lined streets, parks, low traffic roads",
    soundtrack: "Soft piano, ambient electronic, mellow acoustic",
    prompt: "What thought are you ready to leave behind on this walk?",
    musicQuery: "Soft piano ambient mellow acoustic walking",
  },
  "Clear Mind": {
    title: "Open Sky Stretch",
    summary:
      "A linear route with long sightlines and minimal turns so your mind can untangle itself.",
    pace: "Steady, rhythmic",
    environment: "Wide promenades, riverside paths, open horizons",
    soundtrack: "Lo-fi beats, minimal ambient, light instrumental",
    prompt: "What question keeps circling back to you lately?",
    musicQuery: "Lofi chill minimal focus instrumental beats",
  },
  "Energy Boost": {
    title: "Sunrise Pulse Route",
    summary:
      "Mild inclines and busier streets to wake the body up and lift your tempo.",
    pace: "Brisk and lively",
    environment: "City blocks, bright avenues, gentle hills",
    soundtrack: "Upbeat indie, funky electronic, modern pop",
    prompt: "What's one thing you're ready to bring fresh energy to today?",
    musicQuery: "Upbeat energetic indie electronic running",
  },
  Reflective: {
    title: "Slow Lantern Path",
    summary:
      "A meandering loop with quiet pockets to let memories and thoughts surface gently.",
    pace: "Slow, attentive",
    environment: "Old neighborhoods, lit alleys, garden paths",
    soundtrack: "Piano sketches, neoclassical, ambient warmth",
    prompt: "What moment from the past month deserves a second look?",
    musicQuery: "Neoclassical piano warm ambient reflection",
  },
  Escape: {
    title: "Off-Map Wander",
    summary:
      "An unfamiliar loop chosen to break routine and let curiosity lead the way.",
    pace: "Curious, drifting",
    environment: "New neighborhoods, hidden side streets, unfamiliar corners",
    soundtrack: "World instrumentals, cinematic ambient, dreamy synths",
    prompt: "If today wasn't yours yet, what would you do with the next hour?",
    musicQuery: "Dreamy synths cinematic electronic wander",
  },
  Confidence: {
    title: "Tall Step Avenue",
    summary:
      "A bold, open route along main streets to help you reclaim your posture and presence.",
    pace: "Strong and grounded",
    environment: "Wide avenues, plazas, well-lit boulevards",
    soundtrack: "Cinematic strings, modern soul, driving electronic",
    prompt: "What would you do today if you fully trusted yourself?",
    musicQuery: "Driving modern soul upbeat confidence walk",
  },
  Recovery: {
    title: "Soft Green Loop",
    summary:
      "A short, level route through quiet greenery to ease the body back to itself.",
    pace: "Very gentle, restorative",
    environment: "Flat parks, garden paths, shaded sidewalks",
    soundtrack: "Nature sounds, warm ambient, slow acoustic",
    prompt: "What does your body need you to hear right now?",
    musicQuery: "Healing nature sounds warm ambient restore",
  },
  "Creative Spark": {
    title: "Bright Detour Route",
    summary:
      "A varied loop with new textures, colors, and corners to nudge fresh ideas loose.",
    pace: "Light, exploratory",
    environment: "Murals, markets, mixed neighborhoods, color-rich streets",
    soundtrack: "Jazz fusion, playful electronic, indie psych",
    prompt: "What half-formed idea wants a little more room today?",
    musicQuery: "Jazz fusion playful electronic creative flow",
  },
};

function getMusicLaunchUrl(provider: string, query: string): string {
  const encQuery = encodeURIComponent(query);
  switch (provider) {
    case "apple":
      return `https://music.apple.com/search?term=${encQuery}`;
    case "ytmusic":
      return `https://music.youtube.com/search?q=${encQuery}`;
    case "youtube":
      return `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " playlist")}`;
    case "tidal":
      return `https://listen.tidal.com/search/playlists?q=${encQuery}`;
    case "spotify":
    default:
      return `https://open.spotify.com/search/${encQuery}`;
  }
}

function getMusicProviderLabel(provider: string): string {
  switch (provider) {
    case "apple":
      return "Apple Music";
    case "ytmusic":
      return "YouTube Music";
    case "youtube":
      return "YouTube";
    case "tidal":
      return "Tidal";
    case "spotify":
    default:
      return "Spotify";
  }
}

function calculateDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function MoodMiles() {
  const [step, setStep] = useState<Step>("landing");
  const [mood, setMood] = useState<Mood | null>(null);
  const [duration, setDuration] = useState<Duration | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [postFeel, setPostFeel] = useState<"Better" | "Same" | "Worse" | null>(null);

  // User Preferences
  const [mapTheme, setMapTheme] = useState<"real" | "cyberpunk">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("moodmiles_map_theme") as "real" | "cyberpunk") || "real";
    }
    return "real";
  });
  const [walkingSpeed, setWalkingSpeed] = useState<"slow" | "normal" | "brisk">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("moodmiles_walking_speed") as "slow" | "normal" | "brisk") || "normal";
    }
    return "normal";
  });
  const [runningSpeed, setRunningSpeed] = useState<"jog" | "fast" | "sprint">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("moodmiles_running_speed") as "jog" | "fast" | "sprint") || "fast";
    }
    return "fast";
  });
  const [musicProvider, setMusicProvider] = useState<"spotify" | "apple" | "ytmusic" | "youtube" | "tidal">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("moodmiles_music_provider") as any) || "spotify";
    }
    return "spotify";
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Geolocated / Custom Location states hoisted to parent so it is shared across both planning and active screens
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [usingCustomLocation, setUsingCustomLocation] = useState<boolean>(false);
  const [locationName, setLocationName] = useState<string>("Detecting location...");
  const [deviceLocation, setDeviceLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Background fetch to track actual physical device GPS coords for "far away starting point navigation"
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setDeviceLocation(coords);
        
        // Populate standard userLocation initially if not using custom dropped pin
        if (!usingCustomLocation && !userLocation) {
          setUserLocation(coords);
          setLocationName("Your Location");
        }
      },
      (err) => {
        console.warn("Background device location retrieval failed: ", err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [usingCustomLocation, userLocation]);

  const route = useMemo(() => (mood ? ROUTES[mood] : null), [mood]);

  const reset = () => {
    setStep("landing");
    setMood(null);
    setDuration(null);
    setActivity(null);
    setPostFeel(null);
    setUserLocation(null);
    setUsingCustomLocation(false);
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Ambient gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-accent/25 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 h-[32rem] w-[32rem] rounded-full bg-primary/20 blur-[140px]" />
        <div className="absolute bottom-0 left-1/2 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-chart-3/15 blur-[120px]" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-6">
        <Header
          step={step}
          onBack={() => stepBack(step, setStep)}
          onReset={reset}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <div className="mt-6 flex-1">
          {step === "landing" && <Landing onStart={() => setStep("mood")} />}
          {step === "mood" && (
            <MoodStep
              selected={mood}
              onSelect={(m) => {
                setMood(m);
                setTimeout(() => setStep("time"), 180);
              }}
            />
          )}
          {step === "time" && (
            <TimeStep
              selected={duration}
              onSelect={(d) => {
                setDuration(d);
                setTimeout(() => setStep("activity"), 180);
              }}
            />
          )}
          {step === "activity" && (
            <ActivityStep
              selected={activity}
              onSelect={(a) => {
                setActivity(a);
                setTimeout(() => setStep("route"), 220);
              }}
            />
          )}
          {step === "route" && route && mood && duration && activity && (
            <RouteScreen
              route={route}
              mood={mood}
              duration={duration}
              activity={activity}
              mapTheme={mapTheme}
              walkingSpeed={walkingSpeed}
              runningSpeed={runningSpeed}
              userLocation={userLocation}
              setUserLocation={setUserLocation}
              usingCustomLocation={usingCustomLocation}
              setUsingCustomLocation={setUsingCustomLocation}
              locationName={locationName}
              setLocationName={setLocationName}
              deviceLocation={deviceLocation}
              musicProvider={musicProvider}
              onOpenSettings={() => setSettingsOpen(true)}
              onStart={() => setStep("active")}
            />
          )}
          {step === "active" && route && mood && duration && activity && (
            <ActiveScreen
              route={route}
              mood={mood}
              duration={duration}
              activity={activity}
              mapTheme={mapTheme}
              walkingSpeed={walkingSpeed}
              runningSpeed={runningSpeed}
              userLocation={userLocation}
              setUserLocation={setUserLocation}
              usingCustomLocation={usingCustomLocation}
              setUsingCustomLocation={setUsingCustomLocation}
              locationName={locationName}
              setLocationName={setLocationName}
              musicProvider={musicProvider}
              onComplete={() => setStep("post")}
            />
          )}
          {step === "post" && mood && (
            <PostScreen
              mood={mood}
              feel={postFeel}
              onSelect={setPostFeel}
              onDone={reset}
            />
          )}
        </div>

        {/* Footnote */}
        <footer className="mt-8 text-center pb-2">
          <p className="text-[10px] text-muted-foreground/45 tracking-wider">
            Created by <span className="font-medium text-foreground/45">Bikram Chatterjee</span>
          </p>
        </footer>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-border/80 bg-card/90 p-6 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold tracking-tight">Preferences</h3>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="rounded-full p-1.5 hover:bg-accent/50 text-muted-foreground hover:text-foreground transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="mt-4 space-y-5">
              {/* Map Theme Toggle */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Map Rendering Theme
                </span>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-background/40 p-1 border border-border/60">
                  <button
                    onClick={() => {
                      setMapTheme("real");
                      localStorage.setItem("moodmiles_map_theme", "real");
                    }}
                    className={`rounded-lg py-2 text-xs font-medium transition ${
                      mapTheme === "real"
                        ? "bg-gradient-to-r from-accent to-primary text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Street Map
                  </button>
                  <button
                    onClick={() => {
                      setMapTheme("cyberpunk");
                      localStorage.setItem("moodmiles_map_theme", "cyberpunk");
                    }}
                    className={`rounded-lg py-2 text-xs font-medium transition ${
                      mapTheme === "cyberpunk"
                        ? "bg-gradient-to-r from-accent to-primary text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Cyberpunk Grid
                  </button>
                </div>
              </div>

              {/* Walking Speed Selector */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Walking Speed (Loop Scale)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(["slow", "normal", "brisk"] as const).map((spd) => {
                    const label = spd === "slow" ? "3.5 km/h" : spd === "normal" ? "4.8 km/h" : "6.0 km/h";
                    return (
                      <button
                        key={spd}
                        onClick={() => {
                          setWalkingSpeed(spd);
                          localStorage.setItem("moodmiles_walking_speed", spd);
                        }}
                        className={`rounded-xl border p-2.5 text-center transition flex flex-col items-center gap-0.5 ${
                          walkingSpeed === spd
                            ? "border-primary/60 bg-gradient-to-br from-accent/15 to-primary/15 text-foreground"
                            : "border-border/60 bg-background/30 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className="text-xs font-semibold capitalize">{spd}</span>
                        <span className="text-[10px] opacity-80">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Running Speed Selector */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Running Speed (Loop Scale)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(["jog", "fast", "sprint"] as const).map((spd) => {
                    const label = spd === "jog" ? "8.0 km/h" : spd === "fast" ? "10.5 km/h" : "13.0 km/h";
                    return (
                      <button
                        key={spd}
                        onClick={() => {
                          setRunningSpeed(spd);
                          localStorage.setItem("moodmiles_running_speed", spd);
                        }}
                        className={`rounded-xl border p-2.5 text-center transition flex flex-col items-center gap-0.5 ${
                          runningSpeed === spd
                            ? "border-primary/60 bg-gradient-to-br from-accent/15 to-primary/15 text-foreground"
                            : "border-border/60 bg-background/30 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className="text-xs font-semibold capitalize">{spd}</span>
                        <span className="text-[10px] opacity-80">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Music Provider Preference */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Preferred Music Service
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(["spotify", "apple", "ytmusic", "youtube", "tidal"] as const).map((prov) => {
                    const label = getMusicProviderLabel(prov);
                    const active = musicProvider === prov;
                    return (
                      <button
                        key={prov}
                        onClick={() => {
                          setMusicProvider(prov);
                          localStorage.setItem("moodmiles_music_provider", prov);
                        }}
                        className={`rounded-xl border p-2.5 text-center transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                          active
                            ? "border-primary/60 bg-gradient-to-br from-accent/15 to-primary/15 text-foreground"
                            : "border-border/60 bg-background/30 text-muted-foreground hover:text-foreground"
                        } ${prov === "tidal" ? "col-span-2" : "col-span-1"}`}
                      >
                        <span className="text-xs font-semibold">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Button
                onClick={() => setSettingsOpen(false)}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-accent to-primary text-background font-medium hover:opacity-95"
              >
                Save & Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function stepBack(step: Step, setStep: (s: Step) => void) {
  const order: Step[] = ["landing", "mood", "time", "activity", "route", "active", "post"];
  const idx = order.indexOf(step);
  if (idx > 0) setStep(order[idx - 1]);
}

function Header({
  step,
  onBack,
  onReset,
  onOpenSettings,
}: {
  step: Step;
  onBack: () => void;
  onReset: () => void;
  onOpenSettings: () => void;
}) {
  const showBack = step !== "landing" && step !== "post";
  return (
    <header className="flex items-center justify-between">
      <button
        onClick={onBack}
        className={`flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/50 backdrop-blur transition ${
          showBack ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-label="Back"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary">
          <Footprints className="h-3.5 w-3.5 text-background" />
        </div>
        <span className="text-sm font-medium tracking-wide">MoodMiles</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSettings}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/50 text-muted-foreground backdrop-blur transition hover:text-foreground"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
        <button
          onClick={onReset}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/50 text-muted-foreground backdrop-blur transition hover:text-foreground"
          aria-label="Restart"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <section className="flex h-full flex-col items-center justify-between pt-10 text-center">
      <div className="space-y-8">
        <div className="relative mx-auto h-44 w-44">
          <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-accent/40 via-primary/30 to-chart-3/30 blur-2xl" />
          <div className="relative flex h-full w-full items-center justify-center rounded-full border border-border/40 bg-card/40 backdrop-blur-xl">
            <Sparkles className="h-12 w-12 text-foreground/90" />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            MoodMiles
          </p>
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight">
            Walk how you want to feel.
          </h1>
          <p className="mx-auto max-w-xs text-balance text-sm leading-relaxed text-muted-foreground">
            Forget calories and pace. Choose a mood, choose your minutes, and we'll shape
            a route around how you want to arrive home.
          </p>
        </div>
      </div>

      <div className="mt-10 w-full space-y-3">
        <Button
          onClick={onStart}
          className="h-14 w-full rounded-2xl bg-gradient-to-r from-accent to-primary text-base font-medium text-background shadow-lg shadow-primary/20 hover:opacity-95"
        >
          Begin
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          Takes less than 30 seconds
        </p>
      </div>
    </section>
  );
}

function StepHeading({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="mb-6 space-y-2">
      <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
        {kicker}
      </p>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

function MoodStep({
  selected,
  onSelect,
}: {
  selected: Mood | null;
  onSelect: (m: Mood) => void;
}) {
  return (
    <section>
      <StepHeading
        kicker="Step 1 of 3"
        title="How do you want to feel?"
        sub="Pick the closest fit. You don't have to be sure."
      />
      <div className="grid grid-cols-2 gap-3">
        {MOODS.map(({ label, icon: Icon, hint }) => {
          const active = selected === label;
          return (
            <button
              key={label}
              onClick={() => onSelect(label)}
              className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-primary/60 bg-gradient-to-br from-accent/20 to-primary/20"
                  : "border-border/60 bg-card/40 backdrop-blur hover:border-border"
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-primary/30">
                <Icon className="h-4 w-4" />
              </div>
              <div className="mt-3 text-sm font-medium">{label}</div>
              <div className="mt-1 text-xs leading-snug text-muted-foreground">
                {hint}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TimeStep({
  selected,
  onSelect,
}: {
  selected: Duration | null;
  onSelect: (d: Duration) => void;
}) {
  return (
    <section>
      <StepHeading
        kicker="Step 2 of 3"
        title="How much time do you have?"
        sub="We'll shape the loop to fit."
      />
      <div className="grid grid-cols-2 gap-3">
        {DURATIONS.map((d) => {
          const active = selected === d;
          return (
            <button
              key={d}
              onClick={() => onSelect(d)}
              className={`flex flex-col items-start gap-1 rounded-2xl border p-5 text-left transition ${
                active
                  ? "border-primary/60 bg-gradient-to-br from-accent/20 to-primary/20"
                  : "border-border/60 bg-card/40 backdrop-blur hover:border-border"
              }`}
            >
              <span className="text-3xl font-semibold tracking-tight">{d}</span>
              <span className="text-xs text-muted-foreground">minutes</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ActivityStep({
  selected,
  onSelect,
}: {
  selected: Activity | null;
  onSelect: (a: Activity) => void;
}) {
  const opts: { label: Activity; icon: React.ComponentType<{ className?: string }>; hint: string }[] = [
    { label: "Walk", icon: Footprints, hint: "Slow it down, take it in" },
    { label: "Run", icon: Activity, hint: "Move with momentum" },
  ];
  return (
    <section>
      <StepHeading
        kicker="Step 3 of 3"
        title="Walk or run?"
        sub="Either is the right answer today."
      />
      <div className="space-y-3">
        {opts.map(({ label, icon: Icon, hint }) => {
          const active = selected === label;
          return (
            <button
              key={label}
              onClick={() => onSelect(label)}
              className={`flex w-full items-center gap-4 rounded-2xl border p-5 text-left transition ${
                active
                  ? "border-primary/60 bg-gradient-to-br from-accent/20 to-primary/20"
                  : "border-border/60 bg-card/40 backdrop-blur hover:border-border"
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-primary/30">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-medium">{label}</div>
                <div className="text-xs text-muted-foreground">{hint}</div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function RouteScreen({
  route,
  mood,
  duration,
  activity,
  mapTheme,
  walkingSpeed,
  runningSpeed,
  userLocation,
  setUserLocation,
  usingCustomLocation,
  setUsingCustomLocation,
  locationName,
  setLocationName,
  deviceLocation,
  musicProvider,
  onOpenSettings,
  onStart,
}: {
  route: (typeof ROUTES)[Mood];
  mood: Mood;
  duration: Duration;
  activity: Activity;
  mapTheme: "real" | "cyberpunk";
  walkingSpeed: "slow" | "normal" | "brisk";
  runningSpeed: "jog" | "fast" | "sprint";
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (coords: { lat: number; lng: number } | null) => void;
  usingCustomLocation: boolean;
  setUsingCustomLocation: (val: boolean) => void;
  locationName: string;
  setLocationName: (name: string) => void;
  deviceLocation: { lat: number; lng: number } | null;
  musicProvider: "spotify" | "apple" | "ytmusic" | "youtube" | "tidal";
  onOpenSettings: () => void;
  onStart: () => void;
}) {
  const distanceToStartMiles = useMemo(() => {
    if (!deviceLocation || !userLocation) return 0;
    return calculateDistanceMiles(
      deviceLocation.lat,
      deviceLocation.lng,
      userLocation.lat,
      userLocation.lng
    );
  }, [deviceLocation, userLocation]);

  const showNavigationButton = usingCustomLocation && userLocation;

  const distanceLabel = useMemo(() => {
    if (!deviceLocation || !userLocation) return "";
    return ` (${distanceToStartMiles.toFixed(1)} miles away)`;
  }, [deviceLocation, userLocation, distanceToStartMiles]);

  const handleNavigateToStart = () => {
    if (!userLocation) return;
    const isApple = typeof navigator !== "undefined" && /Mac|iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = isApple
      ? `https://maps.apple.com/?daddr=${userLocation.lat},${userLocation.lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${userLocation.lat},${userLocation.lng}`;
    window.open(url, "_blank");
  };

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          Your route
        </p>
        <h2 className="text-3xl font-semibold leading-tight tracking-tight">
          {route.title}
        </h2>
        <div className="flex flex-wrap gap-2 pt-1">
          <Chip>{mood}</Chip>
          <Chip>{duration} min</Chip>
          <Chip>{activity}</Chip>
        </div>
      </div>

      <MoodMap
        mood={mood}
        duration={duration}
        activity={activity}
        mapTheme={mapTheme}
        walkingSpeed={walkingSpeed}
        runningSpeed={runningSpeed}
        routeCenter={userLocation}
        setRouteCenter={setUserLocation}
        usingCustomLocation={usingCustomLocation}
        setUsingCustomLocation={setUsingCustomLocation}
        locationName={locationName}
        setLocationName={setLocationName}
      />

      <p className="text-[15px] leading-relaxed text-foreground/85">
        {route.summary}
      </p>

      <div className="space-y-2">
        <DetailRow icon={Gauge} label="Pace" value={route.pace} />
        <DetailRow icon={TreePine} label="Environment" value={route.environment} />
        <DetailRow
          icon={Music}
          label="Soundtrack"
          value={route.soundtrack}
          action={
            <button
              onClick={() => window.open(getMusicLaunchUrl(musicProvider, route.musicQuery), "_blank")}
              className="rounded-lg bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <Music className="h-3.5 w-3.5 animate-pulse" />
              Open {getMusicProviderLabel(musicProvider)}
            </button>
          }
        />
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/50 p-5 backdrop-blur">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <Quote className="h-3.5 w-3.5" />
          Reflective prompt
        </div>
        <p className="mt-2 text-[15px] italic leading-relaxed text-foreground/90">
          "{route.prompt}"
        </p>
      </div>

      {showNavigationButton && (
        <Button
          onClick={handleNavigateToStart}
          className="h-14 w-full rounded-2xl border border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent font-medium transition flex items-center justify-center gap-2 shadow-sm shadow-accent/5 animate-in fade-in slide-in-from-bottom-2 duration-300 cursor-pointer"
        >
          <Navigation className="h-4 w-4 fill-accent animate-pulse" />
          Navigate to Start Point{distanceLabel}
        </Button>
      )}

      <Button
        onClick={onStart}
        className="h-14 w-full rounded-2xl bg-gradient-to-r from-accent to-primary text-base font-medium text-background shadow-lg shadow-primary/20 hover:opacity-95"
      >
        <Play className="mr-1 h-4 w-4 fill-background" />
        Start
      </Button>
    </section>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur w-full">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-primary/30">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-0.5 text-sm text-foreground/90 truncate">{value}</div>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs text-foreground/85 backdrop-blur">
      {children}
    </span>
  );
}

function PostScreen({
  mood,
  feel,
  onSelect,
  onDone,
}: {
  mood: Mood;
  feel: "Better" | "Same" | "Worse" | null;
  onSelect: (f: "Better" | "Same" | "Worse") => void;
  onDone: () => void;
}) {
  const reflection = useMemo(() => {
    if (!feel) return null;
    if (feel === "Better")
      return `Something shifted. You went out looking for ${mood.toLowerCase()}, and your body answered. Notice what specifically helped — the pace, the streets, the soundtrack — so you can find it again next time.`;
    if (feel === "Same")
      return `Same isn't nothing. You still chose to move when you didn't have to, and that's its own kind of ${mood.toLowerCase()}. Some routes do their work quietly, hours later.`;
    return `That's honest, and worth knowing. ${mood} isn't always one walk away. Maybe today asked for rest, or a different route, or simply more time. Tomorrow can try again.`;
  }, [feel, mood]);

  return (
    <section className="space-y-6 pt-4">
      <div className="space-y-2 text-center">
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          You're back
        </p>
        <h2 className="text-3xl font-semibold tracking-tight">How do you feel now?</h2>
        <p className="text-sm text-muted-foreground">
          No wrong answer. Just check in.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(["Better", "Same", "Worse"] as const).map((opt) => {
          const active = feel === opt;
          return (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
              className={`rounded-2xl border px-3 py-5 text-sm font-medium transition ${
                active
                  ? "border-primary/60 bg-gradient-to-br from-accent/25 to-primary/25"
                  : "border-border/60 bg-card/40 backdrop-blur hover:border-border"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {reflection && (
        <div className="rounded-2xl border border-border/60 bg-card/50 p-5 backdrop-blur">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            A short reflection
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-foreground/90">
            {reflection}
          </p>
        </div>
      )}

      <Button
        onClick={onDone}
        disabled={!feel}
        className="h-14 w-full rounded-2xl bg-gradient-to-r from-accent to-primary text-background font-medium hover:opacity-95 disabled:opacity-40"
      >
        Done
      </Button>
    </section>
  );
}

interface ActiveScreenProps {
  route: (typeof ROUTES)[Mood];
  mood: Mood;
  duration: Duration;
  activity: Activity;
  mapTheme: "real" | "cyberpunk";
  walkingSpeed: "slow" | "normal" | "brisk";
  runningSpeed: "jog" | "fast" | "sprint";
  onComplete: () => void;
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (coords: { lat: number; lng: number } | null) => void;
  usingCustomLocation: boolean;
  setUsingCustomLocation: (val: boolean) => void;
  locationName: string;
  setLocationName: (name: string) => void;
  musicProvider: "spotify" | "apple" | "ytmusic" | "youtube" | "tidal";
}

function ActiveScreen({
  route,
  mood,
  duration,
  activity,
  mapTheme,
  walkingSpeed,
  runningSpeed,
  onComplete,
  userLocation,
  setUserLocation,
  usingCustomLocation,
  setUsingCustomLocation,
  locationName,
  setLocationName,
  musicProvider,
}: ActiveScreenProps) {
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [liveDistance, setLiveDistance] = useState(0);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [paused]);

  const targetSeconds = duration * 60;
  const percentElapsed = Math.min((seconds / targetSeconds) * 100, 100);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <section className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-accent animate-pulse">
            Journey in progress
          </p>
          <h2 className="text-2xl font-bold tracking-tight">Enjoy the Rhythm</h2>
        </div>

        {/* Circular Timer Visual */}
        <div className="relative flex items-center justify-center">
          <CircularProgress percent={percentElapsed} size={64} strokeWidth={4.5} />
          <div className="absolute flex flex-col items-center">
            <span className="text-[10px] font-semibold tracking-wide text-foreground/95">
              {Math.round(percentElapsed)}%
            </span>
          </div>
        </div>
      </div>

      {/* Live Map with Real-time GPS/Breadcrumbs Tracking */}
      <MoodMap
        mood={mood}
        duration={duration}
        activity={activity}
        mapTheme={mapTheme}
        walkingSpeed={walkingSpeed}
        runningSpeed={runningSpeed}
        liveTracking={true}
        onDistanceChange={setLiveDistance}
        routeCenter={userLocation}
        setRouteCenter={setUserLocation}
        usingCustomLocation={usingCustomLocation}
        setUsingCustomLocation={setUsingCustomLocation}
        locationName={locationName}
        setLocationName={setLocationName}
      />

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur flex flex-col justify-between">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Elapsed Time
          </div>
          <div className="mt-2 text-3xl font-bold font-mono text-foreground">
            {formatTime(seconds)}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            Target: {duration} mins
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur flex flex-col justify-between">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Traveled
          </div>
          <div className="mt-2 text-3xl font-bold font-mono text-cyan-400">
            {liveDistance.toFixed(2)}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            Kilometers
          </div>
        </div>
      </div>

      {/* Soundtrack & Reflective Prompt Overlay */}
      <div className="rounded-2xl border border-border/60 bg-card/50 p-4.5 backdrop-blur-md space-y-3.5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Quote className="h-3.5 w-3.5 text-accent animate-pulse" />
          Mindfulness prompts
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] leading-relaxed text-muted-foreground gap-2">
            <div>
              <span className="font-semibold text-foreground/80">Ambient Soundtrack:</span> {route.soundtrack}
            </div>
            <button
              onClick={() => window.open(getMusicLaunchUrl(musicProvider, route.musicQuery), "_blank")}
              className="rounded-lg bg-accent/20 hover:bg-accent/30 text-accent px-2.5 py-1.5 text-[10px] font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <Music className="h-3 w-3 animate-pulse" />
              Open {getMusicProviderLabel(musicProvider)}
            </button>
          </div>
          <p className="text-sm italic leading-relaxed text-foreground/95 bg-background/35 p-3 rounded-xl border border-border/40">
            "{route.prompt}"
          </p>
        </div>
      </div>

      {/* Active Navigation Control panel */}
      <div className="grid grid-cols-3 gap-3">
        <Button
          onClick={() => setPaused(!paused)}
          className={`h-13 rounded-2xl font-medium border border-border/60 bg-card/50 hover:bg-card/75 text-foreground col-span-1`}
        >
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button
          onClick={onComplete}
          className="h-13 rounded-2xl bg-gradient-to-r from-accent to-primary text-background font-medium hover:opacity-95 shadow-md shadow-primary/10 col-span-2"
        >
          Complete Journey
        </Button>
      </div>
    </section>
  );
}

function CircularProgress({
  percent,
  size = 80,
  strokeWidth = 6,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke="rgba(255, 255, 255, 0.05)"
        strokeWidth={strokeWidth}
      />
      {/* Foreground progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke="url(#progressGradient)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className="transition-all duration-300 ease-out"
      />
      <defs>
        <linearGradient id="progressGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}
