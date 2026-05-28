import { useEffect, useRef, useState } from "react";
import { Loader2, Compass } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

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

interface LatLng {
  lat: number;
  lng: number;
}

interface MoodMapProps {
  mood: Mood;
  duration: Duration;
  activity: Activity;
  mapTheme: string;
  walkingSpeed: "slow" | "normal" | "brisk";
  runningSpeed: "jog" | "fast" | "sprint";
  liveTracking?: boolean;
  onDistanceChange?: (distKm: number) => void;
  onBreadcrumbsChange?: (breadcrumbs: LatLng[]) => void;
  routeCenter: LatLng | null;
  setRouteCenter: (coords: LatLng | null) => void;
  usingCustomLocation: boolean;
  setUsingCustomLocation: (val: boolean) => void;
  locationName: string;
  setLocationName: (name: string) => void;
  routeVariant?: number;
  prompt?: string;
  onNavigationStepsChange?: (steps: string[]) => void;
}

// Default backup coordinates (London Hyde Park area)
const DEFAULT_COORDS: LatLng = { lat: 51.5074, lng: -0.1278 };

// Spoken mindfulness audio guide using standard SpeechSynthesis (webview-native supported)
function speakMindfulnessCue(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92; // meditational pace
    utterance.pitch = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.lang.startsWith("en") && v.name.includes("Natural")) || 
                         voices.find(v => v.lang.startsWith("en"));
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("SpeechSynthesis error:", err);
  }
}

// Turn-by-turn navigation parser for OSRM steps
function parseOSRMStep(step: any): string | null {
  const type = step.maneuver.type;
  const modifier = step.maneuver.modifier || "";
  const name = step.name || "";
  const distance = Math.round(step.distance);
  
  if (type === "arrive") {
    return "Arrive back at your destination";
  }
  
  let action = "";
  if (type === "depart") {
    action = name ? `Head ${modifier || "forward"} on ${name}` : "Start walking forward";
  } else if (type === "turn") {
    action = name ? `Turn ${modifier} onto ${name}` : `Turn ${modifier}`;
  } else if (type === "new name") {
    action = name ? `Continue onto ${name}` : "Continue forward";
  } else {
    if (!name) return null;
    action = `Head ${modifier} onto ${name}`.trim();
  }
  
  return distance > 0 ? `${action} and walk for ${distance} meters` : action;
}

