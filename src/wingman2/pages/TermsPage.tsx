import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";

const termsSections = [
  {
    id: "best-efforts",
    heading: "Best-efforts guidance, not a promise",
    body: "Wingman is a sales-assistance tool. Every recommendation, comparison, product profile and piece of generated copy is provided on a best-efforts basis to support your own judgement, and is not a guarantee, warranty or promise about any product, system outcome or customer result.",
  },
  {
    id: "verify-before-quote",
    heading: "You remain responsible for the quote",
    body: "Before any product, comparison or proposal is issued to a customer, you must verify the governing specification, compatibility, lifecycle status, regional availability, pricing and lead time against the current WyreStorm documentation, datasheet or order desk. Wingman cannot see your live stock, your customer's installed infrastructure or the final installation conditions.",
  },
  {
    id: "data-accuracy",
    heading: "Product data may be incomplete or out of date",
    body: "Wingman's governed catalogue is compiled from the best information available at the time of generation. Ports, USB version, HDBaseT class, reach, resolution and feature claims can change between product revisions, regional SKUs and firmware releases. A governed profile is a starting point for your own check, not a substitute for the manufacturer datasheet.",
  },
  {
    id: "competitor-info",
    heading: "Competitor information is approximate",
    body: "Competitor product details are captured from public sources and are provided only to start a comparison conversation. They are not an endorsement of a competitor, a statement of equivalence, or a representation about what a competitor product can do. Confirm competitor behaviour against the competitor's own documentation before treating a comparison as settled.",
  },
  {
    id: "generated-copy",
    heading: "Generated copy needs your review",
    body: "Customer-facing wording produced by Wingman is drafted to sound commercially safe, but only you know the specific account, the customer's situation and the commitments that have already been made. Review all generated copy before it is sent, and do not send anything that overstates capability, availability or price.",
  },
  {
    id: "no-liability",
    heading: "Limitation of liability",
    body: "To the maximum extent permitted by law, Wingman and its provider accept no liability for any loss, damage, claim or expense arising out of or in connection with your use of the tool, reliance on its output, or any error, omission or inaccuracy in its content, however caused.",
  },
  {
    id: "no-warranty",
    heading: "No warranty",
    body: "The tool and its output are provided \"as is\" and \"as available\", without warranty of any kind, express or implied, including fitness for a particular purpose, merchantability or non-infringement. Your use of the tool is entirely at your own risk.",
  },
  {
    id: "acceptable-use",
    heading: "Acceptable use",
    body: "Use Wingman only for legitimate sales and pre-sales activities. Do not use it to misrepresent products, fabricate specifications, bypass verification requirements, or make commitments to customers that WyreStorm has not approved.",
  },
  {
    id: "internal-tool",
    heading: "Internal sales workspace",
    body: "Wingman is an internal sales workspace. Its recommendations and notes are intended for your team's use in preparing customer-facing material, not as a public document. Customer-sensitive information entered into Wingman should be handled in line with your own data-protection obligations.",
  },
  {
    id: "changes",
    heading: "Changes to these terms",
    body: "These terms may be updated from time to time as the tool and its data change. Continued use of Wingman after an update means you accept the updated terms.",
  },
];

export function TermsPage() {
  return (
    <main className="wm-page wm-terms-page" data-wingman-page="terms">
      <header className="wm-page-header">
        <p className="wm-ui-kicker">Wingman legal</p>
        <h1 className="wm-page-title">Terms and legal disclaimer</h1>
        <p className="wm-page-description">
          How Wingman's guidance should be used, and where responsibility sits before anything is quoted to a customer.
        </p>
      </header>

      <div className="wm-action-row" aria-label="Terms actions">
        <Link className="wm-button wm-button-secondary" to={routeCatalogByKey.support.path}>
          Back to Support
        </Link>
        <Link className="wm-button wm-button-ghost" to={routeCatalogByKey.salesHelper.path}>
          Open Sales Helper
        </Link>
      </div>

      <div className="wm-terms-sections" role="list" aria-label="Terms and disclaimer sections">
        {termsSections.map((section) => (
          <section className="wm-section-card" id={section.id} key={section.id} aria-labelledby={`${section.id}-title`}>
            <p className="wm-ui-kicker">Section</p>
            <h2 id={`${section.id}-title`} className="wm-card-title">
              {section.heading}
            </h2>
            <p className="wm-copy">{section.body}</p>
          </section>
        ))}
      </div>

      <section className="wm-section-card" aria-labelledby="terms-acknowledgement">
        <p className="wm-ui-kicker">Acknowledgment</p>
        <h2 id="terms-acknowledgement" className="wm-card-title">
          By using Wingman you accept these terms
        </h2>
        <p className="wm-copy">
          Using Wingman means you accept these terms and the verification responsibility described above. If you cannot
          verify a recommendation before it reaches a customer, do not issue it.
        </p>
      </section>
    </main>
  );
}

export default TermsPage;
