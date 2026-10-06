import { useEffect, useState } from "react";
import { canonicalManufacturerName, EQUIPMENT_LIBRARY_EVENT, EQUIPMENT_ROLES, isWyreStormManufacturer, readEquipmentLibrary, removeLibraryEquipment, saveLibraryEquipment, type LibraryEquipment } from "../lib/equipmentLibrary";
import { postWingmanJson } from "../api/wingmanApi";
import { manufacturerFromProductPage, productPageConnections, productPageSpecifications, productPageSummary, suggestEquipmentRole, suggestModelFromProductPage, type ProductPageDetails } from "../lib/productPageIntake";

type Props = { locations: Array<{ id: string; name: string }>; onSelect: (item: LibraryEquipment, locationId: string, quantity: number) => void };
const blank = (): Omit<LibraryEquipment, "id"> => ({ manufacturer: "", model: "", role: "Display", relationship: "complementary", description: "", connections: "", specifications: "", accessories: "", sourceUrl: "", checkedOn: "", notes: "", preferred: true });
export function EquipmentLibraryPanel({ locations, onSelect }: Props) {
  const [items, setItems] = useState(readEquipmentLibrary);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Omit<LibraryEquipment, "id"> & { id?: string }>(blank);
  const [editing, setEditing] = useState(false);
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [readingProductPage, setReadingProductPage] = useState(false);
  useEffect(() => {
    const refresh = () => setItems(readEquipmentLibrary());
    window.addEventListener(EQUIPMENT_LIBRARY_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener(EQUIPMENT_LIBRARY_EVENT, refresh); window.removeEventListener("storage", refresh); };
  }, []);
  const resolvedLocation = locations.some(location => location.id === locationId) ? locationId : locations[0]?.id || "";
  const filtered = items.filter(item => `${item.manufacturer} ${item.model} ${item.role} ${item.description} ${item.notes}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(b.preferred) - Number(a.preferred) || a.manufacturer.localeCompare(b.manufacturer));
  return <section className="wm-room-library" aria-label="Reusable equipment library">
    <div className="wm-room-wizard-heading"><div><h3>Your equipment library</h3><p>Reuse familiar products. Recorded details still need checking against this room.</p></div>
      <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={() => { setDraft(blank()); setEditing(true); setMessage(""); }}>Save a product</button></div>
    <label>Find a saved product<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Brand, model or equipment role" /></label>
    <div className="wm-room-wizard-fields"><label>Place equipment at<select value={resolvedLocation} onChange={event => setLocationId(event.target.value)}><option value="" disabled>Add a room location first</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
      <label>Quantity<input type="number" min="1" step="1" value={quantity} onChange={event => setQuantity(Number(event.target.value))} /></label></div>
    {!items.length && <p>Save the exact models you use regularly—displays, audio, control, cables, mounts and other equipment. This library is saved in this browser.</p>}
    {items.length > 0 && !filtered.length && <p>No saved products match. Try another brand or role.</p>}
    {filtered.map(item => <article className="wm-room-library-item" key={item.id}>
      <div><strong>{item.manufacturer} {item.model}</strong><p>{item.role}{isWyreStormManufacturer(item.manufacturer) ? " · WyreStorm product" : item.relationship === "competitor" ? " · Competitor alternative" : " · Complementary third-party"}{item.preferred ? " · Preferred" : ""} · {item.checkedOn ? `Last checked ${item.checkedOn}` : "Specifications not checked"}</p>
        {item.description && <p>{item.description}</p>}
        {item.connections && <p>Connections: {item.connections}</p>}{item.accessories && <p>Accessories: {item.accessories}</p>}</div>
      <div className="wm-room-wizard-actions"><button type="button" className="wm-ui-button wm-ui-button-primary" disabled={!resolvedLocation || !Number.isInteger(quantity) || quantity < 1} onClick={() => { try { onSelect(item, resolvedLocation, quantity); setMessage(`${item.manufacturer} ${item.model} added. Confirm suitability before specifying.`); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not add equipment."); } }}>Use in this room</button>
        <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => { setDraft(item); setEditing(true); }}>Edit details</button>
        <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => { try { removeLibraryEquipment(item.id); setMessage("Removed from your library. Room selections are retained."); } catch { setMessage("Could not update your library. Check browser storage."); } }}>Remove</button></div>
    </article>)}
    {editing && <form className="wm-room-wizard-fields" onSubmit={event => { event.preventDefault(); try { saveLibraryEquipment(draft); setEditing(false); setDraft(blank()); setMessage("Product saved for future rooms."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save. Check browser storage."); } }}>
      <label className="wm-room-wizard-field-wide">Manufacturer product page<input type="url" value={draft.sourceUrl} onChange={event => setDraft({ ...draft, sourceUrl: event.target.value })} placeholder="Paste a public https product page URL" /></label>
      <div className="wm-room-wizard-field-wide"><button type="button" className="wm-ui-button wm-ui-button-secondary" disabled={!draft.sourceUrl || readingProductPage} onClick={async () => {
        setReadingProductPage(true); setMessage("Reading the manufacturer product page…");
        try {
          const details = await postWingmanJson<ProductPageDetails>("/api/wingman/equipment/inspect-product-page", { productUrl: draft.sourceUrl });
          if (!details.ok) throw new Error("Wingman couldn't read product details from that page.");
          const summary = productPageSummary(details);
          setDraft(previous => ({ ...previous, manufacturer: canonicalManufacturerName(manufacturerFromProductPage(details) || previous.manufacturer),
            model: suggestModelFromProductPage(details) || previous.model, role: suggestEquipmentRole(details), description: summary || previous.description,
            connections: productPageConnections(details) || previous.connections,
            specifications: productPageSpecifications(details) || previous.specifications, sourceUrl: details.resolvedUrl || previous.sourceUrl,
            checkedOn: String(details.fetchedAt || new Date().toISOString()).slice(0, 10) }));
          setMessage("Page details added as suggestions. Check the exact model and specifications before saving.");
        } catch (error) { setMessage(error instanceof Error ? `${error.message} You can still enter the product details yourself.` : "Could not read that page. Enter the product details yourself."); }
        finally { setReadingProductPage(false); }
      }}>{readingProductPage ? "Reading product page…" : "Read product details"}</button><p>Wingman reads public manufacturer pages and suggests details for you to review. It does not save the product until you choose Save.</p></div>
      <label>Manufacturer<input required value={draft.manufacturer} onChange={event => setDraft({ ...draft, manufacturer: event.target.value })} /></label>
      <label>Exact model / SKU<input required value={draft.model} onChange={event => setDraft({ ...draft, model: event.target.value })} /></label>
      {isWyreStormManufacturer(draft.manufacturer) ? <p className="wm-room-wizard-field-wide">Wingman will keep this in WyreStorm product scope.</p> : draft.manufacturer.trim() ? <label>How this product fits the room<select value={draft.relationship} onChange={event => setDraft({ ...draft, relationship: event.target.value as LibraryEquipment["relationship"] })}><option value="complementary">Complementary third-party product</option><option value="competitor">Competitor / alternative to a WyreStorm product</option></select></label> : null}
      <label>Equipment role<select value={draft.role} onChange={event => setDraft({ ...draft, role: event.target.value as LibraryEquipment["role"] })}>{EQUIPMENT_ROLES.map(role => <option key={role}>{role}</option>)}</select></label>
      <label className="wm-room-wizard-field-wide">Short product description<textarea value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} /></label>
      <label>Connections<input value={draft.connections} onChange={event => setDraft({ ...draft, connections: event.target.value })} placeholder="Inputs, outputs and connection types" /></label>
      <label>Specifications recorded from the source<textarea value={draft.specifications} onChange={event => setDraft({ ...draft, specifications: event.target.value })} /></label>
      <label>Accessories and dependencies<textarea value={draft.accessories} onChange={event => setDraft({ ...draft, accessories: event.target.value })} placeholder="Mount, power supply, amplifier or required cable" /></label>
      <label>Useful room types and installation notes<textarea value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} /></label>
      <label>Source last checked<input type="date" value={draft.checkedOn} onChange={event => setDraft({ ...draft, checkedOn: event.target.value })} /></label>
      <label className="wm-room-wizard-check"><input type="checkbox" checked={draft.preferred} onChange={event => setDraft({ ...draft, preferred: event.target.checked })} />Preferred equipment</label>
      <div className="wm-room-wizard-actions"><button type="submit" className="wm-ui-button wm-ui-button-primary">Save product</button><button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => setEditing(false)}>Cancel</button></div>
    </form>}
    {message && <p role="status">{message}</p>}
  </section>;
}
