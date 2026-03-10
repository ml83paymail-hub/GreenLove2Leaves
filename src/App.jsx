import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Auth ─────────────────────────────────────────────────────────────────────
const MAIN_PW = import.meta.env.VITE_PASSWORD_MAIN;
const GUEST_PW = import.meta.env.VITE_PASSWORD_GUEST;
const SESSION_KEY = "gl2_session";
const SESSION_DAYS = 7;

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { role, expires } = JSON.parse(raw);
    if (Date.now() > expires) { localStorage.removeItem(SESSION_KEY); return null; }
    return role;
  } catch { return null; }
}

function setSession(role) {
  const expires = role === "guest"
    ? Date.now() + 2 * 60 * 60 * 1000
    : Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ role, expires }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// Context for role
const RoleContext = createContext("guest");
const useRole = () => useContext(RoleContext);

function LoginScreen({ onLogin }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = () => {
    if (pw === MAIN_PW) { setSession("main"); onLogin("main"); }
    else if (pw === GUEST_PW) { setSession("guest"); onLogin("guest"); }
    else {
      setError(true); setShake(true);
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "linear-gradient(145deg, #e8e7dc 0%, #EBEBE6 40%, #e2e1d8 100%)", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }`}</style>
      <div style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "16px", padding: "40px 36px", width: "100%", maxWidth: "340px", boxShadow: "0 8px 40px rgba(0,0,0,0.12)", border: "1px solid rgba(255,255,255,0.7)", animation: shake ? "shake 0.5s ease" : "none" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "32px", marginBottom: "10px" }}>🌿</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#1e2218", letterSpacing: "0.5px" }}>GreenLove2Leaves</div>
          <div style={{ fontSize: "12px", color: "#8a9080", marginTop: "4px" }}>Bitte Passwort eingeben</div>
        </div>
        <input
          type="password"
          value={pw}
          onChange={e => { setPw(e.target.value); setError(false); }}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder="Passwort"
          autoFocus
          style={{ width: "100%", padding: "11px 14px", borderRadius: "8px", border: `1px solid ${error ? "#b94040" : "rgba(255,255,255,0.7)"}`, background: "rgba(235,235,230,0.8)", fontSize: "14px", color: "#1e2218", outline: "none", boxSizing: "border-box", fontFamily: "system-ui, sans-serif", transition: "border 0.2s" }}
        />
        {error && <div style={{ fontSize: "11px", color: "#b94040", marginTop: "6px", textAlign: "center" }}>Falsches Passwort</div>}
        <button onClick={handleSubmit} style={{ width: "100%", marginTop: "14px", padding: "11px", borderRadius: "8px", border: "none", background: "#5c6c56", color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "system-ui, sans-serif" }}>
          Einloggen
        </button>
      </div>
    </div>
  );
}

// ── Toast Notifications ──────────────────────────────────────────────────────
function ToastContainer({ toasts, onRemove }) {
  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999, display: "flex", flexDirection: "column", gap: "10px", pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: "#5c6c56", color: "white", borderRadius: "10px",
          padding: "12px 18px", fontSize: "13px", fontFamily: "system-ui, sans-serif",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)", maxWidth: "280px",
          animation: "slideIn 0.3s ease", pointerEvents: "auto",
          display: "flex", alignItems: "flex-start", gap: "10px",
        }}>
          <span style={{ fontSize: "18px", flexShrink: 0 }}>🌿</span>
          <div>
            <div style={{ fontWeight: "600", marginBottom: "2px" }}>{t.title}</div>
            <div style={{ fontSize: "11px", opacity: 0.85 }}>{t.msg}</div>
          </div>
          <button onClick={() => onRemove(t.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: "14px", marginLeft: "auto", flexShrink: 0 }}>✕</button>
        </div>
      ))}
      <style>{`@keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
}

// ── Supabase ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://booronkmwfvdbpyopjsl.supabase.co";
const SUPABASE_KEY = "sb_publishable_xinZMWPSxd7oxz_j5a8HOQ_vElqWJDT";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Discord ───────────────────────────────────────────────────────────────────
const DISCORD_WEBHOOK = import.meta.env.VITE_DISCORD_WEBHOOK;

async function sendDiscordNotification(pflanzenname, notiz, hatFoto) {
  const monate = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
  const d = new Date();
  const datum = d.getDate() + ". " + monate[d.getMonth()] + " " + d.getFullYear();

  const beschreibung = notiz ? `**${pflanzenname}**\n\u200B\n${notiz}` : `**${pflanzenname}**\n\u200B\nEin neues Foto wurde hinzugefügt`;

  const payload = {
    embeds: [{
      description: beschreibung,
      color: 6057046,
      footer: { text: "Tagebuch | " + datum }
    }]
  };

  try {
    await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Discord Fehler:", err);
  }
}

// ── Pie Chart ────────────────────────────────────────────────────────────────
function PieIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }} fill="#333">
      {/* Candle */}
      <rect x="6" y="1" width="2" height="3" rx="0.5" />
      {/* Flame */}
      <ellipse cx="7" cy="1" rx="1" ry="1.2" />
      {/* Top layer of cake */}
      <rect x="2" y="5" width="10" height="3" rx="1" />
      {/* Bottom layer of cake */}
      <rect x="1" y="8.5" width="12" height="4" rx="1" />
    </svg>
  );
}

function shortBeiUnsSeit(datum) {
  if (!datum) return "";
  const start = new Date(datum);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }
  if (years > 0) return `${years}J ${months}M ${days}T`;
  if (months > 0) return `${months}M ${days}T`;
  return `${Math.max(1, days)}T`;
}

// ── Share Helper ─────────────────────────────────────────────────────────────
async function shareImage(url, name) {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const file = new File([blob], `${name}.jpg`, { type: "image/jpeg" });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      return;
    }
  } catch(e) {}
  try {
    if (navigator.share) { await navigator.share({ url, title: name }); return; }
  } catch(e) {}
  const a = document.createElement("a");
  a.href = url; a.download = `${name}.jpg`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ── Design ───────────────────────────────────────────────────────────────────
const BG = "#EBEBE6";
const BG_DARK = "#d4d4ce";
const BG_LIGHT = "#f2f2ee";
const GLASS = "rgba(255,255,255,0.45)";
const GLASS_BORDER = "rgba(255,255,255,0.7)";
const GLASS_SHADOW = "0 4px 24px rgba(180,178,160,0.18)";
const ACCENT = "#5c6c56";
const ACCENT_LIGHT = "#c8e0b0";
const TEXT_DARK = "#1e2218";
const TEXT_MID = "#4a5240";
const TEXT_LIGHT = "#8a9080";
const WHITE = "#f5f4ee";
const FONT = "system-ui, -apple-system, sans-serif";
const BTN = "#5c6c56";

const WOCHENTAGE = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcBeiUnsSeit(dateStr) {
  if (!dateStr) return "–";
  const start = new Date(dateStr);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }
  const parts = [];
  if (years > 0) parts.push(`${years} Jahr${years !== 1 ? "e" : ""}`);
  if (months > 0) parts.push(`${months} Monat${months !== 1 ? "e" : ""}`);
  if (days > 0) parts.push(`${days} Tag${days !== 1 ? "e" : ""}`);
  return parts.length ? parts.join(", ") : "Heute";
}

function getWochentag(dateStr) {
  if (!dateStr) return "–";
  return WOCHENTAGE[new Date(dateStr).getDay()];
}

function formatDate(dateStr) {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// DB row → app object
function dbToPlant(row) {
  return {
    id: row.id,
    name: row.name,
    vollstaendigerName: row.vollstaendiger_name || "",
    typ: row.typ || "",
    datum: row.datum || "",
    standort: row.standort || "",
    erhaltenVon: row.erhalten_von || "",
    aufIm: row.auf_im || "",
    tc: row.TC === true || row.tc === true,
    foto: row.foto_url || "",
  };
}

// app object → DB row
function plantToDb(p) {
  return {
    name: p.name,
    vollstaendiger_name: p.vollstaendigerName || null,
    typ: p.typ || null,
    datum: p.datum || null,
    standort: p.standort || null,
    erhalten_von: p.erhaltenVon || null,
    auf_im: p.aufIm || null,
    "TC": p.tc === true,
    foto_url: p.foto || null,
  };
}

// DB tagebuch → app entry
function dbToEntry(row) {
  return {
    id: row.id,
    date: row.created_at,
    note: row.notiz || "",
    photo: row.foto_url || "",
  };
}

// ── Image compression ─────────────────────────────────────────────────────────
function compressImage(file, maxPx = 1920, quality = 0.88) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width > height) { height = Math.round(height * maxPx / width); width = maxPx; }
        else { width = Math.round(width * maxPx / height); height = maxPx; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(resolve, "image/jpeg", quality);
    };
    img.src = URL.createObjectURL(file);
  });
}

// ── Upload photo to Supabase Storage ──────────────────────────────────────────
async function uploadPhoto(file, folder = "pflanzen") {
  const compressed = await compressImage(file);
  const ext = "jpg";
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("pflanzen-fotos").upload(path, compressed, { contentType: "image/jpeg" });
  if (error) throw error;
  const { data } = supabase.storage.from("pflanzen-fotos").getPublicUrl(path);
  return data.publicUrl;
}

// ── Menu ──────────────────────────────────────────────────────────────────────
const menu = [
  { id: "updates", label: "Updates", emoji: "»", sub: [{ id: "fotoalbum", label: "Fotoalbum", emoji: "»" }] },
  { id: "content", label: "Content", emoji: "»", sub: [{ id: "social-media", label: "Social Media", emoji: "»" }] },
  { id: "pflanzen", label: "Pflanzen", emoji: "»", sub: [
    { id: "unsere-pflanzen", label: "Unsere Pflanzen", emoji: "»" },
    { id: "ableger", label: "Unsere Ableger", emoji: "»" },
    { id: "wishlist", label: "Wishlist", emoji: "»" },
    { id: "notizbuch", label: "Notizbuch", emoji: "»" },
  ]},
  { id: "aufgaben", label: "Aufgaben & Termine", emoji: "»", sub: [
    { id: "todo", label: "To Do Liste", emoji: "»" },
    { id: "sale-termine", label: "Sale Termine", emoji: "»" },
    { id: "akklimatisierung", label: "Akklimatisierung", emoji: "»" },
  ]},
  { id: "einverkauf", label: "Ein & Verkauf", emoji: "»", sub: [
    { id: "bestellungen", label: "Bestellungen & Käufe", emoji: "»" },
    { id: "anzeigen", label: "Aktuelle Anzeigen", emoji: "»" },
    { id: "pflanzenkasse", label: "Pflanzenkasse", emoji: "»" },
  ]},
  { id: "duenger", label: "Dünger & Substrat", emoji: "»", sub: [
    { id: "duenger-detail", label: "Dünger", emoji: "»" },
    { id: "substrat", label: "Substrat", emoji: "»" },
  ]},
  { id: "informationen", label: "Informationen", emoji: "»", sub: [
    { id: "naehrstoffe", label: "Nährstoffe", emoji: "»" },
    { id: "gewebe", label: "Gewebebeurteilung", emoji: "»" },
    { id: "nuetzlinge", label: "Nützlinge", emoji: "»" },
    { id: "wiki", label: "Pflanzen Wiki", emoji: "»" },
  ]},
  { id: "system", label: "System", emoji: "»", sub: [
    { id: "postfach", label: "Postfach", emoji: "»" },
    { id: "gastzugang", label: "Gastzugang", emoji: "»" },
    { id: "archiv", label: "Archiv", emoji: "»" },
  ]},
];

const pages = {
  "social-media": { title: "Social Media", desc: "Dein Foto-Grid für deine Pflanzenmomente.", empty: "Noch keine Fotos vorhanden." },
  "postfach": { title: "Postfach", desc: "Deine Nachrichten und Benachrichtigungen.", empty: "Dein Postfach ist leer." },
  ableger: { title: "Unsere Ableger", desc: "Alle Ableger und Stecklinge im Überblick.", empty: "Noch keine Ableger dokumentiert." },
  wishlist: { title: "Wishlist", desc: "Pflanzen die du noch haben möchtest.", empty: "Deine Wunschliste ist noch leer." },
  notizbuch: { title: "Notizbuch", desc: "Persönliche Notizen rund um deine Pflanzen.", empty: "Noch keine Notizen vorhanden." },
  todo: { title: "To Do Liste", desc: "Alle anstehenden Aufgaben.", empty: "Keine offenen Aufgaben!" },
  "sale-termine": { title: "Sale Termine", desc: "Bevorstehende Verkaufs- und Tauschtermine.", empty: "Keine Termine eingetragen." },
  "sale-termine": { title: "Sale Termine", desc: "Übersicht aller Sale-Termine.", empty: "Noch keine Sale-Termine eingetragen." },
  akklimatisierung: { title: "Akklimatisierung", desc: "Neue Pflanzen in der Eingewöhnungsphase.", empty: "Keine Pflanzen in der Akklimatisierung." },
  bestellungen: { title: "Bestellungen & Käufe", desc: "Übersicht aller Käufe und Bestellungen.", empty: "Noch keine Bestellungen erfasst." },
  anzeigen: { title: "Aktuelle Anzeigen", desc: "Deine aktiven Verkaufs- und Tauschangebote.", empty: "Keine aktiven Anzeigen." },
  pflanzenkasse: { title: "Pflanzenkasse", desc: "Einnahmen und Ausgaben rund um deine Pflanzen.", empty: "Noch keine Einträge in der Kasse." },
  "duenger-detail": { title: "Dünger", desc: "Alle Düngemittel, Dosierungen und Vorräte.", empty: "Noch kein Dünger eingetragen." },
  substrat: { title: "Substrat", desc: "Übersicht deiner Substrate und Mischungen.", empty: "Noch kein Substrat eingetragen." },
  naehrstoffe: { title: "Nährstoffe", desc: "Informationen zu Makro- und Mikronährstoffen.", empty: "Noch keine Nährstoff-Infos vorhanden." },
  gewebe: { title: "Gewebebeurteilung", desc: "Pflanzenkrankheiten erkennen und beurteilen.", empty: "Noch keine Einträge vorhanden." },
  nuetzlinge: { title: "Nützlinge", desc: "Hilfreiche Insekten und biologische Schädlingsbekämpfung.", empty: "Noch keine Nützlinge dokumentiert." },
  wiki: { title: "Pflanzen Wiki", desc: "Deine persönliche Pflanzenenzyklopädie.", empty: "Das Wiki ist noch leer." },
};

