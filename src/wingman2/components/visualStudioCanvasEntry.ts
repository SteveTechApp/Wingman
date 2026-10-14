/**
 * Public re-exports for the visual-design canvas tools.
 *
 * The canvas implementation pulls in @xyflow/react and dagre (~170 KB
 * minified). Keeping it in its own module boundary lets the bundler place it
 * in a lazy chunk: it is only loaded by the proposal-visuals and template
 * review workspaces, never by the eager application shell.
 */
export { default } from "./VisualStudioCanvas";
