import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, Send } from "lucide-react";
import { discoveryResumeUrl } from "../../lib/discoveryResume";
import { projectDetailSections, projectSectionAnchor, projectSectionHref, type ProjectSectionId } from "../../lib/projectAnchors";
import { CopyPanelLink } from "./CopyPanelLink";

/**
 * Where a project can go next, and the records behind it.
 *
 * The records list is real links rather than buttons: each entry is a section of
 * the project's own address, so a rep can open Equipment in another tab,
 * bookmark Requirements, or middle-click Handoff while the current reading stays
 * where it is. The list is the anchor registry's own sections, not a second copy
 * of them: a section exists here because a panel renders it, so this navigator
 * cannot offer a section with no panel (or miss one that has a panel).
 *
 * Each chip also carries its own address: a small copy action beside the link
 * sends that section to a colleague without leaving the reading in front of the
 * rep. It sits beside the link rather than inside it — a button cannot live in a
 * link — and it copies the same anchor the link navigates to, so the chips and
 * the copied addresses cannot drift apart.
 */
export function ProjectWorkflowNavigator({ current, projectId, responsePath }: {
  current: ProjectSectionId; projectId: string; responsePath: string;
}) {
  return <section className="wm-project-workspace" aria-label="Project workflow">
    <header><div><p className="wm-ui-kicker">Continue this project</p><h2>Update Discovery or prepare a response</h2></div></header>
    <div className="wm-project-continuation">
      <Link to={discoveryResumeUrl(projectId)}><ClipboardList aria-hidden="true" /><span><strong>Edit in Discovery</strong><small>Reopen the standard questions with this project’s saved answers.</small></span><ArrowRight aria-hidden="true" /></Link>
      <Link to={responsePath}><Send aria-hidden="true" /><span><strong>Build response</strong><small>Continue with the project’s equipment and evidence.</small></span><ArrowRight aria-hidden="true" /></Link>
    </div>
    <details className="wm-project-records"><summary>Review project records</summary><nav aria-label="Project pages">{projectDetailSections.map((page) => {
      const href = projectSectionHref(projectId, page.id);
      if (!href) return null;
      const anchor = projectSectionAnchor(page.id);
      return (
        <Fragment key={page.id}>
          <Link to={href} aria-current={current === page.id ? "page" : undefined}>{page.label}</Link>
          {anchor ? <CopyPanelLink projectId={projectId} anchorId={anchor.id} compact label={`the ${page.label} section`} /> : null}
        </Fragment>
      );
    })}</nav></details>
  </section>;
}
