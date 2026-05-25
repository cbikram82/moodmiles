import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Compass } from "lucide-react";

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

interface MoodMapProps {
  mood: Mood;
  duration: Duration;
  activity: Activity;
  mapTheme: "real" | "cyberpunk";
  walkingSpeed: "slow" | "normal" | "brisk";
  runningSpeed: "jog" | "fast" | "sprint";
  liveTracking?: boolean;
  onDistanceChange?: (distKm: number) => void;
}

interface LatLng {
  lat: number;
  lng: number;
}

// Default backup coordinates (London Hyde Park area)
const DEFAULT_COORDS: LatLng = { lat: 51.5074, lng: -0.1278 };

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
}: MoodMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // References for live rendering layers to avoid complete maps rebuild on coordinate ticks
  const liveMarkerRef = useRef<any>(null);
  const liveBreadcrumbsPolylineRef = useRef<any>(null);

  const [L, setL] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locationName, setLocationName] = useState<string>("Detecting location...");
  const [routingDistance, setRoutingDistance] = useState<number>(0);

  // Real-time breadcrumbs tracking
  const [breadcrumbs, setBreadcrumbs] = useState<LatLng[]>([]);
  const [cumulativeDistance, setCumulativeDistance] = useState<number>(0);

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

  // 2. Geolocation Tracker: watchPosition if liveTracking, else getCurrentPosition
  useEffect(() => {
    let watchId: number | null = null;

    if (!navigator.geolocation) {
      setUserLocation(DEFAULT_COORDS);
      setLocationName("London, UK (Default)");
      setLoading(false);
      return;
    }

    if (liveTracking) {
      // 2A. Active watch tracking
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          setUserLocation(newPos);
          setLocationName("Tracking Live Location");
          setLoading(false);

          // Update breadcrumbs and haversine calculations
          setBreadcrumbs((prev) => {
            const next = [...prev];
            if (next.length === 0) {
              next.push(newPos);
            } else {
              const last = next[next.length - 1];
              const dist = haversineDistance(last, newPos);
              if (dist > 0.003) { // 3 meters threshold
                next.push(newPos);
                // Accumulate distance
                setCumulativeDistance((prevDist) => {
                  const updated = prevDist + dist;
                  onDistanceChange?.(updated);
                  return updated;
                });
              }
            }
            return next;
          });
        },
        (err) => {
          console.warn("Geolocation watch error: ", err.message);
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      // 2B. Single shot planning retrieval
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationName("Your Location");
          setLoading(false);
        },
        (err) => {
          console.warn("Geolocation query failed, using default: ", err.message);
          setUserLocation(DEFAULT_COORDS);
          setLocationName("London, UK (Default)");
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [liveTracking, onDistanceChange]);

  // 3. Algorithmic spatial loop generator
  const getLoopWaypoints = (start: LatLng): LatLng[] => {
    const speedKmh = getSpeedKmh();
    const totalDistanceKm = speedKmh * (duration / 60);
    const sideKm = totalDistanceKm / 4;

    const latOffset = sideKm / 111;
    const radLat = (start.lat * Math.PI) / 180;
    const lngOffset = sideKm / (111 * Math.cos(radLat));

    const waypoints: LatLng[] = [];

    if (mood === "Clear Mind") {
      waypoints.push({ lat: start.lat + latOffset * 1.8, lng: start.lng + lngOffset * 0.4 });
    } else if (mood === "Creative Spark" || mood === "Escape") {
      const factor = mood === "Escape" ? 1.3 : 1.1;
      waypoints.push({ lat: start.lat + latOffset * factor, lng: start.lng - lngOffset * 0.3 });
      waypoints.push({ lat: start.lat + latOffset * 1.6, lng: start.lng + lngOffset * 1.1 });
      waypoints.push({ lat: start.lat - latOffset * 0.2, lng: start.lng + lngOffset * factor });
    } else if (mood === "Energy Boost" || mood === "Confidence") {
      waypoints.push({ lat: start.lat + latOffset, lng: start.lng - latOffset * 0.2 });
      waypoints.push({ lat: start.lat + latOffset, lng: start.lng + lngOffset });
      waypoints.push({ lat: start.lat, lng: start.lng + lngOffset });
    } else {
      waypoints.push({ lat: start.lat + latOffset, lng: start.lng });
      waypoints.push({ lat: start.lat + latOffset, lng: start.lng + lngOffset });
      waypoints.push({ lat: start.lat, lng: start.lng + lngOffset });
    }

    return waypoints;
  };

  // 4. Initialize Map (Leaflet) & Draw planned route + Breadcrumbs
  useEffect(() => {
    if (!L || loading || !userLocation || mapTheme !== "real" || !mapContainerRef.current) return;

    // A. Recreate map base if it doesn't exist
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userLocation.lat, userLocation.lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 20,
      }).addTo(map);

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

      // Calculate coordinates loop
      const waypoints = getLoopWaypoints(userLocation);
      const fullCoordinates = [userLocation, ...waypoints, userLocation];
      const coordinatesString = fullCoordinates
        .map((coord) => `${coord.lng},${coord.lat}`)
        .join(";");
      const osrmUrl = `https://router.project-osrm.org/route/v1/walking/${coordinatesString}?overview=full&geometries=geojson`;

      // Static Custom Start Pin
      const startIcon = L.divIcon({
        className: "custom-start-marker",
        html: `
          <div class="glowing-start-pin">
            <div class="glowing-start-pin-ring"></div>
            <div class="glowing-start-pin-core"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker([userLocation.lat, userLocation.lng], { icon: startIcon }).addTo(map);

      // Waypoint Dots Custom Pin
      const wpIcon = L.divIcon({
        className: "custom-wp-marker",
        html: `<div class="custom-wp-pin"></div>`,
        iconSize: [8, 8],
        iconAnchor: [4, 4],
      });

      // Call OSRM
      fetch(osrmUrl)
        .then((res) => res.json())
        .then((data) => {
          if (data.code === "Ok" && data.routes && data.routes[0]) {
            const route = data.routes[0];
            if (!liveTracking) {
              setRoutingDistance(route.distance / 1000);
            }

            const latLngs = route.geometry.coordinates.map((coord: number[]) => [
              coord[1],
              coord[0],
            ]) as any[];

            const polyline = L.polyline(latLngs, {
              color: "#8b5cf6",
              weight: 4.5,
              opacity: 0.85,
              lineJoin: "round",
            }).addTo(map);

            waypoints.forEach((wp) => {
              L.marker([wp.lat, wp.lng], { icon: wpIcon }).addTo(map);
            });

            // Focus planned bounds initially
            if (!liveTracking) {
              map.fitBounds(polyline.getBounds(), { padding: [22, 22] });
            }
          } else {
            throw new Error("OSRM Failed status: " + data.code);
          }
        })
        .catch(() => {
          // Straight line fallback
          const pathCoords = [...fullCoordinates].map((c) => [c.lat, c.lng]) as any[];
          const polyline = L.polyline(pathCoords, {
            color: "#a78bfa",
            weight: 4,
            opacity: 0.8,
            dashArray: "6, 8",
          }).addTo(map);

          waypoints.forEach((wp) => {
            L.marker([wp.lat, wp.lng], { icon: wpIcon }).addTo(map);
          });

          if (!liveTracking) {
            map.fitBounds(polyline.getBounds(), { padding: [22, 22] });
            setRoutingDistance(getSpeedKmh() * (duration / 60));
          }
        });
    }

    const map = mapInstanceRef.current;

    // B. LIVE ROUTE & GPS RENDERING (React state ticks)
    if (liveTracking) {
      // 1. Create or move the live user marker
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
        liveMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: liveIcon }).addTo(map);
      } else {
        liveMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      }

      // 2. Draw/Update lived breadcrumbs trail
      if (breadcrumbs.length > 1) {
        const pathPoints = breadcrumbs.map((pt) => [pt.lat, pt.lng]) as any[];

        if (!liveBreadcrumbsPolylineRef.current) {
          liveBreadcrumbsPolylineRef.current = L.polyline(pathPoints, {
            color: "#06b6d4", // glowing cyan trail
            weight: 5,
            opacity: 0.9,
            lineJoin: "round",
          }).addTo(map);
        } else {
          liveBreadcrumbsPolylineRef.current.setLatLngs(pathPoints);
        }
      }

      // 3. Keep center focused on live GPS
      map.panTo([userLocation.lat, userLocation.lng], { animate: true });
    }
  }, [L, loading, userLocation, mapTheme, breadcrumbs, liveTracking]);

  // Cleanup map container fully on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 5. Procedural Cyberpunk/Glow Canvas Map Render with live walk simulation
  useEffect(() => {
    if (loading || mapTheme !== "cyberpunk" || !canvasRef.current || !userLocation) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvasRef.current.parentElement?.clientWidth || 400);
    let height = (canvas.height = 176);

    const speedKmh = getSpeedKmh();
    const calculatedDist = speedKmh * (duration / 60);
    setRoutingDistance(calculatedDist);

    const handleResize = () => {
      if (!canvasRef.current) return;
      width = canvas.width = canvasRef.current.parentElement?.clientWidth || 400;
      height = canvas.height = 176;
    };
    window.addEventListener("resize", handleResize);

    const padding = 45;
    const startPoint = { x: width / 2, y: height - padding };

    const getMoodWaypoints = () => {
      const pts = [];
      const distFactor = duration / 15;
      const maxW = Math.min(width / 3.2, 100) * (0.6 + distFactor * 0.1);
      const maxH = 50 * (0.6 + distFactor * 0.15);

      if (mood === "Clear Mind") {
        pts.push({ x: startPoint.x + maxW * 0.2, y: startPoint.y - maxH * 1.8 });
      } else if (mood === "Creative Spark" || mood === "Escape") {
        pts.push({ x: startPoint.x - maxW * 0.8, y: startPoint.y - maxH * 0.6 });
        pts.push({ x: startPoint.x + maxW * 0.6, y: startPoint.y - maxH * 1.9 });
        pts.push({ x: startPoint.x + maxW * 1.2, y: startPoint.y - maxH * 0.9 });
      } else if (mood === "Energy Boost" || mood === "Confidence") {
        pts.push({ x: startPoint.x - maxW * 0.7, y: startPoint.y - maxH * 0.7 });
        pts.push({ x: startPoint.x - maxW * 0.7, y: startPoint.y - maxH * 1.6 });
        pts.push({ x: startPoint.x + maxW * 0.7, y: startPoint.y - maxH * 1.6 });
        pts.push({ x: startPoint.x + maxW * 0.7, y: startPoint.y - maxH * 0.7 });
      } else {
        pts.push({ x: startPoint.x - maxW * 0.8, y: startPoint.y - maxH * 0.9 });
        pts.push({ x: startPoint.x, y: startPoint.y - maxH * 1.8 });
        pts.push({ x: startPoint.x + maxW * 0.8, y: startPoint.y - maxH * 0.9 });
      }
      return pts;
    };

    const waypoints = getMoodWaypoints();
    const fullPath = [startPoint, ...waypoints, startPoint];

    const gridSpacing = 24;
    let dashOffset = 0;

    // Simulation metrics
    let simProgress = 0; // 0 to 1 representation along full loop path
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

      // Calculate user's dynamic simulated coordinates along the path
      const now = Date.now();
      const elapsed = (now - lastTime) / 1000; // seconds
      lastTime = now;

      if (liveTracking) {
        // Speed up simulation to loop every 40 seconds for demonstration, keeping actual distance calculations accurate
        simProgress = (simProgress + elapsed * 0.025) % 1;
        onDistanceChange?.(simProgress * calculatedDist);
      } else {
        simProgress = 0;
      }

      // Map progress to absolute pixel point
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

      // Traveled Breadcrumbs Path (Glowing Cyan)
      if (simProgress > 0) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = "rgba(6, 182, 212, 0.6)";
        ctx.strokeStyle = "#06b6d4";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);

        // Draw fully completed segments
        for (let i = 1; i <= livePoint.index; i++) {
          ctx.lineTo(fullPath[i].x, fullPath[i].y);
        }
        // Draw partial active segment
        ctx.lineTo(livePoint.x, livePoint.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Static Custom planned waypoints
      waypoints.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(167, 139, 250, 0.8)";
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
      });

      // Start/Finish Static Marker
      ctx.beginPath();
      ctx.arc(startPoint.x, startPoint.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#10b981";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      // Live Tracking Cursor Indicator with glowing rings
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
  }, [loading, mapTheme, mood, duration, activity, userLocation, walkingSpeed, runningSpeed, liveTracking]);

  if (loading) {
    return (
      <div className="flex h-44 flex-col items-center justify-center rounded-3xl border border-border/60 bg-card/40 backdrop-blur-xl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mt-2 text-xs text-muted-foreground">
          Locating your coordinates...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Geolocation metadata banner */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Compass className="h-3.5 w-3.5 text-accent animate-pulse" />
          <span className="truncate max-w-[200px]">{locationName}</span>
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
          {liveTracking ? "Live tracking progress" : mapTheme === "real" ? "Walkable Loop" : "Procedural Loop"} · ~
          {liveTracking
            ? (Math.round(cumulativeDistance * 100) / 100).toFixed(2)
            : (Math.round(routingDistance * 10) / 10).toFixed(1)}{" "}
          km
        </span>
      </div>

      {/* Map container frame */}
      <div className="relative h-44 w-full overflow-hidden rounded-3xl border border-border/60 shadow-lg shadow-black/10">
        {mapTheme === "real" ? (
          <div ref={mapContainerRef} className="absolute inset-0 h-full w-full bg-background" />
        ) : (
          <canvas ref={canvasRef} className="block h-full w-full bg-[#0c0d12]" />
        )}
      </div>
    </div>
  );
}
