"use client";
import { useState, type FormEvent } from "react";
import { buildMailtoHref, type ContactFields } from "../lib/mailto";
import s from "./ContactModal.module.css";

const TO = "booking@thelongshotroom.example";

export default function ContactModal({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState<ContactFields>({ name: "", email: "", project: "" });

  function set<K extends keyof ContactFields>(k: K, v: string) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    window.location.href = buildMailtoHref(TO, f);
  }

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-label="Contact" onClick={onClose}>
      <div className={s.panel} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={s.close} aria-label="Close" onClick={onClose}>
          ✕
        </button>
        <p className="label">New inquiry</p>
        <h2 className={s.title}>Tell me about your record.</h2>
        <p className={s.sub}>
          A few details so we can respond thoughtfully. Required fields marked with{" "}
          <span className={s.req}>*</span>.
        </p>
        <form className={s.form} onSubmit={onSubmit}>
          <label className={s.field}>
            <span className="label">Your name <span className={s.req}>*</span></span>
            <input required value={f.name} onChange={(e) => set("name", e.target.value)} />
          </label>
          <label className={s.field}>
            <span className="label">Email <span className={s.req}>*</span></span>
            <input required type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
          </label>
          <label className={s.field}>
            <span className="label">Band / project <span className={s.req}>*</span></span>
            <input required value={f.project} onChange={(e) => set("project", e.target.value)} />
          </label>
          <label className={s.field}>
            <span className="label">Music link</span>
            <input
              value={f.musicLink ?? ""}
              placeholder="Spotify, Bandcamp, SoundCloud, anything"
              onChange={(e) => set("musicLink", e.target.value)}
            />
          </label>
          <label className={s.field}>
            <span className="label">How many songs?</span>
            <input
              value={f.songCount ?? ""}
              placeholder="Single, EP, LP, or a number"
              onChange={(e) => set("songCount", e.target.value)}
            />
          </label>
          <label className={s.field}>
            <span className="label">When are you hoping to record?</span>
            <input
              value={f.timing ?? ""}
              placeholder="A specific month, “no rush,” or “TBD”"
              onChange={(e) => set("timing", e.target.value)}
            />
          </label>
          <label className={`${s.field} ${s.full}`}>
            <span className="label">Tell me about the project</span>
            <textarea
              rows={4}
              value={f.message ?? ""}
              placeholder="Influences, where you’re at as a band, what you’re trying to make."
              onChange={(e) => set("message", e.target.value)}
            />
          </label>
          <div className={s.actions}>
            <button type="submit" className={s.send}>Send</button>
            <button type="button" className={s.cancel} onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
