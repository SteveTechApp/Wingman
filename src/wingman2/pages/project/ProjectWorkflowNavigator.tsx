import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, Send } from "lucide-react";
import { discoveryResumeUrl } from "../../lib/discoveryResume";

export function ProjectWorkflowNavigator({ pages, current, onChange, projectId, responsePath }: {
  pages: readonly { id: string; label: string }[]; current: string; onChange: (id: string) => void; projectId: string; responsePath: string;
}) {
  return <section className="wm-project-workspace" aria-label="Project workflow">
    <header><div><p className="wm-ui-kicker">Continue this project</p><h2>Update Discovery or prepare a response</h2></div></header>
    <div className="wm-project-continuation">
      <Link to={discoveryResumeUrl(projectId)}><ClipboardList aria-hidden="true" /><span><strong>Edit in Discovery</strong><small>Reopen the standard questions with this project’s saved answers.</small></span><ArrowRight aria-hidden="true" /></Link>
      <Link to={responsePath}><Send aria-hidden="true" /><span><strong>Build response</strong><small>Continue with the project’s equipment and evidence.</small></span><ArrowRight aria-hidden="true" /></Link>
    </div>
    <details className="wm-project-records"><summary>Review project records</summary><nav aria-label="Project pages">{pages.map((page) => <button key={page.id} type="button" aria-current={current === page.id ? "page" : undefined} onClick={() => onChange(page.id)}>{page.label}</button>)}</nav></details>
  </section>;
}
