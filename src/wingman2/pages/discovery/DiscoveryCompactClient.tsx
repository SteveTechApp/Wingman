type Props = { clientName: string; siteName: string; onClientNameChange: (value: string) => void; onSiteNameChange: (value: string) => void };
export function DiscoveryCompactClient({ clientName, siteName, onClientNameChange, onSiteNameChange }: Props) { return (<details className="wm-discovery-client-compact" data-wingman-client-compact="true">
          <summary className="wm-discovery-client-compact-toggle">
            {(clientName.trim() || siteName.trim())
              ? `${clientName.trim()}${siteName.trim() ? ` · ${siteName.trim()}` : ""}`
              : "Add client details"}
          </summary>
          <div className="wm-discovery-client-compact-fields">
            <input
              type="text"
              placeholder="Client name"
              value={clientName}
              onChange={(e) => onClientNameChange(e.target.value)}
              className="wm-discovery-client-compact-input"
            />
            <input
              type="text"
              placeholder="Site name"
              value={siteName}
              onChange={(e) => onSiteNameChange(e.target.value)}
              className="wm-discovery-client-compact-input"
            />
          </div>
        </details>); }
