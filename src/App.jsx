import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

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

// ── Design ───────────────────────────────────────────────────────────────────
const BG = "#EBEBE6";
const BG_DARK = "#d4d4ce";
const BG_LIGHT = "#f2f2ee";
const GLASS = "rgba(255,255,255,0.45)";
const GLASS_BORDER = "rgba(255,255,255,0.7)";
const GLASS_SHADOW = "0 4px 24px rgba(180,178,160,0.18)";
const ACCENT = "#5a7a3a";
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
    { id: "bestellungen", label: "Bestellungen & Einkäufe", emoji: "»" },
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
];

const pages = {
  "social-media": { title: "Social Media", desc: "Dein Foto-Grid für deine Pflanzenmomente.", empty: "Noch keine Fotos vorhanden." },
  ableger: { title: "Unsere Ableger", desc: "Alle Ableger und Stecklinge im Überblick.", empty: "Noch keine Ableger dokumentiert." },
  wishlist: { title: "Wishlist", desc: "Pflanzen die du noch haben möchtest.", empty: "Deine Wunschliste ist noch leer." },
  notizbuch: { title: "Notizbuch", desc: "Persönliche Notizen rund um deine Pflanzen.", empty: "Noch keine Notizen vorhanden." },
  todo: { title: "To Do Liste", desc: "Alle anstehenden Aufgaben.", empty: "Keine offenen Aufgaben!" },
  "sale-termine": { title: "Sale Termine", desc: "Bevorstehende Verkaufs- und Tauschtermine.", empty: "Keine Termine eingetragen." },
  akklimatisierung: { title: "Akklimatisierung", desc: "Neue Pflanzen in der Eingewöhnungsphase.", empty: "Keine Pflanzen in der Akklimatisierung." },
  bestellungen: { title: "Bestellungen & Einkäufe", desc: "Übersicht aller Käufe und Bestellungen.", empty: "Noch keine Bestellungen erfasst." },
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
        {!plant.foto && <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.75 }}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}
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
        <div style={{ fontSize: "10px", color: TEXT_LIGHT, fontStyle: "italic", marginBottom: "10px", fontFamily: FONT }}>{plant.vollstaendigerName || "–"}</div>
        <div style={{ height: "1px", background: BG_DARK, marginBottom: "10px" }} />
        {[["Standort", plant.standort], ["Bei uns seit", calcBeiUnsSeit(plant.datum)]].map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "3px" }}>
            <span style={{ fontSize: "10px", color: TEXT_LIGHT, fontFamily: FONT }}>{l}</span>
            <span style={{ fontSize: "10px", color: TEXT_MID, fontFamily: FONT, textAlign: "right" }}>{v || "–"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tagebuch ─────────────────────────────────────────────────────────────────
function Tagebuch({ plantId }) {
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showAll, setShowAll] = useState(false);
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
        <div style={{ fontSize: "10px", color: TEXT_LIGHT, letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: FONT }}>Tagebuch</div>
        <button onClick={() => setShowForm(v => !v)} style={{
          background: showForm ? BG_DARK : ACCENT, border: "none",
          borderRadius: "6px", padding: "5px 12px", cursor: "pointer",
          fontSize: "11px", color: showForm ? TEXT_MID : WHITE, fontFamily: FONT,
        }}>{showForm ? "Abbrechen" : "+ Eintrag"}</button>
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
            <div key={entry.id} style={{ background: BG, borderRadius: "8px", border: `1px solid ${BG_DARK}`, overflow: "hidden" }}>
              {entry.photo && <img src={entry.photo} alt="" style={{ width: "100%", height: "auto", display: "block" }} />}
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
                      <span style={{ fontSize: "12px", color: TEXT_LIGHT, fontFamily: FONT }}>{formatEntryDate(entry.date)}</span>
                      <div style={{ position: "relative" }}>
                        <button onClick={e => { e.stopPropagation(); const m = document.getElementById("menu-"+entry.id); m.style.display = m.style.display === "block" ? "none" : "block"; }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: TEXT_LIGHT, fontFamily: FONT, padding: "2px 6px", letterSpacing: "1px" }}>⋯</button>
                        <div id={"menu-"+entry.id} style={{ display: "none", position: "absolute", right: 0, bottom: "28px", background: WHITE, borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", border: `1px solid ${BG_DARK}`, minWidth: "130px", zIndex: 20, overflow: "hidden" }}>
                          <button onClick={() => { setEditingEntry(entry.id); document.getElementById("menu-"+entry.id).style.display = "none"; }} style={{ width: "100%", background: "none", border: "none", padding: "10px 14px", textAlign: "left", cursor: "pointer", fontSize: "12px", color: TEXT_DARK, fontFamily: FONT, display: "flex", alignItems: "center", gap: "8px" }}>
                            <span>✎</span> Bearbeiten
                          </button>
                          <div style={{ height: "1px", background: BG_DARK }} />
                          <button onClick={() => handleDelete(entry.id)} style={{ width: "100%", background: "none", border: "none", padding: "10px 14px", textAlign: "left", cursor: "pointer", fontSize: "12px", color: "#b94040", fontFamily: FONT, display: "flex", alignItems: "center", gap: "8px" }}>
                            <span>🗑</span> Löschen
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
  const [editMode, setEditMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState({ ...plant });
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

          {/* Share + Download buttons */}
          {plant.foto && !editMode && (
            <div style={{ position: "absolute", bottom: "12px", left: "12px", display: "flex", gap: "6px" }}>
              <button onClick={handleShare} style={{ background: "rgba(255,255,255,0.9)", border: "none", borderRadius: "6px", padding: "5px 10px", cursor: "pointer", fontSize: "11px", color: TEXT_MID, fontFamily: FONT }}>
                ↗ Teilen
              </button>
              <button onClick={handleDownload} style={{ background: "rgba(255,255,255,0.9)", border: "none", borderRadius: "6px", padding: "5px 10px", cursor: "pointer", fontSize: "11px", color: TEXT_MID, fontFamily: FONT }}>
                ↓ Speichern
              </button>
            </div>
          )}

          {/* 3-dot menu */}
          <div style={{ position: "absolute", top: "12px", right: "12px" }}>
            <button onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }} style={{ background: "rgba(255,255,255,0.9)", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", fontSize: "16px", color: TEXT_MID, display: "flex", alignItems: "center", justifyContent: "center" }}>⋯</button>
            {menuOpen && (
              <div style={{ position: "absolute", top: "36px", right: 0, background: WHITE, borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", border: `1px solid ${BG_DARK}`, overflow: "hidden", minWidth: "140px", zIndex: 10 }}>
                <button onClick={() => { onDelete(plant.id); setMenuOpen(false); }} style={{ width: "100%", background: "none", border: "none", padding: "11px 16px", textAlign: "left", cursor: "pointer", fontSize: "12px", color: "#b94040", fontFamily: FONT, display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🗑</span> Pflanze löschen
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "22px" }}>
          {!editMode ? (
            <>
              <div style={{ fontSize: "17px", fontWeight: "700", color: TEXT_DARK, marginBottom: "2px", fontFamily: FONT }}>{plant.name}</div>
              <div style={{ fontSize: "11px", color: TEXT_LIGHT, fontStyle: "italic", marginBottom: "16px", fontFamily: FONT }}>{plant.vollstaendigerName || "–"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>
                {[["Typ", plant.typ],["Standort", plant.standort],["Datum", formatDate(plant.datum)],["Wochentag", getWochentag(plant.datum)],["Bei uns seit", calcBeiUnsSeit(plant.datum)],["Erhalten von", plant.erhaltenVon],["Auf / Im", plant.aufIm]].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: "9px", color: TEXT_LIGHT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "3px", fontFamily: FONT }}>{label}</div>
                    <div style={{ fontSize: "12px", color: TEXT_DARK, fontFamily: FONT }}>{value || "–"}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
                <button onClick={onClose} style={{ flex: 1, background: BG, border: `1px solid ${BG_DARK}`, borderRadius: "6px", padding: "9px", cursor: "pointer", fontSize: "12px", color: TEXT_MID, fontFamily: FONT }}>Schließen</button>
                <button onClick={() => setEditMode(true)} style={{ flex: 1, background: ACCENT, border: "none", borderRadius: "6px", padding: "9px", cursor: "pointer", fontSize: "12px", color: WHITE, fontFamily: FONT }}>✎ Bearbeiten</button>
              </div>
              <Tagebuch plantId={plant.id} />
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
  const [form, setForm] = useState({ name: "", foto: "", typ: "", datum: "", vollstaendigerName: "", standort: "", erhaltenVon: "", aufIm: "" });
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
      if (!error && data) onSave(dbToPlant(data));
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
    filtered.forEach(p => { const key = p[groupBy] || "Keine Angabe"; if (!map[key]) map[key] = []; map[key].push(p); });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([label, plants]) => ({ label, plants }));
  })();

  const toggleGroup = (label) => setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));

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
          <button onClick={() => setShowAdd(true)} style={{ background: BTN, border: "none", borderRadius: "6px", padding: "9px 18px", cursor: "pointer", fontSize: "12px", color: WHITE, fontFamily: FONT, whiteSpace: "nowrap" }}>+ Pflanze hinzufügen</button>
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
                  <span style={{ fontSize: "11px", fontWeight: "600", color: ACCENT, letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: FONT }}>{label}</span>
                  <span style={{ fontSize: "10px", color: TEXT_LIGHT, fontFamily: FONT }}>({gPlants.length})</span>
                  <div style={{ flex: 1, height: "1px", background: BG_DARK }} />
                  <span style={{ fontSize: "11px", color: TEXT_LIGHT }}>{collapsedGroups[label] ? "▶" : "▼"}</span>
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

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeMenu, setActiveMenu] = useState("pflanzen");
  const [activePage, setActivePage] = useState("unsere-pflanzen");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = (title, msg) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

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
    if (m) { setActiveMenu(id); setActivePage(m.sub[0].id); }
  };

  const handlePageClick = (id) => {
    setActivePage(id);
    setMobileOpen(false);
  };

  const pageTitle = activePage === "unsere-pflanzen" ? "Unsere Pflanzen" : pages[activePage]?.title;

  const Sidebar = ({ mobile }) => (
    <aside style={{
      width: mobile ? "280px" : collapsed ? "52px" : "216px",
      minWidth: mobile ? "280px" : collapsed ? "52px" : "216px",
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
              <button onClick={() => handleMenuClick(item.id)} style={{ width: "100%", background: isActive ? "#4a5a44" : "none", border: "none", borderLeft: isActive ? `3px solid ${ACCENT_LIGHT}` : "3px solid transparent", color: isActive ? "#ffffff" : "rgba(255,255,255,0.7)", padding: (!collapsed || mobile) ? "13px 14px" : "13px 0", textAlign: (!collapsed || mobile) ? "left" : "center", cursor: "pointer", fontSize: "15px", letterSpacing: "0.6px", display: "flex", alignItems: "center", gap: (!collapsed || mobile) ? "9px" : 0, justifyContent: (!collapsed || mobile) ? "flex-start" : "center", transition: "background 0.15s, color 0.15s", whiteSpace: "nowrap", fontFamily: FONT }}>
                <span>{item.emoji}</span>
                {(!collapsed || mobile) && <span>{item.label}</span>}
              </button>
              {isActive && (!collapsed || mobile) && (
                <div style={{ background: "#4e5e48" }}>
                  {item.sub.map(sub => {
                    const isSub = activePage === sub.id;
                    return (
                      <button key={sub.id} onClick={() => handlePageClick(sub.id)} style={{ width: "100%", background: isSub ? "rgba(122,158,82,0.13)" : "none", border: "none", borderLeft: isSub ? `2px solid ${ACCENT}` : "2px solid transparent", color: isSub ? "#ffffff" : "rgba(255,255,255,0.6)", padding: "10px 14px 10px 34px", textAlign: "left", cursor: "pointer", fontSize: "15px", letterSpacing: "0.3px", display: "flex", alignItems: "center", gap: "7px", transition: "background 0.15s, color 0.15s", whiteSpace: "nowrap", fontFamily: FONT }}>
                        <span style={{ opacity: 0.6, fontSize: "11px" }}>{sub.emoji}</span>{sub.label}
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
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: ACCENT_LIGHT, flexShrink: 0 }} />
          <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.5)", letterSpacing: "2px", textTransform: "uppercase", fontFamily: FONT }}>Pflanzen</span>
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
            {activePage === "unsere-pflanzen" ? <PflanzenPage /> : <GenericPage page={pages[activePage] || { title: "–", desc: "", empty: "Noch keine Inhalte." }} />}
          </main>
        </div>
      </div>
    </>
  );
}
