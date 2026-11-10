import { installationLineLabel, type InstallationSchedule } from "../lib/installationSchedule";

export function ProposalInstallationScope({ schedule }: { schedule: InstallationSchedule }) {
  return <section className="wm-proposal-installation-scope">
    <h3>Installation scope</h3>
    <p>{schedule.text}</p>
    <table>
      <thead><tr><th>Scope item</th><th>Survey detail</th><th>Links or displays</th><th>Qty</th></tr></thead>
      <tbody>{schedule.lines.map((line) => <tr key={line.id}>
        <td>{installationLineLabel(line)}</td><td>{line.detail}</td><td>{line.links.join(", ")}</td><td>{line.quantity}</td>
      </tr>)}</tbody>
    </table>
  </section>;
}
