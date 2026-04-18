import * as React from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Compass,
  MessageSquareText,
  Search,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getCatalogProducts } from "@/catalog/repository";
import type { CatalogProduct } from "@/catalog/types";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  getActiveProject,
  subscribeProjects,
  type StoredProject,
} from "@/features/projects/projectStore";
import {
  buildProductPositioningGuide,
  findSalesMotion,
  labelSalesRoute,
  recommendSalesConversationCards,
  recommendSalesPitchModules,
  SALES_MOTIONS,
  type SalesMotion,
} from "@/features/sales/salesPositioningContent";
import {
  ROOM_TEMPLATE_CATEGORY_ORDER,
  ROOM_TEMPLATE_LIBRARY,
  type RoomTemplateCategory,
  type RoomTemplateScenario,
} from "@/features/templates/roomTemplateLibrary";
import {
  deriveRoomTemplateFamilies,
  findBestRoomTemplateForProject,
  findRoomTemplateById,
  DEFAULT_ROOM_TEMPLATE_ID,
} from "@/features/templates/roomWorkflowContext";
import "./sales-positioning-page.css";

type RoomCategoryFilter = "All Rooms" | RoomTemplateCategory;

const FAMILY_ALIASES: Record<string, string[]> = {
  apollo: ["apollo", "presentation", "conference", "wireless", "byod", "byom"],
  hdbaset: ["hdbaset", "extender", "transmitter", "receiver"],
  matrix: ["matrix", "switcher", "seamless"],
  avoip: ["avoip", "networkhd", "encoder", "decoder"],
  networkhd: ["avoip", "networkhd", "encoder", "decoder"],
  "switching and control": ["switcher", "matrix", "switching", "control"],
  "presentation and uc": ["apollo", "presentation", "conference", "usb-c", "wireless"],
  "usb extension": ["usb", "kvm", "camera", "host", "peripheral"],
  "video wall": ["video wall", "videowall", "processor", "multiview", "wall"],
};

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

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function roomSearchBlob(room: RoomTemplateScenario): string {
  return [
    room.category,
    room.vertical,
    room.roomType,
    room.summary,
    room.story,
    ...room.useCases,
    ...room.recommendedFamilies,
  ]
    .join(" ")
    .toLowerCase();
}