// ── Plant Card ────────────────────────────────────────────────────────────────
function PlantCard({ plant, onClick }) {
  return (
    <div onClick={() => onClick(plant)} style={{
      background: GLASS, borderRadius: "10px", overflow: "hidden",
      border: `1px solid ${GLASS_BORDER}`, cursor: "pointer",
      transition: "transform 0.15s, box-shadow 0.15s", boxShadow: GLASS_SHADOW,
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(150,148,130,0.22)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = GLASS_SHADOW; }}
    >
      <div style={{
        height: "220px",
        background: plant.foto ? `url(${plant.foto}) center/cover no-repeat` : BTN,
        display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
        aspectRatio: "3/4",
        height: "auto",
      }}>
        {!plant.foto && <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#EBEBE6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}><rect x="1" y="6" width="22" height="15" rx="3" ry="3"/><path d="M8 6l2-3h4l2 3"/><circle cx="12" cy="13.5" r="3.5"/><circle cx="17.5" cy="9.5" r="1"/></svg>}
        {plant.typ && (
          <span style={{
            position: "absolute", top: "10px", right: "10px",
            background: "rgba(255,255,255,0.88)", fontSize: "10px",
            padding: "3px 9px", borderRadius: "20px", color: TEXT_MID, fontFamily: FONT,
          }}>{plant.typ}</span>
        )}
      </div>
      <div style={{ padding: "14px 16px", background: "rgba(255,255,255,0.3)" }}>
        <div style={{ fontSize: "13px", fontWeight: "600", color: TEXT_DARK, marginBottom: "2px", fontFamily: FONT }}>{plant.name}</div>
        <div style={{ height: "1px", background: BG_DARK, marginBottom: "10px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "3px" }}>
          <span style={{ fontSize: "10px", color: TEXT_LIGHT, fontFamily: FONT }}>Standort</span>
          <span style={{ fontSize: "10px", color: TEXT_MID, fontFamily: FONT, textAlign: "right" }}>{plant.standort || "–"}</span>
        </div>
        {plant.datum && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginTop: "3px" }}>
            <PieIcon />
            <span style={{ fontSize: "10px", color: TEXT_MID, fontFamily: FONT }}>{shortBeiUnsSeit(plant.datum)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tagebuch ─────────────────────────────────────────────────────────────────
function Tagebuch({ plantId, plantName }) {
  const role = useRole();
  const canEdit = role !== "readonly" && role !== "guest";
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [discordOn, setDiscordOn] = useState(() => localStorage.getItem("discordOn") !== "false");
  const toggleDiscord = () => setDiscordOn(v => { localStorage.setItem("discordOn", !v); return !v; });
  const [newNote, setNewNote] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    supabase.from("tagebuch").select("*").eq("pflanze_id", plantId).order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setEntries(data.map(dbToEntry)); });
  }, [plantId]);

  const allEntries = entries;
  const visible = showAll ? allEntries : allEntries.slice(0, 5);
  const hidden = allEntries.length - 5;

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!newNote.trim() && !photoFile) return;
    setSaving(true);
    try {
      let foto_url = null;
      if (photoFile) foto_url = await uploadPhoto(photoFile, "tagebuch");
      const { data, error } = await supabase.from("tagebuch").insert({
        pflanze_id: plantId, notiz: newNote.trim() || null, foto_url,
        created_at: new Date(entryDate).toISOString(),
      }).select().single();
      if (!error && data) setEntries(prev => [...prev, dbToEntry(data)]);
      setNewNote(""); setPhotoFile(null); setPhotoPreview(null); setShowForm(false);
      setEntryDate(new Date().toISOString().slice(0, 10));
      // Discord Benachrichtigung
      if (discordOn) sendDiscordNotification(plantName, newNote.trim() || null, !!foto_url);
    } finally { setSaving(false); }
  };

  const handleDelete = async (entryId) => {
    await supabase.from("tagebuch").delete().eq("id", entryId);
    setEntries(prev => prev.filter(e => e.id !== entryId));
  };

  const handleUpdate = async (entryId, note, date) => {
    const { data } = await supabase.from("tagebuch").update({
      notiz: note || null,
      created_at: new Date(date).toISOString(),
    }).eq("id", entryId).select().single();
    if (data) setEntries(prev => prev.map(e => e.id === entryId ? dbToEntry(data) : e));
    setEditingEntry(null);
  };

  const formatEntryDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <div style={{ marginTop: "22px" }}>
      <div style={{ height: "1px", background: BG_DARK, marginBottom: "18px" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ fontSize: "13px", color: "#222", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: FONT, fontWeight: "700" }}>Tagebuch</div>
          <div onClick={toggleDiscord} title={discordOn ? "Discord: An" : "Discord: Aus"} style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", background: discordOn ? "#5c6c56" : "#ccc", borderRadius: "20px", padding: "3px 8px 3px 6px", transition: "background 0.2s" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white" style={{ flexShrink: 0 }}><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "white", transition: "opacity 0.2s", opacity: discordOn ? 1 : 0.5 }} />
          </div>
        </div>
        {canEdit && <button onClick={() => setShowForm(v => !v)} style={{
          background: showForm ? BG_DARK : ACCENT, border: "none",
          borderRadius: "6px", padding: "5px 12px", cursor: "pointer",
          fontSize: "11px", color: showForm ? TEXT_MID : WHITE, fontFamily: FONT,
        }}>{showForm ? "Abbrechen" : "+ Eintrag"}</button>}
      </div>

      {showForm && (
        <div style={{ background: BG, borderRadius: "8px", padding: "14px", border: `1px solid ${BG_DARK}`, marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <textarea placeholder="Notiz schreiben …" value={newNote} onChange={e => setNewNote(e.target.value)} rows={3} style={{ width: "100%", background: WHITE, border: `1px solid ${BG_DARK}`, borderRadius: "6px", padding: "8px 10px", fontSize: "12px", color: TEXT_DARK, fontFamily: FONT, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          {/* Date picker */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "9px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT }}>Datum & Uhrzeit</label>
            <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)}
              style={{ background: WHITE, border: `1px solid ${BG_DARK}`, borderRadius: "6px", padding: "7px 10px", fontSize: "12px", color: TEXT_DARK, fontFamily: FONT, outline: "none" }} />
          </div>

          <div>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: WHITE, border: `1px solid ${BG_DARK}`, borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "11px", color: TEXT_MID, fontFamily: FONT }}>
              📷 Foto hinzufügen
              <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
            </label>
            {photoPreview && (
              <div style={{ marginTop: "8px", position: "relative", display: "inline-block" }}>
                <img src={photoPreview} alt="Vorschau" style={{ width: "100%", maxHeight: "280px", objectFit: "cover", borderRadius: "6px", border: `1px solid ${BG_DARK}` }} />
                <button onClick={() => { setPhotoPreview(null); setPhotoFile(null); }} style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: "22px", height: "22px", cursor: "pointer", fontSize: "11px", color: WHITE }}>✕</button>
              </div>
            )}
          </div>
          <button onClick={handleSave} disabled={saving} style={{ background: (newNote.trim() || photoFile) && !saving ? ACCENT : BG_DARK, border: "none", borderRadius: "6px", padding: "8px", cursor: "pointer", fontSize: "12px", color: WHITE, fontFamily: FONT, alignSelf: "flex-end", minWidth: "100px" }}>
            {saving ? "Speichert …" : "Speichern"}
          </button>
        </div>
      )}

      {allEntries.length === 0 ? (
        <div style={{ padding: "20px", textAlign: "center", color: TEXT_LIGHT, fontSize: "12px", fontFamily: FONT, background: BG, borderRadius: "8px" }}>Noch keine Einträge vorhanden.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {visible.map(entry => (
            <div key={entry.id} style={{ background: BG, borderRadius: "8px", border: `1px solid ${BG_DARK}`, overflow: "visible", position: "relative" }}>
              {entry.photo && <img src={entry.photo} alt="" style={{ width: "100%", height: "auto", display: "block", borderRadius: "8px 8px 0 0" }} />}
              <div style={{ padding: "10px 12px" }}>
                {editingEntry === entry.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <textarea defaultValue={entry.note} id={"edit-note-"+entry.id} rows={3} style={{ width: "100%", background: WHITE, border: `1px solid ${BG_DARK}`, borderRadius: "6px", padding: "8px 10px", fontSize: "14px", color: TEXT_DARK, fontFamily: FONT, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                    <input type="date" defaultValue={entry.date.slice(0,10)} id={"edit-date-"+entry.id} style={{ background: WHITE, border: `1px solid ${BG_DARK}`, borderRadius: "6px", padding: "7px 10px", fontSize: "12px", color: TEXT_DARK, fontFamily: FONT, outline: "none" }} />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => setEditingEntry(null)} style={{ flex: 1, background: BG_DARK, border: "none", borderRadius: "6px", padding: "7px", cursor: "pointer", fontSize: "12px", color: TEXT_MID, fontFamily: FONT }}>Abbrechen</button>
                      <button onClick={() => handleUpdate(entry.id, document.getElementById("edit-note-"+entry.id).value, document.getElementById("edit-date-"+entry.id).value)} style={{ flex: 2, background: BTN, border: "none", borderRadius: "6px", padding: "7px", cursor: "pointer", fontSize: "12px", color: WHITE, fontFamily: FONT }}>Speichern</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {entry.note && <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: TEXT_DARK, fontFamily: FONT, lineHeight: "1.6" }}>{entry.note}</p>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#222", fontFamily: FONT }}>{formatEntryDate(entry.date)}</span>
                      <div style={{ position: "relative" }}>
                        {canEdit && <button onClick={e => { e.stopPropagation(); const m = document.getElementById("menu-"+entry.id); m.style.display = m.style.display === "block" ? "none" : "block"; }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: TEXT_LIGHT, fontFamily: FONT, padding: "2px 6px", letterSpacing: "1px" }}>⋯</button>}
                        <div id={"menu-"+entry.id} style={{ display: "none", position: "absolute", right: 0, top: "100%", marginTop: "4px", background: WHITE, borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", border: `1px solid ${BG_DARK}`, minWidth: "130px", zIndex: 100, overflow: "hidden" }}>
                          <button onClick={() => { setEditingEntry(entry.id); document.getElementById("menu-"+entry.id).style.display = "none"; }} style={{ width: "100%", background: "none", border: "none", padding: "10px 14px", textAlign: "left", cursor: "pointer", fontSize: "12px", color: TEXT_DARK, fontFamily: FONT, display: "flex", alignItems: "center", gap: "8px" }}>
                            <span>✎</span> Bearbeiten
                          </button>
                          <div style={{ height: "1px", background: BG_DARK }} />
                          <button onClick={() => handleDelete(entry.id)} style={{ width: "100%", background: "none", border: "none", padding: "10px 14px", textAlign: "left", cursor: "pointer", fontSize: "12px", color: "#222", fontFamily: FONT, display: "flex", alignItems: "center", gap: "8px", fontWeight: "600" }}>
                            <span>✕</span> Löschen
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
          {!showAll && hidden > 0 && (
            <button onClick={() => setShowAll(true)} style={{ background: "none", border: `1px solid ${BG_DARK}`, borderRadius: "6px", padding: "7px", cursor: "pointer", fontSize: "11px", color: TEXT_LIGHT, fontFamily: FONT, width: "100%" }}>
              ▼ {hidden} weitere Einträge anzeigen
            </button>
          )}
          {showAll && (
            <button onClick={() => setShowAll(false)} style={{ background: "none", border: `1px solid ${BG_DARK}`, borderRadius: "6px", padding: "7px", cursor: "pointer", fontSize: "11px", color: TEXT_LIGHT, fontFamily: FONT, width: "100%" }}>
              ▲ Weniger anzeigen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Plant Modal ───────────────────────────────────────────────────────────────
function PlantModal({ plant, onClose, onDelete, onSave }) {
  const role = useRole();
  const canEdit = role !== "readonly" && role !== "guest";
  const [editMode, setEditMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState({ ...plant, tc: plant.tc === true });
  const [uploading, setUploading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inputStyle = { width: "100%", background: BG, border: `1px solid ${BG_DARK}`, borderRadius: "6px", padding: "7px 10px", fontSize: "12px", color: TEXT_DARK, fontFamily: FONT, outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontSize: "9px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "4px", fontFamily: FONT };

  const handleFotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadPhoto(file);
      set("foto", url);
    } finally { setUploading(false); }
  };

  const handleShare = async () => {
    if (!plant.foto) return;
    try {
      const resp = await fetch(plant.foto);
      const blob = await resp.blob();
      const file = new File([blob], `${plant.name}.jpg`, { type: "image/jpeg" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: plant.name });
        return;
      }
    } catch(e) {}
    if (navigator.share) {
      try { await navigator.share({ url: plant.foto, title: plant.name }); return; } catch(e) {}
    }
    handleDownload();
  };

  const handleDownload = async () => {
    if (!plant.foto) return;
    try {
      const resp = await fetch(plant.foto);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${plant.name}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch(e) {
      window.open(plant.foto, "_blank");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" }}
      onClick={() => { setMenuOpen(false); onClose(); }}>
      <div style={{ background: "rgba(245,244,238,0.88)", borderRadius: "14px", width: "100%", maxWidth: "440px", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", maxHeight: "90vh", overflowY: "auto", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid ${GLASS_BORDER}` }}
        onClick={e => e.stopPropagation()}>

        {/* Photo area */}
        <div style={{ height: "280px", background: form.foto ? `url(${form.foto}) center/cover` : BTN, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
          {!form.foto && <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.75 }}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}
          {uploading && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "13px", fontFamily: FONT }}>Lädt hoch …</div>}
          <button onClick={onClose} style={{ position: "absolute", top: "12px", left: "12px", background: "rgba(255,255,255,0.9)", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", fontSize: "13px", color: TEXT_MID }}>✕</button>

          {/* Photo upload button (edit mode) */}
          {editMode && (
            <label style={{ position: "absolute", bottom: "12px", left: "12px", background: "rgba(255,255,255,0.9)", borderRadius: "6px", padding: "5px 10px", fontSize: "11px", color: TEXT_MID, cursor: "pointer", fontFamily: FONT }}>
              📷 Foto ändern
              <input type="file" accept="image/*" onChange={handleFotoUpload} style={{ display: "none" }} />
            </label>
          )}



          {/* 3-dot menu */}
          {canEdit && <div style={{ position: "absolute", top: "12px", right: "12px" }}>
            <button onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }} style={{ background: "rgba(255,255,255,0.9)", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", fontSize: "16px", color: TEXT_MID, display: "flex", alignItems: "center", justifyContent: "center" }}>⋯</button>
            {menuOpen && (
              <div style={{ position: "absolute", top: "36px", right: 0, background: WHITE, borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", border: `1px solid ${BG_DARK}`, overflow: "hidden", minWidth: "140px", zIndex: 10 }}>
                <button onClick={() => { onDelete(plant.id); setMenuOpen(false); }} style={{ width: "100%", background: "none", border: "none", padding: "11px 16px", textAlign: "left", cursor: "pointer", fontSize: "12px", color: "#b94040", fontFamily: FONT, display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🗑</span> Pflanze löschen
                </button>
              </div>
            )}
          </div>}
        </div>

        <div style={{ padding: "22px" }}>
          {!editMode ? (
            <>
              <div style={{ fontSize: "17px", fontWeight: "700", color: TEXT_DARK, marginBottom: "2px", fontFamily: FONT }}>{plant.name}</div>
              <div style={{ fontSize: "11px", color: TEXT_LIGHT, fontStyle: "italic", marginBottom: "16px", fontFamily: FONT }}>{plant.vollstaendigerName || "–"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>
                {[["Typ", plant.typ],["Standort", plant.standort],["Datum", formatDate(plant.datum)],["Wochentag", getWochentag(plant.datum)],["Bei uns seit", calcBeiUnsSeit(plant.datum)],["Erhalten von", plant.erhaltenVon],["Auf / Im", plant.aufIm],["TC Pflanze", plant.tc ? "✓ Ja" : ""]].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: "9px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "3px", fontFamily: FONT }}>{label}</div>
                    <div style={{ fontSize: "12px", color: TEXT_DARK, fontFamily: FONT }}>{value || "–"}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
                <button onClick={onClose} style={{ flex: 1, background: BG, border: `1px solid ${BG_DARK}`, borderRadius: "6px", padding: "9px", cursor: "pointer", fontSize: "12px", color: TEXT_MID, fontFamily: FONT }}>Schließen</button>
                {canEdit && <button onClick={() => setEditMode(true)} style={{ flex: 1, background: ACCENT, border: "none", borderRadius: "6px", padding: "9px", cursor: "pointer", fontSize: "12px", color: WHITE, fontFamily: FONT }}>✎ Bearbeiten</button>}
              </div>
              <Tagebuch plantId={plant.id} plantName={plant.name} />
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "13px" }}>
                <div><label style={labelStyle}>Name *</label><input style={inputStyle} value={form.name} onChange={e => set("name", e.target.value)} /></div>
                <div><label style={labelStyle}>Typ</label>
                  <select style={{...inputStyle, appearance: "none", WebkitAppearance: "none", cursor: "pointer"}} value={form.typ} onChange={e => set("typ", e.target.value)}>
                    <option value="">– Bitte wählen –</option>
                    {["Alocasia","Anthurium","Hoya","Dischidia","Begonie","Fleischis","Philodendron","Monstera","Scindapsus","Weitere Pflanzen"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div><label style={labelStyle}>Vollständiger Name</label><input style={inputStyle} value={form.vollstaendigerName} onChange={e => set("vollstaendigerName", e.target.value)} /></div>
              <div><label style={labelStyle}>Datum (Einzug)</label><input type="date" style={inputStyle} value={form.datum} onChange={e => set("datum", e.target.value)} /></div>
              {form.datum && (
                <div style={{ background: BG, borderRadius: "8px", padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", border: `1px solid ${BG_DARK}` }}>
                  <div><div style={{ fontSize: "9px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT }}>Wochentag</div><div style={{ fontSize: "12px", color: ACCENT, fontFamily: FONT, marginTop: "3px", fontWeight: "600" }}>{getWochentag(form.datum)}</div></div>
                  <div><div style={{ fontSize: "9px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT }}>Bei uns seit</div><div style={{ fontSize: "12px", color: ACCENT, fontFamily: FONT, marginTop: "3px", fontWeight: "600" }}>{calcBeiUnsSeit(form.datum)}</div></div>
                </div>
              )}
              <div><label style={labelStyle}>Standort</label>
                <select style={{...inputStyle, appearance: "none", WebkitAppearance: "none", cursor: "pointer"}} value={form.standort} onChange={e => set("standort", e.target.value)}>
                  <option value="">– Bitte wählen –</option>
                  {["Wohnzimmer","Schlafzimmer","Küche","Bad","Flur"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Erhalten von</label><input style={inputStyle} value={form.erhaltenVon} onChange={e => set("erhaltenVon", e.target.value)} /></div>
              <div><label style={labelStyle}>Auf / Im</label>
                <select style={{...inputStyle, appearance: "none", WebkitAppearance: "none", cursor: "pointer"}} value={form.aufIm} onChange={e => set("aufIm", e.target.value)}>
                  <option value="">– Bitte wählen –</option>
                  {["Instagram","Store","Webseite","eBay","Kleinanzeigen","Facebook","WA - Anthurien Verkauf","WA - Rare Plant (TC)","WA - VerkaufsGruppen","WA - Auktionen","WA - Hoyaddicted","WA - Hoya Verkauf"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", cursor: "pointer" }} onClick={() => set("tc", !form.tc)}>
                <div style={{ width: "18px", height: "18px", border: "2px solid #5c6c56", borderRadius: "3px", background: form.tc ? "#5c6c56" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {form.tc && <span style={{ color: "white", fontSize: "13px", lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{ ...labelStyle, margin: 0 }}>TC</span>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button onClick={() => setEditMode(false)} style={{ flex: 1, background: BG, border: `1px solid ${BG_DARK}`, borderRadius: "6px", padding: "10px", cursor: "pointer", fontSize: "12px", color: TEXT_MID, fontFamily: FONT }}>Abbrechen</button>
                <button onClick={() => { if (form.name.trim()) { onSave(form); setEditMode(false); } }} style={{ flex: 2, background: ACCENT, border: "none", borderRadius: "6px", padding: "10px", cursor: "pointer", fontSize: "12px", color: WHITE, fontFamily: FONT }}>Speichern</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add Plant Modal ───────────────────────────────────────────────────────────
function AddPlantModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: "", foto: "", typ: "", datum: "", vollstaendigerName: "", standort: "", erhaltenVon: "", aufIm: "", tc: false });
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inputStyle = { width: "100%", background: BG, border: `1px solid ${BG_DARK}`, borderRadius: "6px", padding: "8px 12px", fontSize: "12px", color: TEXT_DARK, fontFamily: FONT, outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT };

  const handleFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setFotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      let foto_url = null;
      if (fotoFile) foto_url = await uploadPhoto(fotoFile);
      const dbRow = { ...plantToDb({ ...form }), foto_url };
      const { data, error } = await supabase.from("pflanzen").insert(dbRow).select().single();
      if (!error && data) {
        await supabase.from("todos").insert({ titel: data.name + ", bitte ein Label erstellen!", kategorie: "Label", datum: new Date().toISOString().split("T")[0], erledigt: false });
        onSave(dbToPlant(data));
      }
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" }} onClick={onClose}>
      <div style={{ background: "rgba(245,244,238,0.88)", borderRadius: "14px", width: "100%", maxWidth: "460px", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", maxHeight: "90vh", overflowY: "auto", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid ${GLASS_BORDER}` }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "22px 22px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "15px", fontWeight: "600", color: TEXT_DARK, fontFamily: FONT }}>Neue Pflanze hinzufügen</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "15px", color: TEXT_LIGHT }}>✕</button>
        </div>
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: "13px" }}>

          {/* Foto Upload */}
          <div>
            <label style={labelStyle}>Foto</label>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "240px", background: fotoPreview ? `url(${fotoPreview}) center/cover` : BG, border: `1px dashed ${BG_DARK}`, borderRadius: "8px", cursor: "pointer" }}>
              {!fotoPreview && <span style={{ fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>📷 Foto auswählen</span>}
              <input type="file" accept="image/*" onChange={handleFoto} style={{ display: "none" }} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "13px" }}>
            <div><label style={labelStyle}>Name *</label><input style={inputStyle} placeholder="z.B. Monstera" value={form.name} onChange={e => set("name", e.target.value)} /></div>
            <div><label style={labelStyle}>Typ</label>
              <select style={{...inputStyle, appearance: "none", WebkitAppearance: "none", cursor: "pointer"}} value={form.typ} onChange={e => set("typ", e.target.value)}>
                <option value="">– Bitte wählen –</option>
                {["Alocasia","Anthurium","Hoya","Dischidia","Begonie","Fleischis","Philodendron","Monstera","Scindapsus","Weitere Pflanzen"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div><label style={labelStyle}>Vollständiger Name</label><input style={inputStyle} placeholder="Botanischer Name" value={form.vollstaendigerName} onChange={e => set("vollstaendigerName", e.target.value)} /></div>
          <div><label style={labelStyle}>Datum (Einzug)</label><input type="date" style={inputStyle} value={form.datum} onChange={e => set("datum", e.target.value)} /></div>

          {form.datum && (
            <div style={{ background: BG, borderRadius: "8px", padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", border: `1px solid ${BG_DARK}` }}>
              <div><div style={{ fontSize: "9px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT }}>Wochentag</div><div style={{ fontSize: "12px", color: ACCENT, fontFamily: FONT, marginTop: "3px", fontWeight: "600" }}>{getWochentag(form.datum)}</div></div>
              <div><div style={{ fontSize: "9px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT }}>Bei uns seit</div><div style={{ fontSize: "12px", color: ACCENT, fontFamily: FONT, marginTop: "3px", fontWeight: "600" }}>{calcBeiUnsSeit(form.datum)}</div></div>
            </div>
          )}

          <div><label style={labelStyle}>Standort</label>
            <select style={{...inputStyle, appearance: "none", WebkitAppearance: "none", cursor: "pointer"}} value={form.standort} onChange={e => set("standort", e.target.value)}>
              <option value="">– Bitte wählen –</option>
              {["Wohnzimmer","Schlafzimmer","Küche","Bad","Flur"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Erhalten von</label><input style={inputStyle} placeholder="z.B. Instagram" value={form.erhaltenVon} onChange={e => set("erhaltenVon", e.target.value)} /></div>
          <div><label style={labelStyle}>Auf / Im</label>
            <select style={{...inputStyle, appearance: "none", WebkitAppearance: "none", cursor: "pointer"}} value={form.aufIm} onChange={e => set("aufIm", e.target.value)}>
              <option value="">– Bitte wählen –</option>
              {["Instagram","Store","Webseite","eBay","Kleinanzeigen","Facebook","WA - Anthurien Verkauf","WA - Rare Plant (TC)","WA - VerkaufsGruppen","WA - Auktionen","WA - Hoyaddicted","WA - Hoya Verkauf"].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", cursor: "pointer" }} onClick={() => set("tc", !form.tc)}>
            <div style={{ width: "18px", height: "18px", border: "2px solid #5c6c56", borderRadius: "3px", background: form.tc ? "#5c6c56" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {form.tc && <span style={{ color: "white", fontSize: "13px", lineHeight: 1 }}>✓</span>}
            </div>
            <span style={{ ...labelStyle, margin: 0 }}>TC</span>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <button onClick={onClose} style={{ flex: 1, background: BG, border: `1px solid ${BG_DARK}`, borderRadius: "6px", padding: "10px", cursor: "pointer", fontSize: "12px", color: TEXT_MID, fontFamily: FONT }}>Abbrechen</button>
            <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{ flex: 2, background: form.name.trim() && !saving ? BTN : BG_DARK, border: "none", borderRadius: "6px", padding: "10px", cursor: form.name.trim() ? "pointer" : "default", fontSize: "12px", color: WHITE, fontFamily: FONT }}>
              {saving ? "Speichert …" : "Speichern"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Gießplan Widget ───────────────────────────────────────────────────────────
const TAGE_KURZ = ["Mo","Di","Mi","Do","Fr","Sa","So"];
const TAGE_VOLL = ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];
const jsTagToIdx = d => d === 0 ? 6 : d - 1;

function GiessplanWidget({ plants, activeTag, onTagClick, onClose }) {
  const counts = TAGE_VOLL.map(tag => plants.filter(p => p.datum && WOCHENTAGE[new Date(p.datum).getDay()] === tag).length);
  const today = jsTagToIdx(new Date().getDay());
  const max = Math.max(...counts, 1);

  return (
    <div style={{ position: "absolute", top: "54px", right: "48px", zIndex: 50, background: "rgba(245,244,238,0.97)", borderRadius: "14px", boxShadow: "0 8px 32px rgba(0,0,0,0.14)", border: `1px solid ${GLASS_BORDER}`, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: "18px 20px", minWidth: "340px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <span style={{ fontSize: "11px", color: TEXT_MID, letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: FONT, fontWeight: "600" }}>Gießtage – Wochenübersicht</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: TEXT_LIGHT }}>✕</button>
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
        {TAGE_KURZ.map((tag, i) => {
          const isToday = i === today;
          const isActive = activeTag === TAGE_VOLL[i];
          const barH = counts[i] > 0 ? Math.max(20, Math.round((counts[i] / max) * 60)) : 6;
          return (
            <div key={tag} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: "600", color: counts[i] > 0 ? BTN : TEXT_LIGHT, fontFamily: FONT }}>{counts[i] > 0 ? counts[i] : "–"}</span>
              <div onClick={() => counts[i] > 0 && onTagClick(isActive ? null : TAGE_VOLL[i])} style={{ width: "100%", height: `${barH}px`, background: isActive ? "#3a4a34" : BTN, opacity: counts[i] > 0 ? 1 : 0.25, borderRadius: "4px", cursor: counts[i] > 0 ? "pointer" : "default", transition: "all 0.2s", border: isToday ? "2px solid #3a4a34" : "2px solid transparent" }} />
              <span style={{ fontSize: "10px", fontFamily: FONT, color: isToday ? BTN : TEXT_LIGHT, fontWeight: isToday ? "700" : "400" }}>{tag}</span>
            </div>
          );
        })}
      </div>
      {activeTag && (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${BG_DARK}`, fontSize: "11px", color: TEXT_MID, fontFamily: FONT }}>
          Filter aktiv: <strong>{activeTag}</strong> · {plants.filter(p => p.datum && WOCHENTAGE[new Date(p.datum).getDay()] === activeTag).length} Pflanzen
          <button onClick={() => onTagClick(null)} style={{ marginLeft: "10px", background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: ACCENT, fontFamily: FONT }}>Filter entfernen ✕</button>
        </div>
      )}
    </div>
  );
}

// ── Pflanzen Page ─────────────────────────────────────────────────────────────
const GROUP_OPTIONS = [
  { value: "none", label: "Keine Gruppierung" },
  { value: "typ", label: "Nach Typ" },
  { value: "standort", label: "Nach Standort" },
  { value: "aufIm", label: "Nach Herkunft" },
];

function PflanzenPage() {
  const role = useRole();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState(() => localStorage.getItem("groupBy") || "none");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [showGiessplan, setShowGiessplan] = useState(false);
  const [giessFilter, setGiessFilter] = useState(null);

  const loadPlants = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("pflanzen").select("*").order("created_at", { ascending: false });
    if (data) setPlants(data.map(dbToPlant));
    setLoading(false);
  }, []);

  useEffect(() => { loadPlants(); }, [loadPlants]);

  const handleDelete = async (id) => {
    await supabase.from("pflanzen").delete().eq("id", id);
    setPlants(ps => ps.filter(p => p.id !== id));
    setSelected(null);
  };

  const handleSave = async (updated) => {
    const { data } = await supabase.from("pflanzen").update(plantToDb(updated)).eq("id", updated.id).select().single();
    if (data) {
      const plant = dbToPlant(data);
      setPlants(ps => ps.map(p => p.id === plant.id ? plant : p));
      setSelected(plant);
    }
  };

  const filtered = plants.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.vollstaendigerName || "").toLowerCase().includes(search.toLowerCase());
    const matchTag = !giessFilter || (p.datum && WOCHENTAGE[new Date(p.datum).getDay()] === giessFilter);
    return matchSearch && matchTag;
  });

  const grouped = (() => {
    if (groupBy === "none") return [{ label: null, plants: filtered }];
    const map = {};
    filtered.forEach(p => { const key = p[groupBy] || "Keine Angabe"; if (!map[key]) map[key] = []; map[key].push(p); }); Object.keys(map).forEach(k => map[k].sort((a, b) => a.name.localeCompare(b.name, "de")));
    // Sort by predefined order matching dropdown options
    const orderMap = {
      typ: ["Alocasia","Anthurium","Hoya","Dischidia","Begonie","Fleischis","Philodendron","Monstera","Scindapsus","Weitere Pflanzen","Keine Angabe"],
      standort: ["Wohnzimmer","Schlafzimmer","Küche","Bad","Flur","Keine Angabe"],
      aufIm: ["Instagram","Store","Webseite","eBay","Kleinanzeigen","Facebook","WA - Anthurien Verkauf","WA - Rare Plant (TC)","WA - VerkaufsGruppen","WA - Auktionen","WA - Hoyaddicted","WA - Hoya Verkauf","Keine Angabe"],
    };
    const order = orderMap[groupBy] || [];
    return Object.entries(map).sort(([a], [b]) => {
      const ai = order.indexOf(a), bi = order.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }).map(([label, plants]) => ({ label, plants }));
  })();

  const toggleGroup = (label) => setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));

  // Default new groups to collapsed
  useEffect(() => {
    if (groupBy === "none") return;
    setCollapsedGroups(prev => {
      const next = { ...prev };
      grouped.forEach(({ label }) => { if (label && !(label in next)) next[label] = true; });
      return next;
    });
  }, [groupBy, plants]);

  return (
    <div style={{ position: "relative" }}>
      {showGiessplan && <GiessplanWidget plants={plants} activeTag={giessFilter} onTagClick={tag => { setGiessFilter(tag); if (!tag) setShowGiessplan(false); }} onClose={() => setShowGiessplan(false)} />}

      <div style={{ marginBottom: "22px" }}>
        <div style={{ marginBottom: "14px" }}>
          <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: "600", color: TEXT_DARK, fontFamily: FONT }}>Unsere Pflanzen</h1>
          <p style={{ margin: 0, fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>
            {plants.length} Pflanze{plants.length !== 1 ? "n" : ""} in der Sammlung
            {giessFilter && <span style={{ marginLeft: "8px", color: ACCENT, fontWeight: "600" }}>· {giessFilter}</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
          <input placeholder="Suchen …" value={search} onChange={e => setSearch(e.target.value)} style={{ background: WHITE, border: `1px solid ${BG_DARK}`, borderRadius: "6px", padding: "8px 14px", fontSize: "12px", color: TEXT_DARK, fontFamily: FONT, outline: "none", flex: 1 }} />
          {role !== "guest" && role !== "readonly" && <button onClick={() => setShowAdd(true)} style={{ background: BTN, border: "none", borderRadius: "6px", padding: "9px 18px", cursor: "pointer", fontSize: "12px", color: WHITE, fontFamily: FONT, whiteSpace: "nowrap" }}>+ Pflanze hinzufügen</button>}
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <select value={groupBy} onChange={e => { setGroupBy(e.target.value); localStorage.setItem("groupBy", e.target.value); setCollapsedGroups({}); }} style={{ background: BTN, border: `1px solid ${BTN}`, borderRadius: "6px", padding: "7px 12px", fontSize: "12px", color: WHITE, fontFamily: FONT, outline: "none", cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}>
            {GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={() => setShowGiessplan(v => !v)} style={{ background: BTN, border: `1px solid ${BTN}`, borderRadius: "6px", padding: "7px 14px", cursor: "pointer", fontSize: "12px", color: WHITE, fontFamily: FONT, whiteSpace: "nowrap" }}>Gießtage</button>
        </div>
      </div>

      <div style={{ height: "1px", background: BG_DARK, marginBottom: "26px" }} />

      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: TEXT_LIGHT, fontFamily: FONT }}>Pflanzen werden geladen …</div>
      ) : filtered.length === 0 ? (
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", padding: "52px 72px", background: GLASS, borderRadius: "10px", border: `1px solid ${GLASS_BORDER}`, gap: "14px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: GLASS_SHADOW }}>
          <span style={{ fontSize: "30px", opacity: 0.3 }}>🌿</span>
          <p style={{ margin: 0, color: TEXT_LIGHT, fontSize: "13px", fontFamily: FONT }}>{search ? "Keine Pflanzen gefunden." : "Noch keine Pflanzen eingetragen."}</p>
          {!search && <button onClick={() => setShowAdd(true)} style={{ background: BTN, border: "none", borderRadius: "6px", padding: "9px 22px", cursor: "pointer", fontSize: "12px", color: WHITE, fontFamily: FONT }}>+ Pflanze hinzufügen</button>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {grouped.map(({ label, plants: gPlants }) => (
            <div key={label || "all"}>
              {label && (
                <button onClick={() => toggleGroup(label)} style={{ display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", cursor: "pointer", marginBottom: "14px", padding: 0, width: "100%", textAlign: "left" }}>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: ACCENT, letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: FONT }}>{label}</span>
                  <span style={{ fontSize: "13px", color: TEXT_LIGHT, fontFamily: FONT }}>({gPlants.length})</span>
                  <div style={{ flex: 1, height: "1px", background: BG_DARK }} />
                  <span style={{ fontSize: "13px", color: TEXT_LIGHT }}>{collapsedGroups[label] ? "▶" : "▼"}</span>
                </button>
              )}
              {!collapsedGroups[label] && (
                <div className="plant-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
                  {gPlants.map(p => <PlantCard key={p.id} plant={p} onClick={setSelected} />)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selected && <PlantModal plant={selected} onClose={() => setSelected(null)} onDelete={handleDelete} onSave={handleSave} />}
      {showAdd && <AddPlantModal onClose={() => setShowAdd(false)} onSave={p => setPlants(ps => [p, ...ps])} />}
    </div>
  );
}


// ── Todo Page ─────────────────────────────────────────────────────────────────
const TODO_KATEGORIEN = ["Bestellungen", "Label", "Organisation", "Ableger"];

function TodoPage() {
  const role = useRole();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [gruppeFilter, setGruppeFilter] = useState("Alle");
  const [form, setForm] = useState({ titel: "", kategorie: "Label", datum: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("todos").select("*").order("datum", { ascending: true, nullsFirst: false });
    if (data) setTodos(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.titel.trim()) return;
    setSaving(true);
    const row = { titel: form.titel.trim(), kategorie: form.kategorie, datum: form.datum || null, erledigt: false };
    const { data } = await supabase.from("todos").insert(row).select().single();
    if (data) setTodos(prev => [data, ...prev]);
    setForm({ titel: "", kategorie: "Label", datum: new Date().toISOString().split('T')[0] });
    setShowAdd(false);
    setSaving(false);
  };

  const handleToggle = async (todo) => {
    const { data } = await supabase.from("todos").update({ erledigt: !todo.erledigt }).eq("id", todo.id).select().single();
    if (data) setTodos(prev => prev.map(t => t.id === todo.id ? data : t));
  };

  const handleDelete = async (id) => {
    await supabase.from("todos").delete().eq("id", id);
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const deleteAllErledigt = async () => {
    const ids = todos.filter(t => t.erledigt).map(t => t.id);
    if (ids.length === 0) return;
    await supabase.from("todos").delete().in("id", ids);
    setTodos(prev => prev.filter(t => !t.erledigt));
  };

  const filtered = todos.filter(t => {
    const matchSearch = t.titel.toLowerCase().includes(search.toLowerCase());
    const matchKat = gruppeFilter === "Alle" || t.kategorie === gruppeFilter;
    return matchSearch && matchKat;
  });

  const offen = filtered.filter(t => !t.erledigt);
  const erledigt = filtered.filter(t => t.erledigt);

  const katFarbe = () => "#5c6c56";

  return (
    <div>
      <div style={{ marginBottom: "22px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: "600", color: TEXT_DARK, fontFamily: FONT }}>To Do Liste</h1>
          <p style={{ margin: 0, fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>{offen.length} offene Aufgabe{offen.length !== 1 ? "n" : ""}</p>
        </div>
        {role !== "guest" && role !== "readonly" && <button data-quickadd-todo onClick={() => setShowAdd(true)} style={{ background: ACCENT, border: "none", color: "#fff", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: FONT, fontWeight: "600" }}>+ Aufgabe hinzufügen</button>}
      </div>
      <div style={{ height: "1px", background: BG_DARK, marginBottom: "22px" }} />

      {/* Suche + Filter */}
      <div style={{ marginBottom: "22px" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen ..." style={{ width: "100%", padding: "9px 14px", borderRadius: "8px", border: `1px solid ${GLASS_BORDER}`, background: GLASS, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box", marginBottom: "10px" }} />
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", scrollbarWidth: "none" }}>
          {["Alle", ...[...new Set(todos.map(t => t.kategorie).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de"))].map(k => (
            <button key={k} onClick={() => setGruppeFilter(k)} style={{ padding: "8px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px", fontFamily: FONT, fontWeight: gruppeFilter === k ? "700" : "400", background: gruppeFilter === k ? ACCENT : GLASS, color: gruppeFilter === k ? "#fff" : TEXT_MID, whiteSpace: "nowrap", flexShrink: 0 }}>
              {k}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: TEXT_LIGHT, fontFamily: FONT }}>Aufgaben werden geladen …</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {offen.length === 0 && erledigt.length === 0 && (
            <div style={{ textAlign: "center", padding: "52px", color: TEXT_LIGHT, fontFamily: FONT, fontSize: "13px" }}>Keine Aufgaben gefunden 🌿</div>
          )}
          {offen.map(todo => (
            <div key={todo.id} style={{ background: GLASS, borderRadius: "10px", border: `1px solid ${GLASS_BORDER}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
              <div onClick={() => handleToggle(todo)} style={{ width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${ACCENT}`, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT_DARK, fontFamily: FONT }}>{todo.titel}</div>
                <div style={{ display: "flex", gap: "8px", marginTop: "4px", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", background: katFarbe(), color: "#fff", borderRadius: "4px", padding: "2px 8px", fontFamily: FONT }}>{todo.kategorie}</span>
                  {todo.datum && <span style={{ fontSize: "12px", color: TEXT_DARK, fontFamily: FONT }}>{new Date(todo.datum).toLocaleDateString("de-DE")}</span>}
                </div>
              </div>
              {role !== "guest" && role !== "readonly" && <button onClick={() => handleDelete(todo.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: TEXT_DARK, flexShrink: 0, fontWeight: "600", lineHeight: 1 }}>✕</button>}
            </div>
          ))}

          {erledigt.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ fontSize: "11px", color: TEXT_LIGHT, fontFamily: FONT, letterSpacing: "1.5px", textTransform: "uppercase" }}>Erledigt ({erledigt.length})</div>
                {role !== "guest" && role !== "readonly" && <button onClick={deleteAllErledigt} style={{ background: "#5c6c56", border: "none", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontSize: "11px", color: "#fff", fontFamily: FONT, display: "flex", alignItems: "center", gap: "4px" }}>Erledigte löschen</button>}
              </div>
              {erledigt.map(todo => (
                <div key={todo.id} style={{ background: "rgba(255,255,255,0.25)", borderRadius: "10px", border: `1px solid ${GLASS_BORDER}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: "14px", marginBottom: "6px", opacity: 0.65 }}>
                  <div onClick={() => handleToggle(todo)} style={{ width: "20px", height: "20px", borderRadius: "50%", background: ACCENT, border: `2px solid ${ACCENT}`, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#fff", fontSize: "11px" }}>✓</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", color: TEXT_LIGHT, fontFamily: FONT, textDecoration: "line-through" }}>{todo.titel}</div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px", flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", background: katFarbe(), color: "#fff", borderRadius: "4px", padding: "2px 8px", fontFamily: FONT, opacity: 0.7 }}>{todo.kategorie}</span>
                      {todo.datum && <span style={{ fontSize: "12px", color: TEXT_DARK, fontFamily: FONT }}>{new Date(todo.datum).toLocaleDateString("de-DE")}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "14px", padding: "28px", width: "100%", maxWidth: "420px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "700", color: TEXT_DARK, fontFamily: FONT }}>Aufgabe hinzufügen</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT, display: "block", marginBottom: "5px" }}>Aufgabe *</label>
                <input value={form.titel} onChange={e => setForm(f => ({ ...f, titel: e.target.value }))} placeholder="Was muss erledigt werden?" style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${GLASS_BORDER}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT, display: "block", marginBottom: "5px" }}>Kategorie</label>
                <select value={form.kategorie} onChange={e => setForm(f => ({ ...f, kategorie: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${GLASS_BORDER}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, background: "#fff", outline: "none" }}>
                  {TODO_KATEGORIEN.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT, display: "block", marginBottom: "5px" }}>Datum (optional)</label>
                <input type="date" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${GLASS_BORDER}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "22px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: "10px 20px", borderRadius: "8px", border: `1px solid ${GLASS_BORDER}`, background: "none", cursor: "pointer", fontSize: "13px", fontFamily: FONT, color: TEXT_MID }}>Abbrechen</button>
              <button onClick={handleAdd} disabled={saving || !form.titel.trim()} style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: ACCENT, color: "#fff", cursor: "pointer", fontSize: "13px", fontFamily: FONT, fontWeight: "600", opacity: saving || !form.titel.trim() ? 0.6 : 1 }}>
                {saving ? "Speichern..." : "Hinzufügen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Generic Page ──────────────────────────────────────────────────────────────
function GenericPage({ page }) {
  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ margin: "0 0 6px 0", fontSize: "26px", fontWeight: "600", color: TEXT_DARK, fontFamily: FONT }}>{page.title}</h1>
        <p style={{ margin: 0, fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>{page.desc}</p>
        <div style={{ marginTop: "18px", height: "1px", background: BG_DARK, maxWidth: "400px" }} />
      </div>
      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", padding: "52px 72px", background: BG_LIGHT, borderRadius: "10px", border: `1px solid ${BG_DARK}`, gap: "14px" }}>
        <span style={{ fontSize: "30px", opacity: 0.3 }}>🌿</span>
        <p style={{ margin: 0, color: TEXT_LIGHT, fontSize: "13px", textAlign: "center", fontFamily: FONT }}>{page.empty}</p>
        <button style={{ background: ACCENT, border: "none", color: WHITE, padding: "9px 24px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: FONT }}>+ Hinzufügen</button>
      </div>
    </div>
  );
}


// ── Fotoalbum Page ────────────────────────────────────────────────────────────
function FotoalbumPage() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const LIMIT = 20;
  const [visibleCount, setVisibleCount] = useState(LIMIT);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tagebuch")
        .select("id, foto_url, created_at, notiz, pflanze_id, pflanzen(name)")
        .not("foto_url", "is", null)
        .order("created_at", { ascending: false });
      if (data) setPhotos(data);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: "22px" }}>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: "600", color: TEXT_DARK, fontFamily: FONT }}>Fotoalbum</h1>
        <p style={{ margin: 0, fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>{photos.length} Foto{photos.length !== 1 ? "s" : ""} aus dem Tagebuch</p>
      </div>
      <div style={{ height: "1px", background: BG_DARK, marginBottom: "26px" }} />

      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: TEXT_LIGHT, fontFamily: FONT }}>Fotos werden geladen …</div>
      ) : photos.length === 0 ? (
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", padding: "52px 72px", background: GLASS, borderRadius: "10px", border: `1px solid ${GLASS_BORDER}`, gap: "14px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
          <span style={{ fontSize: "30px", opacity: 0.3 }}>📷</span>
          <p style={{ margin: 0, color: TEXT_LIGHT, fontSize: "13px", fontFamily: FONT }}>Noch keine Tagebuch-Fotos vorhanden.</p>
        </div>
      ) : (
        <div>
          <div className="foto-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
            {photos.slice(0, visibleCount).map(photo => (
              <div key={photo.id} onClick={() => setLightbox(photo)}
                style={{ cursor: "pointer", borderRadius: "8px", overflow: "hidden", background: BTN, aspectRatio: "3/4", position: "relative", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                <img src={photo.foto_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.2s" }}
                  onMouseEnter={e => e.target.style.transform = "scale(1.03)"}
                  onMouseLeave={e => e.target.style.transform = "scale(1)"} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.6))", padding: "20px 8px 8px" }}>
                  <div style={{ fontSize: "11px", color: "#fff", fontFamily: FONT, fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{photo.pflanzen?.name || ""}</div>
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.7)", fontFamily: FONT }}>{new Date(photo.created_at).toLocaleDateString("de-DE")}</div>
                </div>
              </div>
            ))}
          </div>
          {visibleCount < photos.length && (
            <div style={{ textAlign: "center", marginTop: "24px" }}>
              <button onClick={() => setVisibleCount(v => v + LIMIT)} style={{ background: BTN, border: "none", borderRadius: "8px", padding: "10px 28px", cursor: "pointer", fontSize: "13px", color: "#fff", fontFamily: FONT }}>
                {Math.min(LIMIT, photos.length - visibleCount)} weitere Fotos laden
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: "500px", width: "100%", background: WHITE, borderRadius: "12px", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <img src={lightbox.foto_url} alt="" style={{ width: "100%", height: "auto", display: "block" }} />
            <div style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT_DARK, fontFamily: FONT, marginBottom: "4px" }}>{lightbox.pflanzen?.name}</div>
              {lightbox.notiz && <div style={{ fontSize: "13px", color: TEXT_MID, fontFamily: FONT, marginBottom: "6px" }}>{lightbox.notiz}</div>}
              <div style={{ fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>{new Date(lightbox.created_at).toLocaleDateString("de-DE")}</div>

            </div>
            <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", color: "#fff", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Postfach ──────────────────────────────────────────────────────────────────
const POSTFACH_WEBHOOK = import.meta.env.VITE_POSTFACH_WEBHOOK;
const NOTIZBUCH_WEBHOOK = import.meta.env.VITE_NOTIZBUCH_WEBHOOK;

// Renders text with **bold** and line breaks
function renderText(text) {
  if (!text) return null;
  return text.split("\n").map((line, i, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    return <span key={i}>{parts}{i < arr.length - 1 && <br />}</span>;
  });
}

async function sendPostfachDiscord(text) {
  const monate = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
  const d = new Date();
  const datum = d.getDate() + ". " + monate[d.getMonth()] + " " + d.getFullYear();
  try {
    await fetch(POSTFACH_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{ description: text, color: 6057046, footer: { text: "GreenLove2Leaves | " + datum } }]
      })
    });
  } catch(e) { console.error("Postfach Discord Fehler:", e); }
}

function PostfachPage() {
  const role = useRole();
  const [nachrichten, setNachrichten] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 3);
    await supabase.from("postfach").delete().lt("created_at", cutoff.toISOString());
    const { data } = await supabase.from("postfach").select("*").order("created_at", { ascending: false });
    if (data) setNachrichten(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const { data } = await supabase.from("postfach").insert({ text: text.trim(), erledigt: false }).select().single();
    if (data) { setNachrichten(prev => [data, ...prev]); await sendPostfachDiscord(text.trim()); }
    setText(""); setShowAdd(false); setSaving(false);
  };

  const handleToggle = async (n) => {
    const { data } = await supabase.from("postfach").update({ erledigt: !n.erledigt }).eq("id", n.id).select().single();
    if (data) setNachrichten(prev => prev.map(x => x.id === n.id ? data : x));
  };

  const handleDeleteErledigt = async () => {
    const ids = nachrichten.filter(n => n.erledigt).map(n => n.id);
    if (!ids.length) return;
    await supabase.from("postfach").delete().in("id", ids);
    setNachrichten(prev => prev.filter(n => !n.erledigt));
  };

  const formatDate = (iso) => new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const offen = nachrichten.filter(n => !n.erledigt);
  const erledigt = nachrichten.filter(n => n.erledigt);

  return (
    <div>
      <div style={{ marginBottom: "22px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: "600", color: TEXT_DARK, fontFamily: FONT }}>Postfach</h1>
          <p style={{ margin: 0, fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>{offen.length} unerledigte Nachricht{offen.length !== 1 ? "en" : ""} · automatische Löschung nach 3 Tagen</p>
        </div>
        {role !== "guest" && role !== "readonly" && <button data-quickadd-postfach onClick={() => setShowAdd(true)} style={{ background: ACCENT, border: "none", color: "#fff", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: FONT, fontWeight: "600" }}>+ Nachricht</button>}
      </div>
      <div style={{ height: "1px", background: BG_DARK, marginBottom: "22px" }} />

      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: TEXT_LIGHT, fontFamily: FONT }}>Nachrichten werden geladen …</div>
      ) : nachrichten.length === 0 ? (
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", padding: "52px 72px", background: GLASS, borderRadius: "10px", border: `1px solid ${GLASS_BORDER}`, gap: "14px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
          <span style={{ fontSize: "30px", opacity: 0.3 }}>📬</span>
          <p style={{ margin: 0, color: TEXT_LIGHT, fontSize: "13px", fontFamily: FONT }}>Dein Postfach ist leer.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {offen.map(n => (
            <div key={n.id} onClick={() => role !== "guest" && role !== "readonly" && handleToggle(n)} style={{ background: GLASS, borderRadius: "10px", border: "1px solid #5c6c56", padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "14px", cursor: "pointer", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${ACCENT}`, flexShrink: 0, marginTop: "2px" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", color: TEXT_DARK, fontFamily: FONT, lineHeight: "1.6" }}>{renderText(n.text)}</div>
                <div style={{ fontSize: "11px", color: TEXT_LIGHT, fontFamily: FONT, marginTop: "6px" }}>{formatDate(n.created_at)}</div>
              </div>
            </div>
          ))}
          {erledigt.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ fontSize: "11px", color: TEXT_LIGHT, fontFamily: FONT, letterSpacing: "1.5px", textTransform: "uppercase" }}>Erledigt ({erledigt.length})</div>
                {role !== "guest" && role !== "readonly" && <button onClick={e => { e.stopPropagation(); handleDeleteErledigt(); }} style={{ background: ACCENT, border: "none", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontSize: "11px", color: "#fff", fontFamily: FONT }}>Erledigte löschen</button>}
              </div>
              {erledigt.map(n => (
                <div key={n.id} onClick={() => handleToggle(n)} style={{ background: "rgba(255,255,255,0.25)", borderRadius: "10px", border: `1px solid ${GLASS_BORDER}`, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: "14px", cursor: "pointer", marginBottom: "6px", opacity: 0.6 }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: ACCENT, border: `2px solid ${ACCENT}`, flexShrink: 0, marginTop: "2px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#fff", fontSize: "11px" }}>✓</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", color: TEXT_LIGHT, fontFamily: FONT, textDecoration: "line-through", lineHeight: "1.6" }}>{renderText(n.text)}</div>
                    <div style={{ fontSize: "11px", color: TEXT_LIGHT, fontFamily: FONT, marginTop: "6px" }}>{formatDate(n.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "14px", padding: "28px", width: "100%", maxWidth: "420px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "700", color: TEXT_DARK, fontFamily: FONT }}>Neue Nachricht</h2>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Nachricht schreiben …" rows={4} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${GLASS_BORDER}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: "10px", marginTop: "18px", justifyContent: "flex-end" }}>
              <button onClick={() => { setShowAdd(false); setText(""); }} style={{ padding: "10px 20px", borderRadius: "8px", border: `1px solid ${GLASS_BORDER}`, background: "none", cursor: "pointer", fontSize: "13px", fontFamily: FONT, color: TEXT_MID }}>Abbrechen</button>
              <button onClick={handleAdd} disabled={saving || !text.trim()} style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: ACCENT, color: "#fff", cursor: "pointer", fontSize: "13px", fontFamily: FONT, fontWeight: "600", opacity: saving || !text.trim() ? 0.6 : 1 }}>
                {saving ? "Senden …" : "Senden"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pflanzenkasse Page ────────────────────────────────────────────────────────
const KASSE_KATEGORIEN = ["Pflanzen", "Dünger", "Töpfe", "Zubehör", "Sonstiges"];

function PflanzenkassePage() {
  const role = useRole();
  const canEdit = role !== "readonly" && role !== "guest";
  const [eintraege, setEintraege] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filterTyp, setFilterTyp] = useState("alle");
  const [form, setForm] = useState({ name: "", beschreibung: "", betrag: "", typ: "ausgabe", kategorie: "Pflanzen", datum: new Date().toISOString().split("T")[0] });
  const [editEntry, setEditEntry] = useState(null);
  const [showAbschluss, setShowAbschluss] = useState(false);
  const [abschlussLoading, setAbschlussLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}`;
  const [openMonths, setOpenMonths] = useState({[currentMonthKey]: true});
  const toggleMonth = (key) => setOpenMonths(prev => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("pflanzenkasse").select("*").order("datum", { ascending: false });
      if (data) setEintraege(data);
      setLoading(false);
    };
    load();
  }, []);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.betrag) return;
    setSaving(true);
    const row = { name: form.name.trim(), beschreibung: form.beschreibung.trim(), betrag: parseFloat(form.betrag), typ: form.typ, kategorie: form.kategorie, datum: form.datum };
    const { data } = await supabase.from("pflanzenkasse").insert(row).select().single();
    if (data) setEintraege(prev => [data, ...prev].sort((a, b) => new Date(b.datum) - new Date(a.datum)));
    setForm({ name: "", beschreibung: "", betrag: "", typ: "ausgabe", kategorie: "Pflanzen", datum: new Date().toISOString().split("T")[0] });
    setShowAdd(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await supabase.from("pflanzenkasse").delete().eq("id", id);
    setEintraege(prev => prev.filter(e => e.id !== id));
  };

  const handleEdit = async () => {
    if (!form.name.trim() || !form.beschreibung.trim() || !form.betrag) return;
    setSaving(true);
    const row = { name: form.name.trim(), beschreibung: form.beschreibung.trim(), betrag: parseFloat(form.betrag), typ: form.typ, kategorie: form.kategorie, datum: form.datum };
    const { data } = await supabase.from("pflanzenkasse").update(row).eq("id", editEntry.id).select().single();
    if (data) setEintraege(prev => prev.map(e => e.id === data.id ? data : e).sort((a, b) => new Date(b.datum) - new Date(a.datum)));
    setEditEntry(null);
    setForm({ name: "", beschreibung: "", betrag: "", typ: "ausgabe", kategorie: "Pflanzen", datum: new Date().toISOString().split("T")[0] });
    setSaving(false);
  };

  const openEdit = (e) => {
    setEditEntry(e);
    setForm({ name: e.name, beschreibung: e.beschreibung || "", betrag: String(e.betrag), typ: e.typ, kategorie: e.kategorie, datum: e.datum });
    setOpenMenuId(null);
  };

  const handleAbschluss = async () => {
    if (eintraege.length === 0) return;
    setAbschlussLoading(true);
    const jahr = new Date(eintraege[0].datum).getFullYear();
    await supabase.from("pflanzenkasse_archiv").insert({ jahr, eintraege: JSON.stringify(eintraege) });
    await supabase.from("pflanzenkasse").delete().neq("id", 0);
    setEintraege([]);
    setShowAbschluss(false);
    setAbschlussLoading(false);
  };

  const filtered = filterTyp === "alle" ? eintraege : eintraege.filter(e => e.typ === filterTyp);
  const gesamtEinnahmen = eintraege.filter(e => e.typ === "einnahme").reduce((s, e) => s + parseFloat(e.betrag), 0);
  const gesamtAusgaben = eintraege.filter(e => e.typ === "ausgabe").reduce((s, e) => s + parseFloat(e.betrag), 0);
  const saldo = gesamtEinnahmen - gesamtAusgaben;

  const formatBetrag = (b) => parseFloat(b).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  const formatDate = (d) => new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div>
      <div style={{ marginBottom: "22px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: "600", color: TEXT_DARK, fontFamily: FONT }}>Pflanzenkasse</h1>
          <p style={{ margin: 0, fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>{eintraege.length} Eintrag{eintraege.length !== 1 ? "einträge" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {canEdit && eintraege.length > 0 && <button onClick={() => setShowAbschluss(true)} style={{ background: "none", border: `1px solid ${BG_DARK}`, color: TEXT_MID, padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: FONT }}>Jahr abschließen</button>}
          {canEdit && <button onClick={() => setShowAdd(true)} style={{ background: ACCENT, border: "none", color: "#fff", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: FONT, fontWeight: "600" }}>+ Eintrag</button>}
        </div>
      </div>
      <div style={{ height: "1px", background: BG_DARK, marginBottom: "22px" }} />

      {/* Saldo Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Einnahmen", value: gesamtEinnahmen, color: "#4a7c59" },
          { label: "Ausgaben", value: gesamtAusgaben, color: "#b94040" },
          { label: "Saldo", value: saldo, color: saldo >= 0 ? "#4a7c59" : "#b94040" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: GLASS, borderRadius: "10px", border: `1px solid ${GLASS_BORDER}`, padding: "16px 18px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
            <div style={{ fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT, marginBottom: "6px" }}>{label}</div>
            <div style={{ fontSize: "18px", fontWeight: "700", color, fontFamily: FONT, whiteSpace: "nowrap" }}>{formatBetrag(value)}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
        {[["alle", "Alle"], ["einnahme", "Einnahmen"], ["ausgabe", "Ausgaben"]].map(([val, label]) => (
          <button key={val} onClick={() => setFilterTyp(val)} style={{ padding: "7px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px", fontFamily: FONT, fontWeight: filterTyp === val ? "700" : "400", background: filterTyp === val ? ACCENT : GLASS, color: filterTyp === val ? "#fff" : TEXT_MID }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: TEXT_LIGHT, fontFamily: FONT }}>Laden …</div>
      ) : filtered.length === 0 ? (
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", padding: "52px 72px", background: GLASS, borderRadius: "10px", border: `1px solid ${GLASS_BORDER}`, gap: "14px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
          <span style={{ fontSize: "30px", opacity: 0.3 }}>💰</span>
          <p style={{ margin: 0, color: TEXT_LIGHT, fontSize: "13px", fontFamily: FONT }}>Noch keine Einträge vorhanden.</p>
        </div>
      ) : (() => {
        // Group by month
        const groups = {};
        filtered.forEach(e => {
          const d = new Date(e.datum);
          const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(e);
        });
        const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {sortedKeys.map(key => {
              const [year, month] = key.split("-");
              const monthLabel = new Date(parseInt(year), parseInt(month)-1, 1).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
              const monatEinnahmen = groups[key].filter(e => e.typ === "einnahme").reduce((s, e) => s + parseFloat(e.betrag), 0);
              const monatAusgaben = groups[key].filter(e => e.typ === "ausgabe").reduce((s, e) => s + parseFloat(e.betrag), 0);
              const monatSaldo = monatEinnahmen - monatAusgaben;
              return (
                <div key={key}>
                  {/* Month header – collapsible */}
                  <div onClick={() => toggleMonth(key)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: openMonths[key] ? "10px" : "0", cursor: "pointer", userSelect: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11px", color: TEXT_LIGHT, transition: "transform 0.2s", display: "inline-block", transform: openMonths[key] ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: TEXT_DARK, fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.5px" }}>{monthLabel}</div>
                    </div>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: monatSaldo >= 0 ? "#4a7c59" : "#b94040", fontFamily: FONT }}>{monatSaldo >= 0 ? "+" : ""}{formatBetrag(monatSaldo)}</span>
                  </div>
                  {openMonths[key] && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {groups[key].map(e => (
                      <div key={e.id} style={{ background: GLASS, borderRadius: "10px", border: `1px solid ${GLASS_BORDER}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", position: "relative", zIndex: openMenuId === e.id ? 50 : 1 }}>
                        <div style={{ width: "4px", alignSelf: "stretch", borderRadius: "4px", background: e.typ === "einnahme" ? "#4a7c59" : "#b94040", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT_DARK, fontFamily: FONT }}>{e.name}</div>
                          <div style={{ display: "flex", gap: "8px", marginTop: "4px", flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ fontSize: "11px", background: e.typ === "einnahme" ? "#4a7c59" : "#b94040", color: "#fff", borderRadius: "4px", padding: "2px 8px", fontFamily: FONT }}>{e.kategorie}</span>
                            <span style={{ fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>{formatDate(e.datum)}</span>
                            {e.beschreibung && <span style={{ fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>· {e.beschreibung}</span>}
                          </div>
                        </div>
                        <div style={{ fontSize: "16px", fontWeight: "700", color: e.typ === "einnahme" ? "#4a7c59" : "#b94040", fontFamily: FONT, flexShrink: 0 }}>
                          {e.typ === "einnahme" ? "+" : "-"}{formatBetrag(e.betrag)}
                        </div>
                        {canEdit && (
                          <div style={{ position: "relative", flexShrink: 0 }}>
                            <button onClick={() => setOpenMenuId(openMenuId === e.id ? null : e.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: TEXT_LIGHT, padding: "2px 6px", lineHeight: 1 }}>⋯</button>
                            {openMenuId === e.id && (
                              <div style={{ position: "absolute", top: "28px", right: 0, background: "#fff", borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", border: `1px solid ${BG_DARK}`, overflow: "hidden", minWidth: "130px", zIndex: 20 }}>
                                <button onClick={() => openEdit(e)} style={{ width: "100%", background: "none", border: "none", padding: "11px 16px", textAlign: "left", cursor: "pointer", fontSize: "12px", color: TEXT_DARK, fontFamily: FONT, display: "flex", alignItems: "center", gap: "8px" }}>✎ Bearbeiten</button>
                                <button onClick={() => { handleDelete(e.id); setOpenMenuId(null); }} style={{ width: "100%", background: "none", border: "none", padding: "11px 16px", textAlign: "left", cursor: "pointer", fontSize: "12px", color: "#b94040", fontFamily: FONT, display: "flex", alignItems: "center", gap: "8px" }}>🗑 Löschen</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Add Modal */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "14px", padding: "28px", width: "100%", maxWidth: "440px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "700", color: TEXT_DARK, fontFamily: FONT }}>Neuer Eintrag</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
              {/* Einnahme / Ausgabe Toggle */}
              <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", border: `1px solid ${BG_DARK}` }}>
                {[["ausgabe", "Ausgabe"], ["einnahme", "Einnahme"]].map(([val, label]) => (
                  <button key={val} onClick={() => set("typ", val)} style={{ flex: 1, padding: "10px", border: "none", cursor: "pointer", fontSize: "13px", fontFamily: FONT, fontWeight: form.typ === val ? "700" : "400", background: form.typ === val ? (val === "einnahme" ? "#4a7c59" : "#b94040") : "#fff", color: form.typ === val ? "#fff" : TEXT_MID, transition: "all 0.15s" }}>
                    {label}
                  </button>
                ))}
              </div>
              <div><label style={{ display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT }}>Name *</label>
                <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="z.B. Monstera verkauft" style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div><label style={{ display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT }}>Beschreibung *</label>
                <input value={form.beschreibung} onChange={e => set("beschreibung", e.target.value)} placeholder="z.B. Verkauft auf Kleinanzeigen" style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div><label style={{ display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT }}>Betrag (€) *</label>
                <input type="number" step="0.01" value={form.betrag} onChange={e => set("betrag", e.target.value)} placeholder="0.00" style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div><label style={{ display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT }}>Kategorie</label>
                <select value={form.kategorie} onChange={e => set("kategorie", e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, background: "#fff", outline: "none" }}>
                  {KASSE_KATEGORIEN.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div><label style={{ display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT }}>Datum</label>
                <input type="date" value={form.datum} onChange={e => set("datum", e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, background: "none", cursor: "pointer", fontSize: "13px", fontFamily: FONT, color: TEXT_MID }}>Abbrechen</button>
              <button onClick={handleAdd} disabled={saving || !form.name.trim() || !form.beschreibung.trim() || !form.betrag} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: ACCENT, color: "#fff", cursor: "pointer", fontSize: "13px", fontFamily: FONT, fontWeight: "600", opacity: saving || !form.name.trim() || !form.beschreibung.trim() || !form.betrag ? 0.6 : 1 }}>
                {saving ? "Speichert …" : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ── Archiv Page ──────────────────────────────────────────────────────────────
function ArchivPage() {
  const [archive, setArchive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openJahr, setOpenJahr] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("pflanzenkasse_archiv").select("*").order("jahr", { ascending: false });
      if (data) { setArchive(data); if (data.length > 0) setOpenJahr(data[0].id); }
      setLoading(false);
    };
    load();
  }, []);

  const formatBetrag = (b) => parseFloat(b).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  const formatDate = (d) => new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div>
      <div style={{ marginBottom: "22px" }}>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: "600", color: TEXT_DARK, fontFamily: FONT }}>Archiv</h1>
        <p style={{ margin: 0, fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>Abgeschlossene Pflanzenkassen-Jahre</p>
      </div>
      <div style={{ height: "1px", background: BG_DARK, marginBottom: "26px" }} />

      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: TEXT_LIGHT, fontFamily: FONT }}>Laden …</div>
      ) : archive.length === 0 ? (
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", padding: "52px 72px", background: GLASS, borderRadius: "10px", border: `1px solid ${GLASS_BORDER}`, gap: "14px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
          <span style={{ fontSize: "30px", opacity: 0.3 }}>📦</span>
          <p style={{ margin: 0, color: TEXT_LIGHT, fontSize: "13px", fontFamily: FONT }}>Noch keine archivierten Jahre.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "680px" }}>
          {archive.map(a => {
            const eintraege = typeof a.eintraege === "string" ? JSON.parse(a.eintraege) : a.eintraege;
            const einnahmen = eintraege.filter(e => e.typ === "einnahme").reduce((s, e) => s + parseFloat(e.betrag), 0);
            const ausgaben = eintraege.filter(e => e.typ === "ausgabe").reduce((s, e) => s + parseFloat(e.betrag), 0);
            const saldo = einnahmen - ausgaben;
            const isOpen = openJahr === a.id;

            // Group by month
            const groups = {};
            eintraege.forEach(e => {
              const d = new Date(e.datum);
              const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
              if (!groups[key]) groups[key] = [];
              groups[key].push(e);
            });
            const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

            return (
              <div key={a.id} style={{ background: GLASS, borderRadius: "12px", border: `1px solid ${GLASS_BORDER}`, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", overflow: "hidden" }}>
                {/* Year header */}
                <div onClick={() => setOpenJahr(isOpen ? null : a.id)} style={{ padding: "18px 20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "11px", color: TEXT_LIGHT, transition: "transform 0.2s", display: "inline-block", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: TEXT_DARK, fontFamily: FONT }}>{a.jahr}</div>
                      <div style={{ fontSize: "11px", color: TEXT_LIGHT, fontFamily: FONT, marginTop: "2px" }}>{eintraege.length} Einträge</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "10px", color: TEXT_LIGHT, fontFamily: FONT, letterSpacing: "0.5px" }}>EINNAHMEN</div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#4a7c59", fontFamily: FONT, whiteSpace: "nowrap" }}>+{formatBetrag(einnahmen)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "10px", color: TEXT_LIGHT, fontFamily: FONT, letterSpacing: "0.5px" }}>AUSGABEN</div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#b94040", fontFamily: FONT, whiteSpace: "nowrap" }}>-{formatBetrag(ausgaben)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "10px", color: TEXT_LIGHT, fontFamily: FONT, letterSpacing: "0.5px" }}>SALDO</div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: saldo >= 0 ? "#4a7c59" : "#b94040", fontFamily: FONT, whiteSpace: "nowrap" }}>{saldo >= 0 ? "+" : ""}{formatBetrag(saldo)}</div>
                    </div>
                  </div>
                </div>

                {/* Entries */}
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${BG_DARK}`, padding: "16px 20px", display: "flex", flexDirection: "column", gap: "20px" }}>
                    {sortedKeys.map(key => {
                      const [year, month] = key.split("-");
                      const monthLabel = new Date(parseInt(year), parseInt(month)-1, 1).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
                      const mSaldo = groups[key].filter(e => e.typ === "einnahme").reduce((s,e) => s+parseFloat(e.betrag),0) - groups[key].filter(e => e.typ === "ausgabe").reduce((s,e) => s+parseFloat(e.betrag),0);
                      return (
                        <div key={key}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <div style={{ fontSize: "12px", fontWeight: "700", color: TEXT_DARK, fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.5px" }}>{monthLabel}</div>
                            <span style={{ fontSize: "12px", fontWeight: "700", color: mSaldo >= 0 ? "#4a7c59" : "#b94040", fontFamily: FONT }}>{mSaldo >= 0 ? "+" : ""}{formatBetrag(mSaldo)}</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {groups[key].map((e, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", background: "rgba(255,255,255,0.5)", borderRadius: "8px" }}>
                                <div style={{ width: "3px", alignSelf: "stretch", borderRadius: "4px", background: e.typ === "einnahme" ? "#4a7c59" : "#b94040", flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: "13px", fontWeight: "600", color: TEXT_DARK, fontFamily: FONT }}>{e.name}</div>
                                  <div style={{ display: "flex", gap: "8px", marginTop: "3px", alignItems: "center", flexWrap: "wrap" }}>
                                    <span style={{ fontSize: "10px", background: e.typ === "einnahme" ? "#4a7c59" : "#b94040", color: "#fff", borderRadius: "4px", padding: "2px 7px", fontFamily: FONT }}>{e.kategorie}</span>
                                    <span style={{ fontSize: "11px", color: TEXT_LIGHT, fontFamily: FONT }}>{formatDate(e.datum)}</span>
                                    {e.beschreibung && <span style={{ fontSize: "11px", color: TEXT_LIGHT, fontFamily: FONT }}>· {e.beschreibung}</span>}
                                  </div>
                                </div>
                                <div style={{ fontSize: "14px", fontWeight: "700", color: e.typ === "einnahme" ? "#4a7c59" : "#b94040", fontFamily: FONT, flexShrink: 0, whiteSpace: "nowrap" }}>
                                  {e.typ === "einnahme" ? "+" : "-"}{formatBetrag(e.betrag)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Bestellungen Page ────────────────────────────────────────────────────────
function BestellungenPage() {
  const role = useRole();
  const canEdit = role !== "readonly" && role !== "guest";
  const [bestellungen, setBestellungen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erhalten, setErhalten] = useState(null); // id being processed
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [editForm, setEditForm] = useState({ artikel: '', datum: '', gekauft_bei: '', auf_im: '' });
  const setE = (k, v) => setEditForm(f => ({ ...f, [k]: v }));
  const [form, setForm] = useState({ artikel: "", datum: new Date().toISOString().split("T")[0], gekauft_bei: "", auf_im: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("bestellungen").select("*").order("datum", { ascending: false });
      if (data) setBestellungen(data);
      setLoading(false);
    };
    load();
  }, []);

  const handleAdd = async () => {
    if (!form.artikel.trim() || !form.gekauft_bei.trim()) return;
    setSaving(true);
    const { data } = await supabase.from("bestellungen").insert({ artikel: form.artikel.trim(), datum: form.datum, gekauft_bei: form.gekauft_bei.trim(), auf_im: form.auf_im.trim() || null }).select().single();
    if (data) setBestellungen(prev => [data, ...prev].sort((a, b) => new Date(b.datum) - new Date(a.datum)));
    setForm({ artikel: "", datum: new Date().toISOString().split("T")[0], gekauft_bei: "", auf_im: "" });
    setShowAdd(false);
    setSaving(false);
  };

  const handleErhalten = async (b) => {
    setErhalten(b.id);
    // Create Todo
    const titel = `${b.artikel} erhalten, bitte einpflegen!`;
    await supabase.from("todos").insert({ titel, kategorie: "Bestellungen", datum: new Date().toISOString().split("T")[0], erledigt: false });
    // Delete Bestellung
    await supabase.from("bestellungen").delete().eq("id", b.id);
    setBestellungen(prev => prev.filter(x => x.id !== b.id));
    setErhalten(null);
  };

  const openEdit = (b) => { setEditEntry(b); setEditForm({ artikel: b.artikel, datum: b.datum, gekauft_bei: b.gekauft_bei, auf_im: b.auf_im || "" }); setOpenMenuId(null); };

  const handleSaveEdit = async () => {
    if (!editForm.artikel.trim() || !editForm.gekauft_bei.trim()) return;
    setSaving(true);
    const { data } = await supabase.from("bestellungen").update({ artikel: editForm.artikel.trim(), datum: editForm.datum, gekauft_bei: editForm.gekauft_bei.trim(), auf_im: editForm.auf_im.trim() || null }).eq("id", editEntry.id).select().single();
    if (data) setBestellungen(prev => prev.map(x => x.id === data.id ? data : x).sort((a, b) => new Date(b.datum) - new Date(a.datum)));
    setEditEntry(null);
    setSaving(false);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div>
      <div style={{ marginBottom: "22px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: "600", color: TEXT_DARK, fontFamily: FONT }}>Bestellungen & Käufe</h1>
          <p style={{ margin: 0, fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>{bestellungen.length} offene Bestellung{bestellungen.length !== 1 ? "en" : ""}</p>
        </div>
        {canEdit && <button onClick={() => setShowAdd(true)} style={{ background: ACCENT, border: "none", color: "#fff", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: FONT, fontWeight: "600" }}>+ Bestellung</button>}
      </div>
      <div style={{ height: "1px", background: BG_DARK, marginBottom: "26px" }} />

      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: TEXT_LIGHT, fontFamily: FONT }}>Laden …</div>
      ) : bestellungen.length === 0 ? (
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", padding: "52px 72px", background: GLASS, borderRadius: "10px", border: `1px solid ${GLASS_BORDER}`, gap: "14px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
          <span style={{ fontSize: "30px", opacity: 0.3 }}>📦</span>
          <p style={{ margin: 0, color: TEXT_LIGHT, fontSize: "13px", fontFamily: FONT }}>Keine offenen Bestellungen.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {bestellungen.map(b => (
            <div key={b.id} style={{ background: GLASS, borderRadius: "12px", border: `1px solid ${GLASS_BORDER}`, padding: "16px 18px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: TEXT_DARK, fontFamily: FONT, marginBottom: "6px" }}>{b.artikel}</div>
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "10px", color: TEXT_LIGHT, fontFamily: FONT, letterSpacing: "0.5px", textTransform: "uppercase" }}>Gekauft bei</span>
                      <span style={{ fontSize: "13px", color: TEXT_DARK, fontFamily: FONT }}>{b.gekauft_bei}</span>
                    </div>
                    {b.auf_im && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontSize: "10px", color: TEXT_LIGHT, fontFamily: FONT, letterSpacing: "0.5px", textTransform: "uppercase" }}>Auf / Im</span>
                        <span style={{ fontSize: "13px", color: TEXT_DARK, fontFamily: FONT }}>{b.auf_im}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "10px", color: TEXT_LIGHT, fontFamily: FONT, letterSpacing: "0.5px", textTransform: "uppercase" }}>Datum</span>
                      <span style={{ fontSize: "13px", color: TEXT_DARK, fontFamily: FONT }}>{formatDate(b.datum)}</span>
                    </div>
                  </div>
                </div>
                {canEdit && (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                    <button onClick={() => handleErhalten(b)} disabled={erhalten === b.id} style={{ background: ACCENT, border: "none", borderRadius: "8px", padding: "8px 14px", cursor: "pointer", fontSize: "12px", color: "#fff", fontFamily: FONT, fontWeight: "600", opacity: erhalten === b.id ? 0.6 : 1, whiteSpace: "nowrap" }}>
                      {erhalten === b.id ? "…" : "✓ Erhalten"}
                    </button>
                    <div style={{ position: "relative" }}>
                      <button onClick={() => setOpenMenuId(openMenuId === b.id ? null : b.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: TEXT_LIGHT, padding: "2px 6px", lineHeight: 1 }}>⋯</button>
                      {openMenuId === b.id && (
                        <div style={{ position: "absolute", top: "28px", right: 0, background: "#fff", borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", border: `1px solid ${BG_DARK}`, overflow: "hidden", minWidth: "130px", zIndex: 20 }}>
                          <button onClick={() => openEdit(b)} style={{ width: "100%", background: "none", border: "none", padding: "11px 16px", textAlign: "left", cursor: "pointer", fontSize: "12px", color: TEXT_DARK, fontFamily: FONT, display: "flex", alignItems: "center", gap: "8px" }}>✎ Bearbeiten</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editEntry && (
        <div onClick={() => setEditEntry(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "14px", padding: "28px", width: "100%", maxWidth: "440px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "700", color: TEXT_DARK, fontFamily: FONT }}>Bestellung bearbeiten</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
              <div><label style={{ display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT }}>Artikel *</label>
                <input value={editForm.artikel} onChange={e => setE("artikel", e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div><label style={{ display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT }}>Gekauft bei *</label>
                <input value={editForm.gekauft_bei} onChange={e => setE("gekauft_bei", e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div><label style={{ display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT }}>Auf / Im</label>
                <input value={editForm.auf_im} onChange={e => setE("auf_im", e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div><label style={{ display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT }}>Datum</label>
                <input type="date" value={editForm.datum} onChange={e => setE("datum", e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
              <button onClick={() => setEditEntry(null)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, background: "none", cursor: "pointer", fontSize: "13px", fontFamily: FONT, color: TEXT_MID }}>Abbrechen</button>
              <button onClick={handleSaveEdit} disabled={saving || !editForm.artikel.trim() || !editForm.gekauft_bei.trim()} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: ACCENT, color: "#fff", cursor: "pointer", fontSize: "13px", fontFamily: FONT, fontWeight: "600", opacity: saving || !editForm.artikel.trim() || !editForm.gekauft_bei.trim() ? 0.6 : 1 }}>
                {saving ? "Speichert …" : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "14px", padding: "28px", width: "100%", maxWidth: "440px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "700", color: TEXT_DARK, fontFamily: FONT }}>Neue Bestellung</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
              <div><label style={{ display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT }}>Artikel *</label>
                <input value={form.artikel} onChange={e => set("artikel", e.target.value)} placeholder="z.B. Monstera deliciosa" style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div><label style={{ display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT }}>Gekauft bei *</label>
                <input value={form.gekauft_bei} onChange={e => set("gekauft_bei", e.target.value)} placeholder="z.B. Etsy, eBay, Kleinanzeigen" style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div><label style={{ display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT }}>Auf / Im</label>
                <input value={form.auf_im} onChange={e => set("auf_im", e.target.value)} placeholder="optional" style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div><label style={{ display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT }}>Datum</label>
                <input type="date" value={form.datum} onChange={e => set("datum", e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, background: "none", cursor: "pointer", fontSize: "13px", fontFamily: FONT, color: TEXT_MID }}>Abbrechen</button>
              <button onClick={handleAdd} disabled={saving || !form.artikel.trim() || !form.gekauft_bei.trim()} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: ACCENT, color: "#fff", cursor: "pointer", fontSize: "13px", fontFamily: FONT, fontWeight: "600", opacity: saving || !form.artikel.trim() || !form.gekauft_bei.trim() ? 0.6 : 1 }}>
                {saving ? "Speichert …" : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Ableger Page ──────────────────────────────────────────────────────────────
const ABLEGER_TYPEN = ["Alocasia", "Anthurium", "Begonie", "Hoya", "Monstera", "Philodendron", "Scindapsus", "Epipremnum", "Weitere Pflanzen", "Wetsticks & Anzuchtboxen"];
const ABLEGER_STANDORTE = ["Bad-Gitter", "Growbox 1", "Growbox 2", "Pflanzentrolli 1", "Pflanzentrolli 2", "Pflanzentrolli 3", "WZ - großes Regal", "WZ - TV Regal"];

function AblegerPage() {
  const role = useRole();
  const canEdit = role !== "readonly" && role !== "guest";
  const [ableger, setAbleger] = useState([]);
  const [pflanzen, setPflanzen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [detailEntry, setDetailEntry] = useState(null);
  const [gruppierung, setGruppierung] = useState("typ");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const toggleGroup = (key) => setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState([]);
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkField, setBulkField] = useState("standort");
  const [bulkValue, setBulkValue] = useState(ABLEGER_STANDORTE[0]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const exitSelectMode = () => { setSelectMode(false); setSelected([]); };
  const [saving, setSaving] = useState(false);
  const emptyForm = { name: "", nr: "", typ: "Hoya", datum: new Date().toISOString().split("T")[0], standort: "Growbox 1", mutterpflanze_id: "" };
  const [form, setForm] = useState(emptyForm);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: a }, { data: p }] = await Promise.all([
        supabase.from("ableger").select("*").order("created_at", { ascending: false }),
        supabase.from("pflanzen").select("id, name, typ").order("name")
      ]);
      if (a) { setAbleger(a); const keys = [...new Set(a.map(x => x.typ)), ...new Set(a.map(x => x.standort))]; const collapsed = {}; keys.forEach(k => { if (k) collapsed[k] = true; }); setCollapsedGroups(collapsed); }
      if (p) setPflanzen(p);
      setLoading(false);
    };
    load();
  }, []);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const row = { name: form.name.trim(), nr: form.nr.trim() || null, typ: form.typ, datum: form.datum, standort: form.standort, mutterpflanze_id: form.mutterpflanze_id ? parseInt(form.mutterpflanze_id) : null };
    const { data } = await supabase.from("ableger").insert(row).select().single();
    if (data) setAbleger(prev => [data, ...prev]);
    setForm(emptyForm);
    setShowAdd(false);
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const row = { name: form.name.trim(), nr: form.nr.trim() || null, typ: form.typ, datum: form.datum, standort: form.standort, mutterpflanze_id: form.mutterpflanze_id ? parseInt(form.mutterpflanze_id) : null };
    const { data } = await supabase.from("ableger").update(row).eq("id", editEntry.id).select().single();
    if (data) setAbleger(prev => prev.map(x => x.id === data.id ? data : x));
    setEditEntry(null);
    setForm(emptyForm);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await supabase.from("ableger").delete().eq("id", id);
    setAbleger(prev => prev.filter(x => x.id !== id));
    setOpenMenuId(null);
  };

  const handleDuplicate = async (a) => {
    setOpenMenuId(null);
    const row = { name: a.name, nr: a.nr || null, typ: a.typ, datum: new Date().toISOString().split("T")[0], standort: a.standort, mutterpflanze_id: a.mutterpflanze_id || null };
    const { data } = await supabase.from("ableger").insert(row).select().single();
    if (data) setAbleger(prev => [data, ...prev]);
  };

  const openEdit = (a) => {
    setEditEntry(a);
    setForm({ name: a.name, nr: a.nr || "", typ: a.typ, datum: a.datum, standort: a.standort, mutterpflanze_id: a.mutterpflanze_id ? String(a.mutterpflanze_id) : "" });
    setOpenMenuId(null);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const getMutterName = (id) => pflanzen.find(p => p.id === id)?.name || "–";
  const getDisplayName = (a) => a.nr ? `${a.name} – Nr. ${a.nr}` : a.name;

  const getMutterGruppen = () => {
    const grouped = {};
    pflanzen.forEach(p => {
      const t = p.typ || "Sonstige";
      if (!grouped[t]) grouped[t] = [];
      grouped[t].push(p);
    });
    return Object.keys(grouped).sort((a, b) => a.localeCompare(b, "de")).map(typ => ({ typ, pflanzen: grouped[typ] }));
  };

  const MutterpflanzeDropdown = ({ value, onChange }) => {
    const [open, setOpen] = useState(false);
    const [collapsedTyp, setCollapsedTyp] = useState(() => { const c = {}; getMutterGruppen().forEach(({ typ }) => { c[typ] = true; }); return c; });
    const gruppen = getMutterGruppen();
    const selectedName = value ? (pflanzen.find(p => p.id === parseInt(value))?.name || "–") : "– keine Verknüpfung –";
    const toggleTyp = (typ) => setCollapsedTyp(prev => ({ ...prev, [typ]: !prev[typ] }));
    return (
      <div style={{ position: "relative" }}>
        <button type="button" onClick={() => setOpen(!open)} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: value ? TEXT_DARK : TEXT_LIGHT, background: "#fff", outline: "none", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{selectedName}</span>
          <span style={{ fontSize: "11px", color: TEXT_LIGHT }}>{open ? "▲" : "▼"}</span>
        </button>
        {open && (
          <div style={{ position: "absolute", top: "42px", left: 0, right: 0, background: "#fff", borderRadius: "8px", border: `1px solid ${BG_DARK}`, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 100, maxHeight: "280px", overflowY: "auto" }}>
            <div onClick={() => { onChange(""); setOpen(false); }} style={{ padding: "10px 14px", fontSize: "13px", fontFamily: FONT, color: TEXT_LIGHT, cursor: "pointer", borderBottom: `1px solid ${BG_DARK}` }}>– keine Verknüpfung –</div>
            {gruppen.map(({ typ, pflanzen: pl }) => (
              <div key={typ}>
                <div onClick={() => toggleTyp(typ)} style={{ padding: "8px 14px", fontSize: "11px", fontWeight: "700", color: ACCENT, fontFamily: FONT, textTransform: "uppercase", letterSpacing: "1px", background: BG, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none" }}>
                  <span>{typ} <span style={{ fontWeight: "400", color: TEXT_LIGHT }}>({pl.length})</span></span>
                  <span style={{ fontSize: "10px", color: TEXT_LIGHT }}>{collapsedTyp[typ] ? "▶" : "▼"}</span>
                </div>
                {!collapsedTyp[typ] && pl.map(p => (
                  <div key={p.id} onClick={() => { onChange(String(p.id)); setOpen(false); }} style={{ padding: "9px 14px 9px 24px", fontSize: "13px", fontFamily: FONT, color: parseInt(value) === p.id ? ACCENT : TEXT_DARK, fontWeight: parseInt(value) === p.id ? "600" : "400", cursor: "pointer", background: parseInt(value) === p.id ? "rgba(92,108,86,0.07)" : "transparent" }}>
                    {p.name}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleBulkEdit = async () => {
    setBulkSaving(true);
    const updateVal = bulkField === "mutterpflanze_id" ? (bulkValue ? parseInt(bulkValue) : null) : bulkValue;
    await supabase.from("ableger").update({ [bulkField]: updateVal }).in("id", selected);
    setAbleger(prev => prev.map(a => selected.includes(a.id) ? { ...a, [bulkField]: updateVal } : a));
    setBulkModal(false);
    setBulkSaving(false);
    exitSelectMode();
  };

  // Grouping
  const groupKey = gruppierung === "typ" ? "typ" : "standort";
  const groups = {};
  ableger.forEach(a => {
    const key = a[groupKey] || "Sonstige";
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });
  const sortedGroupKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b, "de"));

  const formFields = (
    <div style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
      <div style={{ display: "flex", gap: "10px" }}>
        <div style={{ flex: 2 }}><label style={{ display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT }}>Name *</label>
          <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="z.B. Hoya Linearis" style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ flex: 1 }}><label style={{ display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT }}>Nr.</label>
          <input value={form.nr} onChange={e => set("nr", e.target.value)} placeholder="z.B. 1" style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>
      <div><label style={{ display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT }}>Datum</label>
        <input type="date" value={form.datum} onChange={e => set("datum", e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box" }} />
      </div>
      <div><label style={{ display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT }}>Typ</label>
        <select value={form.typ} onChange={e => set("typ", e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, background: "#fff", outline: "none" }}>
          {ABLEGER_TYPEN.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div><label style={{ display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT }}>Standort</label>
        <select value={form.standort} onChange={e => set("standort", e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, background: "#fff", outline: "none" }}>
          {ABLEGER_STANDORTE.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div><label style={{ display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT }}>Mutterpflanze</label>
        <MutterpflanzeDropdown value={form.mutterpflanze_id} onChange={v => set("mutterpflanze_id", v)} />
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: "22px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: "600", color: TEXT_DARK, fontFamily: FONT }}>Unsere Ableger</h1>
          <p style={{ margin: 0, fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>{ableger.length} Ableger</p>
        </div>
        {canEdit && <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => { setSelectMode(!selectMode); setSelected([]); }} style={{ background: selectMode ? "#b94040" : GLASS, border: `1px solid ${GLASS_BORDER}`, color: selectMode ? "#fff" : TEXT_MID, padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: FONT, fontWeight: "600" }}>{selectMode ? "Abbrechen" : "Mehrfachauswahl"}</button>
          <button onClick={() => { setForm(emptyForm); setShowAdd(true); }} style={{ background: ACCENT, border: "none", color: "#fff", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: FONT, fontWeight: "600" }}>+ Ableger</button>
        </div>}
      </div>
      <div style={{ height: "1px", background: BG_DARK, marginBottom: "18px" }} />

      {/* Bulk action bar */}
      {selectMode && (
        <div style={{ background: ACCENT, borderRadius: "10px", padding: "12px 16px", marginBottom: "18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", color: "#fff", fontFamily: FONT, fontWeight: "600" }}>{selected.length} ausgewählt</span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setSelected(ableger.map(a => a.id))} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "6px", padding: "7px 14px", cursor: "pointer", fontSize: "12px", color: "#fff", fontFamily: FONT }}>Alle wählen</button>
            <button onClick={() => { if (selected.length === 0) return; setBulkField("standort"); setBulkValue(ABLEGER_STANDORTE[0]); setBulkModal(true); }} disabled={selected.length === 0} style={{ background: selected.length > 0 ? "#fff" : "rgba(255,255,255,0.3)", border: "none", borderRadius: "6px", padding: "7px 14px", cursor: selected.length > 0 ? "pointer" : "default", fontSize: "12px", color: ACCENT, fontFamily: FONT, fontWeight: "600" }}>Bearbeiten</button>
          </div>
        </div>
      )}

      {/* Gruppierung Toggle */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "22px" }}>
        {[["typ", "Nach Typ"], ["standort", "Nach Standort"]].map(([val, label]) => (
          <button key={val} onClick={() => setGruppierung(val)} style={{ padding: "7px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px", fontFamily: FONT, fontWeight: gruppierung === val ? "700" : "400", background: gruppierung === val ? ACCENT : GLASS, color: gruppierung === val ? "#fff" : TEXT_MID }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: TEXT_LIGHT, fontFamily: FONT }}>Laden …</div>
      ) : ableger.length === 0 ? (
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", padding: "52px 72px", background: GLASS, borderRadius: "10px", border: `1px solid ${GLASS_BORDER}`, gap: "14px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
          <span style={{ fontSize: "30px", opacity: 0.3 }}>🌱</span>
          <p style={{ margin: 0, color: TEXT_LIGHT, fontSize: "13px", fontFamily: FONT }}>Noch keine Ableger erfasst.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {sortedGroupKeys.map(groupName => (
            <div key={groupName}>
              <button onClick={() => toggleGroup(groupName)} style={{ display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", cursor: "pointer", marginBottom: "14px", padding: 0, width: "100%", textAlign: "left" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: ACCENT, letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: FONT }}>{groupName}</span>
                <span style={{ fontSize: "13px", color: TEXT_LIGHT, fontFamily: FONT }}>({groups[groupName].length})</span>
                <div style={{ flex: 1, height: "1px", background: BG_DARK }} />
                <span style={{ fontSize: "13px", color: TEXT_LIGHT }}>{collapsedGroups[groupName] ? "▶" : "▼"}</span>
              </button>
              {!collapsedGroups[groupName] && <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {groups[groupName].map(a => (
                  <div key={a.id} style={{ background: GLASS, borderRadius: "10px", border: `1px solid ${selected.includes(a.id) ? ACCENT : GLASS_BORDER}`, padding: "13px 16px", display: "flex", alignItems: "center", gap: "12px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", position: "relative", zIndex: openMenuId === a.id ? 50 : 1, cursor: selectMode ? "pointer" : "default" }} onClick={() => selectMode ? toggleSelect(a.id) : (!selectMode && setDetailEntry(a))}>
                    {selectMode && (
                      <div style={{ width: "18px", height: "18px", border: `2px solid ${ACCENT}`, borderRadius: "4px", background: selected.includes(a.id) ? ACCENT : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {selected.includes(a.id) && <span style={{ color: "#fff", fontSize: "11px", lineHeight: 1 }}>✓</span>}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT_DARK, fontFamily: FONT }}>{getDisplayName(a)}</div>
                    </div>
                    {canEdit && !selectMode && (
                      <div style={{ position: "relative", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setOpenMenuId(openMenuId === a.id ? null : a.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: TEXT_LIGHT, padding: "2px 6px", lineHeight: 1 }}>⋯</button>
                        {openMenuId === a.id && (
                          <div style={{ position: "absolute", top: "28px", right: 0, background: "#fff", borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", border: `1px solid ${BG_DARK}`, overflow: "hidden", minWidth: "130px", zIndex: 20 }}>
                            <button onClick={() => openEdit(a)} style={{ width: "100%", background: "none", border: "none", padding: "11px 16px", textAlign: "left", cursor: "pointer", fontSize: "12px", color: TEXT_DARK, fontFamily: FONT, display: "flex", alignItems: "center", gap: "8px" }}>✎ Bearbeiten</button>
                            <button onClick={() => handleDuplicate(a)} style={{ width: "100%", background: "none", border: "none", padding: "11px 16px", textAlign: "left", cursor: "pointer", fontSize: "12px", color: TEXT_DARK, fontFamily: FONT, display: "flex", alignItems: "center", gap: "8px" }}>⧉ Duplizieren</button>
                            <button onClick={() => handleDelete(a.id)} style={{ width: "100%", background: "none", border: "none", padding: "11px 16px", textAlign: "left", cursor: "pointer", fontSize: "12px", color: "#b94040", fontFamily: FONT, display: "flex", alignItems: "center", gap: "8px" }}>🗑 Löschen</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>}
            </div>
          ))}
        </div>
      )}

      {/* Detail Card */}
      {detailEntry && (
        <div onClick={() => setDetailEntry(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "14px", padding: "28px", width: "100%", maxWidth: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: TEXT_DARK, fontFamily: FONT }}>{detailEntry.name}</div>
                {detailEntry.nr && <div style={{ fontSize: "13px", color: TEXT_LIGHT, fontFamily: FONT, marginTop: "2px" }}>Nr. {detailEntry.nr}</div>}
              </div>
              <button onClick={() => setDetailEntry(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: TEXT_LIGHT, padding: "0 4px", lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ height: "1px", background: BG_DARK, marginBottom: "18px" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[["🌿 Typ", detailEntry.typ], ["📍 Standort", detailEntry.standort], ["📅 Datum", formatDate(detailEntry.datum)], ["↳ Mutterpflanze", detailEntry.mutterpflanze_id ? getMutterName(detailEntry.mutterpflanze_id) : "–"]].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>{label}</span>
                  <span style={{ fontSize: "13px", color: TEXT_DARK, fontFamily: FONT, fontWeight: "500", textAlign: "right", maxWidth: "60%" }}>{value}</span>
                </div>
              ))}
            </div>
            {canEdit && (
              <div style={{ display: "flex", gap: "8px", marginTop: "22px" }}>
                <button onClick={() => { openEdit(detailEntry); setDetailEntry(null); }} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, background: "none", cursor: "pointer", fontSize: "13px", fontFamily: FONT, color: TEXT_MID }}>✎ Bearbeiten</button>
                <button onClick={() => { handleDelete(detailEntry.id); setDetailEntry(null); }} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: "#b94040", color: "#fff", cursor: "pointer", fontSize: "13px", fontFamily: FONT, fontWeight: "600" }}>🗑 Löschen</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {bulkModal && (
        <div onClick={() => setBulkModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "14px", padding: "28px", width: "100%", maxWidth: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: "700", color: TEXT_DARK, fontFamily: FONT }}>Mehrfach bearbeiten</h2>
            <p style={{ margin: "0 0 20px 0", fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>{selected.length} Ableger werden geändert</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
              <div><label style={{ display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT }}>Feld</label>
                <select value={bulkField} onChange={e => { setBulkField(e.target.value); setBulkValue(e.target.value === "standort" ? ABLEGER_STANDORTE[0] : e.target.value === "typ" ? ABLEGER_TYPEN[0] : ""); }} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, background: "#fff", outline: "none" }}>
                  <option value="standort">Standort</option>
                  <option value="typ">Typ</option>
                  <option value="mutterpflanze_id">Mutterpflanze</option>
                </select>
              </div>
              <div><label style={{ display: "block", fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "5px", fontFamily: FONT }}>Neuer Wert</label>
                {bulkField === "standort" && <select value={bulkValue} onChange={e => setBulkValue(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, background: "#fff", outline: "none" }}>{ABLEGER_STANDORTE.map(s => <option key={s} value={s}>{s}</option>)}</select>}
                {bulkField === "typ" && <select value={bulkValue} onChange={e => setBulkValue(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, background: "#fff", outline: "none" }}>{ABLEGER_TYPEN.map(t => <option key={t} value={t}>{t}</option>)}</select>}
                {bulkField === "mutterpflanze_id" && <MutterpflanzeDropdown value={bulkValue} onChange={v => setBulkValue(v)} />}
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
              <button onClick={() => setBulkModal(false)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, background: "none", cursor: "pointer", fontSize: "13px", fontFamily: FONT, color: TEXT_MID }}>Abbrechen</button>
              <button onClick={handleBulkEdit} disabled={bulkSaving} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: ACCENT, color: "#fff", cursor: "pointer", fontSize: "13px", fontFamily: FONT, fontWeight: "600", opacity: bulkSaving ? 0.6 : 1 }}>{bulkSaving ? "Speichert …" : `${selected.length} Ableger speichern`}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "14px", padding: "28px", width: "100%", maxWidth: "440px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "700", color: TEXT_DARK, fontFamily: FONT }}>Neuer Ableger</h2>
            {formFields}
            <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, background: "none", cursor: "pointer", fontSize: "13px", fontFamily: FONT, color: TEXT_MID }}>Abbrechen</button>
              <button onClick={handleAdd} disabled={saving || !form.name.trim()} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: ACCENT, color: "#fff", cursor: "pointer", fontSize: "13px", fontFamily: FONT, fontWeight: "600", opacity: saving || !form.name.trim() ? 0.6 : 1 }}>{saving ? "Speichert …" : "Speichern"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editEntry && (
        <div onClick={() => { setEditEntry(null); setForm(emptyForm); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "14px", padding: "28px", width: "100%", maxWidth: "440px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "700", color: TEXT_DARK, fontFamily: FONT }}>Ableger bearbeiten</h2>
            {formFields}
            <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
              <button onClick={() => { setEditEntry(null); setForm(emptyForm); }} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, background: "none", cursor: "pointer", fontSize: "13px", fontFamily: FONT, color: TEXT_MID }}>Abbrechen</button>
              <button onClick={handleEdit} disabled={saving || !form.name.trim()} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: ACCENT, color: "#fff", cursor: "pointer", fontSize: "13px", fontFamily: FONT, fontWeight: "600", opacity: saving || !form.name.trim() ? 0.6 : 1 }}>{saving ? "Speichert …" : "Speichern"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ── Notizbuch Page ────────────────────────────────────────────────────────────
function NotizbuchPage() {
  const role = useRole();
  const canEdit = role !== "readonly" && role !== "guest";
  const [tab, setTab] = useState("notizen"); // "notizen" | "themen"
  const [activeThema, setActiveThema] = useState(null);
  const [addNotiz, setAddNotiz] = useState(false);
  const [addThema, setAddThema] = useState(false);
  const [suche, setSuche] = useState("");

  return (
    <div>
      <div style={{ marginBottom: "22px" }}>
        <h1 style={{ margin: "0 0 16px 0", fontSize: "26px", fontWeight: "600", color: TEXT_DARK, fontFamily: FONT }}>Notizbuch</h1>
      </div>
      <div style={{ height: "1px", background: BG_DARK, marginBottom: "20px" }} />

      {/* Search */}
      {!activeThema && (
        <div style={{ marginBottom: "14px" }}>
          <input value={suche} onChange={e => setSuche(e.target.value)} placeholder="Suche nach Schlagwort …" style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box", background: GLASS }} />
        </div>
      )}

      {/* Tabs + Button */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "26px", alignItems: "center" }}>
        {[["notizen", "Allgemeine Notizen"], ["themen", "Nach Thema"]].map(([val, label]) => (
          <button key={val} onClick={() => { setTab(val); setActiveThema(null); }} style={{ padding: "8px 12px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px", fontFamily: FONT, fontWeight: tab === val ? "700" : "400", background: tab === val ? ACCENT : GLASS, color: tab === val ? "#fff" : TEXT_MID, whiteSpace: "nowrap" }}>
            {label}
          </button>
        ))}
        {canEdit && !activeThema && (
          <button onClick={() => tab === "notizen" ? setAddNotiz(true) : setAddThema(true)} style={{ background: ACCENT, border: "none", color: "#fff", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontFamily: FONT, fontWeight: "600", marginLeft: "auto", whiteSpace: "nowrap" }}>
            {tab === "notizen" ? "+ Notiz" : "+ Thema"}
          </button>
        )}
      </div>

      {tab === "notizen" && <AllgemeineNotizen canEdit={canEdit} triggerAdd={addNotiz} onAddHandled={() => setAddNotiz(false)} suche={suche} />}
      {tab === "themen" && !activeThema && <ThemenListe canEdit={canEdit} onOpen={setActiveThema} triggerAdd={addThema} onAddHandled={() => setAddThema(false)} suche={suche} />}
      {tab === "themen" && activeThema && <ThemaDetail thema={activeThema} canEdit={canEdit} onBack={() => setActiveThema(null)} />}
    </div>
  );
}

function AllgemeineNotizen({ canEdit, triggerAdd, onAddHandled, suche }) {
  const [notizen, setNotizen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(10);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [datum, setDatum] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => { if (triggerAdd) { setText(""); setShowAdd(true); onAddHandled(); } }, [triggerAdd]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("notizbuch_notizen").select("*").order("created_at", { ascending: false });
      if (data) setNotizen(data);
      setLoading(false);
    };
    load();
  }, []);

  const handleAdd = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const ts = new Date(datum).toISOString();
    const { data } = await supabase.from("notizbuch_notizen").insert({ text: text.trim(), created_at: ts, updated_at: ts }).select().single();
    if (data) {
      setNotizen(prev => [data, ...prev].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
      const monate = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
      const d = new Date(datum);
      const datumStr = d.getDate() + ". " + monate[d.getMonth()] + " " + d.getFullYear();
      await fetch(NOTIZBUCH_WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ embeds: [{ description: `**Allgemeine Notiz**\n\u200B\n${text.trim()}`, color: 6057046, footer: { text: "Notizbuch | " + datumStr } }] }) }).catch(()=>{});
    }
    setText(""); setDatum(new Date().toISOString().split("T")[0]); setShowAdd(false); setSaving(false);
  };

  const handleEdit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const ts = new Date(datum).toISOString();
    const { data } = await supabase.from("notizbuch_notizen").update({ text: text.trim(), created_at: ts, updated_at: ts }).eq("id", editEntry.id).select().single();
    if (data) setNotizen(prev => prev.map(n => n.id === data.id ? data : n).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
    setEditEntry(null); setText(""); setDatum(new Date().toISOString().split("T")[0]); setSaving(false);
  };

  const handleDelete = async (id) => {
    await supabase.from("notizbuch_notizen").delete().eq("id", id);
    setNotizen(prev => prev.filter(n => n.id !== id));
    setOpenMenuId(null);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const filtered = suche?.trim() ? notizen.filter(n => n.text.toLowerCase().includes(suche.toLowerCase())) : notizen;
  const shown = filtered.slice(0, visible);

  return (
    <div>
      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: TEXT_LIGHT, fontFamily: FONT }}>Laden …</div>
      ) : notizen.length === 0 ? (
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", padding: "52px 72px", background: GLASS, borderRadius: "10px", border: `1px solid ${GLASS_BORDER}`, gap: "14px" }}>
          <p style={{ margin: 0, color: TEXT_LIGHT, fontSize: "13px", fontFamily: FONT }}>Noch keine Notizen vorhanden.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "30px 0", color: TEXT_LIGHT, fontSize: "13px", fontFamily: FONT }}>Keine Notizen für „{suche}" gefunden.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {shown.map(n => (
            <div key={n.id} style={{ background: GLASS, borderRadius: "10px", border: `1px solid ${GLASS_BORDER}`, padding: "16px 18px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", position: "relative", zIndex: openMenuId === n.id ? 50 : 1 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                <div style={{ fontSize: "14px", color: TEXT_DARK, fontFamily: FONT, lineHeight: "1.6", flex: 1 }}>{renderText(n.text)}</div>
                {canEdit && (
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <button onClick={() => setOpenMenuId(openMenuId === n.id ? null : n.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: TEXT_LIGHT, padding: "2px 6px", lineHeight: 1 }}>⋯</button>
                    {openMenuId === n.id && (
                      <div style={{ position: "absolute", top: "28px", right: 0, background: "#fff", borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", border: `1px solid ${BG_DARK}`, overflow: "hidden", minWidth: "130px", zIndex: 20 }}>
                        <button onClick={() => { setEditEntry(n); setText(n.text); setDatum(n.created_at?.split("T")[0] || new Date().toISOString().split("T")[0]); setOpenMenuId(null); }} style={{ width: "100%", background: "none", border: "none", padding: "11px 16px", textAlign: "left", cursor: "pointer", fontSize: "12px", color: TEXT_DARK, fontFamily: FONT, display: "flex", alignItems: "center", gap: "8px" }}>✎ Bearbeiten</button>
                        <button onClick={() => handleDelete(n.id)} style={{ width: "100%", background: "none", border: "none", padding: "11px 16px", textAlign: "left", cursor: "pointer", fontSize: "12px", color: "#b94040", fontFamily: FONT, display: "flex", alignItems: "center", gap: "8px" }}>🗑 Löschen</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ marginTop: "8px" }}>
                <span style={{ fontSize: "11px", color: TEXT_LIGHT, fontFamily: FONT }}>{formatDate(n.created_at)}</span>
              </div>
            </div>
          ))}
          {visible < filtered.length && (
            <button onClick={() => setVisible(v => v + 10)} style={{ alignSelf: "center", marginTop: "4px", background: GLASS, border: `1px solid ${GLASS_BORDER}`, borderRadius: "8px", padding: "9px 22px", cursor: "pointer", fontSize: "13px", fontFamily: FONT, color: TEXT_MID }}>
              {filtered.length - visible} weitere anzeigen
            </button>
          )}
        </div>
      )}

      {(showAdd || editEntry) && (
        <div onClick={() => { setShowAdd(false); setEditEntry(null); setText(""); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "14px", padding: "28px", width: "100%", maxWidth: "500px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "700", color: TEXT_DARK, fontFamily: FONT }}>{editEntry ? "Notiz bearbeiten" : "Neue Notiz"}</h2>
            <label style={{ fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>Datum</label>
            <input type="date" value={datum} onChange={e => setDatum(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box", marginBottom: "12px", marginTop: "4px" }} />
            <label style={{ fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>Notiz</label>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Notiz schreiben …" rows={6} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", resize: "vertical", boxSizing: "border-box", marginTop: "4px" }} />
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button onClick={() => { setShowAdd(false); setEditEntry(null); setText(""); }} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, background: "none", cursor: "pointer", fontSize: "13px", fontFamily: FONT, color: TEXT_MID }}>Abbrechen</button>
              <button onClick={editEntry ? handleEdit : handleAdd} disabled={saving || !text.trim()} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: ACCENT, color: "#fff", cursor: "pointer", fontSize: "13px", fontFamily: FONT, fontWeight: "600", opacity: saving || !text.trim() ? 0.6 : 1 }}>{saving ? "Speichert …" : "Speichern"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ThemenListe({ canEdit, onOpen, triggerAdd, onAddHandled, suche }) {
  const [themen, setThemen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editThema, setEditThema] = useState(null);
  const [editName, setEditName] = useState("");
  const [editBeschreibung, setEditBeschreibung] = useState("");
  const [beschreibung, setBeschreibung] = useState("");

  useEffect(() => { if (triggerAdd) { setShowAdd(true); onAddHandled(); } }, [triggerAdd]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("notizbuch_themen").select("*").order("name", { ascending: true });
      if (data) {
        const { data: counts } = await supabase.from("notizbuch_eintraege").select("thema_id");
        const countMap = {};
        (counts || []).forEach(e => { countMap[e.thema_id] = (countMap[e.thema_id] || 0) + 1; });
        setThemen(data.map(t => ({ ...t, _count: countMap[t.id] || 0 })));
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("notizbuch_themen").insert({ name: name.trim(), beschreibung: beschreibung.trim() || null });
    if (error) { alert("Fehler: " + error.message); setSaving(false); return; }
    const { data: fresh, error: e2 } = await supabase.from("notizbuch_themen").select("*").order("name", { ascending: true });
    if (e2) { alert("Ladefehler: " + e2.message); setSaving(false); return; }
    if (fresh) {
      const { data: counts } = await supabase.from("notizbuch_eintraege").select("thema_id");
      const countMap = {};
      (counts || []).forEach(e => { countMap[e.thema_id] = (countMap[e.thema_id] || 0) + 1; });
      setThemen(fresh.map(t => ({ ...t, _count: countMap[t.id] || 0 })));
    }
    setName(""); setBeschreibung(""); setShowAdd(false); setSaving(false);
  };

  const handleEdit = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    const { data } = await supabase.from("notizbuch_themen").update({ name: editName.trim(), beschreibung: editBeschreibung.trim() || null }).eq("id", editThema.id).select().single();
    if (data) setThemen(prev => prev.map(t => t.id === data.id ? { ...t, ...data } : t));
    setEditThema(null); setEditName(""); setEditBeschreibung(""); setSaving(false);
  };

  const handleDelete = async (id) => {
    await supabase.from("notizbuch_eintraege").delete().eq("thema_id", id);
    await supabase.from("notizbuch_themen").delete().eq("id", id);
    setThemen(prev => prev.filter(t => t.id !== id));
    setOpenMenuId(null);
  };

  const [collapsed, setCollapsed] = useState({ aktiv: false, abgeschlossen: true });

  const handleToggleStatus = async (t, e) => {
    e.stopPropagation();
    const newStatus = t.status === "abgeschlossen" ? "aktiv" : "abgeschlossen";
    await supabase.from("notizbuch_themen").update({ status: newStatus }).eq("id", t.id);
    setThemen(prev => prev.map(x => x.id === t.id ? { ...x, status: newStatus } : x));
    setOpenMenuId(null);
  };

  const [matchingThemaIds, setMatchingThemaIds] = useState(null);

  useEffect(() => {
    const search = async () => {
      if (!suche?.trim()) { setMatchingThemaIds(null); return; }
      const { data } = await supabase.from("notizbuch_eintraege").select("thema_id, text");
      if (data) {
        const ids = data.filter(e => e.text?.toLowerCase().includes(suche.toLowerCase())).map(e => e.thema_id);
        setMatchingThemaIds(ids);
      }
    };
    search();
  }, [suche]);

  const suchFilter = (t) => {
    if (!suche?.trim()) return true;
    if (t.name.toLowerCase().includes(suche.toLowerCase())) return true;
    if (matchingThemaIds && matchingThemaIds.includes(t.id)) return true;
    return false;
  };
  const aktiv = themen.filter(t => t.status !== "abgeschlossen" && suchFilter(t));
  const abgeschlossen = themen.filter(t => t.status === "abgeschlossen" && suchFilter(t));

  const renderGruppe = (liste, label) => (
    <div style={{ marginBottom: "16px" }}>
      <button onClick={() => setCollapsed(c => ({ ...c, [label]: !c[label] }))} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", padding: "6px 0", marginBottom: "8px" }}>
        <span style={{ fontSize: "13px", fontWeight: "600", color: ACCENT, fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label === "aktiv" ? "Aktiv" : "Abgeschlossen"}</span>
        <span style={{ fontSize: "13px", color: TEXT_LIGHT, fontFamily: FONT }}>({liste.length})</span>
        <div style={{ flex: 1, height: "1px", background: BG_DARK }} />
        <span style={{ fontSize: "13px", color: TEXT_LIGHT }}>{collapsed[label] ? "▶" : "▼"}</span>
      </button>
      {!collapsed[label] && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {liste.map(t => (
            <div key={t.id} style={{ background: GLASS, borderRadius: "10px", border: `1px solid ${GLASS_BORDER}`, padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", cursor: "pointer", position: "relative", zIndex: openMenuId === t.id ? 50 : 1 }} onClick={() => onOpen(t)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "15px", fontWeight: "600", color: TEXT_DARK, fontFamily: FONT }}>{t.name}</div>
                <div style={{ fontSize: "11px", color: TEXT_LIGHT, fontFamily: FONT, marginTop: "2px" }}>{t._count ?? 0} Einträge</div>
              </div>
              <span style={{ fontSize: "18px", color: TEXT_LIGHT }}>›</span>
              {canEdit && (
                <div style={{ position: "relative", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setOpenMenuId(openMenuId === t.id ? null : t.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: TEXT_LIGHT, padding: "2px 6px", lineHeight: 1 }}>⋯</button>
                  {openMenuId === t.id && (
                    <div style={{ position: "absolute", top: "28px", right: 0, background: "#fff", borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", border: `1px solid ${BG_DARK}`, overflow: "hidden", minWidth: "160px", zIndex: 20 }}>
                      <button onClick={(e) => handleToggleStatus(t, e)} style={{ width: "100%", background: "none", border: "none", padding: "11px 16px", textAlign: "left", cursor: "pointer", fontSize: "12px", color: TEXT_DARK, fontFamily: FONT, display: "flex", alignItems: "center", gap: "8px" }}>{t.status === "abgeschlossen" ? "↩ Reaktivieren" : "✓ Abschließen"}</button>
                      <button onClick={() => { setEditThema(t); setEditName(t.name); setEditBeschreibung(t.beschreibung || ""); setOpenMenuId(null); }} style={{ width: "100%", background: "none", border: "none", padding: "11px 16px", textAlign: "left", cursor: "pointer", fontSize: "12px", color: TEXT_DARK, fontFamily: FONT, display: "flex", alignItems: "center", gap: "8px" }}>✎ Umbenennen</button>
                      <button onClick={() => handleDelete(t.id)} style={{ width: "100%", background: "none", border: "none", padding: "11px 16px", textAlign: "left", cursor: "pointer", fontSize: "12px", color: "#b94040", fontFamily: FONT, display: "flex", alignItems: "center", gap: "8px" }}>🗑 Löschen</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: TEXT_LIGHT, fontFamily: FONT }}>Laden …</div>
      ) : themen.length === 0 ? (
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", padding: "52px 72px", background: GLASS, borderRadius: "10px", border: `1px solid ${GLASS_BORDER}`, gap: "14px" }}>
          <p style={{ margin: 0, color: TEXT_LIGHT, fontSize: "13px", fontFamily: FONT }}>Noch keine Themen vorhanden.</p>
        </div>
      ) : (
        <div>
          {renderGruppe(aktiv, "aktiv")}
          {abgeschlossen.length > 0 && renderGruppe(abgeschlossen, "abgeschlossen")}
        </div>
      )}

      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "14px", padding: "28px", width: "100%", maxWidth: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "700", color: TEXT_DARK, fontFamily: FONT }}>Neues Thema</h2>
            <label style={{ fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Projekt Growbox" style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box", marginTop: "4px", marginBottom: "12px" }} />
            <label style={{ fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>Beschreibung (optional)</label>
            <textarea value={beschreibung} onChange={e => setBeschreibung(e.target.value)} placeholder="Worum geht es in diesem Thema?" rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", resize: "vertical", boxSizing: "border-box", marginTop: "4px" }} />
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, background: "none", cursor: "pointer", fontSize: "13px", fontFamily: FONT, color: TEXT_MID }}>Abbrechen</button>
              <button onClick={handleAdd} disabled={saving || !name.trim()} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: ACCENT, color: "#fff", cursor: "pointer", fontSize: "13px", fontFamily: FONT, fontWeight: "600", opacity: saving || !name.trim() ? 0.6 : 1 }}>{saving ? "Speichert …" : "Erstellen"}</button>
            </div>
          </div>
        </div>
      )}

      {editThema && (
        <div onClick={() => setEditThema(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "14px", padding: "28px", width: "100%", maxWidth: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "700", color: TEXT_DARK, fontFamily: FONT }}>Thema bearbeiten</h2>
            <label style={{ fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>Name</label>
            <input value={editName} onChange={e => setEditName(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box", marginTop: "4px", marginBottom: "12px" }} />
            <label style={{ fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>Beschreibung (optional)</label>
            <textarea value={editBeschreibung} onChange={e => setEditBeschreibung(e.target.value)} placeholder="Worum geht es in diesem Thema?" rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", resize: "vertical", boxSizing: "border-box", marginTop: "4px" }} />
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button onClick={() => setEditThema(null)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, background: "none", cursor: "pointer", fontSize: "13px", fontFamily: FONT, color: TEXT_MID }}>Abbrechen</button>
              <button onClick={handleEdit} disabled={saving || !editName.trim()} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: ACCENT, color: "#fff", cursor: "pointer", fontSize: "13px", fontFamily: FONT, fontWeight: "600", opacity: saving || !editName.trim() ? 0.6 : 1 }}>{saving ? "Speichert …" : "Speichern"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ThemaDetail({ thema, canEdit, onBack }) {
  const [eintraege, setEintraege] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [text, setText] = useState("");
  const [datum, setDatum] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [visible, setVisible] = useState(10);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("notizbuch_eintraege").select("*").eq("thema_id", thema.id).order("created_at", { ascending: false });
      if (data) setEintraege(data);
      setLoading(false);
    };
    load();
  }, [thema.id]);

  const handleAdd = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const ts = new Date(datum).toISOString();
    await supabase.from("notizbuch_eintraege").insert({ thema_id: thema.id, text: text.trim(), created_at: ts });
    const { data: fresh } = await supabase.from("notizbuch_eintraege").select("*").eq("thema_id", thema.id).order("created_at", { ascending: false });
    if (fresh) setEintraege(fresh);
    const monate = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
    const d = new Date(datum);
    const datumStr = d.getDate() + ". " + monate[d.getMonth()] + " " + d.getFullYear();
    await fetch(NOTIZBUCH_WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ embeds: [{ description: `**${thema.name}**\n\u200B\n${text.trim()}`, color: 6057046, footer: { text: "Notizbuch | " + datumStr } }] }) }).catch(()=>{});
    setText(""); setDatum(new Date().toISOString().split("T")[0]); setShowAdd(false); setSaving(false);
  };

  const handleEdit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const ts = new Date(datum).toISOString();
    await supabase.from("notizbuch_eintraege").update({ text: text.trim(), created_at: ts }).eq("id", editEntry.id);
    const { data: fresh } = await supabase.from("notizbuch_eintraege").select("*").eq("thema_id", thema.id).order("created_at", { ascending: false });
    if (fresh) setEintraege(fresh);
    setEditEntry(null); setText(""); setDatum(new Date().toISOString().split("T")[0]); setSaving(false);
  };

  const handleDelete = async (id) => {
    await supabase.from("notizbuch_eintraege").delete().eq("id", id);
    setEintraege(prev => prev.filter(e => e.id !== id));
    setOpenMenuId(null);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const shown = eintraege.slice(0, visible);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "22px", flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ background: GLASS, border: `1px solid ${GLASS_BORDER}`, borderRadius: "8px", padding: "7px 14px", cursor: "pointer", fontSize: "13px", fontFamily: FONT, color: TEXT_MID }}>← Zurück</button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: TEXT_DARK, fontFamily: FONT }}>{thema.name}</h2>
          {thema.beschreibung && <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: TEXT_MID, fontFamily: FONT, lineHeight: "1.5" }}>{thema.beschreibung}</p>}
        </div>
        {canEdit && <button onClick={() => { setText(""); setDatum(new Date().toISOString().split("T")[0]); setShowAdd(true); }} style={{ background: ACCENT, border: "none", color: "#fff", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: FONT, fontWeight: "600", marginLeft: "auto" }}>+ Eintrag</button>}
      </div>
      <div style={{ height: "1px", background: BG_DARK, marginBottom: "20px" }} />

      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: TEXT_LIGHT, fontFamily: FONT }}>Laden …</div>
      ) : eintraege.length === 0 ? (
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", padding: "52px 72px", background: GLASS, borderRadius: "10px", border: `1px solid ${GLASS_BORDER}`, gap: "14px" }}>
          <p style={{ margin: 0, color: TEXT_LIGHT, fontSize: "13px", fontFamily: FONT }}>Noch keine Einträge in diesem Thema.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {shown.map(e => (
            <div key={e.id} style={{ background: GLASS, borderRadius: "10px", border: `1px solid ${GLASS_BORDER}`, padding: "16px 18px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", position: "relative", zIndex: openMenuId === e.id ? 50 : 1 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                <div style={{ fontSize: "14px", color: TEXT_DARK, fontFamily: FONT, lineHeight: "1.6", flex: 1 }}>{renderText(e.text)}</div>
                {canEdit && (
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <button onClick={() => setOpenMenuId(openMenuId === e.id ? null : e.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: TEXT_LIGHT, padding: "2px 6px", lineHeight: 1 }}>⋯</button>
                    {openMenuId === e.id && (
                      <div style={{ position: "absolute", top: "28px", right: 0, background: "#fff", borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", border: `1px solid ${BG_DARK}`, overflow: "hidden", minWidth: "130px", zIndex: 20 }}>
                        <button onClick={() => { setEditEntry(e); setText(e.text); setDatum(e.created_at?.split("T")[0] || new Date().toISOString().split("T")[0]); setOpenMenuId(null); }} style={{ width: "100%", background: "none", border: "none", padding: "11px 16px", textAlign: "left", cursor: "pointer", fontSize: "12px", color: TEXT_DARK, fontFamily: FONT, display: "flex", alignItems: "center", gap: "8px" }}>✎ Bearbeiten</button>
                        <button onClick={() => handleDelete(e.id)} style={{ width: "100%", background: "none", border: "none", padding: "11px 16px", textAlign: "left", cursor: "pointer", fontSize: "12px", color: "#b94040", fontFamily: FONT, display: "flex", alignItems: "center", gap: "8px" }}>🗑 Löschen</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ marginTop: "8px" }}>
                <span style={{ fontSize: "11px", color: TEXT_LIGHT, fontFamily: FONT }}>{formatDate(e.created_at)}</span>
              </div>
            </div>
          ))}
          {visible < eintraege.length && (
            <button onClick={() => setVisible(v => v + 10)} style={{ alignSelf: "center", marginTop: "4px", background: GLASS, border: `1px solid ${GLASS_BORDER}`, borderRadius: "8px", padding: "9px 22px", cursor: "pointer", fontSize: "13px", fontFamily: FONT, color: TEXT_MID }}>
              {eintraege.length - visible} weitere anzeigen
            </button>
          )}
        </div>
      )}

      {(showAdd || editEntry) && (
        <div onClick={() => { setShowAdd(false); setEditEntry(null); setText(""); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "14px", padding: "28px", width: "100%", maxWidth: "500px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "700", color: TEXT_DARK, fontFamily: FONT }}>{editEntry ? "Eintrag bearbeiten" : "Neuer Eintrag"}</h2>
            <label style={{ fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>Datum</label>
            <input type="date" value={datum} onChange={e => setDatum(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", boxSizing: "border-box", marginBottom: "12px", marginTop: "4px" }} />
            <label style={{ fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>Notiz</label>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Notiz schreiben …" rows={6} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, fontSize: "13px", fontFamily: FONT, color: TEXT_DARK, outline: "none", resize: "vertical", boxSizing: "border-box", marginTop: "4px" }} />
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button onClick={() => { setShowAdd(false); setEditEntry(null); setText(""); }} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `1px solid ${BG_DARK}`, background: "none", cursor: "pointer", fontSize: "13px", fontFamily: FONT, color: TEXT_MID }}>Abbrechen</button>
              <button onClick={editEntry ? handleEdit : handleAdd} disabled={saving || !text.trim()} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: ACCENT, color: "#fff", cursor: "pointer", fontSize: "13px", fontFamily: FONT, fontWeight: "600", opacity: saving || !text.trim() ? 0.6 : 1 }}>{saving ? "Speichert …" : "Speichern"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ── App ───────────────────────────────────────────────────────────────────────
// ── Gastzugang Page ───────────────────────────────────────────────────────────
// ── Shareable Pages Config ───────────────────────────────────────────────────
const SHAREABLE_PAGES = [
  { id: "fotoalbum", label: "Fotoalbum" },
  { id: "unsere-pflanzen", label: "Unsere Pflanzen" },
];

// One single share entry: token + pages[] + active
function GastzugangPage() {
  const [shareData, setShareData] = useState(null); // { id, token, pages, active }
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [active, setActive] = useState(false);
  const [copying, setCopying] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("share_links").select("*").limit(1).maybeSingle();
      if (data) {
        setShareData(data);
        setActive(data.active);
        try { setSelected(JSON.parse(data.page_id)); } catch { setSelected([data.page_id]); }
      }
      setLoading(false);
    };
    load();
  }, []);

  const token = shareData?.token || (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
  const url = active && selected.length > 0 ? `${window.location.origin}${window.location.pathname}#share/${shareData?.token}` : null;

  const togglePage = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    const pageJson = JSON.stringify(selected);
    const newToken = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    if (shareData) {
      const { data } = await supabase.from("share_links").update({ page_id: pageJson, token: newToken, active: true, expires_at: expiresAt }).eq("id", shareData.id).select().single();
      if (data) { setShareData(data); setActive(true); }
    } else {
      const { data } = await supabase.from("share_links").insert({ page_id: pageJson, token: newToken, active: true, expires_at: expiresAt }).select().single();
      if (data) { setShareData(data); setActive(true); }
    }
    setSaving(false);
  };

  const handleToggleActive = async () => {
    const newActive = !active;
    setActive(newActive);
    if (shareData) {
      await supabase.from("share_links").update({ active: newActive }).eq("id", shareData.id);
    }
  };

  const handleCopy = async () => {
    const u = shareData ? `${window.location.origin}${window.location.pathname}#share/${shareData.token}` : null;
    if (!u) return;
    await navigator.clipboard.writeText(u);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const sharedUrl = shareData ? `${window.location.origin}${window.location.pathname}#share/${shareData.token}` : null;

  return (
    <div>
      <div style={{ marginBottom: "22px" }}>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: "600", color: TEXT_DARK, fontFamily: FONT }}>Gastzugang</h1>
        <p style={{ margin: 0, fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>Einen Link generieren – nur Leseansicht, kein Login nötig.</p>
      </div>
      <div style={{ height: "1px", background: BG_DARK, marginBottom: "26px" }} />

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: TEXT_LIGHT, fontFamily: FONT }}>Laden …</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "560px" }}>

          {/* Page selection */}
          <div style={{ background: GLASS, borderRadius: "12px", border: `1px solid ${GLASS_BORDER}`, padding: "18px 20px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
            <div style={{ fontSize: "12px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT, marginBottom: "14px" }}>Seiten auswählen</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {SHAREABLE_PAGES.map(page => (
                <div key={page.id} onClick={() => togglePage(page.id)} style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                  <div style={{ width: "18px", height: "18px", border: `2px solid ${ACCENT}`, borderRadius: "3px", background: selected.includes(page.id) ? ACCENT : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {selected.includes(page.id) && <span style={{ color: "white", fontSize: "12px", lineHeight: 1 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: "14px", color: TEXT_DARK, fontFamily: FONT }}>{page.label}</span>
                </div>
              ))}
            </div>
            <button onClick={handleSave} disabled={saving || selected.length === 0} style={{ marginTop: "16px", background: selected.length > 0 ? ACCENT : BG_DARK, border: "none", borderRadius: "6px", padding: "9px 20px", cursor: selected.length > 0 ? "pointer" : "default", fontSize: "12px", color: "#fff", fontFamily: FONT }}>
              {saving ? "Speichert …" : shareData ? "Auswahl speichern" : "Link generieren"}
            </button>
          </div>

          {/* Link + toggle */}
          {shareData && (
            <div style={{ background: GLASS, borderRadius: "12px", border: `1px solid ${GLASS_BORDER}`, padding: "18px 20px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT_DARK, fontFamily: FONT }}>Link</div>
                  <div style={{ fontSize: "11px", color: active ? ACCENT : TEXT_LIGHT, fontFamily: FONT, marginTop: "2px" }}>{active ? "Aktiv – Zugriff möglich" : "Deaktiviert – kein Zugriff"}</div>
                </div>
                <div onClick={handleToggleActive} style={{ width: "44px", height: "24px", borderRadius: "12px", background: active ? ACCENT : BG_DARK, cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: "3px", left: active ? "23px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
                </div>
              </div>
              {active && sharedUrl && (() => {
                const exp = shareData?.expires_at ? new Date(shareData.expires_at) : null;
                const remaining = exp ? Math.max(0, Math.round((exp - Date.now()) / 60000)) : null;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {remaining !== null && (
                      <div style={{ fontSize: "11px", color: remaining < 5 ? "#b94040" : ACCENT, fontFamily: FONT }}>
                        ⏱ Läuft ab in {remaining} Minute{remaining !== 1 ? "n" : ""}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <div style={{ flex: 1, background: BG, borderRadius: "6px", padding: "8px 12px", fontSize: "11px", color: TEXT_MID, fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", border: `1px solid ${BG_DARK}` }}>{sharedUrl}</div>
                      <button onClick={handleCopy} style={{ background: copying ? ACCENT : BTN, border: "none", borderRadius: "6px", padding: "8px 14px", cursor: "pointer", fontSize: "11px", color: "#fff", fontFamily: FONT, whiteSpace: "nowrap", transition: "background 0.2s" }}>
                        {copying ? "✓ Kopiert" : "Kopieren"}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SharedView({ token }) {
  const [status, setStatus] = useState("loading");
  const [pages, setPages] = useState([]);
  const [activePage, setActivePage] = useState(null);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.from("share_links").select("*").eq("token", token).eq("active", true).maybeSingle();
      if (data) {
        // Check expiry
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          await supabase.from("share_links").update({ active: false }).eq("id", data.id);
          setStatus("invalid");
          return;
        }
        let pgs = [];
        try { pgs = JSON.parse(data.page_id); } catch { pgs = [data.page_id]; }
        setPages(pgs);
        setActivePage(pgs[0]);
        setStatus("valid");
      } else setStatus("invalid");
    };
    check();
  }, [token]);

  if (status === "loading") return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: BG, fontFamily: FONT, color: TEXT_LIGHT }}>Laden …</div>
  );
  if (status === "invalid") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: BG, fontFamily: FONT, gap: "12px" }}>
      <span style={{ fontSize: "32px" }}>🔒</span>
      <div style={{ fontSize: "16px", fontWeight: "600", color: TEXT_DARK }}>Kein Zugriff</div>
      <div style={{ fontSize: "13px", color: TEXT_LIGHT }}>Dieser Link ist nicht mehr aktiv.</div>
    </div>
  );

  const pageLabels = { "fotoalbum": "Fotoalbum", "unsere-pflanzen": "Unsere Pflanzen" };

  return (
    <RoleContext.Provider value="readonly">
      <div style={{ display: "flex", height: "100vh", fontFamily: FONT, background: BG, overflow: "hidden", flexDirection: "column" }}>
        <header style={{ height: "54px", background: "rgba(235,235,230,0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: `1px solid ${GLASS_BORDER}`, display: "flex", alignItems: "center", padding: "0 20px", gap: "10px", flexShrink: 0 }}>
          <span style={{ fontSize: "15px", color: TEXT_DARK, fontWeight: "600", fontFamily: FONT }}>🌿 GreenLove2Leaves</span>
          {pages.length > 1 && (
            <div style={{ display: "flex", gap: "6px", marginLeft: "16px" }}>
              {pages.map(p => (
                <button key={p} onClick={() => setActivePage(p)} style={{ padding: "5px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "12px", fontFamily: FONT, background: activePage === p ? ACCENT : GLASS, color: activePage === p ? "#fff" : TEXT_MID }}>
                  {pageLabels[p] || p}
                </button>
              ))}
            </div>
          )}
          <span style={{ fontSize: "11px", color: TEXT_LIGHT, marginLeft: "auto", fontFamily: FONT }}>Leseansicht</span>
        </header>
        <main style={{ flex: 1, overflowY: "auto", padding: "36px 48px", background: "linear-gradient(145deg, #e8e7dc 0%, #EBEBE6 40%, #e2e1d8 100%)" }}>
          {activePage === "fotoalbum" ? <FotoalbumPage /> : activePage === "unsere-pflanzen" ? <PflanzenPage /> : null}
        </main>
      </div>
    </RoleContext.Provider>
  );
}

export default function App() {
  const shareToken = (() => {
    const hash = window.location.hash.replace("#", "");
    if (hash.startsWith("share/")) return hash.replace("share/", "");
    return null;
  })();

  const [role, setRole] = useState(() => getSession());

  if (shareToken) return <SharedView token={shareToken} />;
  if (!role) return <LoginScreen onLogin={setRole} />;

  return (
    <RoleContext.Provider value={role}>
      <AppInner onLogout={() => { clearSession(); setRole(null); }} />
    </RoleContext.Provider>
  );
}

function AppInner({ onLogout }) {
  const role = useRole();
  const [activeMenu, setActiveMenu] = useState(() => {
    try {
      const hash = window.location.hash.replace("#", "");
      if (hash) { const m = menu.find(x => x.sub.some(s => s.id === hash)); if (m) return m.id; }
      const stored = sessionStorage.getItem("activeMenu");
      if (stored) return stored;
    } catch(e) {}
    return "pflanzen";
  });
  const [activePage, setActivePage] = useState(() => {
    try {
      const hash = window.location.hash.replace("#", "");
      if (hash && menu.some(m => m.sub.some(s => s.id === hash))) return hash;
      const stored = sessionStorage.getItem("activePage");
      if (stored) return stored;
    } catch(e) {}
    return "unsere-pflanzen";
  });
  const [collapsed, setCollapsed] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [quickAdd, setQuickAdd] = useState(false);
  const openQuickAdd = () => setQuickAdd(true);
  const closeQuickAdd = () => setQuickAdd(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = (title, msg) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, []);

  useEffect(() => {
    const channel = supabase.channel("realtime-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pflanzen" }, payload => {
        addToast("Neue Pflanze 🌱", `${payload.new.name} wurde hinzugefügt`);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tagebuch" }, payload => {
        addToast("Neuer Tagebucheintrag 📖", "Ein Eintrag wurde hinzugefügt");
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const currentMenu = menu.find(m => m.id === activeMenu);

  const handleMenuClick = (id) => {
    const m = menu.find(x => x.id === id);
    if (m) { setActiveMenu(id); setActivePage(m.sub[0].id); sessionStorage.setItem("activeMenu", id); sessionStorage.setItem("activePage", m.sub[0].id); history.replaceState(null, "", "#" + m.sub[0].id); }
  };

  const handlePageClick = (id) => {
    setActivePage(id);
    setMobileOpen(false);
    sessionStorage.setItem("activePage", id);
    sessionStorage.setItem("activeMenu", activeMenu);
    history.replaceState(null, "", "#" + id);
  };

  const pageTitle = activePage === "unsere-pflanzen" ? "Unsere Pflanzen" : pages[activePage]?.title;

  const Sidebar = ({ mobile }) => (
    <aside style={{
      width: mobile ? "280px" : collapsed ? "52px" : "240px",
      minWidth: mobile ? "280px" : collapsed ? "52px" : "240px",
      background: "#5c6c56", display: "flex", flexDirection: "column",
      transition: mobile ? "none" : "width 0.25s ease, min-width 0.25s ease",
      overflow: "hidden", height: "100%",
      boxShadow: mobile ? "4px 0 24px rgba(0,0,0,0.25)" : "2px 0 16px rgba(0,0,0,0.15)",
      zIndex: 10,
    }}>
      <div style={{ height: "54px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: "1px solid #4a5a44", flexShrink: 0, cursor: mobile ? "default" : "pointer" }}
        onClick={mobile ? undefined : () => setCollapsed(c => !c)}>
        {(!collapsed || mobile) && <span style={{ color: "#ffffff", fontSize: "15px", letterSpacing: "1px", whiteSpace: "nowrap", fontFamily: FONT }}>GreenLove2Leaves</span>}
        {collapsed && !mobile && <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "16px" }}>»</span>}
        {mobile && <button onClick={() => setMobileOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", fontSize: "20px", cursor: "pointer", padding: "4px 8px" }}>✕</button>}
      </div>
      <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "6px 0" }}>
        {menu.map(item => {
          const isActive = activeMenu === item.id;
          return (
            <div key={item.id}>
              <button onClick={() => handleMenuClick(item.id)} style={{ width: "100%", background: isActive ? "rgba(235,235,230,0.15)" : "none", border: "none", borderLeft: isActive ? `3px solid ${BG}` : "3px solid transparent", color: isActive ? "#ffffff" : "rgba(255,255,255,0.7)", padding: (!collapsed || mobile) ? "13px 14px" : "13px 0", textAlign: (!collapsed || mobile) ? "left" : "center", cursor: "pointer", fontSize: "16px", letterSpacing: "0.6px", display: "flex", alignItems: "center", gap: (!collapsed || mobile) ? "9px" : 0, justifyContent: (!collapsed || mobile) ? "flex-start" : "center", transition: "background 0.15s, color 0.15s", whiteSpace: "nowrap", fontFamily: FONT }}>
                <span>{item.emoji}</span>
                {(!collapsed || mobile) && <span>{item.label}</span>}
              </button>
              {isActive && (!collapsed || mobile) && (
                <div style={{ background: "#4e5e48" }}>
                  {item.sub.map(sub => {
                    const isSub = activePage === sub.id;
                    return (
                      <button key={sub.id} onClick={() => handlePageClick(sub.id)} style={{ width: "100%", background: isSub ? "rgba(235,235,230,0.15)" : "none", border: "none", borderLeft: "3px solid transparent", color: isSub ? "#ffffff" : "rgba(255,255,255,0.6)", padding: "10px 14px 10px 34px", textAlign: "left", cursor: "pointer", fontSize: "16px", letterSpacing: "0.3px", display: "flex", alignItems: "center", gap: "7px", transition: "background 0.15s, color 0.15s", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: FONT }}>
                        <span style={{ opacity: 0.5, fontSize: "10px" }}>»</span>{sub.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      {(!collapsed || mobile) && (
          <div style={{ padding: "11px 14px", borderTop: "1px solid #4a5a44", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: isOnline ? "#EBEBE6" : "#e05555", flexShrink: 0 }} />
            <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.5)", letterSpacing: "2px", textTransform: "uppercase", fontFamily: FONT, flex: 1 }}>{isOnline ? "Online" : "Offline"}</span>

          </div>
      )}
    </aside>
  );

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .gl-desktop-sidebar { display: none !important; }
          .gl-hamburger { display: flex !important; }
          .gl-main { padding: 16px 14px !important; }
          .plant-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .foto-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .gl-quickadd-fab { display: flex !important; }
        }
      `}</style>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex" }}>
          <div onClick={() => setMobileOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
          <div style={{ position: "relative", zIndex: 201, height: "100%" }}>
            <Sidebar mobile={true} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", height: "100vh", fontFamily: FONT, background: BG, overflow: "hidden" }}>
        <ToastContainer toasts={toasts} onRemove={removeToast} />

        {/* Desktop sidebar */}
        <div className="gl-desktop-sidebar" style={{ display: "flex", height: "100%" }}>
          <Sidebar mobile={false} />
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <header style={{ height: "54px", background: "rgba(235,235,230,0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: `1px solid ${GLASS_BORDER}`, display: "flex", alignItems: "center", padding: "0 16px", gap: "10px", flexShrink: 0 }}>
            {/* Hamburger – mobile only */}
            <button className="gl-hamburger" onClick={() => setMobileOpen(true)} style={{ display: "none", background: "none", border: "none", cursor: "pointer", fontSize: "22px", color: BTN, padding: "2px 6px", alignItems: "center" }}>☰</button>
            <span style={{ fontSize: "11px", color: TEXT_LIGHT, letterSpacing: "0.8px", fontFamily: FONT, whiteSpace: "nowrap" }}>{currentMenu?.emoji} {currentMenu?.label}</span>
            <span style={{ color: BG_DARK }}>›</span>
            <span style={{ fontSize: "11px", color: TEXT_MID, fontFamily: FONT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pageTitle}</span>
          </header>
          <main className="gl-main" style={{ flex: 1, overflowY: "auto", padding: "36px 48px", background: "linear-gradient(145deg, #e8e7dc 0%, #EBEBE6 40%, #e2e1d8 100%)" }}>
            {activePage === "unsere-pflanzen" ? <PflanzenPage /> : activePage === "fotoalbum" ? <FotoalbumPage /> : activePage === "todo" ? <TodoPage /> : activePage === "postfach" ? <PostfachPage /> : activePage === "gastzugang" ? <GastzugangPage /> : activePage === "pflanzenkasse" ? <PflanzenkassePage /> : activePage === "archiv" ? <ArchivPage /> : activePage === "bestellungen" ? <BestellungenPage /> : activePage === "ableger" ? <AblegerPage /> : activePage === "notizbuch" ? <NotizbuchPage /> : <GenericPage page={pages[activePage] || { title: "–", desc: "", empty: "Noch keine Inhalte." }} />}
          </main>
        </div>
      </div>
      {/* Mobile floating + button */}
      {role !== "guest" && role !== "readonly" && <button onClick={openQuickAdd} style={{ position: "fixed", bottom: "28px", right: "28px", zIndex: 500, width: "56px", height: "56px", borderRadius: "50%", background: ACCENT, border: "none", color: "#fff", fontSize: "30px", cursor: "pointer", boxShadow: "0 4px 24px rgba(0,0,0,0.22)", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>+</button>}

      {/* QuickAdd Modal */}
      {quickAdd && (
        <div onClick={closeQuickAdd} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 600, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "14px", padding: "22px", width: "100%", maxWidth: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", marginBottom: "20px" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "700", color: TEXT_DARK, fontFamily: FONT }}>Schnell hinzufügen</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button onClick={() => { setQuickAdd(false); setActiveMenu("updates"); setActivePage("postfach"); sessionStorage.setItem("activePage", "postfach"); sessionStorage.setItem("activeMenu", "updates"); history.replaceState(null, "", "#postfach"); setTimeout(() => { const btn = document.querySelector("[data-quickadd-postfach]"); if (btn) btn.click(); }, 300); }} style={{ width: "100%", padding: "14px", borderRadius: "10px", border: `1px solid ${GLASS_BORDER}`, background: GLASS, cursor: "pointer", textAlign: "left", fontFamily: FONT, fontSize: "14px", color: TEXT_DARK, display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "32px", fontWeight: "700", color: "#5c6c56" }}>»</span>
                <div>
                  <div style={{ fontWeight: "600" }}>Nachricht</div>
                  <div style={{ fontSize: "11px", color: TEXT_LIGHT, marginTop: "2px" }}>Neue Nachricht ins Postfach</div>
                </div>
              </button>
              <button onClick={() => { setQuickAdd(false); setActivePage("todo"); sessionStorage.setItem("activePage", "todo"); history.replaceState(null, "", "#todo"); setTimeout(() => { const btn = document.querySelector("[data-quickadd-todo]"); if (btn) btn.click(); }, 300); }} style={{ width: "100%", padding: "14px", borderRadius: "10px", border: `1px solid ${GLASS_BORDER}`, background: GLASS, cursor: "pointer", textAlign: "left", fontFamily: FONT, fontSize: "14px", color: TEXT_DARK, display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "32px", fontWeight: "700", color: "#5c6c56" }}>»</span>
                <div>
                  <div style={{ fontWeight: "600" }}>To Do Aufgabe</div>
                  <div style={{ fontSize: "11px", color: TEXT_LIGHT, marginTop: "2px" }}>Neue Aufgabe in der To Do Liste</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
