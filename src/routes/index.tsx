import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
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
  Timer,
  MapPin,
  TrendingUp,
  Trophy,
  LogIn,
  LogOut,
  Check,
  Loader2,
  History,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoodMap } from "@/components/MoodMap";
import { useAuth } from "@/lib/auth";
import {
  saveJourney,
  updateJourneyFeeling,
  getJourneyHistory,
  type JourneyRecord,
} from "@/lib/journeys";
import { Capacitor } from "@capacitor/core";
import { CapacitorPedometer } from "@capgo/capacitor-pedometer";
import logoUrl from "../logo.png";

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
  | "Creative Spark"
  | "Nature Connection";

type Duration = 15 | 30 | 45 | 60;
type Activity = "Walk" | "Run";
type Step = "landing" | "mood" | "time" | "activity" | "route" | "active" | "recap" | "post";

interface JourneyData {
  seconds: number;
  distanceKm: number;
  breadcrumbs: { lat: number; lng: number }[];
  steps: number;
  routeVariant: number;
}

const MOODS: { label: Mood; icon: React.ComponentType<{ className?: string }>; hint: string }[] = [
  { label: "Calm", icon: Wind, hint: "Settle the nervous system" },
  { label: "Clear Mind", icon: Brain, hint: "Untangle the noise" },
  { label: "Energy Boost", icon: Zap, hint: "Wake the body up" },
  { label: "Reflective", icon: Moon, hint: "Sit with your thoughts" },
  { label: "Escape", icon: Compass, hint: "Step out of routine" },
  { label: "Confidence", icon: Crown, hint: "Walk a little taller" },
  { label: "Recovery", icon: Leaf, hint: "Gentle restoration" },
  { label: "Creative Spark", icon: Lightbulb, hint: "Loosen new ideas" },
  { label: "Nature Connection", icon: TreePine, hint: "Tune into natural beauty" },
];

const DURATIONS: Duration[] = [15, 30, 45, 60];

const ROUTES: Record<
  Mood,
  {
    title: string;
    summary: string;
    pace: string;
    environment: string;
    variants: {
      variantName: "Default" | "Labyrinth" | "Infinity";
      soundtrack: string;
      prompt: string;
      musicQuery: string;
    }[];
  }
