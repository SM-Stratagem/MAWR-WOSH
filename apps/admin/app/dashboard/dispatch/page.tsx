"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from "@react-google-maps/api";
import { api } from "../../../convex/_generated/api";

const statusColors: Record<string, string> = {
  confirmed: "#2f80ff",
  team_assigned: "#2f80ff",
  on_the_way: "#2f80ff",
  arrived: "#ffb020",
  washing_in_progress: "#b6ff1c",
  completed: "#b6ff1c",
  canceled: "#ff4d4f",
};

const DEFAULT_CENTER = { lat: 25.2048, lng: 55.2708 };

const mapContainerStyle = { width: "100%", height: "100%" };

export default function DispatchPage() {
  const bookings = useQuery(api.bookings.adminListBookings, {});
  const liveTeams = useQuery(api.teams.adminLiveTeams);
  const autoReassign = useMutation(api.bookings.adminAutoReassign);
  const bulkAutoAssign = useMutation(api.bookings.adminBulkAutoAssign);

  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: "wosh-dispatch-map",
  });

  const activeBookings = useMemo(
    () =>
      (bookings || []).filter((b: any) =>
        ["confirmed", "team_assigned", "on_the_way", "arrived", "washing_in_progress"].includes(
          b.status,
        ),
      ),
    [bookings],
  );

  const teamsOnMap = useMemo(
    () => (liveTeams || []).filter((t: any) => t.currentLat && t.currentLng),
    [liveTeams],
  );

  const bookingsOnMap = useMemo(
    () => activeBookings.filter((b: any) => b.address?.latitude && b.address?.longitude),
    [activeBookings],
  );

  const mapCenter = useMemo(() => {
    const pts: { lat: number; lng: number }[] = [];
    for (const t of teamsOnMap) pts.push({ lat: t.currentLat, lng: t.currentLng });
    for (const b of bookingsOnMap)
      pts.push({ lat: b.address.latitude, lng: b.address.longitude });
    if (pts.length === 0) return DEFAULT_CENTER;
    const avgLat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    const avgLng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
    return { lat: avgLat, lng: avgLng };
  }, [teamsOnMap, bookingsOnMap]);

  const unassignedCount = activeBookings.filter((b: any) => !b.assignedTeamId).length;

  const handleBulkAssign = async () => {
    setBusy(true);
    try {
      const res = await bulkAutoAssign({});
      alert(`Assigned ${res.assigned} booking(s). Skipped: ${res.skipped}.`);
    } catch (e: any) {
      alert(e.message || "Bulk assign failed");
    } finally {
      setBusy(false);
    }
  };

  const handleReassign = async (bookingId: string) => {
    setBusy(true);
    try {
      const res = await autoReassign({ bookingId: bookingId as any });
      alert(`Assigned to ${res.teamName} (${res.distanceKm.toFixed(2)} km, ETA ${res.etaMin}-${res.etaMax} min)`);
      setSelectedBooking(null);
    } catch (e: any) {
      alert(e.message || "Reassign failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[var(--green)] text-xs font-[900] tracking-[.18em] uppercase mb-2">
            Live GPS
          </div>
          <h1 className="text-[32px] font-[900] tracking-tight m-0">Dispatch Map</h1>
          <p className="text-[var(--muted)] text-[15px] mt-3">
            Live teams + active bookings. Auto-assign uses nearest available team by Haversine distance.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={handleBulkAssign}
          disabled={busy || unassignedCount === 0}
        >
          {busy ? "Working..." : `Auto Assign ${unassignedCount} Unassigned`}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] gap-4">
        <div className="card overflow-hidden" style={{ minHeight: 540 }}>
          {!apiKey ? (
            <div className="h-full flex items-center justify-center text-[var(--muted)] p-8 text-center">
              Set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in <code>apps/admin/.env</code> to enable the live map.
            </div>
          ) : !isLoaded ? (
            <div className="h-full flex items-center justify-center text-[var(--muted)]">
              Loading map...
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={11}
              options={{
                disableDefaultUI: false,
                streetViewControl: false,
                mapTypeControl: false,
                styles: [
                  { elementType: "geometry", stylers: [{ color: "#1f2123" }] },
                  { elementType: "labels.text.stroke", stylers: [{ color: "#1f2123" }] },
                  { elementType: "labels.text.fill", stylers: [{ color: "#a8aaa6" }] },
                  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2f31" }] },
                  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1011" }] },
                ],
              }}
            >
              {teamsOnMap.map((t: any) => (
                <MarkerF
                  key={`team-${t._id}`}
                  position={{ lat: t.currentLat, lng: t.currentLng }}
                  onClick={() => setSelectedTeam(t)}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 9,
                    fillColor: t.status === "available" ? "#b6ff1c" : "#ffb020",
                    fillOpacity: 1,
                    strokeColor: "#111",
                    strokeWeight: 2,
                  }}
                />
              ))}
              {bookingsOnMap.map((b: any) => (
                <MarkerF
                  key={`booking-${b._id}`}
                  position={{ lat: b.address.latitude, lng: b.address.longitude }}
                  onClick={() => setSelectedBooking(b)}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 11,
                    fillColor: statusColors[b.status] || "#a8aaa6",
                    fillOpacity: 0.9,
                    strokeColor: "#fff",
                    strokeWeight: 2,
                  }}
                />
              ))}
              {selectedTeam && (
                <InfoWindowF
                  position={{ lat: selectedTeam.currentLat, lng: selectedTeam.currentLng }}
                  onCloseClick={() => setSelectedTeam(null)}
                >
                  <div style={{ color: "#111" }}>
                    <div style={{ fontWeight: 900, marginBottom: 4 }}>{selectedTeam.name}</div>
                    <div style={{ fontSize: 12 }}>Status: {selectedTeam.status}</div>
                    {selectedTeam.lastLocationAt && (
                      <div style={{ fontSize: 11, color: "#666" }}>
                        Updated {Math.round((Date.now() - selectedTeam.lastLocationAt) / 1000)}s ago
                      </div>
                    )}
                  </div>
                </InfoWindowF>
              )}
              {selectedBooking && (
                <InfoWindowF
                  position={{
                    lat: selectedBooking.address.latitude,
                    lng: selectedBooking.address.longitude,
                  }}
                  onCloseClick={() => setSelectedBooking(null)}
                >
                  <div style={{ color: "#111", minWidth: 200 }}>
                    <div style={{ fontWeight: 900, marginBottom: 4 }}>
                      {selectedBooking.bookingNumber}
                    </div>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>
                      {selectedBooking.washType?.name} · {selectedBooking.status}
                    </div>
                    <div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>
                      {selectedBooking.address.formattedAddress}
                    </div>
                    <button
                      onClick={() => handleReassign(selectedBooking._id)}
                      disabled={busy}
                      style={{
                        background: "#2f80ff",
                        color: "white",
                        border: "none",
                        padding: "6px 10px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {selectedBooking.assignedTeamId ? "Reassign nearest" : "Assign nearest"}
                    </button>
                  </div>
                </InfoWindowF>
              )}
            </GoogleMap>
          )}
        </div>

        <div className="space-y-3">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[20px] font-[900] m-0">Dispatch Queue</h2>
                <p className="text-[var(--muted)] text-[13px] mt-1">Active bookings</p>
              </div>
              <span className="badge badge-red">{unassignedCount} unassigned</span>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {activeBookings.slice(0, 20).map((b: any) => (
                <div
                  key={b._id}
                  className="p-4 rounded-2xl border border-[var(--border)] cursor-pointer transition-all hover:border-[var(--green)]"
                  style={{ background: "var(--panel-3)" }}
                  onClick={() => setSelectedBooking(b)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-[900]">{b.bookingNumber}</span>
                    <span
                      className={`badge ${b.assignedTeamId ? "badge-green" : "badge-red"}`}
                    >
                      {b.assignedTeamId ? b.team?.name || "Assigned" : "Unassigned"}
                    </span>
                  </div>
                  <div className="text-[var(--muted)] text-[13px] leading-relaxed mb-2">
                    {b.address?.formattedAddress || "No address"} · {b.washType?.name || "N/A"}
                  </div>
                  {b.etaMin && b.etaMax && (
                    <div className="text-[11px] text-[var(--muted)]">
                      ETA {b.etaMin}–{b.etaMax} min
                    </div>
                  )}
                  <button
                    className="text-[11px] text-[var(--green)] font-[700] mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReassign(b._id);
                    }}
                    disabled={busy}
                  >
                    {b.assignedTeamId ? "Reassign nearest →" : "Assign nearest →"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-[17px] font-[900] m-0 mb-3">
              Active Teams ({teamsOnMap.length})
            </h3>
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {(liveTeams || [])
                .filter((t: any) => t.status !== "offline")
                .map((t: any) => (
                  <div
                    key={t._id}
                    className="p-3 rounded-xl border border-[var(--border-soft)]"
                    style={{ background: "var(--panel-2)" }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${t.status === "available" ? "bg-[var(--green)]" : "bg-[var(--amber)]"}`}
                        />
                        <span className="font-[700] text-[14px]">{t.name}</span>
                      </div>
                      <span
                        className={`badge ${t.status === "available" ? "badge-green" : "badge-amber"}`}
                      >
                        {t.status}
                      </span>
                    </div>
                    {t.lastLocationAt ? (
                      <div className="text-[11px] text-[var(--muted)] mt-1">
                        Live · {Math.round((Date.now() - t.lastLocationAt) / 1000)}s ago
                      </div>
                    ) : (
                      <div className="text-[11px] text-[var(--red)] mt-1">No GPS yet</div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