function buildProjectBlob(project?: StoredProject | null): string {
  if (!project) return "";

  return [
    project.name,
    project.customer,
    project.site,
    project.roomName,
    project.notes,
    project.discovery?.workflowTrack,
    project.discovery?.customerOutcome,
    project.discovery?.featureRequirements,
    project.template?.summary,
    project.proposal?.notes,
  ]
    .map((item) => tidy(item).toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function buildProductBlob(product: CatalogProduct): string {
  return [
    product.sku,
    product.name,
    product.family,
    product.category,
    product.subcategory,
    product.summary,
    product.transport,
    product.topology,
    ...(product.features || []),
    ...(product.normalizedTags || []),
  ]
    .map((item) => tidy(item).toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function productMatchesFamily(product: CatalogProduct, family: string): boolean {
  const blob = buildProductBlob(product);
  const aliases = FAMILY_ALIASES[normalizeKey(family)] || [family.toLowerCase()];
  return aliases.some((alias) => blob.includes(alias));
}

function recommendMotion(room: RoomTemplateScenario, project?: StoredProject | null): SalesMotion {
  const projectBlob = buildProjectBlob(project);
  const roomBlob = roomSearchBlob(room);

  if (/refresh|replace|legacy|upgrade|swap/.test(projectBlob)) {
    return findSalesMotion("competitive-refresh") ?? SALES_MOTIONS[0];
  }

  if (
    room.ioProfile.displayCount >= 4 ||
    /sports bar|venue|command|control|lecture theatre|sanctuary|divisible/.test(roomBlob)
  ) {
    return findSalesMotion("rollout") ?? SALES_MOTIONS[0];
  }

  if (/proposal|design|specify|review/.test(projectBlob)) {
    return findSalesMotion("reassurance") ?? SALES_MOTIONS[0];
  }

  return findSalesMotion("room-fit") ?? SALES_MOTIONS[0];
}

function recommendSalesProducts(input: {
  products: CatalogProduct[];
  room: RoomTemplateScenario;
  motion: SalesMotion;
  pitchFamilies: string[];
  project?: StoredProject | null;
}): CatalogProduct[] {
  const roomFamilies = new Set(
    dedupe([
      ...input.room.recommendedFamilies,
      ...input.motion.focusFamilies,
      ...input.pitchFamilies,
      ...deriveRoomTemplateFamilies(input.project, input.room),
    ]).map(normalizeKey),
  );

  return [...input.products]
    .map((product) => {
      let score = 0;

      for (const family of roomFamilies) {
        if (productMatchesFamily(product, family)) {
          score += 18;
        }
      }

      if (input.motion.preferredPitchIds.some((id) => productMatchesFamily(product, id))) {
        score += 8;
      }

      if (input.motion.focusFamilies.some((family) => productMatchesFamily(product, family))) {
        score += 10;
      }

      if (product.summary && roomSearchBlob(input.room).includes("meeting") && /wireless|conference|usb/.test(buildProductBlob(product))) {
        score += 6;
      }

      if (roomSearchBlob(input.room).includes("sports bar") && /networkhd|decoder|encoder|matrix/.test(buildProductBlob(product))) {
        score += 6;
      }

      return { product, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.product.sku.localeCompare(right.product.sku))
    .slice(0, 6)
    .map((item) => item.product);
}

function RoomCard(props: {
  active: boolean;
  room: RoomTemplateScenario;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={`wm-sales-room-card${props.active ? " is-active" : ""}`}
      onClick={() => props.onSelect(props.room.id)}
    >
      <span className="wm-sales-room-card__meta">
        {props.room.category} | {props.room.vertical}
      </span>
      <strong>{props.room.roomType}</strong>
      <span>{props.room.summary}</span>
      <div className="wm-sales-chip-row">
        <span className="wm-workspace-tag">{props.room.ioProfile.sourceCount} sources</span>
        <span className="wm-workspace-tag">{props.room.ioProfile.displayCount} displays</span>
      </div>
    </button>
  );
}

function MotionCard(props: {
  active: boolean;
  motion: SalesMotion;
  onSelect: (id: SalesMotion["id"]) => void;
}) {
  return (
    <button
      type="button"
      className={`wm-sales-motion-card${props.active ? " is-active" : ""}`}
      onClick={() => props.onSelect(props.motion.id)}
    >
      <span className="wm-sales-motion-card__meta">Sales motion</span>
      <strong>{props.motion.title}</strong>
      <span>{props.motion.summary}</span>
    </button>
  );
}

function PitchCard(props: {
  active: boolean;
  pitch: ReturnType<typeof recommendSalesPitchModules>[number];
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={`wm-sales-pitch-card${props.active ? " is-active" : ""}`}
      onClick={() => props.onSelect(props.pitch.id)}
    >
      <span className="wm-sales-motion-card__meta">{props.pitch.eyebrow}</span>
      <strong>{props.pitch.title}</strong>
      <span>{props.pitch.elevatorPitch}</span>
    </button>
  );
}

function ProductCard(props: {
  active: boolean;
  product: CatalogProduct;
  onSelect: (sku: string) => void;
}) {
  return (
    <button
      type="button"
      className={`wm-sales-product-card${props.active ? " is-active" : ""}`}
      onClick={() => props.onSelect(props.product.sku)}
    >
      <span className="wm-sales-room-card__meta">
        {props.product.family || "WyreStorm"} | {props.product.sku}
      </span>
      <strong>{props.product.name || props.product.sku}</strong>
      <span>{props.product.summary || "Product detail is still being expanded."}</span>
    </button>
  );
}

export default function SalesPositioningPage() {
  const activeProject = React.useSyncExternalStore(
    subscribeProjects,
    getActiveProject,
    () => undefined,
  );
  const products = React.useMemo(() => getCatalogProducts(), []);
  const inferredRoom = React.useMemo(
    () => findBestRoomTemplateForProject(activeProject) ?? findRoomTemplateById(DEFAULT_ROOM_TEMPLATE_ID),
    [activeProject],
  );

  const [roomCategory, setRoomCategory] = React.useState<RoomCategoryFilter>("All Rooms");
  const [roomQuery, setRoomQuery] = React.useState("");
  const deferredRoomQuery = React.useDeferredValue(roomQuery);
  const [selectedRoomId, setSelectedRoomId] = React.useState(inferredRoom?.id ?? DEFAULT_ROOM_TEMPLATE_ID);

  React.useEffect(() => {
    if (!inferredRoom?.id) return;
    setSelectedRoomId(inferredRoom.id);
  }, [activeProject?.id, inferredRoom?.id]);

  const selectedRoom = React.useMemo(
    () => findRoomTemplateById(selectedRoomId) ?? inferredRoom ?? ROOM_TEMPLATE_LIBRARY[0],
    [inferredRoom, selectedRoomId],
  );

  const recommendedMotion = React.useMemo(
    () => recommendMotion(selectedRoom, activeProject),
    [activeProject, selectedRoom],
  );
  const [selectedMotionId, setSelectedMotionId] = React.useState<SalesMotion["id"]>(recommendedMotion.id);

  React.useEffect(() => {
    setSelectedMotionId(recommendedMotion.id);
  }, [recommendedMotion.id, selectedRoom.id]);

  const selectedMotion = React.useMemo(
    () => findSalesMotion(selectedMotionId) ?? recommendedMotion,
    [recommendedMotion, selectedMotionId],
  );

  const roomMatches = React.useMemo(() => {
    const query = deferredRoomQuery.trim().toLowerCase();

    return ROOM_TEMPLATE_LIBRARY.filter((room) => {
      const matchesCategory = roomCategory === "All Rooms" || room.category === roomCategory;
      const matchesQuery = !query || roomSearchBlob(room).includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [deferredRoomQuery, roomCategory]);

  const pitchModules = React.useMemo(
    () =>
      recommendSalesPitchModules({
        room: selectedRoom,
        motion: selectedMotion,
        project: activeProject,
        limit: 4,
      }),
    [activeProject, selectedMotion, selectedRoom],
  );
  const [selectedPitchId, setSelectedPitchId] = React.useState(pitchModules[0]?.id ?? "");

  React.useEffect(() => {
    if (!pitchModules.length) return;
    if (pitchModules.some((pitch) => pitch.id === selectedPitchId)) return;
    setSelectedPitchId(pitchModules[0].id);
  }, [pitchModules, selectedPitchId]);

  const selectedPitch = pitchModules.find((pitch) => pitch.id === selectedPitchId) ?? pitchModules[0] ?? null;
  const conversationCards = React.useMemo(
    () =>
      recommendSalesConversationCards({
        room: selectedRoom,
        motion: selectedMotion,
        project: activeProject,
        limit: 3,
      }),
    [activeProject, selectedMotion, selectedRoom],
  );

  const productShortlist = React.useMemo(
    () =>
      recommendSalesProducts({
        products,
        room: selectedRoom,
        motion: selectedMotion,
        pitchFamilies: selectedPitch?.relatedFamilies ?? [],
        project: activeProject,
      }),
    [activeProject, products, selectedMotion, selectedPitch?.relatedFamilies, selectedRoom],
  );
  const [selectedSku, setSelectedSku] = React.useState(productShortlist[0]?.sku ?? "");

  React.useEffect(() => {
    if (!productShortlist.length) return;
    if (productShortlist.some((product) => product.sku === selectedSku)) return;
    setSelectedSku(productShortlist[0].sku);
  }, [productShortlist, selectedSku]);

  const selectedProduct = productShortlist.find((product) => product.sku === selectedSku) ?? productShortlist[0] ?? null;
  const productGuide = React.useMemo(
    () => (selectedProduct ? buildProductPositioningGuide(selectedProduct) : null),
    [selectedProduct],
  );
  const roomFamilies = React.useMemo(
    () => deriveRoomTemplateFamilies(activeProject, selectedRoom),
    [activeProject, selectedRoom],
  );

  return (
    <div className="wm-page-shell wm-sales-page">
      <section className="wm-page-header wm-page-header--split">
        <div className="wm-page-stack">
          <div className="wm-page-kicker">Sales Positioning</div>
          <h1 className="wm-page-title">Choose the room type, then shape the sales story around it.</h1>
          <p className="wm-page-subtitle">
            Start with the room first, choose the sales motion second, then narrow into
            the best WyreStorm angle and shortlist without dropping back into a raw SKU-first flow.
          </p>
        </div>

        <div className="wm-page-actions">
          <Link to={WM_ROUTES.catalog} className="wm-btn-secondary">
            Open Catalog
          </Link>
          <Link to={WM_ROUTES.guru} className="wm-btn-secondary">
            Ask Guru
          </Link>
          <Link to={WM_ROUTES.proposal} className="wm-btn-primary">
            Open Proposal
          </Link>
        </div>
      </section>

      <section className="wm-sales-hero">
        <div className="wm-sales-hero__copy">
          <div className="wm-page-kicker">
            <Compass size={14} />
            <span>Current room fit</span>
          </div>
          <h2>{selectedRoom.roomType}</h2>
          <p>{selectedRoom.story}</p>

          <div className="wm-sales-chip-row">
            {roomFamilies.map((family) => (
              <span key={family} className="wm-workspace-tag">
                {family}
              </span>
            ))}
          </div>
        </div>

        <aside className="wm-sales-hero__project">
          <div className="wm-sales-hero__project-top">
            <div className="wm-page-kicker">
              <BriefcaseBusiness size={14} />
              <span>{activeProject ? "Current project attached" : "No active project"}</span>
            </div>
          </div>
          <strong>{activeProject?.name || "Sales story can still start from the room type."}</strong>
          <p>
            {activeProject
              ? [activeProject.customer || "Customer not set", activeProject.site || "Site not set"].join(" / ")
              : "Attach a project when you want the sales motion and product angle to reflect a live opportunity."}
          </p>
          <div className="wm-sales-chip-row">
            <span className="wm-workspace-tag">{selectedRoom.ioProfile.sourceCount} sources</span>
            <span className="wm-workspace-tag">{selectedRoom.ioProfile.displayCount} displays</span>
            <span className="wm-workspace-tag">{selectedMotion.title}</span>
          </div>
        </aside>
      </section>

      <section className="wm-page-grid wm-page-grid--3">
        <section className="wm-section">
          <div className="wm-section-header">
            <div>
              <div className="wm-page-kicker">Step 1</div>
              <h2 className="wm-section-title">Choose the room type</h2>
              <p className="wm-section-copy">
                Start from the room and application, not a product family.
              </p>
            </div>
          </div>

          <div className="wm-sales-filter-row">
            <div className="wm-sales-search">
              <Search size={16} />
              <input
                value={roomQuery}
                onChange={(event) => setRoomQuery(event.currentTarget.value)}
                placeholder="Search room types"
              />
            </div>

            <div className="wm-sales-chip-row">
              {ROOM_TEMPLATE_CATEGORY_ORDER.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`wm-sales-chip-filter${roomCategory === category ? " is-active" : ""}`}
                  onClick={() => setRoomCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="wm-sales-room-grid">
            {roomMatches.slice(0, 8).map((room) => (
              <RoomCard
                key={room.id}
                active={room.id === selectedRoom.id}
                room={room}
                onSelect={setSelectedRoomId}
              />
            ))}
          </div>
        </section>

        <section className="wm-section">
          <div className="wm-section-header">
            <div>
              <div className="wm-page-kicker">Step 2</div>
              <h2 className="wm-section-title">Choose the sales motion</h2>
              <p className="wm-section-copy">
                Decide how the conversation should move before you start naming products.
              </p>
            </div>
          </div>

          <div className="wm-sales-motion-grid">
            {SALES_MOTIONS.map((motion) => (
              <MotionCard
                key={motion.id}
                active={motion.id === selectedMotion.id}
                motion={motion}
                onSelect={setSelectedMotionId}
              />
            ))}
          </div>
        </section>

        <section className="wm-section">
          <div className="wm-section-header">
            <div>
              <div className="wm-page-kicker">Step 3</div>
              <h2 className="wm-section-title">Choose the product angle</h2>
              <p className="wm-section-copy">
                Pick the clearest WyreStorm story for this room and motion.
              </p>
            </div>
          </div>

          <div className="wm-sales-motion-grid">
            {pitchModules.map((pitch) => (
              <PitchCard
                key={pitch.id}
                active={pitch.id === selectedPitch?.id}
                pitch={pitch}
                onSelect={setSelectedPitchId}
              />
            ))}
          </div>
        </section>
      </section>

      <section className="wm-page-grid wm-page-grid--2">
        <section className="wm-section wm-sales-story-panel">
          <div className="wm-section-header">
            <div>
              <h2 className="wm-section-title">Room-based sales story</h2>
              <p className="wm-section-copy">
                Use the room, the motion, and the WyreStorm angle together so the pitch feels deliberate.
              </p>
            </div>
          </div>

          {selectedPitch ? (
            <div className="wm-sales-story">
              <div className="wm-sales-story__lead">
                <div className="wm-page-inline-list">
                  <span className="wm-workspace-tag">{selectedRoom.roomType}</span>
                  <span className="wm-workspace-tag">{selectedMotion.title}</span>
                  <span className="wm-workspace-tag">{selectedPitch.title}</span>
                </div>

                <h3>{selectedPitch.elevatorPitch}</h3>
                <p>{selectedMotion.detail}</p>
              </div>

              <div className="wm-sales-story__subpanel">
                <span className="wm-sales-subpanel__title">Lead with this</span>
                <div className="wm-sales-list">
                  {selectedPitch.leadWith.map((item) => (
                    <div key={item} className="wm-sales-list__item">
                      <CheckCircle2 size={15} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="wm-sales-story__subpanel">
                <span className="wm-sales-subpanel__title">Proof points</span>
                <div className="wm-sales-list">
                  {selectedPitch.proofPoints.map((item) => (
                    <div key={item} className="wm-sales-list__item">
                      <Sparkles size={15} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="wm-sales-story__subpanel">
                <span className="wm-sales-subpanel__title">Best next route</span>
                <Link to={selectedPitch.route} className="wm-sales-next-link">
                  {labelSalesRoute(selectedPitch.route)}
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="wm-empty-state">Choose a product angle to build the talk track.</div>
          )}
        </section>

        <section className="wm-section wm-sales-story-panel">
          <div className="wm-section-header">
            <div>
              <h2 className="wm-section-title">Conversation plays</h2>
              <p className="wm-section-copy">
                Use these plays to qualify the room and keep the customer conversation moving.
              </p>
            </div>
          </div>

          <div className="wm-sales-conversation-grid">
            {conversationCards.map((card) => (
              <article key={card.id} className="wm-sales-conversation-card">
                <div className="wm-sales-conversation-card__top">
                  <div>
                    <span className="wm-sales-motion-card__meta">{card.outcome}</span>
                    <h3>{card.title}</h3>
                  </div>
                </div>

                <p>{card.opener}</p>

                <div className="wm-sales-story__subpanel">
                  <span className="wm-sales-subpanel__title">Qualification questions</span>
                  <div className="wm-sales-list">
                    {card.qualificationQuestions.map((item) => (
                      <div key={item} className="wm-sales-list__item">
                        <MessageSquareText size={15} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="wm-sales-story__subpanel">
                  <span className="wm-sales-subpanel__title">WyreStorm angle</span>
                  <div className="wm-sales-list">
                    {card.wyrestormAngles.map((item) => (
                      <div key={item} className="wm-sales-list__item">
                        <CheckCircle2 size={15} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="wm-page-grid wm-page-grid--2">
        <section className="wm-section">
          <div className="wm-section-header">
            <div>
              <h2 className="wm-section-title">WyreStorm shortlist</h2>
              <p className="wm-section-copy">
                Product suggestions are now driven by room type, sales motion, and the chosen product angle.
              </p>
            </div>
          </div>

          {productShortlist.length > 0 ? (
            <div className="wm-sales-product-grid">
              {productShortlist.map((product) => (
                <ProductCard
                  key={product.sku}
                  active={product.sku === selectedProduct?.sku}
                  product={product}
                  onSelect={setSelectedSku}
                />
              ))}
            </div>
          ) : (
            <div className="wm-empty-state">
              The shortlist will appear once the room and product angle are specific enough.
            </div>
          )}
        </section>

        <section className="wm-section">
          <div className="wm-section-header">
            <div>
              <h2 className="wm-section-title">Selected product story</h2>
              <p className="wm-section-copy">
                Keep the room-level story and the product-level positioning connected.
              </p>
            </div>
          </div>

          {selectedProduct && productGuide ? (
            <div className="wm-sales-story">
              <div className="wm-sales-story__lead">
                <span className="wm-sales-motion-card__meta">
                  {selectedProduct.family || "WyreStorm"} | {selectedProduct.sku}
                </span>
                <h3>{productGuide.headline}</h3>
                <p>{productGuide.elevatorPitch}</p>
              </div>

              <div className="wm-sales-story__subpanel">
                <span className="wm-sales-subpanel__title">Positioning highlights</span>
                <div className="wm-sales-list">
                  {productGuide.positioningHighlights.map((item) => (
                    <div key={item} className="wm-sales-list__item">
                      <CheckCircle2 size={15} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="wm-sales-story__subpanel">
                <span className="wm-sales-subpanel__title">Discovery questions</span>
                <div className="wm-sales-list">
                  {productGuide.discoveryQuestions.map((item) => (
                    <div key={item} className="wm-sales-list__item">
                      <Search size={15} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="wm-sales-story__subpanel">
                <span className="wm-sales-subpanel__title">Range story</span>
                <p>{productGuide.rangeConnection}</p>
              </div>
            </div>
          ) : (
            <div className="wm-empty-state">Choose a product from the shortlist to see the positioning guide.</div>
          )}
        </section>
      </section>
    </div>
  );
}
