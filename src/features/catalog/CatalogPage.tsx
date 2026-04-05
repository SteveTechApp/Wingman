import * as React from "react";
import { ArrowRight, CheckCircle2, Search, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { getCatalogProducts } from "@/catalog/repository";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  getActiveProject,
  subscribeProjects,
  updateProject,
} from "@/features/projects/projectStore";
import {
  ROOM_TEMPLATE_CATEGORY_ORDER,
  ROOM_TEMPLATE_LIBRARY,
  type RoomTemplateCategory,
} from "@/features/templates/roomTemplateLibrary";
import {
  DEFAULT_CATALOG_ROOM_ID,
  derivePreferredTrackId,
  deriveRecommendedFamilies,
  findBestCatalogRoomForProject,
  findCatalogRoomById,
  listCatalogTracks,
  recommendCatalogProducts,
  summarizeCatalogProductIo,
  type CatalogSolutionTrack,
  type CatalogSolutionTrackId,
} from "./catalogExperience";
import "./catalog-page.css";

type RoomCategoryFilter = "All Rooms" | RoomTemplateCategory;

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function dedupe(values: unknown[], limit = 10): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const text = tidy(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }

  return out;
}

function formatCount(value?: string | number | null, suffix?: string): string {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "Not set";
  return suffix ? `${numeric}${suffix}` : String(numeric);
}

