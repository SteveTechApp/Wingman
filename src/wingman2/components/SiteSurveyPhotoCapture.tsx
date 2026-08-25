import { useState, useRef, useCallback } from "react";
import {
  Camera,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye,
  MapPin,
  Cable,
  Package,
} from "lucide-react";
import {
  analyzeSiteSurveyPhoto,
  mapExtractionToTopology,
  type SiteSurveyPhotoResult,
  type PhotoExtractionMapping,
} from "../lib/siteSurveyPhotoAnalysis";
import {
  applyPhotoExtractionToTopology,
  buildUpdatedTopology,
  type PhotoToTopologyResult,
} from "../lib/siteSurveyPhotoToTopology";
import type { ProjectTopology } from "../lib/projectTopology";

type SiteSurveyPhotoCaptureProps = {
  onExtractionReady: (extraction: SiteSurveyPhotoResult, mapping: PhotoExtractionMapping) => void;
  onTopologyUpdate: (updatedTopology: ProjectTopology, result: PhotoToTopologyResult) => void;
  existingTopology: ProjectTopology;
  existingLocationNames: string[];
  existingEquipmentNames: string[];
  disabled?: boolean;
};

export function SiteSurveyPhotoCapture({
  onExtractionReady,
  onTopologyUpdate,
  existingTopology,
  existingLocationNames,
  existingEquipmentNames,
  disabled,
}: SiteSurveyPhotoCaptureProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<SiteSurveyPhotoResult | null>(null);
  const [mapping, setMapping] = useState<PhotoExtractionMapping | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, etc.)");
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResult(null);
    setMapping(null);

    // Show preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      const extraction = await analyzeSiteSurveyPhoto(file);
      setResult(extraction);

      const topologyMapping = mapExtractionToTopology(
        extraction,
        existingLocationNames,
        existingEquipmentNames,
      );
      setMapping(topologyMapping);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      setError(message);
    } finally {
      setAnalyzing(false);
    }
  }, [existingLocationNames, existingEquipmentNames]);

  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    event.target.value = "";
  }, [handleFile]);

  const handleConfirm = useCallback(() => {
    if (result && mapping) {
      // Apply extraction to topology
      const topologyResult = applyPhotoExtractionToTopology(result, existingTopology);
      const updatedTopology = buildUpdatedTopology(existingTopology, topologyResult);

      // Notify parent components
      onExtractionReady(result, mapping);
      onTopologyUpdate(updatedTopology, topologyResult);

      // Reset state after confirming
      setResult(null);
      setMapping(null);
      setPreviewUrl(null);
    }
  }, [result, mapping, existingTopology, onExtractionReady, onTopologyUpdate]);

  const handleDismiss = useCallback(() => {
    setResult(null);
    setMapping(null);
    setPreviewUrl(null);
    setError(null);
  }, []);

  return (
    <div className="wm-survey-photo-capture">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInput}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Upload buttons */}
      {!result && !analyzing && (
        <div className="wm-survey-photo-actions">
          <button
            type="button"
            className="wm-ui-button wm-ui-button-secondary text-xs flex items-center gap-2"
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled}
          >
            <Camera size={14} aria-hidden="true" />
            Take Photo
          </button>
          <button
            type="button"
            className="wm-ui-button wm-ui-button-secondary text-xs flex items-center gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            <Upload size={14} aria-hidden="true" />
            Upload Photo
          </button>
        </div>
      )}

      {/* Analyzing state */}
      {analyzing && (
        <div className="wm-survey-photo-analyzing">
          {previewUrl && (
            <img src={previewUrl} alt="Site photo" className="wm-survey-photo-thumbnail" />
          )}
          <div className="wm-survey-photo-analyzing-text">
            <Loader2 size={16} className="animate-spin text-cyan-400" aria-hidden="true" />
            <span className="text-xs text-white/70">Analyzing site photo...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="wm-survey-photo-error">
          <AlertTriangle size={14} className="text-red-400" aria-hidden="true" />
          <span className="text-xs text-red-300">{error}</span>
          <button type="button" className="text-white/40 hover:text-white/60" onClick={handleDismiss}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* Results preview */}
      {result && mapping && !analyzing && (
        <div className="wm-survey-photo-results">
          <div className="wm-survey-photo-results-header">
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-cyan-400" aria-hidden="true" />
              <span className="text-xs font-semibold">Extracted from: {result.fileName}</span>
            </div>
            <button type="button" className="text-white/40 hover:text-white/60" onClick={handleDismiss}>
              <X size={12} />
            </button>
          </div>

          {/* Summary */}
          <p className="wm-survey-photo-summary text-[11px] text-white/60 mb-3">
            {result.summary}
          </p>

          {/* Extracted data cards */}
          <div className="wm-survey-photo-extracted-grid">
            {/* Locations */}
            <div className="wm-survey-photo-extracted-card">
              <div className="wm-survey-photo-extracted-header">
                <MapPin size={12} className="text-cyan-400" aria-hidden="true" />
                <span className="text-[10px] font-semibold">Locations ({result.locations.length})</span>
              </div>
              {result.locations.length === 0 ? (
                <p className="text-[10px] text-white/30">No new locations detected</p>
              ) : (
                <ul className="wm-survey-photo-extracted-list">
                  {result.locations.map((loc, i) => (
                    <li key={i} className="text-[10px] text-white/70">
                      {loc.name}
                      {loc.type && <span className="text-white/40"> ({loc.type})</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Equipment */}
            <div className="wm-survey-photo-extracted-card">
              <div className="wm-survey-photo-extracted-header">
                <Package size={12} className="text-blue-400" aria-hidden="true" />
                <span className="text-[10px] font-semibold">Equipment ({result.equipment.length})</span>
              </div>
              {result.equipment.length === 0 ? (
                <p className="text-[10px] text-white/30">No new equipment detected</p>
              ) : (
                <ul className="wm-survey-photo-extracted-list">
                  {result.equipment.slice(0, 8).map((eq, i) => (
                    <li key={i} className="text-[10px] text-white/70">
                      {eq.name}
                      {eq.location && <span className="text-white/40"> @ {eq.location}</span>}
                    </li>
                  ))}
                  {result.equipment.length > 8 && (
                    <li className="text-[10px] text-white/40">+{result.equipment.length - 8} more</li>
                  )}
                </ul>
              )}
            </div>

            {/* Cables */}
            <div className="wm-survey-photo-extracted-card">
              <div className="wm-survey-photo-extracted-header">
                <Cable size={12} className="text-emerald-400" aria-hidden="true" />
                <span className="text-[10px] font-semibold">Cables ({result.cables.length})</span>
              </div>
              {result.cables.length === 0 ? (
                <p className="text-[10px] text-white/30">No cables detected</p>
              ) : (
                <ul className="wm-survey-photo-extracted-list">
                  {result.cables.slice(0, 5).map((cable, i) => (
                    <li key={i} className="text-[10px] text-white/70">
                      {cable.fromEquipment} → {cable.toEquipment}
                      {cable.estimatedLengthMetres && (
                        <span className="text-white/40"> (~{cable.estimatedLengthMetres}m)</span>
                      )}
                    </li>
                  ))}
                  {result.cables.length > 5 && (
                    <li className="text-[10px] text-white/40">+{result.cables.length - 5} more</li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* Additional observations */}
          {(result.roomDimensions || result.networkInfrastructure || result.powerAvailability || result.accessNotes) && (
            <div className="wm-survey-photo-observations">
              {result.roomDimensions && (
                <p className="text-[10px] text-white/50"><strong>Room:</strong> {result.roomDimensions}</p>
              )}
              {result.networkInfrastructure && (
                <p className="text-[10px] text-white/50"><strong>Network:</strong> {result.networkInfrastructure}</p>
              )}
              {result.powerAvailability && (
                <p className="text-[10px] text-white/50"><strong>Power:</strong> {result.powerAvailability}</p>
              )}
              {result.accessNotes && (
                <p className="text-[10px] text-white/50"><strong>Access:</strong> {result.accessNotes}</p>
              )}
            </div>
          )}

          {/* Confidence indicator */}
          <div className="wm-survey-photo-confidence">
            <span className="text-[10px] text-white/40">Confidence:</span>
            <div className="wm-survey-photo-confidence-bar">
              <div
                className={`wm-survey-photo-confidence-fill ${
                  result.confidence > 0.7 ? "high" : result.confidence > 0.4 ? "medium" : "low"
                }`}
                style={{ width: `${result.confidence * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-white/40">{Math.round(result.confidence * 100)}%</span>
          </div>

          {/* Confirm button */}
          <div className="wm-survey-photo-confirm-actions">
            <button
              type="button"
              className="wm-ui-button wm-ui-button-primary text-xs flex items-center gap-2"
              onClick={handleConfirm}
            >
              <CheckCircle2 size={14} aria-hidden="true" />
              Apply to Checklist ({mapping.locationsToCreate.length} locations, {mapping.equipmentToCreate.length} devices, {mapping.cablesToCreate.length} cables)
            </button>
            <button
              type="button"
              className="wm-ui-button wm-ui-button-secondary text-xs"
              onClick={handleDismiss}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