> = {
  Calm: {
    title: "Quiet Reset Loop",
    summary:
      "A gentle route designed to reduce noise, slow your breathing, and help you decompress.",
    pace: "Easy, unhurried",
    environment: "Tree-lined streets, parks, low traffic roads",
    variants: [
      {
        variantName: "Default",
        soundtrack: "Soft piano, ambient electronic, mellow acoustic",
        prompt: "What thought are you ready to leave behind on this walk?",
        musicQuery: "Soft piano ambient mellow acoustic walking",
      },
      {
        variantName: "Labyrinth",
        soundtrack: "Low-frequency binaural beats, deep space soundscape",
        prompt:
          "Focus completely on the texture of the ground under your feet. How does each step land?",
        musicQuery: "Binaural beats deep space soundscape grounding",
      },
      {
        variantName: "Infinity",
        soundtrack: "Bilateral stimulation tones, calming stream ambient",
        prompt:
          "Name three things in your visual field that are green or blue. Notice their specific shade.",
        musicQuery: "Bilateral stimulation audio calm nature stream",
      },
    ],
  },
  "Clear Mind": {
    title: "Open Sky Stretch",
    summary:
      "A linear route with long sightlines and minimal turns so your mind can untangle itself.",
    pace: "Steady, rhythmic",
    environment: "Wide promenades, riverside paths, open horizons",
    variants: [
      {
        variantName: "Default",
        soundtrack: "Lo-fi beats, minimal ambient, light instrumental",
        prompt: "What question keeps circling back to you lately?",
        musicQuery: "Lofi chill minimal focus instrumental beats",
      },
      {
        variantName: "Labyrinth",
        soundtrack: "Deep theta wave soundscapes, calming Tibetan bowls",
        prompt:
          "Count your breaths up to 4 and back down. Inhale... Exhale... Let the count quiet the background noise.",
        musicQuery: "Theta wave soundscapes calming tibetan singing bowls",
      },
      {
        variantName: "Infinity",
        soundtrack: "Bilateral ambient synth sweeps, gentle wind chimes",
        prompt:
          "Observe the farthest point on the horizon. Walk toward it, imagining your thoughts expanding into that open space.",
        musicQuery: "Bilateral panning ambient synth sweeps relaxing chimes",
      },
    ],
  },
  "Energy Boost": {
    title: "Sunrise Pulse Route",
    summary: "Mild inclines and busier streets to wake the body up and lift your tempo.",
    pace: "Brisk and lively",
    environment: "City blocks, bright avenues, gentle hills",
    variants: [
      {
        variantName: "Default",
        soundtrack: "Upbeat indie, funky electronic, modern pop",
        prompt: "What's one thing you're ready to bring fresh energy to today?",
        musicQuery: "Upbeat energetic indie electronic running",
      },
      {
        variantName: "Labyrinth",
        soundtrack: "Synthwave rhythm, high-tempo retro beats",
        prompt:
          "Match the tempo of your feet to the beat. Feel the direct power of each stride pushing you forward.",
        musicQuery: "Upbeat synthwave retrowave high tempo dynamic drive",
      },
      {
        variantName: "Infinity",
        soundtrack: "Driving tribal drums, melodic house loops",
        prompt:
          "Take a deep breath and raise your posture. What is one positive action you will take in the next three hours?",
        musicQuery: "Driving tribal organic house progressive melodic beats",
      },
    ],
  },
  Reflective: {
    title: "Slow Lantern Path",
    summary: "A meandering loop with quiet pockets to let memories and thoughts surface gently.",
    pace: "Slow, attentive",
    environment: "Old neighborhoods, lit alleys, garden paths",
    variants: [
      {
        variantName: "Default",
        soundtrack: "Piano sketches, neoclassical, ambient warmth",
        prompt: "What moment from the past month deserves a second look?",
        musicQuery: "Neoclassical piano warm ambient reflection",
      },
      {
        variantName: "Labyrinth",
        soundtrack: "Slow acoustic guitar strings, cinematic cello",
        prompt:
          "Recall a moment recently where you felt fully at ease. What did it feel like in your chest?",
        musicQuery: "Slow acoustic instrumental guitar neoclassical cello",
      },
      {
        variantName: "Infinity",
        soundtrack: "Atmospheric ambient chimes, rain and piano tape loop",
        prompt:
          "Think of one thing that went differently than planned, but taught you something valuable. How did you grow?",
        musicQuery: "Rain ambient tape loop neoclassical piano chillout",
      },
    ],
  },
  Escape: {
    title: "Off-Map Wander",
    summary: "An unfamiliar loop chosen to break routine and let curiosity lead the way.",
    pace: "Curious, drifting",
    environment: "New neighborhoods, hidden side streets, unfamiliar corners",
    variants: [
      {
        variantName: "Default",
        soundtrack: "World instrumentals, cinematic ambient, dreamy synths",
        prompt: "If today wasn't yours yet, what would you do with the next hour?",
        musicQuery: "Dreamy synths cinematic electronic wander",
      },
      {
        variantName: "Labyrinth",
        soundtrack: "Space ambient drones, mysterious cosmic pads",
        prompt:
          "Turn down an unfamiliar path or look closely at a building you usually ignore. What details reveal themselves?",
        musicQuery: "Cosmic space ambient drone synth explorer soundtrack",
      },
      {
        variantName: "Infinity",
        soundtrack: "Psych-rock guitar delays, ethereal vocal layers",
        prompt:
          "Let yourself step out of your regular story. Who are you when you are completely anonymous on these streets?",
        musicQuery: "Psych rock guitar delays ambient chill psychedelic dream pop",
      },
    ],
  },
  Confidence: {
    title: "Tall Step Avenue",
    summary: "A bold, open route along main streets to help you reclaim your posture and presence.",
    pace: "Strong and grounded",
    environment: "Wide avenues, plazas, well-lit boulevards",
    variants: [
      {
        variantName: "Default",
        soundtrack: "Cinematic strings, modern soul, driving electronic",
        prompt: "What would you do today if you fully trusted yourself?",
        musicQuery: "Driving modern soul upbeat confidence walk",
      },
      {
        variantName: "Labyrinth",
        soundtrack: "Powerful orchestral brass, cinematic build-ups",
        prompt:
          "Roll your shoulders back and stride with intent. Imagine your footprint leaving a solid mark of presence.",
        musicQuery: "Cinematic epic orchestral brass hybrid electronic motivation",
      },
      {
        variantName: "Infinity",
        soundtrack: "Funky basslines, disco-soul grooves",
        prompt:
          "Recall a major obstacle you successfully overcame. Feel that same resilience moving through your body right now.",
        musicQuery: "Upbeat funky basslines disco soul groove stroll",
      },
    ],
  },
  Recovery: {
    title: "Soft Green Loop",
    summary: "A short, level route through quiet greenery to ease the body back to itself.",
    pace: "Very gentle, restorative",
    environment: "Flat parks, garden paths, shaded sidewalks",
    variants: [
      {
        variantName: "Default",
        soundtrack: "Nature sounds, warm ambient, slow acoustic",
        prompt: "What does your body need you to hear right now?",
        musicQuery: "Healing nature sounds warm ambient restore",
      },
      {
        variantName: "Labyrinth",
        soundtrack: "Soft harp strings, healing 432Hz solfeggio tones",
        prompt:
          "Soften your jaw, your forehead, and your shoulders. Allow your pace to be completely effortless.",
        musicQuery: "Soft harp healing 432hz solfeggio frequency peace",
      },
      {
        variantName: "Infinity",
        soundtrack: "Forest birds ambient, gentle acoustic lullaby",
        prompt:
          "Inhale slowly for a count of 4, and let the exhale carry out any physical tension. Let yourself just be.",
        musicQuery: "Gentle acoustic guitar sleeping forest birds sounds",
      },
    ],
  },
  "Creative Spark": {
    title: "Bright Detour Route",
    summary: "A varied loop with new textures, colors, and corners to nudge fresh ideas loose.",
    pace: "Light, exploratory",
    environment: "Murals, markets, mixed neighborhoods, color-rich streets",
    variants: [
      {
        variantName: "Default",
        soundtrack: "Jazz fusion, playful electronic, indie psych",
        prompt: "What half-formed idea wants a little more room today?",
        musicQuery: "Jazz fusion playful electronic creative flow",
      },
      {
        variantName: "Labyrinth",
        soundtrack: "Upbeat glitch-hop, playful 8-bit chiptune",
        prompt:
          "Look for two objects of completely contrasting colors placed next to each other. What story do they suggest?",
        musicQuery: "Playful glitch hop lofi chiptune retro video game creative",
      },
      {
        variantName: "Infinity",
        soundtrack: "Abstract synth arpeggios, progressive ambient beats",
        prompt:
          "Combine two completely unrelated concepts in your head (e.g., a clock and a cloud). What new invention could they make?",
        musicQuery: "Abstract modular synth arpeggios progressive math rock chill",
      },
    ],
  },
  "Nature Connection": {
    title: "Nature Scenic Trail",
    summary:
      "A breathtaking route tracing lakesides, green spaces, and scenic viewpoints to immerse yourself in the natural landscape.",
    pace: "Easy, immersive",
    environment: "Lakeside trails, national parks, scenic green areas",
    variants: [
      {
        variantName: "Default",
        soundtrack: "Deep acoustic strings, warm neoclassical chamber music",
        prompt:
          "Notice the oldest tree or rock in your sightline. What stories do you think it has stood through?",
        musicQuery: "Acoustic deep ambient warm neoclassical strings scenic",
      },
      {
        variantName: "Labyrinth",
        soundtrack: "Forest canopy bird songs, deep solfeggio ambient",
        prompt:
          "Coordinate your breathing to the rustle of the leaves or the wind. Feel the solid earth push back under each stride.",
        musicQuery: "Forest canopy bird songs healing solfeggio ambient peace",
      },
      {
        variantName: "Infinity",
        soundtrack: "Lakeside stream audio, soothing crystal singing bowls",
        prompt:
          "Let your gaze rest on the horizon or water surface. Walk imagining your thoughts expanding into the open landscape.",
        musicQuery: "Lakeside stream soothing crystal singing bowls meditation",
      },
    ],
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

const SCENIC_HOTSPOTS = [
  { name: "Windermere, Lake District", lat: 54.3643, lng: -2.9207, radiusMiles: 10 },
  { name: "Hyde Park, London", lat: 51.5073, lng: -0.1656, radiusMiles: 2 },
  { name: "Central Park, New York", lat: 40.7851, lng: -73.9683, radiusMiles: 2 },
];

function useScenicDetector(
  userLocation: { lat: number; lng: number } | null,
): { name: string } | null {
  const [scenicSpot, setScenicSpot] = useState<{ name: string } | null>(null);

  useEffect(() => {
    if (!userLocation) {
      setScenicSpot(null);
      return;
    }

    // 1. Hotspots lookup (distance-based)
    const matchedHotspot = SCENIC_HOTSPOTS.find((spot) => {
      const dist = calculateDistanceMiles(userLocation.lat, userLocation.lng, spot.lat, spot.lng);
      return dist <= spot.radiusMiles;
    });

    if (matchedHotspot) {
      setScenicSpot({ name: matchedHotspot.name });
      return;
    }

    // 2. OpenStreetMap Nominatim reverse geocoding fallback
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${userLocation.lat}&lon=${userLocation.lng}&format=json&zoom=10`;
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.address) {
            const addr = data.address;
            const county = addr.county || "";
            const district = addr.state_district || addr.suburb || addr.city || "";

            const searchStr = `${county} ${district} ${data.display_name || ""}`.toLowerCase();
            const keywords = [
              "lake district",
              "national park",
              "forest",
              "reserve",
              "nature",
              "valley",
              "lake",
              "park",
            ];
            const isScenic = keywords.some((kw) => searchStr.includes(kw));

            if (isScenic) {
              const parsedName = county || district || "Beautiful Scenic Spot";
              setScenicSpot({ name: parsedName });
            } else {
              setScenicSpot(null);
            }
          }
        })
        .catch((err) => {
          console.warn("Reverse geocoding scenic lookup failed:", err.message);
          setScenicSpot(null);
        });
    } catch (err) {
      console.warn("Reverse geocoding initiation failed:", err);
      setScenicSpot(null);
    }
  }, [userLocation]);

  return scenicSpot;
}

function MoodMiles() {
  const { user, signInWithGoogle, signOut, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>("landing");
  const [mood, setMood] = useState<Mood | null>(null);
  const [duration, setDuration] = useState<Duration | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [postFeel, setPostFeel] = useState<"Better" | "Same" | "Worse" | null>(null);
  const [journeyData, setJourneyData] = useState<JourneyData | null>(null);
  const [savedJourneyId, setSavedJourneyId] = useState<string | null>(null);
  const [routeVariant, setRouteVariant] = useState<number>(0);

  const handleLaunchScenic = (spotName: string) => {
    setMood("Nature Connection");
    setDuration(30);
    setActivity("Walk");
    setStep("route");
    setLocationName(`${spotName} Scenic Trail`);
  };

  // Database-Backed Reinforcement Learning: Solve active route variant
  useEffect(() => {
    if (!mood) {
      setRouteVariant(0);
      return;
    }
    if (!user) {
      setRouteVariant(0);
      return;
    }
    getJourneyHistory(user.id)
      .then((history) => {
        const lastJourney = history.find((j) => j.mood === mood);
        if (!lastJourney) {
          setRouteVariant(0);
        } else {
          const lastVariant = lastJourney.route_variant || 0;
          if (lastJourney.post_feeling === "Same" || lastJourney.post_feeling === "Worse") {
            setRouteVariant((lastVariant + 1) % 3);
          } else {
            setRouteVariant(lastVariant);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to resolve route variant:", err);
        setRouteVariant(0);
      });
  }, [mood, user]);

  // User Preferences
  const [mapTheme, setMapTheme] = useState<"real" | "cyberpunk">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("moodmiles_map_theme") as "real" | "cyberpunk") || "real";
    }
    return "real";
  });
  const [walkingSpeed, setWalkingSpeed] = useState<"slow" | "normal" | "brisk">(() => {
    if (typeof window !== "undefined") {
      return (
        (localStorage.getItem("moodmiles_walking_speed") as "slow" | "normal" | "brisk") || "normal"
      );
    }
    return "normal";
  });
  const [runningSpeed, setRunningSpeed] = useState<"jog" | "fast" | "sprint">(() => {
    if (typeof window !== "undefined") {
      return (
        (localStorage.getItem("moodmiles_running_speed") as "jog" | "fast" | "sprint") || "fast"
      );
    }
    return "fast";
  });
  const [musicProvider, setMusicProvider] = useState<
    "spotify" | "apple" | "ytmusic" | "youtube" | "tidal"
  >(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("moodmiles_music_provider") as any) || "spotify";
    }
    return "spotify";
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Geolocated / Custom Location states hoisted to parent so it is shared across both planning and active screens
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const scenicSpot = useScenicDetector(userLocation);
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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [usingCustomLocation, userLocation]);

  const route = useMemo(() => (mood ? ROUTES[mood] : null), [mood]);

  const reset = () => {
    setStep("landing");
    setMood(null);
    setDuration(null);
    setActivity(null);
    setPostFeel(null);
    setJourneyData(null);
    setSavedJourneyId(null);
    setUserLocation(null);
    setUsingCustomLocation(false);
    setRouteVariant(0);
  };

  const handleReWalk = (j: JourneyRecord) => {
    setMood(j.mood as Mood);
    setDuration(j.duration as Duration);
    setActivity(j.activity as Activity);
    setRouteVariant(j.route_variant || 0);
    if (j.breadcrumbs && j.breadcrumbs.length > 0) {
      setUserLocation(j.breadcrumbs[0]);
      setUsingCustomLocation(true);
      setLocationName("Re-walk Start Point");
    }
    setStep("route");
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Ambient gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-accent/25 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 h-[32rem] w-[32rem] rounded-full bg-primary/20 blur-[140px]" />
        <div className="absolute bottom-0 left-1/2 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-chart-3/15 blur-[120px]" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <Header
          step={step}
          onBack={() => stepBack(step, setStep)}
          onReset={reset}
          onOpenSettings={() => setSettingsOpen(true)}
          user={user}
        />

        <div className="mt-6 flex-1">
          {step === "landing" && (
            <Landing
              onStart={() => setStep("mood")}
              user={user}
              authLoading={authLoading}
              onSignIn={signInWithGoogle}
              onReWalk={handleReWalk}
            />
          )}
          {step === "mood" && (
            <MoodStep
              selected={mood}
              onSelect={(m) => {
                setMood(m);
                setTimeout(() => setStep("time"), 180);
              }}
              scenicSpot={scenicSpot}
              onLaunchScenic={() => {
                if (scenicSpot) {
                  handleLaunchScenic(scenicSpot.name);
                }
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
              routeVariant={routeVariant}
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
              onComplete={(data) => {
                setJourneyData(data);
                setStep("recap");
              }}
              routeVariant={routeVariant}
            />
          )}
          {step === "recap" && journeyData && mood && route && (
            <RecapScreen
              journeyData={journeyData}
              mood={mood}
              routeTitle={route.title}
              activity={activity!}
              duration={duration!}
              user={user}
              onJourneySaved={setSavedJourneyId}
              onContinue={() => setStep("post")}
            />
          )}
          {step === "post" && mood && (
            <PostScreen
              mood={mood}
              feel={postFeel}
              onSelect={setPostFeel}
              onDone={reset}
              savedJourneyId={savedJourneyId}
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
                    const label =
                      spd === "slow" ? "3.5 km/h" : spd === "normal" ? "4.8 km/h" : "6.0 km/h";
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
                    const label =
                      spd === "jog" ? "8.0 km/h" : spd === "fast" ? "10.5 km/h" : "13.0 km/h";
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

            {/* Account Section */}
            {user && (
              <div className="mt-5 space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Account
                </span>
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/30 p-3">
                  {user.user_metadata?.avatar_url && (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt=""
                      className="h-8 w-8 rounded-full border border-border/40"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">
                      {user.user_metadata?.full_name || user.email}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
                  </div>
                  <button
                    onClick={async () => {
                      await signOut();
                      setSettingsOpen(false);
                    }}
                    className="rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition flex items-center gap-1"
                  >
                    <LogOut className="h-3 w-3" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}

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
  const order: Step[] = ["landing", "mood", "time", "activity", "route", "active", "recap", "post"];
  const idx = order.indexOf(step);
  if (idx > 0) setStep(order[idx - 1]);
}

function Header({
  step,
  onBack,
  onReset,
  onOpenSettings,
  user,
}: {
  step: Step;
  onBack: () => void;
  onReset: () => void;
  onOpenSettings: () => void;
  user: import("@supabase/supabase-js").User | null;
}) {
  const showBack = step !== "landing" && step !== "post" && step !== "recap";
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
        <img
          src={logoUrl}
          alt="MoodMiles Logo"
          className="h-7 w-7 object-contain rounded-full border border-border/40"
        />
        <span className="text-sm font-medium tracking-wide">MoodMiles</span>
      </div>
      <div className="flex items-center gap-2">
        {user?.user_metadata?.avatar_url && (
          <img
            src={user.user_metadata.avatar_url}
            alt=""
            className="h-8 w-8 rounded-full border-2 border-primary/40 shadow-sm"
          />
        )}
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

function MiniJourneyMap({ breadcrumbs }: { breadcrumbs: { lat: number; lng: number }[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined" || breadcrumbs.length < 1 || !containerRef.current) return;

    let map: any = null;

    import("leaflet").then((L) => {
      if (!containerRef.current || mapRef.current) return;

      map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 20,
      }).addTo(map);

      const pathCoords = breadcrumbs.map((pt) => [pt.lat, pt.lng]) as any[];
      const polyline = L.polyline(pathCoords, {
        color: "#06b6d4",
        weight: 3.5,
        opacity: 0.9,
        lineJoin: "round",
      }).addTo(map);

      // Add a small emerald dot for starting point
      const startIcon = L.divIcon({
        className: "mini-start-marker",
        html: `<div style="height: 6px; width: 6px; border-radius: 9999px; background-color: #10b981; border: 1.5px solid #ffffff; box-shadow: 0 0 6px #10b981;"></div>`,
        iconSize: [8, 8],
        iconAnchor: [4, 4],
      });
      L.marker(pathCoords[0], { icon: startIcon }).addTo(map);

      map.fitBounds(polyline.getBounds(), { padding: [10, 10] });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [breadcrumbs]);

  return (
    <div
      ref={containerRef}
      className="h-28 w-full rounded-xl border border-border/40 bg-background shadow-inner overflow-hidden"
    />
  );
}

function CircularProgressRing({
  percent,
  size = 52,
  strokeWidth = 4,
  color = "stroke-primary",
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="rotate-[-90deg] shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke="rgba(255, 255, 255, 0.05)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke="currentColor"
        className={`${color} transition-all duration-500 ease-out`}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
      />
    </svg>
  );
}

function Landing({
  onStart,
  user,
  authLoading,
  onSignIn,
  onReWalk,
}: {
  onStart: () => void;
  user: import("@supabase/supabase-js").User | null;
  authLoading: boolean;
  onSignIn: () => Promise<void>;
  onReWalk: (journey: JourneyRecord) => void;
}) {
  const [journeys, setJourneys] = useState<JourneyRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "analytics" | "milestones">("history");
  const [expandedJourneyId, setExpandedJourneyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setJourneys([]);
      return;
    }
    setLoadingHistory(true);
    getJourneyHistory(user.id)
      .then((data) => {
        setJourneys(data);
      })
      .catch((err) => {
        console.error("Failed to load history:", err);
      })
      .finally(() => {
        setLoadingHistory(false);
      });
  }, [user]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, "0")}`;
  };

  const feelingColor = (f: string | null) => {
    if (f === "Better") return "text-emerald-400";
    if (f === "Same") return "text-amber-400";
    if (f === "Worse") return "text-red-400";
    return "text-muted-foreground";
  };

  // Dynamic Shift Analytics Engine
  const shiftStats = useMemo(() => {
    const stats: Record<string, { better: number; same: number; worse: number; total: number }> =
      {};
    journeys.forEach((j) => {
      if (!j.mood) return;
      if (!stats[j.mood]) {
        stats[j.mood] = { better: 0, same: 0, worse: 0, total: 0 };
      }
      stats[j.mood].total += 1;
      if (j.post_feeling === "Better") stats[j.mood].better += 1;
      else if (j.post_feeling === "Same") stats[j.mood].same += 1;
      else if (j.post_feeling === "Worse") stats[j.mood].worse += 1;
    });
    return stats;
  }, [journeys]);

  // Mood Catalysts Solver
  const catalyst = useMemo(() => {
    if (journeys.length === 0) return null;
    const combos: Record<
      string,
      { better: number; total: number; duration: number; activity: string; variant: number }
    > = {};

    journeys.forEach((j) => {
      const key = `${j.activity}-${j.duration}-${j.route_variant || 0}`;
      if (!combos[key]) {
        combos[key] = {
          better: 0,
          total: 0,
          duration: j.duration,
          activity: j.activity,
          variant: j.route_variant || 0,
        };
      }
      combos[key].total += 1;
      if (j.post_feeling === "Better") combos[key].better += 1;
    });

    const sorted = Object.values(combos).sort((a, b) => {
      const pctA = a.better / a.total;
      const pctB = b.better / b.total;
      if (pctA !== pctB) return pctB - pctA;
      return b.better - a.better;
    });

    const best = sorted[0];
    if (!best || best.better === 0) return null;

    const variantName =
      best.variant === 1 ? "Labyrinth" : best.variant === 2 ? "Infinity" : "Default";
    return `Your fastest emotional lift happens during ${best.duration}-minute ${best.activity.toLowerCase()}s walking the ${variantName} loop.`;
  }, [journeys]);

  // Mindfulness Milestones Computations
  const calmSteps = useMemo(() => {
    return journeys
      .filter((j) => j.mood === "Calm" || j.mood === "Recovery")
      .reduce((sum, j) => sum + (j.steps || 0), 0);
  }, [journeys]);

  const energyMiles = useMemo(() => {
    const energyKm = journeys
      .filter((j) => j.mood === "Energy Boost" || j.mood === "Confidence")
      .reduce((sum, j) => sum + (Number(j.distance_km) || 0), 0);
    return energyKm * 0.621371; // km to miles
  }, [journeys]);

  const windingWalks = useMemo(() => {
    return journeys.filter((j) => (j.route_variant || 0) > 0).length;
  }, [journeys]);

  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }
    return days;
  }, []);

  const weeklyData = useMemo(() => {
    const data = last7Days.map((day) => {
      const dayWalks = journeys.filter((j) => {
        const walkDate = new Date(j.completed_at);
        return (
          walkDate.getDate() === day.getDate() &&
          walkDate.getMonth() === day.getMonth() &&
          walkDate.getFullYear() === day.getFullYear()
        );
      });

      const totalSteps = dayWalks.reduce((sum, j) => sum + (j.steps || 0), 0);

      const moodScores = dayWalks
        .map((j) => {
          if (j.post_feeling === "Better") return 100;
          if (j.post_feeling === "Same") return 50;
          if (j.post_feeling === "Worse") return 0;
          return null;
        })
        .filter((score) => score !== null) as number[];

      const avgMoodScore =
        moodScores.length > 0 ? moodScores.reduce((sum, s) => sum + s, 0) / moodScores.length : 0;

      return {
        label: day.toLocaleDateString("en-GB", { weekday: "short" }),
        steps: totalSteps,
        moodScore: avgMoodScore,
        count: dayWalks.length,
      };
    });

    const maxSteps = Math.max(...data.map((d) => d.steps), 5000);

    return { data, maxSteps };
  }, [journeys, last7Days]);

  return (
    <section className="flex h-full flex-col items-center justify-between pt-10 text-center">
      <div className="space-y-8">
        <div className="relative mx-auto h-44 w-44">
          <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-accent/40 via-primary/30 to-chart-3/30 blur-2xl" />
          <div className="relative flex h-full w-full items-center justify-center rounded-full border border-border/40 bg-transparent overflow-hidden">
            <img src={logoUrl} alt="MoodMiles Logo" className="h-full w-full object-contain" />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">MoodMiles</p>
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-foreground">
            Walk how you want to feel.
          </h1>
          <p className="mx-auto max-w-xs text-balance text-sm leading-relaxed text-muted-foreground">
            Forget calories and pace. Choose a mood, choose your minutes, and we'll shape a route
            around how you want to arrive home.
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

        {!user && !authLoading && (
          <button
            onClick={onSignIn}
            className="mx-auto flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-4 py-2 text-xs text-muted-foreground backdrop-blur transition hover:text-foreground hover:border-border cursor-pointer"
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign in with Google to save journeys
          </button>
        )}

        {user && (
          <p className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 font-medium">
            <Check className="h-3 w-3 text-emerald-400" />
            Signed in as {user.user_metadata?.full_name || user.email}
          </p>
        )}

        {!user && authLoading && (
          <p className="text-center text-[11px] text-muted-foreground">Connecting...</p>
        )}
      </div>

      {/* Interactive Tabs Dashboard Section */}
      {user && (
        <div className="mt-10 w-full text-left space-y-5">
          {/* Tabs bar */}
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-card/55 p-1 border border-border/50 backdrop-blur-md shadow-sm">
            {(["history", "analytics", "milestones"] as const).map((tab) => {
              const label =
                tab === "history"
                  ? "My Walks"
                  : tab === "analytics"
                    ? "Mood Analytics"
                    : "Milestones";
              const Icon = tab === "history" ? History : tab === "analytics" ? TrendingUp : Trophy;
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-semibold tracking-wide transition cursor-pointer ${
                    active
                      ? "bg-gradient-to-r from-accent to-primary text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/15"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">
                    {tab === "history" ? "Walks" : tab === "analytics" ? "Moods" : "Badges"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: HISTORY (GPS Recall Drawer) */}
          {activeTab === "history" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <History className="h-4 w-4 text-accent" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  History Log
                </span>
                {journeys.length > 0 && (
                  <span className="ml-auto text-[10px] text-muted-foreground/60">
                    {journeys.length} total
                  </span>
                )}
              </div>

              {loadingHistory && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {!loadingHistory && journeys.length === 0 && (
                <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur text-center">
                  <p className="text-xs text-muted-foreground">
                    No journeys recorded yet. Complete your first loop to start tracking.
                  </p>
                </div>
              )}

              {!loadingHistory && journeys.length > 0 && (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {journeys.map((j) => {
                    const isExpanded = expandedJourneyId === j.id;
                    const matchedRoute = ROUTES[j.mood as Mood];
                    const currentVariant =
                      matchedRoute?.variants[j.route_variant || 0] || matchedRoute?.variants[0];
                    const promptText =
                      currentVariant?.prompt || "Focus on the rhythm of your strides.";

                    return (
                      <div
                        key={j.id}
                        onClick={() => setExpandedJourneyId(isExpanded ? null : j.id)}
                        className={`rounded-2xl border border-border/60 bg-card/40 p-4.5 backdrop-blur transition-all duration-300 cursor-pointer hover:border-border/80 ${
                          isExpanded ? "border-primary/50 bg-card/60 shadow-md" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold truncate text-foreground/95">
                              {j.route_title}
                            </h3>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 font-medium">
                              <Clock className="h-3 w-3" />
                              {formatDate(j.completed_at)}
                            </div>
                          </div>
                          {j.post_feeling && (
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${feelingColor(j.post_feeling)}`}
                            >
                              {j.post_feeling}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[10px] flex-wrap mt-2.5">
                          <span className="rounded-full border border-border/60 bg-background/30 px-2 py-0.5 text-foreground/80 font-medium">
                            {j.mood}
                          </span>
                          <span className="text-muted-foreground font-semibold">
                            {formatDuration(j.elapsed_seconds)}
                          </span>
                          <span className="text-muted-foreground font-semibold">
                            {Number(j.distance_km).toFixed(2)} km
                          </span>
                          {j.steps !== undefined && j.steps !== null && (
                            <span className="text-muted-foreground font-semibold flex items-center gap-0.5">
                              <Footprints className="h-3 w-3 text-emerald-400 shrink-0" />
                              {j.steps.toLocaleString()}
                            </span>
                          )}
                          {j.route_variant !== undefined &&
                            j.route_variant !== null &&
                            j.route_variant > 0 && (
                              <span className="rounded-full border border-accent/30 bg-accent/15 text-accent font-semibold px-2 py-0.5 text-[9px]">
                                {j.route_variant === 1 ? "Labyrinth" : "Infinity"}
                              </span>
                            )}
                          <span className="rounded-full border border-border/60 bg-background/30 px-2 py-0.5 text-foreground/80 font-medium ml-auto">
                            {j.activity}
                          </span>
                        </div>

                        {/* Expandable Mini Map Drawer / Accordion */}
                        {isExpanded && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="pt-3.5 border-t border-border/40 mt-3.5 space-y-3.5 animate-in slide-in-from-top-2 duration-300"
                          >
                            {j.breadcrumbs && j.breadcrumbs.length > 1 ? (
                              <MiniJourneyMap breadcrumbs={j.breadcrumbs} />
                            ) : (
                              <div className="h-28 w-full rounded-xl border border-border/40 bg-background/20 flex flex-col items-center justify-center text-[10px] text-muted-foreground">
                                <MapPin className="h-5 w-5 text-muted-foreground/35 mb-1" />
                                No GPS trail recorded
                              </div>
                            )}

                            <div className="rounded-xl bg-background/35 p-3 border border-border/40 space-y-1">
                              <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                                <Quote className="h-3 w-3" />
                                Mindful Meditation Focus
                              </div>
                              <p className="text-xs italic text-foreground/90 leading-relaxed">
                                "{promptText}"
                              </p>
                            </div>

                            <Button
                              onClick={() => onReWalk(j)}
                              className="w-full h-10.5 rounded-xl bg-gradient-to-r from-accent to-primary text-xs font-semibold text-background hover:opacity-95 shadow transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Navigation className="h-3.5 w-3.5 fill-background animate-pulse" />
                              Re-walk This Trail (Recall GPS)
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ANALYTICS (Mood Shift Heatmap & Catalyst Highlights) */}
          {activeTab === "analytics" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Mood Shift Matrix
                </span>
              </div>

              {/* Mood Catalyst Discovery Header */}
              {catalyst && (
                <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-accent/15 via-primary/10 to-chart-3/10 p-4.5 shadow-sm shadow-primary/5 animate-in fade-in duration-300">
                  <div className="absolute inset-0 -z-10 animate-pulse bg-gradient-to-tr from-accent/5 to-transparent blur-xl" />
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-primary/30">
                      <Sparkles className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-primary">
                        Your Mood Catalyst
                      </span>
                      <p className="text-xs font-semibold leading-relaxed text-foreground/95">
                        {catalyst}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Shift matrix bars */}
              {Object.keys(shiftStats).length === 0 ? (
                <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur text-center text-xs text-muted-foreground">
                  Complete a few journeys with varying post-feelings to unlock detailed shift
                  analytics.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {Object.entries(shiftStats).map(([startMood, stats]) => {
                    const betterPct = Math.round((stats.better / stats.total) * 100);
                    const samePct = Math.round((stats.same / stats.total) * 100);
                    const worsePct = Math.round((stats.worse / stats.total) * 100);

                    return (
                      <div
                        key={startMood}
                        className="rounded-2xl border border-border/60 bg-card/40 p-4.5 backdrop-blur space-y-3.5 shadow-sm"
                      >
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-bold text-foreground/90">
                            {startMood} walks
                          </span>
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            {stats.total} total {stats.total === 1 ? "journey" : "journeys"}
                          </span>
                        </div>

                        {/* Multi-Segmented Custom Heatbar */}
                        <div className="h-2.5 w-full rounded-full bg-muted-foreground/5 flex overflow-hidden border border-border/40">
                          {stats.better > 0 && (
                            <div
                              style={{ width: `${betterPct}%` }}
                              className="h-full bg-emerald-400 shadow-sm"
                            />
                          )}
                          {stats.same > 0 && (
                            <div
                              style={{ width: `${samePct}%` }}
                              className="h-full bg-amber-400 shadow-sm"
                            />
                          )}
                          {stats.worse > 0 && (
                            <div
                              style={{ width: `${worsePct}%` }}
                              className="h-full bg-red-400 shadow-sm"
                            />
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground/90 font-bold px-0.5">
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Better: {betterPct}%
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                            Same: {samePct}%
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                            Worse: {worsePct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MILESTONES (Mindfulness Rings & Step/Mood Progress Cadence) */}
          {activeTab === "milestones" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 px-1">
                <Trophy className="h-4 w-4 text-accent" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Weekly Dashboard & Milestones
                </span>
              </div>

              {/* Steps vs Mood Weekly Progress Visual Chart */}
              <div className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Weekly Step Cadence & Mood Balance
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-2 pt-2 items-end h-44">
                  {weeklyData.data.map((d, idx) => {
                    const stepsHeight = (d.steps / weeklyData.maxSteps) * 100;
                    const moodColor =
                      d.moodScore >= 75
                        ? "bg-emerald-400"
                        : d.moodScore >= 40
                          ? "bg-amber-400"
                          : d.moodScore > 0
                            ? "bg-red-400"
                            : "bg-muted-foreground/10";

                    return (
                      <div
                        key={idx}
                        className="flex flex-col items-center gap-2 h-full justify-end group relative cursor-pointer"
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border/80 p-2.5 rounded-xl text-[10px] space-y-0.5 shadow-xl pointer-events-none z-50 w-24 text-center">
                          <div className="font-bold text-foreground">
                            {d.steps.toLocaleString()} steps
                          </div>
                          {d.count > 0 && (
                            <div
                              className={`${d.moodScore >= 75 ? "text-emerald-400" : "text-amber-400"} font-bold`}
                            >
                              {d.moodScore}% Mood Lift
                            </div>
                          )}
                          {d.count === 0 && (
                            <div className="text-muted-foreground/60">No walks</div>
                          )}
                        </div>

                        {/* Chart Columns */}
                        <div className="w-full bg-muted-foreground/5 rounded-t-lg relative h-full flex flex-col justify-end overflow-hidden border border-border/20">
                          {d.steps > 0 && (
                            <div
                              style={{ height: `${stepsHeight}%` }}
                              className="w-full bg-gradient-to-t from-primary/30 to-accent/60 rounded-t-md transition-all duration-500 ease-out"
                            />
                          )}

                          {/* Mood Indicator Dot */}
                          {d.count > 0 && (
                            <div
                              style={{ bottom: `${Math.min(stepsHeight, 90)}%` }}
                              className={`absolute left-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full border border-background shadow-md ${moodColor} transition-all duration-300 animate-in zoom-in`}
                            />
                          )}
                        </div>

                        <span className="text-[10px] font-bold text-muted-foreground">
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-center gap-4 text-[10px] text-muted-foreground/80 font-bold">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-5 bg-gradient-to-r from-primary/40 to-accent/80 rounded" />
                    <span>Daily Steps</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 border border-background" />
                    <span>Positive Mood Lift</span>
                  </div>
                </div>
              </div>

              {/* Achievements Milestone List */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {/* 1. Zen Stride */}
                {(() => {
                  const goal = 100000;
                  const pct = Math.min((calmSteps / goal) * 100, 100);
                  return (
                    <div className="rounded-2xl border border-border/60 bg-card/40 p-4.5 backdrop-blur flex items-center gap-4 shadow-sm">
                      <div className="relative flex items-center justify-center shrink-0">
                        <CircularProgressRing percent={pct} color="text-emerald-400" />
                        <div className="absolute text-[9px] font-bold text-foreground">
                          {Math.round(pct)}%
                        </div>
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="text-xs font-bold text-foreground truncate">Zen Stride</h4>
                        <p className="text-[9px] text-emerald-400 uppercase tracking-wide font-bold">
                          {calmSteps.toLocaleString()} / {goal.toLocaleString()} steps
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-snug">
                          Total steps taken during Calm or Recovery sensory loops to ground your
                          body.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Spark Distance */}
                {(() => {
                  const goal = 50;
                  const pct = Math.min((energyMiles / goal) * 100, 100);
                  return (
                    <div className="rounded-2xl border border-border/60 bg-card/40 p-4.5 backdrop-blur flex items-center gap-4 shadow-sm">
                      <div className="relative flex items-center justify-center shrink-0">
                        <CircularProgressRing percent={pct} color="text-cyan-400" />
                        <div className="absolute text-[9px] font-bold text-foreground">
                          {Math.round(pct)}%
                        </div>
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="text-xs font-bold text-foreground truncate">
                          Spark Distance
                        </h4>
                        <p className="text-[9px] text-cyan-400 uppercase tracking-wide font-bold">
                          {energyMiles.toFixed(1)} / {goal.toLocaleString()} miles
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-snug">
                          Total miles logged in Energy Boost or Confidence states to drive momentum.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Winding Sage */}
                {(() => {
                  const goal = 10;
                  const pct = Math.min((windingWalks / goal) * 100, 100);
                  return (
                    <div className="rounded-2xl border border-border/60 bg-card/40 p-4.5 backdrop-blur flex items-center gap-4 shadow-sm">
                      <div className="relative flex items-center justify-center shrink-0">
                        <CircularProgressRing percent={pct} color="text-accent" />
                        <div className="absolute text-[9px] font-bold text-foreground">
                          {Math.round(pct)}%
                        </div>
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="text-xs font-bold text-foreground truncate">Winding Sage</h4>
                        <p className="text-[9px] text-accent uppercase tracking-wide font-bold">
                          {windingWalks} / {goal} walks
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-snug">
                          Total walks completed with snaking Labyrinth or Centering Infinity loops.
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function StepHeading({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="mb-6 space-y-2">
      <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{kicker}</p>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

function MoodStep({
  selected,
  onSelect,
  scenicSpot,
  onLaunchScenic,
}: {
  selected: Mood | null;
  onSelect: (m: Mood) => void;
  scenicSpot: { name: string } | null;
  onLaunchScenic: () => void;
}) {
  return (
    <section>
      <StepHeading
        kicker="Step 1 of 3"
        title="How do you want to feel?"
        sub="Pick the closest fit. You don't have to be sure."
      />

      {/* Symmetrical Scenic Suggester Banner */}
      {scenicSpot && (
        <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-accent/20 via-primary/15 to-chart-3/15 p-4.5 mb-5 shadow-md shadow-primary/5 animate-in slide-in-from-top-2 duration-300">
          <div className="absolute inset-0 -z-10 animate-pulse bg-gradient-to-tr from-accent/5 to-transparent blur-xl" />
          <div className="flex gap-3 items-center">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-primary/30">
              <TreePine className="h-4.5 w-4.5 text-primary animate-bounce" />
            </div>
            <div className="space-y-0.5 text-left min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Scenic Spot Detected
              </span>
              <p className="text-xs font-semibold leading-relaxed text-foreground/95 truncate">
                Looks like you are in {scenicSpot.name}!
              </p>
              <p className="text-[10px] text-muted-foreground/80 leading-tight">
                Tap below to launch a nature-tuned scenic loop trail around the area.
              </p>
            </div>
            <button
              onClick={onLaunchScenic}
              className="rounded-lg bg-primary/25 hover:bg-primary/40 text-primary px-3 py-1.5 text-xs font-bold cursor-pointer transition shrink-0 border border-primary/20"
            >
              Launch Trail
            </button>
          </div>
        </div>
      )}

      {/* 3x3 Symmetrical Selection Grid */}
      <div className="grid grid-cols-3 gap-3">
        {MOODS.map(({ label, icon: Icon, hint }) => {
          const active = selected === label;
          return (
            <button
              key={label}
              onClick={() => onSelect(label)}
              className={`group relative overflow-hidden rounded-2xl border p-3.5 text-left transition flex flex-col justify-between h-36 ${
                active
                  ? "border-primary/60 bg-gradient-to-br from-accent/20 to-primary/20"
                  : "border-border/60 bg-card/40 backdrop-blur hover:border-border"
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-primary/30 shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <div className="mt-2 min-w-0 w-full">
                <div className="text-xs font-bold text-foreground leading-tight truncate">
                  {label}
                </div>
                <div className="mt-1 text-[9px] leading-snug text-muted-foreground line-clamp-2">
                  {hint}
                </div>
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
  const opts: {
    label: Activity;
    icon: React.ComponentType<{ className?: string }>;
    hint: string;
  }[] = [
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
  routeVariant,
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
  routeVariant: number;
}) {
  const currentVariant = useMemo(
    () => route.variants[routeVariant] || route.variants[0],
    [route, routeVariant],
  );

  const distanceToStartMiles = useMemo(() => {
    if (!deviceLocation || !userLocation) return 0;
    return calculateDistanceMiles(
      deviceLocation.lat,
      deviceLocation.lng,
      userLocation.lat,
      userLocation.lng,
    );
  }, [deviceLocation, userLocation]);

  const showNavigationButton = usingCustomLocation && userLocation;

  const distanceLabel = useMemo(() => {
    if (!deviceLocation || !userLocation) return "";
    return ` (${distanceToStartMiles.toFixed(1)} miles away)`;
  }, [deviceLocation, userLocation, distanceToStartMiles]);

  const handleNavigateToStart = () => {
    if (!userLocation) return;
    const isApple =
      typeof navigator !== "undefined" && /Mac|iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = isApple
      ? `https://maps.apple.com/?daddr=${userLocation.lat},${userLocation.lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${userLocation.lat},${userLocation.lng}`;
    window.open(url, "_blank");
  };

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Your route</p>
        <h2 className="text-3xl font-semibold leading-tight tracking-tight">
          {route.title}
          {routeVariant === 1 ? " (Labyrinth)" : routeVariant === 2 ? " (Infinity)" : ""}
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
        routeVariant={routeVariant}
      />

      <p className="text-[15px] leading-relaxed text-foreground/85">{route.summary}</p>

      <div className="space-y-2">
        <DetailRow icon={Gauge} label="Pace" value={route.pace} />
        <DetailRow icon={TreePine} label="Environment" value={route.environment} />
        <DetailRow
          icon={Music}
          label="Soundtrack"
          value={currentVariant.soundtrack}
          action={
            <button
              onClick={() =>
                window.open(getMusicLaunchUrl(musicProvider, currentVariant.musicQuery), "_blank")
              }
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
          "{currentVariant.prompt}"
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
  savedJourneyId,
}: {
  mood: Mood;
  feel: "Better" | "Same" | "Worse" | null;
  onSelect: (f: "Better" | "Same" | "Worse") => void;
  onDone: () => void;
  savedJourneyId: string | null;
}) {
  const handleSelect = (f: "Better" | "Same" | "Worse") => {
    onSelect(f);
    if (savedJourneyId) {
      updateJourneyFeeling(savedJourneyId, f);
    }
  };
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
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">You're back</p>
        <h2 className="text-3xl font-semibold tracking-tight">How do you feel now?</h2>
        <p className="text-sm text-muted-foreground">No wrong answer. Just check in.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(["Better", "Same", "Worse"] as const).map((opt) => {
          const active = feel === opt;
          return (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
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
            <Sparkles className="h-3.5 w-3.5" />A short reflection
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-foreground/90">{reflection}</p>
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

function useCountUp(target: number, durationMs: number = 1200, delay: number = 0) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf: number;
    let startTime: number | null = null;
    const timeout = setTimeout(() => {
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(target * eased);
        if (progress < 1) {
          raf = requestAnimationFrame(animate);
        } else {
          setValue(target);
        }
      };
      raf = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [target, durationMs, delay]);

  return value;
}

function RecapScreen({
  journeyData,
  mood,
  routeTitle,
  activity,
  duration,
  user,
  onJourneySaved,
  onContinue,
}: {
  journeyData: JourneyData;
  mood: Mood;
  routeTitle: string;
  activity: Activity;
  duration: Duration;
  user: import("@supabase/supabase-js").User | null;
  onJourneySaved: (id: string | null) => void;
  onContinue: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    setSaving(true);
    saveJourney({
      mood,
      duration,
      activity,
      routeTitle,
      elapsedSeconds: journeyData.seconds,
      distanceKm: journeyData.distanceKm,
      breadcrumbs: journeyData.breadcrumbs,
      steps: journeyData.steps || 0,
      routeVariant: journeyData.routeVariant,
    }).then((id) => {
      onJourneySaved(id);
      setSaved(!!id);
      setSaving(false);
    });
  }, [user]);

  const animatedSeconds = useCountUp(journeyData.seconds, 1200, 300);
  const animatedDistance = useCountUp(journeyData.distanceKm, 1200, 500);
  const animatedSteps = useCountUp(journeyData.steps || 0, 1200, 700);

  const paceSecondsPerKm =
    journeyData.distanceKm > 0.01 ? journeyData.seconds / journeyData.distanceKm : 0;
  const animatedPace = useCountUp(paceSecondsPerKm, 1200, 700);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatPace = (secPerKm: number) => {
    if (secPerKm === 0) return "--:--";
    const mins = Math.floor(secPerKm / 60);
    const secs = Math.floor(secPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Load Leaflet and render static breadcrumb map
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      journeyData.breadcrumbs.length < 2 ||
      !mapContainerRef.current
    )
      return;

    let map: any = null;

    import("leaflet").then((L) => {
      if (!mapContainerRef.current || mapRef.current) return;

      map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 20,
      }).addTo(map);

      const pathCoords = journeyData.breadcrumbs.map((pt) => [pt.lat, pt.lng]) as [
        number,
        number,
      ][];

      const polyline = L.polyline(pathCoords, {
        color: "#06b6d4",
        weight: 4,
        opacity: 0.9,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(map);

      // Start marker
      const startIcon = L.divIcon({
        className: "recap-start-marker",
        html: `<div style="height:12px;width:12px;border-radius:9999px;background:#10b981;border:2px solid #fff;box-shadow:0 0 8px rgba(16,185,129,0.6);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      const startPt = journeyData.breadcrumbs[0];
      L.marker([startPt.lat, startPt.lng], { icon: startIcon }).addTo(map);

      // End marker
      const endPt = journeyData.breadcrumbs[journeyData.breadcrumbs.length - 1];
      if (endPt !== startPt) {
        const endIcon = L.divIcon({
          className: "recap-end-marker",
          html: `<div style="height:12px;width:12px;border-radius:9999px;background:#8b5cf6;border:2px solid #fff;box-shadow:0 0 8px rgba(139,92,246,0.6);"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        L.marker([endPt.lat, endPt.lng], { icon: endIcon }).addTo(map);
      }

      map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
      setMapReady(true);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [journeyData.breadcrumbs]);

  const hasBreadcrumbs = journeyData.breadcrumbs.length >= 2;

  return (
    <section className="space-y-6 pt-2 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-500">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-primary/30 border border-primary/20">
          <Trophy className="h-7 w-7 text-primary" />
        </div>
        <p className="text-[11px] uppercase tracking-[0.25em] text-accent">Journey Complete</p>
        <h2 className="text-3xl font-bold tracking-tight">
          {routeTitle}
          {journeyData.routeVariant === 1
            ? " (Labyrinth)"
            : journeyData.routeVariant === 2
              ? " (Infinity)"
              : ""}
        </h2>
        <div className="flex justify-center flex-wrap gap-2 pt-1">
          <Chip>{mood}</Chip>
          <Chip>{duration} min</Chip>
          <Chip>{activity}</Chip>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3" style={{ animationDelay: "300ms" }}>
        <div
          className="rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur text-center space-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
          style={{ animationDelay: "300ms" }}
        >
          <div className="flex justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
              <Timer className="h-4 w-4 text-cyan-400" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
            {formatTime(animatedSeconds)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Duration</div>
        </div>

        <div
          className="rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur text-center space-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
          style={{ animationDelay: "500ms" }}
        >
          <div className="flex justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20">
              <MapPin className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
            {animatedDistance.toFixed(2)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Kilometers
          </div>
        </div>

        <div
          className="rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur text-center space-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
          style={{ animationDelay: "700ms" }}
        >
          <div className="flex justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
              <Footprints className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
            {animatedSteps.toLocaleString()}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Steps Taken
          </div>
        </div>

        <div
          className="rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur text-center space-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
          style={{ animationDelay: "900ms" }}
        >
          <div className="flex justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20">
              <TrendingUp className="h-4 w-4 text-violet-400" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
            {formatPace(animatedPace)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pace /km</div>
        </div>
      </div>

      {/* Mini Route Map */}
      <div
        className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
        style={{ animationDelay: "800ms" }}
      >
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-accent" />
            Your trail
          </div>
        </div>
        {hasBreadcrumbs ? (
          <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-border/60 shadow-lg shadow-black/10">
            <div ref={mapContainerRef} className="absolute inset-0 h-full w-full bg-background" />
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur-sm">
                <span className="text-xs text-muted-foreground">Loading trail...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/40 backdrop-blur">
            <MapPin className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <span className="text-xs text-muted-foreground">
              No GPS trail recorded for this journey
            </span>
            <span className="text-[10px] text-muted-foreground/60 mt-1">
              Enable location access to see your route
            </span>
          </div>
        )}
      </div>

      {/* Save status + Continue Button */}
      <div
        className="animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both space-y-3"
        style={{ animationDelay: "1000ms" }}
      >
        {user && (
          <div className="flex items-center justify-center gap-1.5 text-[11px]">
            {saving && (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Saving journey...</span>
              </>
            )}
            {saved && !saving && (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400/80">Journey saved to your history</span>
              </>
            )}
          </div>
        )}
        <Button
          onClick={onContinue}
          className="h-14 w-full rounded-2xl bg-gradient-to-r from-accent to-primary text-base font-medium text-background shadow-lg shadow-primary/20 hover:opacity-95"
        >
          Continue
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
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
  onComplete: (data: JourneyData) => void;
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (coords: { lat: number; lng: number } | null) => void;
  usingCustomLocation: boolean;
  setUsingCustomLocation: (val: boolean) => void;
  locationName: string;
  setLocationName: (name: string) => void;
  musicProvider: "spotify" | "apple" | "ytmusic" | "youtube" | "tidal";
  routeVariant: number;
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
  routeVariant,
}: ActiveScreenProps) {
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [liveDistance, setLiveDistance] = useState(0);
  const [breadcrumbs, setBreadcrumbs] = useState<{ lat: number; lng: number }[]>([]);
  const [liveSteps, setLiveSteps] = useState(0);

  const currentVariant = useMemo(
    () => route.variants[routeVariant] || route.variants[0],
    [route, routeVariant],
  );

  useEffect(() => {
    let active = true;
    let isTracking = false;
    let listenerHandle: any = null;

    async function startPedometer() {
      if (!Capacitor.isNativePlatform()) {
        console.log("[Pedometer] Running on web browser, using simulated step tracking.");
        return;
      }

      try {
        const available = await CapacitorPedometer.isAvailable();
        if (!available.stepCounting) {
          console.warn("[Pedometer] Step counting not available on this device.");
          return;
        }

        let permission = await CapacitorPedometer.checkPermissions();
        if (permission.activityRecognition !== "granted") {
          permission = await CapacitorPedometer.requestPermissions();
        }

        if (permission.activityRecognition === "granted" && active) {
          listenerHandle = await CapacitorPedometer.addListener("measurement", (data: any) => {
            if (active && data && typeof data.numberOfSteps === "number") {
              setLiveSteps(data.numberOfSteps);
            }
          });
          await CapacitorPedometer.startMeasurementUpdates();
          isTracking = true;
          console.log("[Pedometer] Native pedometer started successfully.");
        } else {
          console.warn("[Pedometer] Pedometer permission denied.");
        }
      } catch (err: any) {
        console.error("[Pedometer] Error in startPedometer:", err);
      }
    }

    startPedometer();

    // Web browser simulation if not native
    let simulationInterval: any = null;
    if (!Capacitor.isNativePlatform()) {
      const stepsPerSecond = activity === "Run" ? 3 : 1.5;
      simulationInterval = setInterval(() => {
        if (!paused && active) {
          setLiveSteps((prev) => Math.round(prev + stepsPerSecond));
        }
      }, 1000);
    }

    return () => {
      active = false;
      if (simulationInterval) {
        clearInterval(simulationInterval);
      }
      if (Capacitor.isNativePlatform()) {
        const cleanup = async () => {
          try {
            if (isTracking) {
              await CapacitorPedometer.stopMeasurementUpdates();
              console.log("[Pedometer] Native pedometer stopped.");
            }
            if (listenerHandle) {
              await listenerHandle.remove();
            }
          } catch (err: any) {
            console.error("[Pedometer] Error in cleanup:", err);
          }
        };
        cleanup();
      }
    };
  }, [activity, paused]);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [paused]);

  // Prevent mobile screen sleep to ensure uninterrupted hardware GPS tracking
  useEffect(() => {
    if (typeof window === "undefined") return;
    let wakeLock: any = null;

    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await (navigator as any).wakeLock.request("screen");
          console.log("[Wake Lock] Screen Wake Lock successfully activated.");
        }
      } catch (err: any) {
        console.warn("[Wake Lock] Failed to acquire screen wake lock: ", err.message);
      }
    }

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !wakeLock) {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().then(() => {
          console.log("[Wake Lock] Screen Wake Lock released successfully.");
        });
      }
    };
  }, []);

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
        onBreadcrumbsChange={setBreadcrumbs}
        routeCenter={userLocation}
        setRouteCenter={setUserLocation}
        usingCustomLocation={usingCustomLocation}
        setUsingCustomLocation={setUsingCustomLocation}
        locationName={locationName}
        setLocationName={setLocationName}
        routeVariant={routeVariant}
      />

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-3.5 backdrop-blur flex flex-col justify-between">
          <div className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground truncate">
            Duration
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold font-mono text-foreground truncate">
            {formatTime(seconds)}
          </div>
          <div className="mt-0.5 text-[9px] text-muted-foreground/80 truncate">
            Goal: {duration}m
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/40 p-3.5 backdrop-blur flex flex-col justify-between">
          <div className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground truncate">
            Distance
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold font-mono text-cyan-400 truncate">
            {liveDistance.toFixed(2)}
          </div>
          <div className="mt-0.5 text-[9px] text-muted-foreground/80 truncate">Kilometers</div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/40 p-3.5 backdrop-blur flex flex-col justify-between">
          <div className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground truncate">
            Steps
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold font-mono text-emerald-400 flex items-baseline gap-0.5 truncate">
            <Footprints className="h-3.5 w-3.5 self-center mr-0.5 shrink-0" />
            {liveSteps.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[9px] text-muted-foreground/80 truncate">Step Count</div>
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
              <span className="font-semibold text-foreground/80">Ambient Soundtrack:</span>{" "}
              {currentVariant.soundtrack}
            </div>
            <button
              onClick={() =>
                window.open(getMusicLaunchUrl(musicProvider, currentVariant.musicQuery), "_blank")
              }
              className="rounded-lg bg-accent/20 hover:bg-accent/30 text-accent px-2.5 py-1.5 text-[10px] font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <Music className="h-3 w-3 animate-pulse" />
              Open {getMusicProviderLabel(musicProvider)}
            </button>
          </div>
          <p className="text-sm italic leading-relaxed text-foreground/95 bg-background/35 p-3 rounded-xl border border-border/40">
            "{currentVariant.prompt}"
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
          onClick={() =>
            onComplete({
              seconds,
              distanceKm: liveDistance,
              breadcrumbs,
              steps: liveSteps,
              routeVariant,
            })
          }
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
