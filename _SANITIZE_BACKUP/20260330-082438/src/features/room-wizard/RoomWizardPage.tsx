import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import GlowGuide from "@/ui2/page/GlowGuide";

type RoomType =
  | "Meeting Room"
  | "Boardroom"
  | "Classroom"
  | "Huddle Space"
  | "Training Space"
  | "Control Room";

export default function RoomWizardPage() {
  const navigate = useNavigate();

  const [roomType, setRoomType] = useState<RoomType>("Meeting Room");
  const [displayCount, setDisplayCount] = useState("2");
  const [sourceCount, setSourceCount] = useState("3");
  const [distance, setDistance] = useState("15");
  const [usbNeeds, setUsbNeeds] = useState("Yes");
  const [notes, setNotes] = useState("");

  const recommendation = useMemo(() => {
    const displays = Number(displayCount) || 0;
    const sources = Number(sourceCount) || 0;
    const dist = Number(distance) || 0;

    const architecture =
      displays >= 4
        ? "Consider AV over IP or a scalable matrix-led architecture."
        : sources > 2
          ? "A compact matrix or presentation switcher workflow is likely suitable."
          : "A direct presentation / switching workflow may be enough.";

    const transport =
      dist > 30
        ? "Distance suggests HDBaseT or AV over IP should be considered."
        : "Standard room-distance transport may be acceptable depending on signal spec.";

    const usb =
      usbNeeds === "Yes"
        ? "Include USB extension or room USB host/device planning."
        : "USB transport does not appear to be a key constraint.";

    return { architecture, transport, usb };
  }, [displayCount, sourceCount, distance, usbNeeds]);

  return (
    <div className="wm-fit-page wmu-adopt">
      <section className="wm-surface-card wm-fit-page__hero" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 16 }}>
        <div>
          <div className="wm-page-kicker">Room Wizard</div>
          <div className="wm-page-title">Define the room before choosing products</div>
          <div className="wm-page-copy">
            Keep the first pass concise. Capture only the room signals, distances, display counts, and
            USB needs required to guide the next design step.
          </div>
        </div>

        <GlowGuide
          title="Current priority"
          activeIndex={0}
          steps={[
            { title: "Shape the room", copy: "Capture room type, sources, displays, and distance first." },
            { title: "Check transport fit", copy: "Use room information to decide likely transport direction." },
            { title: "Move to products", copy: "Only then open catalogue or proposal." },
          ]}
          note="Room Wizard should establish the application shape before product selection begins."
        />
      </section>

      <section className="wm-fit-page__body wm-grid-2">
        <aside className="wm-surface-card" style={{ padding: 16, display: "grid", gap: 14, alignSelf: "start" }}>
          <div>
            <div className="wm-section-title">Room type</div>
            <div className="wm-section-copy">Set the application context first.</div>
          </div>

          <select className="wm-select-dark" value={roomType} onChange={(event) => setRoomType(event.target.value as RoomType)}>
            <option>Meeting Room</option>
            <option>Boardroom</option>
            <option>Classroom</option>
            <option>Huddle Space</option>
            <option>Training Space</option>
            <option>Control Room</option>
          </select>
        </aside>

        <section className="wm-surface-card" style={{ padding: 16, display: "grid", gap: 14, minHeight: 0 }}>
          <div className="wm-toolbar-row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="wm-section-title">Room definition</div>
              <div className="wm-section-copy">Compact room capture designed to stay inside the workspace.</div>
            </div>

            <div className="wm-toolbar-row">
              <button type="button" className="wm-btn-secondary" onClick={() => navigate(WM_ROUTES.catalog)}>
                Open catalogue
              </button>
              <button type="button" className="wm-btn-primary" onClick={() => navigate(WM_ROUTES.proposal)}>
                Continue to proposal
              </button>
            </div>
          </div>

          <div className="wm-fit-page__scroll" style={{ display: "grid", gap: 14 }}>
            <div className="wm-grid-3">
              <div className="wm-surface-card--soft" style={{ padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>Display count</div>
                <input className="wm-input-dark" type="number" value={displayCount} onChange={(event) => setDisplayCount(event.target.value)} />
              </div>

              <div className="wm-surface-card--soft" style={{ padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>Source count</div>
                <input className="wm-input-dark" type="number" value={sourceCount} onChange={(event) => setSourceCount(event.target.value)} />
              </div>

              <div className="wm-surface-card--soft" style={{ padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>Longest distance (m)</div>
                <input className="wm-input-dark" type="number" value={distance} onChange={(event) => setDistance(event.target.value)} />
              </div>
            </div>

            <div className="wm-grid-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <div className="wm-surface-card--soft" style={{ padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>USB requirement</div>
                <select className="wm-select-dark" value={usbNeeds} onChange={(event) => setUsbNeeds(event.target.value)}>
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </div>

              <div className="wm-surface-card--soft" style={{ padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>Application notes</div>
                <textarea className="wm-textarea-dark" placeholder="Brief room notes, collaboration needs, control requirements, or audio observations." value={notes} onChange={(event) => setNotes(event.target.value)} />
              </div>
            </div>

            <div className="wm-grid-3">
              {[
                ["Architecture direction", recommendation.architecture],
                ["Transport guidance", recommendation.transport],
                ["USB guidance", recommendation.usb],
              ].map(([title, copy]) => (
                <article key={title} className="wm-product-card">
                  <div className="wm-product-card__title">{title}</div>
                  <div className="wm-product-card__copy" style={{ marginBottom: 0 }}>{copy}</div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}