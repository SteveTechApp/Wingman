export function generateCopilotResponse(context, objection) {
  const competitor = (context.competitor || "Competitor").toLowerCase();
  const text = (objection || "").toLowerCase();

  if (text.includes("crestron") || competitor === "crestron") {
    return {
      response: "That makes sense if the discussion is really about the control layer. The next step is to confirm whether the client is standardising control, AV transport, or both.",
      questions: [
        "Is the requirement driven by control ecosystem preference or by AV signal transport outcomes?",
        "Do you actually need enterprise control depth, or do you need a reliable and scalable AV backbone?",
        "Would the customer accept WyreStorm as the AV transport layer while leaving control open through 3rd party control?"
      ],
      positioning: "Position WyreStorm as the AV backbone and avoid pretending it is a direct control-ecosystem substitute."
    };
  }

  if (text.includes("cost") || text.includes("cheap") || text.includes("price")) {
    return {
      response: "Cost can be optimised, but the right question is whether the customer wants the lowest upfront line item or the cleanest long-term AV standard.",
      questions: [
        "Are they comparing upfront acquisition only, or lifecycle reliability and supportability as well?",
        "What would cause the system to be redesigned in phase two?",
        "Would a more consistent WyreStorm-first standard reduce future variation across rooms?"
      ],
      positioning: "Reframe toward design repeatability, support clarity, and avoiding hidden technical compromise."
    };
  }

  if (text.includes("nvx") || text.includes("specified") || text.includes("already")) {
    return {
      response: "Understood. The safest move is to ask which specific functional requirements made that specification appear necessary.",
      questions: [
        "Is the requirement about transport method, USB behaviour, scaling, or ecosystem compatibility?",
        "Which feature is non-negotiable and which is just familiar specification language?",
        "Would a WyreStorm-first architecture satisfy the actual signal-chain requirement without overscoping the control layer?"
      ],
      positioning: "Validate the requirement first, then show like-for-like transport capability and explain where WyreStorm is commercially cleaner or operationally simpler."
    };
  }

  return {
    response: "The next move is to isolate whether the objection is technical, operational, commercial, or simply brand familiarity.",
    questions: [
      "What is the exact system outcome the client is trying to protect?",
      "Which layer are they really talking about: control, switching, transport, USB, or display?",
      "If WyreStorm matches the required role, what still makes the alternative feel safer to them?"
    ],
    positioning: "Keep the conversation anchored to actual requirement, signal path, deployment fit, and support accountability."
  };
}