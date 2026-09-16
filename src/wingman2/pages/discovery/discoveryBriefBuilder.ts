import { routeCatalogByKey } from "../../app/routeCatalog";
import type { StoredDiscoveryBrief } from "../../features/projects";
import { buildDiscoveryRecommendationEvidence } from "../../lib/recommendationEvidence";
import {
  generateProjectTopologyFromDiscovery,
  normaliseProjectTopology,
  projectTopologyConnectionTypes,
  projectTopologyHasContent,
  projectTopologyLongestRun,
  projectTopologyMissingInformation,
  projectTopologyNetworkSummary,
  projectTopologySummary,
  type ProjectTopology,
} from "../../lib/projectTopology";
import {
  buildDiscoveryConversation,
  getAvoipDirection,
  getAvoipNextQuestion,
  getAvoipSeriesHint,
  getOptionLabel,
  isUnknownDiscoveryValue,
  signalQualityTags,
  wmDiscoveryAnswerIncludes,
  wmDiscoveryAnswerToText,
  wmDiscoveryHasAnswer,
  wmDiscoveryIsExclusiveValue,
  wmDiscoveryNormaliseAnswerList,
} from "./discoveryAnswerUtils";
import { getQuestionStrategy } from "./discoveryQuestions";
import type { DiscoveryMode } from "./discoveryProgressiveDisclosure";
import type { DiscoveryAnswers, DiscoveryNotes, DiscoveryQuestion, DiscoverySummaryItem } from "./discoveryTypes";

export type DiscoveryBriefBuilderInput = {
  answers: DiscoveryAnswers;
  notes: DiscoveryNotes;
  topology: ProjectTopology;
  discoveryQuestions: DiscoveryQuestion[];
  modeQuestions: DiscoveryQuestion[];
  basicQuestionIds: ReadonlySet<string>;
  progressiveMode: DiscoveryMode;
  selectedApplication: string;
  capturedSummary: DiscoverySummaryItem[];
  opportunityDescription: string;
  sourceTemplateId?: string;
  sourceTemplateName?: string;
  clientName: string;
  contactName: string;
  siteName: string;
  budgetLevel: string;
  timeline: string;
  completionPercent: number;
  reviewPosition?: number;
  confirmedSteps: Record<string, boolean>;
  confidenceByStep: Record<string, "high" | "matched" | "low">;
  confidenceScoresByStep: Record<string, number>;
  decisionIntegrity: { canProceedToRecommendation: boolean; issues: Array<{ followUpQuestion: string }> };
};