function formatDateTime(value?: string | null): string {
  if (!value) return "Not captured";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function roomSearchBlob(template: typeof ROOM_TEMPLATE_LIBRARY[number]): string {
  return [
    template.category,
    template.vertical,
    template.roomType,
    template.summary,
    template.story,
    ...template.useCases,
    ...template.sourceTypes,
    ...template.outputTypes,
    ...template.recommendedFamilies,
  ]
    .join(" ")
    .toLowerCase();
}

function routeLabel(route: string): string {
  if (route === WM_ROUTES.videoWall) return "Open Video Wall";
  if (route === WM_ROUTES.bom) return "Open BOM";
  if (route === WM_ROUTES.compare) return "Open Compare";
  if (route === WM_ROUTES.architecture) return "Open Architecture";
  if (route === WM_ROUTES.roomWizard) return "Open Room Wizard";
  return "Open next tool";
}

function RoomCard({
  active,
  room,
  onSelect,
}: {
  active: boolean;
  room: typeof ROOM_TEMPLATE_LIBRARY[number];
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={`wm-catalog-page__room-card${active ? " is-active" : ""}`}
      onClick={() => onSelect(room.id)}
    >
      <span className="wm-catalog-page__room-card-meta">
        {room.category} | {room.vertical}
      </span>
      <strong>{room.roomType}</strong>
      <span>{room.summary}</span>
      <div className="wm-catalog-page__room-card-stats">
        <span>{room.ioProfile.sourceCount} sources</span>
        <span>{room.ioProfile.displayCount} displays</span>
      </div>
      <div className="wm-catalog-page__chip-row">
        {room.recommendedFamilies.map((family) => (
          <span key={`${room.id}-${family}`} className="wm-catalog-page__chip">
            {family}
          </span>
        ))}
      </div>
    </button>
  );
}

function TrackCard({
  active,
  track,
  onSelect,
}: {
  active: boolean;
  track: CatalogSolutionTrack;
  onSelect: (id: CatalogSolutionTrackId) => void;
}) {
  return (
    <button
      type="button"
      className={`wm-catalog-page__track-card${active ? " is-active" : ""}`}
      onClick={() => onSelect(track.id)}
    >
      <span className="wm-catalog-page__track-card-meta">What are you solving?</span>
      <strong>{track.title}</strong>
      <span>{track.summary}</span>
      <div className="wm-catalog-page__chip-row">
        {track.families.map((family) => (
          <span key={`${track.id}-${family}`} className="wm-catalog-page__chip wm-catalog-page__chip--soft">
            {family}
          </span>
        ))}
      </div>
    </button>
  );
}

function MatchCard({
  active,
  alreadyAttached,
  match,
  onSelect,
}: {
  active: boolean;
  alreadyAttached: boolean;
  match: ReturnType<typeof recommendCatalogProducts>[number];
  onSelect: (sku: string) => void;
}) {
  return (
    <button
      type="button"
      className={`wm-catalog-page__match-card${active ? " is-active" : ""}`}
      onClick={() => onSelect(match.product.sku)}
    >
      <div className="wm-catalog-page__match-top">
        <div>
          <span className="wm-catalog-page__match-meta">
            {match.product.family || "WyreStorm"} | {match.product.sku}
          </span>
          <strong>{match.product.name || match.product.sku}</strong>
        </div>
        {alreadyAttached ? (
          <span className="wm-catalog-page__attached-badge">
            <CheckCircle2 size={14} />
            Added
          </span>
        ) : null}
      </div>

      <span className="wm-catalog-page__match-summary">
        {match.product.summary || "Product detail is still being expanded."}
      </span>

      <div className="wm-catalog-page__chip-row">
        {match.highlights.map((item) => (
          <span key={`${match.product.sku}-${item}`} className="wm-catalog-page__chip">
            {item}
          </span>
        ))}
      </div>

      <div className="wm-catalog-page__chip-row">
        {match.reasons.map((reason) => (
          <span key={`${match.product.sku}-${reason}`} className="wm-catalog-page__chip wm-catalog-page__chip--accent">
            {reason}
          </span>
        ))}
      </div>
    </button>
  );
}

export default function CatalogPage() {
  const activeProject = React.useSyncExternalStore(subscribeProjects, getActiveProject, () => undefined);
  const products = React.useMemo(() => getCatalogProducts(), []);
  const inferredRoom = React.useMemo(
    () => findBestCatalogRoomForProject(activeProject) ?? findCatalogRoomById(DEFAULT_CATALOG_ROOM_ID),
    [activeProject],
  );
  const [roomCategory, setRoomCategory] = React.useState<RoomCategoryFilter>("All Rooms");
  const [roomQuery, setRoomQuery] = React.useState("");
  const [productQuery, setProductQuery] = React.useState("");
  const deferredRoomQuery = React.useDeferredValue(roomQuery);
  const deferredProductQuery = React.useDeferredValue(productQuery);
  const [selectedRoomId, setSelectedRoomId] = React.useState(inferredRoom?.id ?? DEFAULT_CATALOG_ROOM_ID);
  const [selectedTrackId, setSelectedTrackId] = React.useState<CatalogSolutionTrackId>(
    derivePreferredTrackId(inferredRoom, activeProject),
  );
  const [selectedSku, setSelectedSku] = React.useState("");
  const [saveMessage, setSaveMessage] = React.useState("");

  React.useEffect(() => {
    if (!inferredRoom?.id) return;
    setSelectedRoomId(inferredRoom.id);
  }, [activeProject?.id, inferredRoom?.id]);

  const selectedRoom = React.useMemo(
    () => findCatalogRoomById(selectedRoomId) ?? inferredRoom ?? ROOM_TEMPLATE_LIBRARY[0],
    [inferredRoom, selectedRoomId],
  );

  React.useEffect(() => {
    setSelectedTrackId(derivePreferredTrackId(selectedRoom, activeProject));
  }, [activeProject?.id, selectedRoom?.id]);

  const roomMatches = React.useMemo(() => {
    const query = deferredRoomQuery.trim().toLowerCase();
    return ROOM_TEMPLATE_LIBRARY.filter((template) => {
      const matchesCategory = roomCategory === "All Rooms" || template.category === roomCategory;
      const matchesQuery = !query || roomSearchBlob(template).includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [deferredRoomQuery, roomCategory]);

  const visibleTracks = React.useMemo(
    () => listCatalogTracks(selectedRoom, activeProject),
    [activeProject, selectedRoom],
  );
  const selectedTrack = visibleTracks.find((track) => track.id === selectedTrackId) ?? visibleTracks[0];
  const recommendedFamilies = React.useMemo(
    () => deriveRecommendedFamilies(activeProject, selectedRoom),
    [activeProject, selectedRoom],
  );
  const matches = React.useMemo(() => recommendCatalogProducts({
    products,
    room: selectedRoom,
    track: selectedTrack,
    project: activeProject,
    query: deferredProductQuery,
  }), [activeProject, deferredProductQuery, products, selectedRoom, selectedTrack]);
  const topMatches = matches.slice(0, 3);
  const deeperMatches = matches.slice(0, 12);

  React.useEffect(() => {
    const preferredProjectSku = activeProject?.catalog?.skus?.find((sku) => (
      matches.some((match) => match.product.sku === sku)
    ));
    const fallbackSku = preferredProjectSku || matches[0]?.product.sku || "";

    if (!fallbackSku) {
      setSelectedSku("");
      return;
    }

    if (!matches.some((match) => match.product.sku === selectedSku)) {
      setSelectedSku(fallbackSku);
    }
  }, [activeProject?.catalog?.skus, matches, selectedSku]);

  React.useEffect(() => {
    setSaveMessage("");
  }, [selectedSku, activeProject?.id]);

  const selectedMatch = matches.find((match) => match.product.sku === selectedSku) ?? matches[0];
  const selectedProduct = selectedMatch?.product;
  const selectedAlreadyAttached = Boolean(
    activeProject &&
    selectedProduct &&
    (activeProject.catalog?.skus ?? []).some((sku) => sku.toUpperCase() === selectedProduct.sku.toUpperCase()),
  );
  const projectStatusNote = activeProject
    ? `${activeProject.name || "Current project"} • ${formatCount(activeProject.discovery?.sourceCount)} inputs • ${formatCount(activeProject.discovery?.displayCount)} outputs`
    : "No active project yet. You can still build a shortlist and save it once the project exists.";

  function handleAttachSelectedProduct() {
    if (!activeProject || !selectedProduct || !selectedTrack) return;

    const existingSkus = (activeProject.catalog?.skus ?? []).map((sku) => sku.toUpperCase());
    const sku = selectedProduct.sku.toUpperCase();
    const nextSkus = existingSkus.includes(sku) ? existingSkus : [...existingSkus, sku];
    const existingBomItems = activeProject.catalog?.bomItems ?? [];
    const hasBomItem = existingBomItems.some((item) => item.sku.toUpperCase() === sku);
    const nextBomItems = hasBomItem
      ? existingBomItems
      : [
          ...existingBomItems,
          {
            sku,
            quantity: 1,
            role: selectedTrack.title,
            description: selectedProduct.summary || selectedProduct.name || sku,
          },
        ];

    updateProject(activeProject.id, {
      stage: activeProject.stage || "Design",
      catalog: {
        ...(activeProject.catalog ?? {}),
        selectedBrand: "WyreStorm",
        skus: nextSkus,
        bomItems: nextBomItems,
      },
    });

    setSaveMessage(
      selectedAlreadyAttached
        ? `${sku} is already on ${activeProject.name || "the current project"}.`
        : `${sku} added to ${activeProject.name || "the current project"}.`,
    );
  }

  return (
    <div className="wm-catalog-page">
      <section className="wm-catalog-page__hero">
        <div className="wm-catalog-page__hero-copy">
          <div className="wm-catalog-page__eyebrow">Catalog</div>
          <h1>Choose the room, pick the job to solve, and review the strongest WyreStorm fits.</h1>
          <p>
            Product selection stays grounded in room intent and AV workflow instead of a raw SKU list.
          </p>

          <div className="wm-catalog-page__hero-actions">
            <Link to={WM_ROUTES.templates} className="wm-btn-primary">
              Choose Room Type
              <ArrowRight size={16} />
            </Link>
            <Link to={WM_ROUTES.guru} className="wm-btn-secondary">
              Ask Guru
            </Link>
          </div>

          <p className="wm-catalog-page__hero-note">{projectStatusNote}</p>
        </div>

        <div className="wm-catalog-page__hero-metrics">
          <div className="wm-catalog-page__metric">
            <span>Rooms</span>
            <strong>{ROOM_TEMPLATE_LIBRARY.length}</strong>
          </div>
          <div className="wm-catalog-page__metric">
            <span>SKUs</span>
            <strong>{products.length}</strong>
          </div>
          <div className="wm-catalog-page__metric">
            <span>Families</span>
            <strong>{recommendedFamilies.length || 1}</strong>
          </div>
          <div className="wm-catalog-page__metric">
            <span>Matches</span>
            <strong>{matches.length}</strong>
          </div>
        </div>
      </section>

      <div className="wm-catalog-page__layout">
        <aside className="wm-catalog-page__sidebar">
          <section className="wm-catalog-page__panel">
            <div className="wm-catalog-page__section-head">
              <div>
                <div className="wm-catalog-page__section-eyebrow">Step 1</div>
                <h2>Choose room type</h2>
              </div>
            </div>

            <div className="wm-catalog-page__chip-row">
              {ROOM_TEMPLATE_CATEGORY_ORDER.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`wm-catalog-page__filter-chip${roomCategory === category ? " is-active" : ""}`}
                  onClick={() => setRoomCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <label className="wm-catalog-page__search">
              <Search size={16} />
              <input
                type="search"
                value={roomQuery}
                onChange={(event) => setRoomQuery(event.target.value)}
                placeholder="Search room type or venue"
              />
            </label>

            <div className="wm-catalog-page__room-list">
              {roomMatches.map((room) => (
                <RoomCard
                  key={room.id}
                  active={room.id === selectedRoom.id}
                  room={room}
                  onSelect={setSelectedRoomId}
                />
              ))}
            </div>
          </section>
        </aside>

        <main className="wm-catalog-page__main">
          <section className="wm-catalog-page__panel wm-catalog-page__panel--feature">
            <div className="wm-catalog-page__feature-top">
              <div>
                <div className="wm-catalog-page__section-eyebrow">Selected room</div>
                <h2>{selectedRoom.roomType}</h2>
                <p>{selectedRoom.summary}</p>
              </div>

              <Link to={selectedRoom.recommendedTool} className="wm-btn-secondary">
                {routeLabel(selectedRoom.recommendedTool)}
              </Link>
            </div>

            <div className="wm-catalog-page__assumption-grid">
              <div className="wm-catalog-page__assumption-card">
                <span>Inputs</span>
                <strong>{selectedRoom.ioProfile.sources}</strong>
              </div>
              <div className="wm-catalog-page__assumption-card">
                <span>Outputs</span>
                <strong>{selectedRoom.ioProfile.outputs}</strong>
              </div>
              <div className="wm-catalog-page__assumption-card">
                <span>Transport</span>
                <strong>{selectedRoom.transportProfile}</strong>
              </div>
              <div className="wm-catalog-page__assumption-card">
                <span>Operators</span>
                <strong>{selectedRoom.ioProfile.operators}</strong>
              </div>
            </div>

            <div className="wm-catalog-page__chip-row">
              {dedupe([
                ...recommendedFamilies,
                ...selectedRoom.useCases,
              ], 10).map((item) => (
                <span key={`room-guidance-${item}`} className="wm-catalog-page__chip wm-catalog-page__chip--accent">
                  {item}
                </span>
              ))}
            </div>
          </section>

          <section className="wm-catalog-page__panel">
            <div className="wm-catalog-page__section-head">
              <div>
                <div className="wm-catalog-page__section-eyebrow">Step 2</div>
                <h2>Choose what you are solving</h2>
                <p>
                  These tracks keep the shortlist grounded in the actual room workflow.
                </p>
              </div>
            </div>

            <div className="wm-catalog-page__track-grid">
              {visibleTracks.map((track) => (
                <TrackCard
                  key={track.id}
                  active={track.id === selectedTrack?.id}
                  track={track}
                  onSelect={setSelectedTrackId}
                />
              ))}
            </div>

            {selectedTrack ? (
              <div className="wm-catalog-page__next-step">
                <Sparkles size={16} />
                <span>{selectedTrack.detail}</span>
              </div>
            ) : null}
          </section>

          <section className="wm-catalog-page__panel">
            <div className="wm-catalog-page__section-head">
              <div>
                <div className="wm-catalog-page__section-eyebrow">Step 3</div>
                <h2>Review recommended WyreStorm products</h2>
                <p>
                  Refine the shortlist if needed, then save the strongest fit.
                </p>
              </div>
            </div>

            <label className="wm-catalog-page__search">
              <Search size={16} />
              <input
                type="search"
                value={productQuery}
                onChange={(event) => setProductQuery(event.target.value)}
                placeholder="Refine by SKU, feature, or product name"
              />
            </label>

            {topMatches.length > 0 ? (
              <div className="wm-catalog-page__top-grid">
                {topMatches.map((match) => (
                  <MatchCard
                    key={match.product.sku}
                    active={match.product.sku === selectedProduct?.sku}
                    alreadyAttached={Boolean(
                      activeProject?.catalog?.skus?.some((sku) => sku.toUpperCase() === match.product.sku.toUpperCase()),
                    )}
                    match={match}
                    onSelect={setSelectedSku}
                  />
                ))}
              </div>
            ) : (
              <div className="wm-catalog-page__empty">
                <h3>No strong matches yet</h3>
                <p>Try a different room type, a different problem track, or a broader search.</p>
              </div>
            )}

            {deeperMatches.length > 0 ? (
              <div className="wm-catalog-page__deep-list">
                {deeperMatches.map((match) => (
                  <MatchCard
                    key={`deep-${match.product.sku}`}
                    active={match.product.sku === selectedProduct?.sku}
                    alreadyAttached={Boolean(
                      activeProject?.catalog?.skus?.some((sku) => sku.toUpperCase() === match.product.sku.toUpperCase()),
                    )}
                    match={match}
                    onSelect={setSelectedSku}
                  />
                ))}
              </div>
            ) : null}
          </section>
        </main>

        <aside className="wm-catalog-page__detail-rail">
          <section className="wm-catalog-page__panel wm-catalog-page__detail-panel">
            <div className="wm-catalog-page__section-head">
              <div>
                <div className="wm-catalog-page__section-eyebrow">Selected product</div>
                <h2>{selectedProduct?.name || "Choose a recommendation"}</h2>
              </div>
            </div>

            {selectedProduct && selectedMatch ? (
              <>
                <div className="wm-catalog-page__detail-meta">
                  <span>{selectedProduct.family || "WyreStorm"}</span>
                  <span>{selectedProduct.sku}</span>
                  <span>{selectedProduct.status}</span>
                </div>

                <p className="wm-catalog-page__detail-summary">
                  {selectedProduct.summary || "Structured product summary is still being expanded."}
                </p>

                <div className="wm-catalog-page__detail-block">
                  <span>Why it fits</span>
                  <div className="wm-catalog-page__chip-row">
                    {selectedMatch.reasons.map((reason) => (
                      <span key={`detail-${reason}`} className="wm-catalog-page__chip wm-catalog-page__chip--accent">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="wm-catalog-page__detail-block">
                  <span>Highlights</span>
                  <div className="wm-catalog-page__chip-row">
                    {selectedMatch.highlights.map((item) => (
                      <span key={`highlight-${item}`} className="wm-catalog-page__chip">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="wm-catalog-page__detail-grid">
                  <div className="wm-catalog-page__detail-card">
                    <span>I/O summary</span>
                    <strong>{summarizeCatalogProductIo(selectedProduct)}</strong>
                  </div>
                  <div className="wm-catalog-page__detail-card">
                    <span>Transport</span>
                    <strong>{selectedProduct.transport || "Not captured"}</strong>
                  </div>
                  <div className="wm-catalog-page__detail-card">
                    <span>Video</span>
                    <strong>{selectedProduct.video?.maxResolution || "Not captured"}</strong>
                  </div>
                  <div className="wm-catalog-page__detail-card">
                    <span>Best next tool</span>
                    <strong>{routeLabel(selectedTrack?.nextRoute || WM_ROUTES.compare)}</strong>
                  </div>
                </div>

                <div className="wm-catalog-page__detail-actions">
                  {activeProject ? (
                    <button
                      type="button"
                      className="wm-btn-primary"
                      onClick={handleAttachSelectedProduct}
                    >
                      {selectedAlreadyAttached ? "Already on current project" : "Add to current project"}
                    </button>
                  ) : (
                    <Link to={WM_ROUTES.projectLauncher} className="wm-btn-primary">
                      Start project to save shortlist
                    </Link>
                  )}

                  <Link to={WM_ROUTES.compare} className="wm-btn-secondary">
                    Open Compare
                  </Link>
                  <Link to={selectedTrack?.nextRoute || WM_ROUTES.bom} className="wm-btn-secondary">
                    {routeLabel(selectedTrack?.nextRoute || WM_ROUTES.bom)}
                  </Link>
                  <a
                    href={selectedProduct.sourceUrl || "https://www.wyrestorm.com/"}
                    target="_blank"
                    rel="noreferrer"
                    className="wm-btn-secondary"
                  >
                    Manufacturer page
                  </a>
                </div>

                {saveMessage ? (
                  <div className="wm-catalog-page__save-note">{saveMessage}</div>
                ) : null}
              </>
            ) : (
              <div className="wm-catalog-page__empty">
                <h3>No product selected</h3>
                <p>Choose one of the recommended products to see the detail and save actions here.</p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
