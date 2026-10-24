import { REP_COPY, customerCopyText } from "../lib/proposalCopy";

/**
 * The two editable fields the proposal steps use.
 *
 * They are handed to the view through its values bag, which is why they sit
 * beside it rather than inside one step: every step renders the same field, so
 * the rep only has to learn one input.
 */
export function InputField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="wm-proposal-field">
      <span>{props.label}</span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}

export function TextAreaField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  hint?: string;
}) {
  const emptyCustomerSection = !customerCopyText(props.value, "").trim();
  const hint = props.hint || (/scope/i.test(props.label)
    ? REP_COPY.scopeGuidance
    : `Record the agreed ${props.label.toLowerCase()} in customer-ready language. This hint is for the rep and is not included in exports.`);
  return (
    <label className="wm-proposal-field wm-proposal-field-wide">
      <span>{props.label}</span>
      {emptyCustomerSection || props.hint ? <small data-rep-only="true">{hint}</small> : null}
      <textarea
        value={props.value}
        rows={props.rows ?? 5}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}