export function compileDiscoveryBrief({
  answers, notes, topology, discoveryQuestions, modeQuestions,
  basicQuestionIds: BASIC_IDS, progressiveMode, selectedApplication,
  capturedSummary, opportunityDescription, sourceTemplateId, sourceTemplateName,
  clientName, contactName, siteName, budgetLevel, timeline, completionPercent,
  reviewPosition, confirmedSteps, confidenceByStep, confidenceScoresByStep,
  decisionIntegrity,
}: DiscoveryBriefBuilderInput): StoredDiscoveryBrief {
    // Always search the FULL question list so Expert answers captured before
    // switching to Basic mode are not silently dropped from the brief.
    const answerLabel = (stepId: string): string => {
      const step = discoveryQuestions.find((candidate) => candidate.id === stepId);
      return step && wmDiscoveryHasAnswer(answers[stepId]) ? getOptionLabel(step, answers[stepId], selectedApplication) : "";
    };
    const answerLabels = (stepId: string): string[] => {
      const step = discoveryQuestions.find(
        (candidate) => candidate.id === stepId,
      );

      if (!step) {
        return [];
      }

      let selectedValues = wmDiscoveryNormaliseAnswerList(answers[stepId]);

      if (
        step.selectAllValue &&
        selectedValues.includes(step.selectAllValue)
      ) {
        selectedValues = step.options
          .map((option) => option.value)
          .filter((value) => value !== step.selectAllValue)
          .filter((value) => !wmDiscoveryIsExclusiveValue(step, value));
      }

      return selectedValues
        .map((value) => getOptionLabel(step, value, selectedApplication))
        .filter(Boolean);
    };

    const application = answerLabel("opportunity") || wmDiscoveryAnswerToText(answers.opportunity) || "Discovery";
    const avoipProfile = answerLabel("avoip-profile");
    const avoipProfileValue = wmDiscoveryAnswerToText(answers["avoip-profile"]);
    const avoipSeriesHint = getAvoipSeriesHint(avoipProfileValue);
    const allNotes = Object.values(notes).map((note) => note.trim()).filter(Boolean);
    const summaryText = capturedSummary
      .map((item) => `${item.label}: ${item.answer}${item.note ? ` - ${item.note}` : ""}`)
      .join("\n");
    const strategy = getQuestionStrategy("opportunity", wmDiscoveryAnswerToText(answers.opportunity));
    const inferredDirection = selectedApplication === "av-over-ip"
      ? getAvoipDirection(avoipProfileValue, strategy.likelyDirection)
      : strategy.likelyDirection;
    const nextBestQuestion = selectedApplication === "av-over-ip"
      ? getAvoipNextQuestion(avoipProfileValue, strategy.askNext)
      : strategy.askNext;
    const displayCount = answerLabel("displays");
    const displayBehaviour = answerLabel("display-behaviour") || answerLabel("displays");
    const signalStandard = answerLabel("signal-standard");
    const sourceCount = answerLabel("sources");
    const ucPurpose = answerLabel("uc-purpose");
    const conferencingPlatform = answerLabels("uc-platform");
    const cameraNeeds = answerLabels("uc-camera");
    const cameraRouting = answerLabels("uc-camera-routing");
    const microphoneNeeds = answerLabels("uc-microphones");
    const microphoneConnections = answerLabels("uc-microphone-connection");
    const usb = answerLabel("usb");
    const audio = answerLabel("audio");
    const sourceConnections = answerLabels("source-connection");
    const sourceDeviceWorkflows = answerLabels("source-device-workflows");
    const wirelessPresentationOperation = answerLabels("wireless-presentation-operation");
    const multiviewDestinations = answerLabels("multiview-destination");
    const multiviewOperation = answerLabels("multiview-operation");
    const microphoneCount = answerLabel("uc-microphone-count");
    const audioProcessing = answerLabels("uc-audio-processing");
    const usbValues = wmDiscoveryNormaliseAnswerList(answers.usb);
    const usbNeeds = answerLabels("usb");
    const usbOwnership = [
      usbValues.includes("byod-byom") ? "User laptop / BYOD / BYOM host" : "",
      usbValues.includes("room-pc-uc") ? "Room PC / UC appliance host" : "",
      usbValues.includes("switchable-host-usb") ? "Switchable room and user-laptop host" : "",
    ].filter(Boolean).join(", ");
    const usbTransport = [
      usbValues.includes("room-host-usb2") ? "Standard USB 2.0 path" : "",
      usbValues.includes("usb3-high-bandwidth-path") ? "High-bandwidth USB 3.x path" : "",
    ].filter(Boolean).join(", ");
    const usbTopologyRisk = [
      usbValues.includes("switchable-host-usb") ? "USB host switching required" : "",
      usbValues.includes("usb3-high-bandwidth-path") ? "High-bandwidth USB 3.x transport required" : "",
      usbValues.includes("unknown-usb") ? "USB workflow requires qualification" : "",
    ].filter(Boolean).join(", ");
    const audioNeeds = answerLabels("audio");
    const controlNeeds = answerLabels("control");
    // WINGMAN_DISCOVERY_SOURCE_UC_EVIDENCE_DERIVED
    const wingmanUnifiedCommsValues = wmDiscoveryNormaliseAnswerList(
      answers["uc-purpose"],
    );
    const wingmanUnifiedCommsWorkflows = answerLabels(
      "uc-purpose",
    );
    const wingmanNoUnifiedComms = wingmanUnifiedCommsValues.includes(
      "no-uc",
    );
    const wingmanUnifiedCommsUnknown = wingmanUnifiedCommsValues.includes(
      "unknown-uc",
    );
    const wingmanLegacyCombinedWorkflow = wingmanUnifiedCommsValues.includes(
      "conferencing-recording",
    );
    const wingmanConferencingRequired =
      !wingmanNoUnifiedComms &&
      !wingmanUnifiedCommsUnknown &&
      (
        wingmanUnifiedCommsValues.includes("video-conferencing") ||
        wingmanLegacyCombinedWorkflow
      );
    const wingmanRecordingRequired =
      !wingmanNoUnifiedComms &&
      !wingmanUnifiedCommsUnknown &&
      (
        wingmanUnifiedCommsValues.includes("recording-streaming") ||
        wingmanLegacyCombinedWorkflow
      );
    const wingmanCameraDistributionRequired =
      !wingmanNoUnifiedComms &&
      !wingmanUnifiedCommsUnknown &&
      wingmanUnifiedCommsValues.includes("camera-distribution-only");
    const wingmanMicrophonesOnly =
      !wingmanNoUnifiedComms &&
      !wingmanUnifiedCommsUnknown &&
      wingmanUnifiedCommsValues.includes("microphones-only");
    const wingmanUnifiedCommsSummary = wingmanNoUnifiedComms
      ? "No camera or microphone requirements"
      : wingmanUnifiedCommsUnknown
        ? "Not yet confirmed"
        : wingmanConferencingRequired && wingmanRecordingRequired
          ? "Video conferencing and recording / live streaming"
          : wingmanUnifiedCommsWorkflows.join(", ") || "Not yet confirmed";

    const activeTopology = projectTopologyHasContent(topology)
      ? normaliseProjectTopology(topology)
      : generateProjectTopologyFromDiscovery({ answers, notes, application: selectedApplication });
    const topologySummary = projectTopologySummary(activeTopology);
    const longestRunMetres = projectTopologyLongestRun(activeTopology);
    const connectionTypes = projectTopologyConnectionTypes(activeTopology);
    const networkSummary = projectTopologyNetworkSummary(activeTopology);
    const distanceInfrastructureNotes = topologySummary;
    const qualityTags = signalQualityTags(signalStandard);
    const processingNeeds = [
      wmDiscoveryAnswerIncludes(answers["display-behaviour"], "video-wall-or-processor-feed") || wmDiscoveryAnswerIncludes(answers.displays, "video-wall-output") ? "Video wall processing" : "",
      wmDiscoveryAnswerIncludes(answers["display-behaviour"], "multiview-on-one-output") ? "Multiview" : "",
      avoipProfileValue === "multiview-avoip" ? "Multiview" : "",
      ...multiviewDestinations.map((item) => `Multiview destination: ${item}`),
      ...multiviewOperation.map((item) => `Multiview operation: ${item}`),
      ...audioProcessing.map((item) => `Audio processing: ${item}`),
    ].filter(Boolean);
    const missingInformationQuestions = progressiveMode === "expert"
      ? discoveryQuestions
      : discoveryQuestions.filter((step) =>
          BASIC_IDS.has(step.id) || wmDiscoveryHasAnswer(answers[step.id]),
        );
    const missingInformation = missingInformationQuestions.flatMap((step) => {
      const answer = answers[step.id] ?? "";
      const answerText = answerLabel(step.id);
      const note = notes[step.id]?.trim() ?? "";

      if (!answer && !note && step.required) {
        return [`Confirm ${step.question.replace(/\?$/, "").toLowerCase()}.`];
      }

      if (isUnknownDiscoveryValue(wmDiscoveryAnswerToText(answer)) || isUnknownDiscoveryValue(answerText) || isUnknownDiscoveryValue(note)) {
        return [`Confirm ${step.question.replace(/\?$/, "").toLowerCase()}.`];
      }

      return [];
    });

    projectTopologyMissingInformation(activeTopology).forEach((item) => {
      if (!missingInformation.includes(item)) missingInformation.push(item);
    });

    if (selectedApplication === "av-over-ip" && !activeTopology.connections.some((connection) => ["ip-av-vlan", "shared-ip-network", "point-to-point-network"].includes(connection.transport))) {
      missingInformation.push("Confirm whether NetworkHD uses the customer network or a dedicated AV network design.");
    }

    if (selectedApplication === "av-over-ip" && (!avoipProfileValue || avoipProfileValue === "unknown-avoip-profile")) {
      missingInformation.push("Confirm whether the AVoIP path is lower-bandwidth 1Gb, premium 1Gb, or zero-latency 10Gb.");
    }

    if (avoipProfileValue === "multiview-avoip") {
      missingInformation.push("Confirm how many sources must appear on one output and which NetworkHD family should carry the multiview requirement.");
    }

    const brief: StoredDiscoveryBrief = {
      savedAt: new Date().toISOString(),
      topology: activeTopology,
      roomModel: {
        roomType: application,
        application,
        applicationType: application,
        outcome: opportunityDescription || application,
        customerWording: notes.opportunity?.trim() || "",
        scale: answerLabel("scale"),
        roomSize: answerLabel("scale"),
        devices: [sourceCount, ...sourceConnections, ...sourceDeviceWorkflows].filter(Boolean),
        sourceTypes: [...sourceConnections, ...sourceDeviceWorkflows],
        sourceConnections,
        sourceDeviceWorkflows,
        wirelessPresentationOperation,
        sourceCount,
        displayCount,
        displays: displayCount,
        displayArrangement: displayBehaviour,
        displayBehaviour,
        signalStandard,
        signalStandardSummary: signalStandard,
        downstreamQualityTags: qualityTags,
        resolutionRequirement: signalStandard,
        topology: activeTopology,
        locations: activeTopology.locations,
        projectDevices: activeTopology.devices,
        projectConnections: activeTopology.connections,
        connectionSummary: topologySummary,
        connectionTypes,
        ucPurpose,
        unifiedCommunicationsRequirement: ucPurpose,
        conferencingPlatform,
        cameraNeeds,
        cameraRouting,
        microphoneNeeds,
        microphoneCount,
        microphoneConnections,
        audioProcessing,
        usbOwnership: usbOwnership || usb,
        usbTransport: usbTransport || usb,
        usbTopologyRisk,
        usbNeeds,
        audioPath: audio,
        audioNeeds,
        controlNeeds,
        cableRun: longestRunMetres !== undefined ? `${longestRunMetres} m` : "Unknown",
        longestRun: longestRunMetres !== undefined ? `${longestRunMetres} m` : "Unknown",
        distanceInfrastructureNotes,
        network: networkSummary,
        networkAvailability: networkSummary,
        processingNeeds,
        processingRequirement: processingNeeds[0] ?? "",
        videoWallRequirement:
          wmDiscoveryAnswerIncludes(answers["display-behaviour"], "video-wall-or-processor-feed") || wmDiscoveryAnswerIncludes(answers.displays, "video-wall-output")
            ? displayBehaviour
            : "Not indicated",
        avoipProfile,
        avoipSeriesHint,
        multiviewRequirement:
          avoipProfileValue === "multiview-avoip" || wmDiscoveryAnswerIncludes(answers["display-behaviour"], "multiview-on-one-output")
            ? "Multiview required"
            : "Not indicated",
        multiviewDestinations,
        multiviewOperation,
        designDirection: inferredDirection,
        inferredArchitectureDirection: inferredDirection,
        recommendedProductPath: selectedApplication === "av-over-ip" ? "AVoIP / matrix routing" : strategy.likelyDirection,
        nextBestQuestion,
        notes: allNotes.join(" | "),
        summary: summaryText,
        sourceTemplateId: sourceTemplateId || "",
        sourceTemplateName: sourceTemplateName || "",
        clientName: clientName.trim(),
        contactName: contactName.trim(),
        siteName: siteName.trim(),
        budgetLevel,
        timeline,
      },
      inference: {
        summary: summaryText,
        architecture: inferredDirection,
        nextBestQuestion,
      },
      capturedPercent: completionPercent,
      returnRoute: routeCatalogByKey.discovery.path,
      missingInformation: Array.from(new Set([
        ...missingInformation,
        ...decisionIntegrity.issues.map((issue) => issue.followUpQuestion),
      ])),
      nextBestQuestion: decisionIntegrity.issues[0]?.followUpQuestion ?? nextBestQuestion,
      reviewPosition,
    };
    // WINGMAN_DISCOVERY_SOURCE_UC_EVIDENCE_ROOM_MODEL
    brief.roomModel = {
      ...(brief.roomModel ?? {}),
      sourceProfile: answerLabel("source-connection"),
      sourceProfileValue: wmDiscoveryAnswerToText(
        answers["source-connection"],
      ),
      unifiedCommsWorkflows: wingmanUnifiedCommsWorkflows,
      cameraMicrophoneWorkflows: wingmanUnifiedCommsWorkflows,
      unifiedCommsSummary: wingmanUnifiedCommsSummary,
      conferencingRequired: wingmanConferencingRequired,
      recordingStreamingRequired: wingmanRecordingRequired,
      cameraDistributionRequired: wingmanCameraDistributionRequired,
      microphonesWithoutCameras: wingmanMicrophonesOnly,
    };

    const recommendationEvidence = buildDiscoveryRecommendationEvidence(brief);

    return {
      ...brief,
      missingInformation: recommendationEvidence.missingInformation,
      nextBestQuestion: decisionIntegrity.issues[0]?.followUpQuestion ?? recommendationEvidence.nextBestQuestion ?? strategy.askNext,
      quoteSafetyStatus: decisionIntegrity.canProceedToRecommendation ? recommendationEvidence.quoteSafetyStatus : "do-not-quote-yet",
      recommendationEvidence,
      discoveryConversation: buildDiscoveryConversation(modeQuestions, answers, notes, selectedApplication, confirmedSteps, confidenceByStep, confidenceScoresByStep),
    };

}
