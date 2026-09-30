import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { routeCatalogByKey } from "../../app/routeCatalog";
import { useCustomRoomTemplates } from "../../lib/customRoomTemplates";
import { roomTemplates } from "../../lib/roomTemplates";
import { templateImageFor } from "../../lib/templateImages";
import { templateMatchesMarketFilter } from "../../lib/templateMarkets";
import { DISCOVERY_MARKETS, DISCOVERY_TEMPLATE_MARKET, getDiscoveryMarket, photoForDiscoveryEnvironment, photoForDiscoveryMarket, RELATED_TEMPLATE_MARKETS } from "./discoveryMarketContext";

type Props = {
  marketId: string;
  environmentId: string;
  onMarketChange: (marketId: string) => void;
  onEnvironmentSelect: (environmentId: string, suggestedApplication?: string, description?: string) => void;
  onCancel?: () => void;
};

export function DiscoveryMarketEntry({ marketId, environmentId, onMarketChange, onEnvironmentSelect, onCancel }: Props) {
  const [query, setQuery] = useState("");
  const [otherDescription, setOtherDescription] = useState("");
  const [describingOther, setDescribingOther] = useState(false);
  const [designingCustom, setDesigningCustom] = useState(false);
  const customTemplates = useCustomRoomTemplates();
  const market = getDiscoveryMarket(marketId);
  const relatedMarkets = RELATED_TEMPLATE_MARKETS[marketId] ?? [];
  const templateMarkets = [DISCOVERY_TEMPLATE_MARKET[marketId], ...relatedMarkets].filter(Boolean);
  const matchingTemplates = [...customTemplates, ...roomTemplates]
    .filter((template) => templateMarkets.some((filter) => templateMatchesMarketFilter(template, filter)))
    .sort((left, right) => Number(templateMatchesMarketFilter(right, templateMarkets[0])) - Number(templateMatchesMarketFilter(left, templateMarkets[0])))
    .slice(0, 4);
  const visibleMarkets = DISCOVERY_MARKETS.filter((item) =>
    `${item.label} ${item.environments.map((environment) => environment.label).join(" ")}`
      .toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <section className="wm-discovery-market-entry wm-ui-card" aria-label="Opportunity context">
      <div className="wm-discovery-market-entry__heading">
        <span className="wm-discovery-market-entry__eyebrow">Start with the customer's world</span>
        <h2>{market ? (!designingCustom && market.id !== "other" ? `How would you like to start in ${market.label}?` : `Where in ${market.label} will AV be used?`) : "Which market is the customer in?"}</h2>
        <p>{market
          ? (!designingCustom && market.id !== "other" ? "Start with a pre-built template for a familiar setup, or describe the customer's environment for a custom design." : "Choose the closest environment. Wingman will use it to frame the next questions, not assume a product or network design.")
          : "Choose their industry first. You’ll then see spaces and situations they are likely to recognise."}</p>
      </div>

      {!market ? (
        <>
          <label className="wm-discovery-market-entry__search">
            <Search size={18} aria-hidden="true" />
            <input aria-label="Search markets and environments" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search markets or spaces…" autoComplete="off" />
          </label>
          <div className="wm-discovery-market-entry__grid">
            {visibleMarkets.map((item) => (
              <button type="button" key={item.id} className="wm-discovery-market-entry__photo"
                onClick={() => { onMarketChange(item.id); setQuery(""); }}>
                <img src={photoForDiscoveryMarket(item.id)} alt="" loading="lazy" />
                <strong>{item.label}</strong>
                <ArrowRight size={17} aria-hidden="true" />
                <span>{item.environments.slice(0, 2).map((environment) => environment.label).join(" · ")}</span>
              </button>
            ))}
          </div>
          {visibleMarkets.length === 0 && <p role="status">No matching market. Try another term or choose Other / not sure.</p>}
        </>
      ) : (
        <>
          <button type="button" className="wm-discovery-market-entry__back" onClick={() => { setDesigningCustom(false); onMarketChange(""); }}>
            <ArrowLeft size={16} aria-hidden="true" /> Change market
          </button>
          {!designingCustom && market.id !== "other" && (
            <div className="wm-discovery-market-entry__paths">
              <h3>Start from a pre-built room design</h3>
              <p>{matchingTemplates.length
                ? "Review a market-relevant template and adapt its equipment schedule, or describe a different environment for a custom design."
                : "There is no pre-built design for this market yet. Describe the environment and Wingman will guide the design."}</p>
              {matchingTemplates.length > 0 && <div className="wm-discovery-market-entry__templates">
                {matchingTemplates.map((template) => (
                  <article key={template.id}>
                    <img src={templateImageFor(template)} alt="" loading="lazy" />
                    <span>{template.vertical === DISCOVERY_TEMPLATE_MARKET[marketId] ? "This market" : `Related: ${template.vertical}`}</span>
                    <h4>{template.name}</h4>
                    <p>{template.summary}</p>
                    <Link to={`${routeCatalogByKey.templates.path}/${template.id}?fromDiscoveryMarket=${encodeURIComponent(marketId)}`}>Review &amp; use template <ArrowRight size={15} aria-hidden="true" /></Link>
                  </article>
                ))}
              </div>}
              <button type="button" className="wm-discovery-market-entry__custom" onClick={() => setDesigningCustom(true)}>Describe this environment for a custom design <ArrowRight size={17} aria-hidden="true" /></button>
            </div>
          )}
          {(designingCustom || market.id === "other") && <div className="wm-discovery-market-entry__grid">
            {market.environments.map((environment) => (
              <button type="button" key={environment.id} className="wm-discovery-market-entry__photo" aria-pressed={environmentId === environment.id}
                onClick={() => environment.id === "other" ? setDescribingOther(true) : onEnvironmentSelect(environment.id, environment.suggestedApplication)}>
                <img src={photoForDiscoveryEnvironment(marketId, environment.id)} alt="" loading="lazy" />
                <strong>{environment.label}</strong>
                <ArrowRight size={17} aria-hidden="true" />
                <span>{environment.cue}</span>
              </button>
            ))}
            {market.id !== "other" && (
              <button type="button" className="wm-discovery-market-entry__photo"
                onClick={() => setDescribingOther(true)}>
                <img src={photoForDiscoveryMarket("other")} alt="" loading="lazy" />
                <strong>Another environment / not sure</strong>
                <ArrowRight size={17} aria-hidden="true" />
                <span>Continue with the customer's own description.</span>
              </button>
            )}
          </div>}
          {(designingCustom || market.id === "other") && describingOther && (
            <form className="wm-discovery-market-entry__other" onSubmit={(event) => {
              event.preventDefault();
              if (otherDescription.trim()) onEnvironmentSelect("other", undefined, otherDescription.trim());
            }}>
              <label htmlFor="wm-discovery-other-environment">Describe the customer’s space or situation</label>
              <input id="wm-discovery-other-environment" value={otherDescription} onChange={(event) => setOtherDescription(event.target.value)}
                placeholder="e.g. Mobile incident support vehicle…" autoComplete="off" required />
              <button type="submit">Continue with this environment</button>
            </form>
          )}
        </>
      )}
      {onCancel && <button type="button" className="wm-discovery-market-entry__cancel" onClick={onCancel}>Keep current context</button>}
    </section>
  );
}