// Haversine formula to compute distance in km between two GPS coordinates
function haversineDistance(p1: LatLng, p2: LatLng): number {
  const R = 6371; // Earth radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function MoodMap({
  mood,
  duration,
  activity,
  mapTheme,
  walkingSpeed,
  runningSpeed,
  liveTracking = false,
  onDistanceChange,
  onBreadcrumbsChange,
  routeCenter,
  setRouteCenter,
  usingCustomLocation,
  setUsingCustomLocation,
  locationName,
  setLocationName,
  routeVariant = 0,
  prompt,
  onNavigationStepsChange,
}: MoodMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // Rock-solid layer references for Leaflet to ensure strict cleanups
  const polylineRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const liveMarkerRef = useRef<any>(null);
  const liveBreadcrumbsPolylineRef = useRef<any>(null);

  const [L, setL] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [routingDistance, setRoutingDistance] = useState<number>(0);

  // Real-time user GPS tracking state (independent of static routeCenter)
  const [liveLocation, setLiveLocation] = useState<LatLng | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<LatLng[]>([]);
  const [cumulativeDistance, setCumulativeDistance] = useState<number>(0);

  const lastSpokenMilestoneDistanceRef = useRef<number>(0);
  const lastWaypointHapticIndexRef = useRef<number>(-1);

  // Helper to calculate km/h based on user-configured speeds
  const getSpeedKmh = (): number => {
    if (activity === "Run") {
      switch (runningSpeed) {
        case "jog":
          return 8.0;
        case "sprint":
          return 13.0;
        case "fast":
        default:
          return 10.5;
      }
    } else {
      switch (walkingSpeed) {
        case "slow":
          return 3.5;
        case "brisk":
          return 6.0;
        case "normal":
        default:
          return 4.8;
      }
    }
  };

  // 1. Load Leaflet Library & CSS dynamically ONLY on client-side
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load CSS
    const cssId = "leaflet-css-cdn";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.crossOrigin = "";
      document.head.appendChild(link);
    }

    // Dynamic import of Leaflet library to prevent window ReferenceErrors during SSR evaluation
    import("leaflet").then((leafletModule) => {
      setL(leafletModule);
    });
  }, []);

  // 2. Geolocation Tracker: watchPosition if liveTracking, else getCurrentPosition (only if no routeCenter exists)
  useEffect(() => {
    let watchId: number | null = null;

    if (!navigator.geolocation) {
      if (!usingCustomLocation && !routeCenter) {
        setRouteCenter(DEFAULT_COORDS);
        setLocationName("London, UK (Default)");
        setLoading(false);
      }
      return;
    }

    if (liveTracking) {
      // 2A. Active watch tracking - updates liveLocation, NEVER overrides routeCenter!
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          setLiveLocation(newPos);
          setLoading(false);

          // Update breadcrumbs and haversine calculations
          setBreadcrumbs((prev) => {
            const next = [...prev];
            if (next.length === 0) {
              next.push(newPos);
            } else {
              const last = next[next.length - 1];
              const dist = haversineDistance(last, newPos);
              if (dist > 0.003) {
                next.push(newPos);
                setCumulativeDistance((prevDist) => {
                  const updated = prevDist + dist;
                  onDistanceChange?.(updated);
                  
                  // Milestone announcements every 0.5 km
                  if (updated - lastSpokenMilestoneDistanceRef.current >= 0.5) {
                    const nextMilestone = Math.floor(updated * 2) / 2;
                    if (nextMilestone > lastSpokenMilestoneDistanceRef.current) {
                      lastSpokenMilestoneDistanceRef.current = nextMilestone;
                      speakMindfulnessCue(`You have completed ${nextMilestone.toFixed(1)} kilometers.`);
                    }
                  }
                  
                  return updated;
                });
              }
            }
            onBreadcrumbsChange?.(next);
            return next;
          });
        },
        (err) => {
          console.warn("Geolocation watch error: ", err.message);
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    } else if (!usingCustomLocation && !routeCenter) {
      // 2B. Single shot planning retrieval - ONLY if no custom location is currently set
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setRouteCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationName("Your Location");
          setLoading(false);
        },
        (err) => {
          console.warn("Geolocation query failed, using default: ", err.message);
          setRouteCenter(DEFAULT_COORDS);
          setLocationName("London, UK (Default)");
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
      );
    } else {
      // Already has a planned route center
      setLoading(false);
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [liveTracking, onDistanceChange, usingCustomLocation, routeCenter]);

  // 3. Algorithmic spatial loop generator with 2D Rotation and Geometry Mutation
  const rotateOffset = (latOff: number, lngOff: number, degrees: number) => {
    if (degrees === 0) return { lat: latOff, lng: lngOff };
    const radians = (degrees * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return {
      lat: latOff * cos - lngOff * sin,
      lng: latOff * sin + lngOff * cos,
    };
  };

  const [activeWaypoints, setActiveWaypoints] = useState<LatLng[]>([]);
  const [activeRouteGeometry, setActiveRouteGeometry] = useState<LatLng[]>([]);
  const [activeRouteSteps, setActiveRouteSteps] = useState<string[]>([]);
  const [routeLoading, setRouteLoading] = useState<boolean>(false);
  const [overpassData, setOverpassData] = useState<{
    pois: { lat: number; lng: number }[];
    litNodes: { lat: number; lng: number }[];
    parks: { lat: number; lng: number; name: string }[];
  } | null>(null);

  const getCandidateWaypoints = (start: LatLng, variantIndex: number, radiusScale: number, closestPark: LatLng | null): LatLng[] => {
    const speedKmh = getSpeedKmh();
    const totalDistanceKm = speedKmh * (duration / 60);
    let R = (totalDistanceKm / 2.8) * radiusScale;
    
    const isNatureLoop = mood === "Nature Connection";
    if (isNatureLoop) {
      R = Math.min(R, 0.35); // Keep it compact so it fits within the park boundary
    }
    
    // Annulus headings (0, 120, 240 degrees) rotated by variantIndex * 90 degrees
    const headings = [0, 120, 240].map(h => h + (variantIndex * 90));
    
    return headings.map((theta) => {
      const latOffset = (R * Math.cos(theta * Math.PI / 180)) / 111;
      const radLat = (start.lat * Math.PI) / 180;
      const lngOffset = (R * Math.sin(theta * Math.PI / 180)) / (111 * Math.cos(radLat));
      
      let wp = {
        lat: start.lat + latOffset,
        lng: start.lng + lngOffset,
      };
      
      if (isNatureLoop && closestPark) {
        // Blended shift: pull waypoint anchor coordinates into the park boundary!
        wp = {
          lat: wp.lat * 0.25 + closestPark.lat * 0.75,
          lng: wp.lng * 0.25 + closestPark.lng * 0.75,
        };
      }
      
      return wp;
    });
  };

  // Unified Overpass static POIs & Safety static metadata fetcher
  useEffect(() => {
    if (!routeCenter) return;
    
    const loadOverpassData = async () => {
      try {
        // Query a 1km bounding box for cafes, restaurants, lit streets, transit stops
        const box = `${routeCenter.lat - 0.009},${routeCenter.lng - 0.009},${routeCenter.lat + 0.009},${routeCenter.lng + 0.009}`;
        const query = `[out:json][timeout:5];(` +
          `node(${box})[amenity~"cafe|restaurant|pub|shop|marketplace"];` +
          `node(${box})[highway=bus_stop];` +
          `node(${box})[lit=yes];` +
          `nwr(around:8000,${routeCenter.lat},${routeCenter.lng})[leisure=park];` +
          `nwr(around:8000,${routeCenter.lat},${routeCenter.lng})[leisure=nature_reserve];` +
          `);out center;`;
          
        const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("Overpass API status: " + res.status);
        const data = await res.json();
        
        const pois: LatLng[] = [];
        const litNodes: LatLng[] = [];
        const parks: { lat: number; lng: number; name: string }[] = [];
        
        if (data && data.elements) {
          data.elements.forEach((el: any) => {
            const lat = el.lat || (el.center && el.center.lat);
            const lng = el.lon || (el.center && el.center.lon);
            if (!lat || !lng) return;
            
            if (el.tags?.amenity || el.tags?.highway === "bus_stop") {
              pois.push({ lat, lng });
            }
            if (el.tags?.lit === "yes") {
              litNodes.push({ lat, lng });
            }
            if (el.tags?.leisure === "park" || el.tags?.leisure === "nature_reserve") {
              parks.push({ lat, lng, name: el.tags.name || "Park" });
            }
          });
        }
        
        setOverpassData({ pois, litNodes, parks });
      } catch (err) {
        console.warn("Local Overpass fetch failed, continuing with empty context:", err);
        setOverpassData({ pois: [], litNodes: [], parks: [] });
      }
    };
    
    loadOverpassData();
  }, [routeCenter]);

  // Computational Psychogeography ranking & OSRM evaluator
  useEffect(() => {
    if (!routeCenter || !overpassData) return;
    
    const controller = new AbortController();
    const signal = controller.signal;
    
    const calculateAffectiveRoute = async () => {
      setRouteLoading(true);
      const isNight = new Date().getHours() >= 20 || new Date().getHours() < 6;
      
      let closestPark: LatLng | null = null;
      if (overpassData.parks.length > 0) {
        let minDist = Infinity;
        overpassData.parks.forEach((p) => {
          const dist = haversineDistance(routeCenter, p);
          if (dist < minDist) {
            minDist = dist;
            closestPark = p;
          }
        });
      }
      
      // Candidate options (stochastic variations)
      const candidates = [
        { waypoints: getCandidateWaypoints(routeCenter, routeVariant, 1.0, closestPark), label: "Standard" },
        { waypoints: getCandidateWaypoints(routeCenter, routeVariant, 1.15, closestPark), label: "Expanded" },
        { waypoints: getCandidateWaypoints(routeCenter, routeVariant, 0.85, closestPark), label: "Compact" }
      ];
      
      // Rank the candidates client-side using direct waypoint coordinates first to protect OSRM public API rate limits
      const rankedCandidates = candidates.map((cand) => {
        let greenScore = 0;
        let vitalityScore = 0;
        let safetyPenalty = 0;
        
        cand.waypoints.forEach((wp) => {
          // Greenery
          let minParkDist = Infinity;
          overpassData.parks.forEach((p) => {
            const d = haversineDistance(wp, p);
            if (d < minParkDist) minParkDist = d;
          });
          greenScore += Math.exp(-minParkDist / 0.2);
          
          // Vitality
          let minPoiDist = Infinity;
          overpassData.pois.forEach((poi) => {
            const d = haversineDistance(wp, poi);
            if (d < minPoiDist) minPoiDist = d;
          });
          vitalityScore += Math.exp(-minPoiDist / 0.15);
          
          // Safety at night
          if (isNight) {
            let minLitDist = Infinity;
            overpassData.litNodes.forEach((l) => {
              const d = haversineDistance(wp, l);
              if (d < minLitDist) minLitDist = d;
            });
            
            if (minLitDist > 0.05 && minPoiDist > 0.08) {
              safetyPenalty += 1.0;
            }
          }
        });
        
        const avgGreen = greenScore / 3;
        const avgVitality = vitalityScore / 3;
        const avgSafetyPen = (safetyPenalty / 3) * 4.0;
        
        let finalScore = 0;
        if (mood === "Calm") {
          finalScore = avgGreen * 3.5 - avgVitality * 1.5 - avgSafetyPen;
        } else if (mood === "Clear Mind") {
          finalScore = -avgVitality * 1.0 + avgGreen * 1.0 - avgSafetyPen;
        } else if (mood === "Energy Boost" || mood === "Confidence") {
          finalScore = avgVitality * 2.5 + avgGreen * 0.5 - avgSafetyPen;
        } else if (mood === "Reflective" || mood === "Creative Spark" || mood === "Escape") {
          finalScore = avgGreen * 2.0 - avgVitality * 0.5 - avgSafetyPen;
        } else if (mood === "Nature Connection") {
          finalScore = avgGreen * 4.5 - avgSafetyPen;
        } else {
          finalScore = avgGreen * 1.5 - avgSafetyPen;
        }
        
        return { ...cand, score: finalScore };
      });
      
      // Sort candidates descending and pick the winner
      rankedCandidates.sort((a, b) => b.score - a.score);
      const winner = rankedCandidates[0];
      
      // Make EXACTLY ONE OSRM query for the winning candidate
      const fullCoordinates = [routeCenter, ...winner.waypoints, routeCenter];
      const coordinatesString = fullCoordinates.map((coord) => `${coord.lng},${coord.lat}`).join(";");
      const osrmUrl = `https://router.project-osrm.org/route/v1/walking/${coordinatesString}?overview=full&geometries=geojson&steps=true${mood === "Nature Connection" ? "&continue_straight=false" : ""}`;
      
      try {
        const res = await fetch(osrmUrl, { signal });
        if (!res.ok) throw new Error("OSRM status: " + res.status);
        const data = await res.json();
        
        if (data.code === "Ok" && data.routes && data.routes[0]) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map((c: any) => ({ lat: c[1], lng: c[0] })) as LatLng[];
          
          setActiveWaypoints(winner.waypoints);
          setActiveRouteGeometry(coords);
          
          if (route.legs && route.legs[0] && onNavigationStepsChange) {
            const parsedSteps: string[] = [];
            route.legs.forEach((leg: any) => {
              if (leg.steps) {
                leg.steps.forEach((step: any) => {
                  const parsed = parseOSRMStep(step);
                  if (parsed && !parsedSteps.includes(parsed)) {
                    parsedSteps.push(parsed);
                  }
                });
              }
            });
            parsedSteps.push(`Calculated Trajectory Score: ${winner.score.toFixed(2)} pts`);
            setActiveRouteSteps(parsedSteps);
            onNavigationStepsChange(parsedSteps);
          }
          
          setRoutingDistance(route.distance / 1000);
        } else {
          throw new Error("OSRM Failed status: " + data.code);
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          return; // Suppress aborted fetches gracefully
        }
        console.warn("OSRM routing failed, drawing straight fallback:", err.message);
        
        // Draw straight line fallback
        setActiveWaypoints(winner.waypoints);
        setActiveRouteGeometry([routeCenter, ...winner.waypoints, routeCenter]);
        setActiveRouteSteps(["Start walking forward", "Continue along the trail to complete the loop"]);
        setRoutingDistance(getSpeedKmh() * (duration / 60));
      } finally {
        setRouteLoading(false);
      }
    };
    
    calculateAffectiveRoute();
    
    return () => {
      controller.abort(); // Cancel pending network fetches on change
    };
  }, [routeCenter, overpassData, duration, activity, walkingSpeed, runningSpeed, routeVariant, mood]);

  // Reset custom location back to browser GPS
  const handleResetToGPS = () => {
    setLoading(true);
    setUsingCustomLocation(false);
    setRouteCenter(null); // Triggers GPS retrieval effect
  };

  // Clean up Leaflet map instance dynamically ONLY when switching themes or routeCenter changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (e) {
        console.warn("Leaflet map cleanup warning: ", e);
      }
      mapInstanceRef.current = null;
      polylineRef.current = null;
      markersRef.current = [];
      liveMarkerRef.current = null;
      liveBreadcrumbsPolylineRef.current = null;
    }
  }, [mapTheme, routeCenter]);

  // 4. Initialize Map (Leaflet) & Draw planned route + Breadcrumbs
  useEffect(() => {
    if (!L || loading || !routeCenter || mapTheme === "cyberpunk" || !mapContainerRef.current) return;

    // A. Recreate map base if it doesn't exist
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [routeCenter.lat, routeCenter.lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });
      mapInstanceRef.current = map;

      let tileUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
      let maxZoom = 20;

      if (mapTheme === "street") {
        tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      } else if (mapTheme === "terrain") {
        tileUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";
        maxZoom = 18;
      } else if (mapTheme === "real" || mapTheme === "dark") {
        tileUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
      }

      L.tileLayer(tileUrl, {
        maxZoom,
      }).addTo(map);

      // Add map click listener to drop pins in planning mode
      if (!liveTracking) {
        map.on("click", (e: any) => {
          setUsingCustomLocation(true);
          setLocationName("Custom Location");
          setRouteCenter({
            lat: e.latlng.lat,
            lng: e.latlng.lng,
          });
        });
      }

      // Add CSS glowing classes
      const styleId = "leaflet-custom-marker-styles";
      if (!document.getElementById(styleId)) {
        const styleEl = document.createElement("style");
        styleEl.id = styleId;
        styleEl.innerHTML = `
          .glowing-start-pin {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 18px;
            width: 18px;
          }
          .glowing-start-pin-ring {
            position: absolute;
            height: 24px;
            width: 24px;
            border-radius: 9999px;
            background-color: #10b981;
            opacity: 0.25;
            animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
          }
          .glowing-start-pin-core {
            height: 10px;
            width: 10px;
            border-radius: 9999px;
            background-color: #10b981;
            border: 2px solid #ffffff;
            box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
          }
          .glowing-live-pin {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 18px;
            width: 18px;
          }
          .glowing-live-pin-ring {
            position: absolute;
            height: 26px;
            width: 26px;
            border-radius: 9999px;
            background-color: #06b6d4;
            opacity: 0.35;
            animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
          }
          .glowing-live-pin-core {
            height: 11px;
            width: 11px;
            border-radius: 9999px;
            background-color: #06b6d4;
            border: 2px solid #ffffff;
            box-shadow: 0 0 10px rgba(6, 182, 212, 0.8);
          }
          .custom-wp-pin {
            height: 6px;
            width: 6px;
            border-radius: 9999px;
            background-color: #a78bfa;
            border: 1.5px solid #ffffff;
            box-shadow: 0 0 6px rgba(167, 139, 250, 0.6);
          }
        `;
        document.head.appendChild(styleEl);
      }
    }

    const map = mapInstanceRef.current;

    // Clear all previously drawn markers and polylines cleanly
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    // Waypoint Dots Custom Pin
    const wpIcon = L.divIcon({
      className: "custom-wp-marker",
      html: `<div class="custom-wp-pin"></div>`,
      iconSize: [8, 8],
      iconAnchor: [4, 4],
    });

    // Render the planned affective loop route
    if (activeRouteGeometry.length > 0) {
      const latLngs = activeRouteGeometry.map((coord) => [coord.lat, coord.lng]);
      const polyline = L.polyline(latLngs, {
        color: "#8b5cf6",
        weight: 4.5,
        opacity: 0.85,
        lineJoin: "round",
      }).addTo(map);
      polylineRef.current = polyline;

      activeWaypoints.forEach((wp) => {
        const wpMarker = L.marker([wp.lat, wp.lng], { icon: wpIcon }).addTo(map);
        markersRef.current.push(wpMarker);
      });

      if (!liveTracking) {
        map.fitBounds(polyline.getBounds(), { padding: [22, 22] });
      }
    } else {
      // Straight line fallback if no geometry has been calculated yet
      const fallbackWaypoints = activeWaypoints.length > 0 ? activeWaypoints : getCandidateWaypoints(routeCenter, routeVariant, 1.0, null);
      const pathCoords = [routeCenter, ...fallbackWaypoints, routeCenter].map((c) => [c.lat, c.lng]);
      const polyline = L.polyline(pathCoords, {
        color: "#a78bfa",
        weight: 4,
        opacity: 0.8,
        dashArray: "6, 8",
      }).addTo(map);
      polylineRef.current = polyline;

      fallbackWaypoints.forEach((wp) => {
        const wpMarker = L.marker([wp.lat, wp.lng], { icon: wpIcon }).addTo(map);
        markersRef.current.push(wpMarker);
      });

      if (!liveTracking) {
        map.fitBounds(polyline.getBounds(), { padding: [22, 22] });
      }
    }

    // B. LIVE ROUTE & GPS RENDERING (React state ticks)
    if (liveTracking && liveLocation) {
      // Check proximity to planned loop waypoints for haptic & spoken guidance
      const waypoints = activeWaypoints;
      for (let i = 0; i < waypoints.length; i++) {
        if (i <= lastWaypointHapticIndexRef.current) continue;
        const distToWp = haversineDistance(liveLocation, waypoints[i]);
        if (distToWp <= 0.015) { // 15 meters
          lastWaypointHapticIndexRef.current = i;
          try {
            Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
            setTimeout(() => {
              Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
            }, 180);
          } catch {
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate([100, 50, 100]);
            }
          }
          speakMindfulnessCue(`Way-point ${i + 1} reached. You are on the right track!`);
          break;
        }
      }

      const liveIcon = L.divIcon({
        className: "custom-live-marker",
        html: `
          <div class="glowing-live-pin">
            <div class="glowing-live-pin-ring"></div>
            <div class="glowing-live-pin-core"></div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      if (!liveMarkerRef.current) {
        liveMarkerRef.current = L.marker([liveLocation.lat, liveLocation.lng], {
          icon: liveIcon,
        }).addTo(map);
      } else {
        liveMarkerRef.current.setLatLng([liveLocation.lat, liveLocation.lng]);
      }

      if (breadcrumbs.length > 1) {
        const pathPoints = breadcrumbs.map((pt) => [pt.lat, pt.lng]) as any[];

        if (!liveBreadcrumbsPolylineRef.current) {
          liveBreadcrumbsPolylineRef.current = L.polyline(pathPoints, {
            color: "#06b6d4",
            weight: 5,
            opacity: 0.9,
            lineJoin: "round",
          }).addTo(map);
        } else {
          liveBreadcrumbsPolylineRef.current.setLatLngs(pathPoints);
        }
      }

      // Pan to the user's active GPS coordinate to keep them centered
      map.panTo([liveLocation.lat, liveLocation.lng], { animate: true });
    }
  }, [L, loading, routeCenter, mapTheme, breadcrumbs, liveTracking, liveLocation, routeVariant, activeRouteGeometry, activeWaypoints]);

  // Cleanup map container fully on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Welcome and Periodic Mindfulness Speaking Effect
  useEffect(() => {
    if (!liveTracking) {
      lastSpokenMilestoneDistanceRef.current = 0;
      lastWaypointHapticIndexRef.current = -1;
      return;
    }

    const welcomeMsg = `Starting your ${mood} journey. Let's find a comfortable ${activity.toLowerCase()}ing pace.`;
    speakMindfulnessCue(welcomeMsg);

    if (!prompt) return;
    const interval = setInterval(() => {
      speakMindfulnessCue(prompt);
    }, 300000); // 5 minutes

    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [liveTracking, mood, activity, prompt]);

  // 5. Procedural Cyberpunk/Glow Canvas Map Render with live walk simulation
  useEffect(() => {
    if (loading || mapTheme !== "cyberpunk" || !canvasRef.current || !routeCenter) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvasRef.current.parentElement?.clientWidth || 400);
    let height = (canvas.height = 240);

    const speedKmh = getSpeedKmh();
    const calculatedDist = speedKmh * (duration / 60);
    setRoutingDistance(calculatedDist);

    const handleResize = () => {
      if (!canvasRef.current) return;
      width = canvas.width = canvasRef.current.parentElement?.clientWidth || 400;
      height = canvas.height = 240;
    };
    window.addEventListener("resize", handleResize);

    const padding = 45;
    const startPoint = { x: width / 2, y: height - padding };

    const getMoodWaypoints = () => {
      const distFactor = duration / 15;
      const maxW = Math.min(width / 3.2, 100) * (0.6 + distFactor * 0.1);
      const maxH = 65 * (0.6 + distFactor * 0.15);

      const rawCanvasOffsets: { dx: number; dy: number }[] = [];

      if (routeVariant === 1) {
        // Labyrinth / Winding organic loop relative to startPoint
        rawCanvasOffsets.push({ dx: -maxW * 0.3, dy: -maxH * 0.8 });
        rawCanvasOffsets.push({ dx: maxW * 0.2, dy: -maxH * 1.5 });
        rawCanvasOffsets.push({ dx: maxW * 1.1, dy: -maxH * 1.0 });
        rawCanvasOffsets.push({ dx: maxW * 0.4, dy: -maxH * 0.3 });
      } else if (routeVariant === 2) {
        // Infinity / Figure-Eight loop lobes relative to startPoint
        rawCanvasOffsets.push({ dx: maxW * 0.8, dy: -maxH * 0.9 });
        rawCanvasOffsets.push({ dx: maxW * 0.2, dy: -maxH * 0.2 });
        rawCanvasOffsets.push({ dx: maxW * 0.9, dy: maxH * 0.5 });
        rawCanvasOffsets.push({ dx: -maxW * 0.3, dy: -maxH * 0.5 });
      } else {
        // Default (original shapes)
        if (mood === "Clear Mind") {
          rawCanvasOffsets.push({ dx: maxW * 0.2, dy: -maxH * 1.8 });
        } else if (mood === "Creative Spark" || mood === "Escape") {
          const factor = mood === "Escape" ? 1.3 : 1.1;
          rawCanvasOffsets.push({ dx: -maxW * 0.8, dy: -maxH * 0.6 });
          rawCanvasOffsets.push({ dx: maxW * 0.6, dy: -maxH * 1.9 });
          rawCanvasOffsets.push({ dx: maxW * 1.2, dy: -maxH * 0.9 });
        } else if (mood === "Energy Boost" || mood === "Confidence") {
          rawCanvasOffsets.push({ dx: -maxW * 0.7, dy: -maxH * 0.7 });
          rawCanvasOffsets.push({ dx: -maxW * 0.7, dy: -maxH * 1.6 });
          rawCanvasOffsets.push({ dx: maxW * 0.7, dy: -maxH * 1.6 });
          rawCanvasOffsets.push({ dx: maxW * 0.7, dy: -maxH * 0.7 });
        } else if (mood === "Nature Connection") {
          rawCanvasOffsets.push({ dx: -maxW * 0.5, dy: -maxH * 1.4 });
          rawCanvasOffsets.push({ dx: maxW * 0.6, dy: -maxH * 1.8 });
          rawCanvasOffsets.push({ dx: maxW * 1.2, dy: -maxH * 0.2 });
        } else {
          rawCanvasOffsets.push({ dx: -maxW * 0.8, dy: -maxH * 0.9 });
          rawCanvasOffsets.push({ dx: 0, dy: -maxH * 1.8 });
          rawCanvasOffsets.push({ dx: maxW * 0.8, dy: -maxH * 0.9 });
        }
      }

      // 2D Rotation of canvas offsets around startPoint
      const angleRad = (routeVariant * 90 * Math.PI) / 180;
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);

      return rawCanvasOffsets.map((offset) => {
        const rotatedDx = offset.dx * cos - offset.dy * sin;
        const rotatedDy = offset.dx * sin + offset.dy * cos;
        return {
          x: startPoint.x + rotatedDx,
          y: startPoint.y + rotatedDy,
        };
      });
    };

    const waypoints = getMoodWaypoints();
    const fullPath = [startPoint, ...waypoints, startPoint];

    const gridSpacing = 24;
    let dashOffset = 0;

    // Simulation metrics
    let simProgress = 0;
    let lastTime = Date.now();

    const render = () => {
      ctx.fillStyle = "#0c0d12";
      ctx.fillRect(0, 0, width, height);

      // Grid
      ctx.strokeStyle = "rgba(40, 42, 60, 0.25)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Cyberpunk road lines
      ctx.strokeStyle = "rgba(52, 53, 76, 0.4)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, height * 0.4);
      ctx.lineTo(width, height * 0.4);
      ctx.moveTo(width * 0.25, 0);
      ctx.lineTo(width * 0.25, height);
      ctx.moveTo(width * 0.75, 0);
      ctx.lineTo(width * 0.75, height);
      ctx.stroke();

      // Planned polyline path (purple)
      ctx.strokeStyle = "rgba(139, 92, 246, 0.45)";
      ctx.lineWidth = 4.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y);
      for (let i = 1; i < fullPath.length; i++) {
        ctx.lineTo(fullPath[i].x, fullPath[i].y);
      }
      ctx.stroke();

      const now = Date.now();
      const elapsed = (now - lastTime) / 1000;
      lastTime = now;

      if (liveTracking) {
        simProgress = (simProgress + elapsed * 0.025) % 1;
        onDistanceChange?.(simProgress * calculatedDist);
      } else {
        simProgress = 0;
      }

      const getPointAlongPath = (t: number) => {
        const numSegments = fullPath.length - 1;
        const scaledT = t * numSegments;
        const segmentIdx = Math.floor(scaledT) % numSegments;
        const localT = scaledT - Math.floor(scaledT);

        const pA = fullPath[segmentIdx];
        const pB = fullPath[segmentIdx + 1];

        return {
          x: pA.x + (pB.x - pA.x) * localT,
          y: pA.y + (pB.y - pA.y) * localT,
          index: segmentIdx,
          localT,
        };
      };

      const livePoint = getPointAlongPath(simProgress);

      if (simProgress > 0) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = "rgba(6, 182, 212, 0.6)";
        ctx.strokeStyle = "#06b6d4";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);

        for (let i = 1; i <= livePoint.index; i++) {
          ctx.lineTo(fullPath[i].x, fullPath[i].y);
        }
        ctx.lineTo(livePoint.x, livePoint.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      waypoints.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(167, 139, 250, 0.8)";
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
      });

      ctx.beginPath();
      ctx.arc(startPoint.x, startPoint.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#10b981";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      if (liveTracking) {
        const livePulse = 0.4 + 0.25 * Math.sin(now * 0.005);
        ctx.beginPath();
        ctx.arc(livePoint.x, livePoint.y, 13, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6, 182, 212, ${livePulse})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(livePoint.x, livePoint.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#06b6d4";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText("START & FINISH", startPoint.x + 14, startPoint.y + 3);

      dashOffset = (dashOffset + 0.35) % 20;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [
    loading,
    mapTheme,
    mood,
    duration,
    activity,
    routeCenter,
    walkingSpeed,
    runningSpeed,
    liveTracking,
    routeVariant,
  ]);

  if (loading || routeLoading) {
    return (
      <div className="flex h-60 flex-col items-center justify-center rounded-3xl border border-border/60 bg-card/40 backdrop-blur-xl animate-pulse">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mt-2 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">Optimizing affective trajectory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Geolocation metadata banner */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="flex items-center gap-1.5 text-muted-foreground min-w-0">
          <Compass className="h-3.5 w-3.5 text-accent animate-pulse shrink-0" />
          <span className="truncate max-w-[140px] font-medium text-foreground">{locationName}</span>
          {usingCustomLocation && !liveTracking && (
            <button
              onClick={handleResetToGPS}
              className="text-[10px] text-accent hover:underline shrink-0 font-medium cursor-pointer"
            >
              (Reset to GPS)
            </button>
          )}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 shrink-0">
          {liveTracking ? "Live" : mapTheme !== "cyberpunk" ? "Walkable Loop" : "Procedural Loop"} · ~
          {liveTracking
            ? (Math.round(cumulativeDistance * 100) / 100).toFixed(2)
            : (Math.round(routingDistance * 10) / 10).toFixed(1)}{" "}
          km
        </span>
      </div>

      {/* Map container frame - Height increased to h-60 for accessibility */}
      <div className="relative h-60 w-full overflow-hidden rounded-3xl border border-border/60 shadow-lg shadow-black/10">
        {mapTheme !== "cyberpunk" ? (
          <>
            <div ref={mapContainerRef} className="absolute inset-0 h-full w-full bg-background" />

            {/* Soft Overlay Label Tip for Interactive Tapping */}
            {!liveTracking && (
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-background/90 px-3.5 py-1 text-[9px] font-semibold text-muted-foreground tracking-wider uppercase border border-border/40 pointer-events-none shadow-sm backdrop-blur-md">
                Tap map to drop start pin
              </div>
            )}
          </>
        ) : (
          <>
            <canvas ref={canvasRef} className="block h-full w-full bg-[#0c0d12]" />

            {/* Helper Tip in Cyberpunk mode */}
            {!liveTracking && (
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-background/90 px-3.5 py-1 text-[9px] font-semibold text-muted-foreground tracking-wider uppercase border border-border/40 pointer-events-none shadow-sm backdrop-blur-md">
                Switch to street map to drop custom pin
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
