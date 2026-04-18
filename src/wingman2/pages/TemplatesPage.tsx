import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

const templates = [
  { name: "Huddle Room", nextPath: `${routeCatalogByKey.discovery.path}?template=huddle-room` },
  { name: "Meeting Room", nextPath: `${routeCatalogByKey.discovery.path}?template=meeting-room` },
  { name: "Boardroom", nextPath: `${routeCatalogByKey.discovery.path}?template=boardroom` },
  { name: "Classroom", nextPath: `${routeCatalogByKey.discovery.path}?template=classroom` },
  { name: "Retail Signage", nextPath: `${routeCatalogByKey.discovery.path}?template=retail-signage` },
  { name: "Hospitality", nextPath: `${routeCatalogByKey.discovery.path}?template=hospitality` },
];

export function TemplatesPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Room Solution Templates"
        title="Begin with a room type the customer already recognizes."
        purpose="This page accelerates solution building by letting reps start from familiar AV scenarios, then attach the right WyreStorm product stack and commercial narrative."
        nextMove="Select the closest room template, apply it to the project, and use it to pre-fill discovery, product matching, and proposal content."
        actions={[
          { label: "Open discovery", to: routeCatalogByKey.discovery.path },
          { label: "Open proposal", to: routeCatalogByKey.proposal.path, variant: "secondary" },
        ]}
      />

      <SectionCard
        title="Template gallery"
        subtitle="Every template should pre-fill discovery answers, suggest a product bundle, and seed proposal sections."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template.name} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-44 bg-gradient-to-br from-slate-100 to-slate-200" />
              <div className="p-5">
                <h3 className="text-lg font-semibold text-slate-900">{template.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Includes room diagram, recommended core products, optional upgrades, and assumptions.
                </p>
                <Link
                  to={template.nextPath}
                  className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Apply template
                </Link>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
