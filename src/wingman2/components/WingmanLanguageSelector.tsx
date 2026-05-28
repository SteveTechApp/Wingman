import {
  SUPPORTED_WINGMAN_LANGUAGES,
  getWingmanLanguage,
  setStoredWingmanCaptureLanguage,
  type WingmanLanguageId,
  useWingmanLanguage,
} from "../data/wingmanLanguage";

type WingmanLanguageSelectorProps = {
  compact?: boolean;
  mode?: "overall" | "capture";
  value?: WingmanLanguageId;
  onChange?: (value: WingmanLanguageId) => void;
  label?: string;
};

function marketCode(id: string, fallback: string) {
  const parts = id.split("-");
  return (fallback || parts[1] || id).toUpperCase();
}

export function WingmanLanguageSelector({
  compact = false,
  mode = "overall",
  value,
  onChange,
  label,
}: WingmanLanguageSelectorProps) {
  const { language, uiText, setLanguage } = useWingmanLanguage();
  const activeLanguage = getWingmanLanguage(value ?? language.id);
  const labelText = label ?? (mode === "capture" ? uiText.captureLanguage : uiText.overallLanguage);
  const activeCode = marketCode(activeLanguage.id, activeLanguage.flag);

  const handleChange = (nextValue: string) => {
    const nextLanguage = getWingmanLanguage(nextValue);

    if (mode === "capture") {
      setStoredWingmanCaptureLanguage(nextLanguage.id);
    }

    if (mode === "overall") {
      setLanguage(nextLanguage.id);
    }

    if (onChange) {
      onChange(nextLanguage.id);
    }
  };

  return (
    <label className="wm-language-selector" data-compact={compact ? "true" : "false"} data-mode={mode}>
      <span>{labelText}</span>
      <div className="wm-language-select-shell" title={`${activeCode} ${activeLanguage.label}`}>
        <strong aria-hidden="true">{activeCode}</strong>
        <select value={activeLanguage.id} onChange={(event) => handleChange(event.target.value)} aria-label={labelText}>
          {SUPPORTED_WINGMAN_LANGUAGES.map((item) => {
            const code = marketCode(item.id, item.flag);

            return (
              <option key={item.id} value={item.id}>
                {code} - {item.label}
              </option>
            );
          })}
        </select>
      </div>
    </label>
  );
}

export default WingmanLanguageSelector;