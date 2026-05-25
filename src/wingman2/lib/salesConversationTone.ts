export type SalesConversationToneId = "trade" | "user" | "consultant";
export type SalesConversationLocale = "en" | "es" | "fr" | "de";

export type SalesConversationContext =
  | "salesHelper"
  | "callCards"
  | "discovery"
  | "finder"
  | "compare"
  | "productPitch"
  | "productFamilies"
  | "templates"
  | "videowall";

export type SalesConversationToneOption = {
  id: SalesConversationToneId;
  label: string;
  shortDescription: string;
};

export type SalesConversationLocaleOption = {
  id: SalesConversationLocale;
  label: string;
  shortLabel: string;
};

type SalesConversationContextCopy = {
  subject: string;
  nextStep: string;
};

export type SalesConversationToneCopy = {
  title: string;
  opener: string;
  followUp: string;
  handoff: string;
};

export const SALES_CONVERSATION_TYPE_STORAGE_KEY = "wingman:sales-conversation-type";
export const SALES_CONVERSATION_LOCALE_STORAGE_KEY = "wingman:sales-conversation-locale";

export const LEGACY_SALES_CONVERSATION_STORAGE_KEYS = [
  "wingman:sales-mode",
  "wingman.salesLanguageMode.v1",
];

export const DEFAULT_SALES_CONVERSATION_TONE_ID: SalesConversationToneId = "trade";
export const DEFAULT_SALES_CONVERSATION_LOCALE: SalesConversationLocale = "en";

export const salesConversationToneOptions: SalesConversationToneOption[] = [
  {
    id: "trade",
    label: "Sell to Trade",
    shortDescription: "Dealer and installer language.",
  },
  {
    id: "user",
    label: "Sell to User",
    shortDescription: "Outcome and experience language.",
  },
  {
    id: "consultant",
    label: "Sell to Technical Consultant",
    shortDescription: "Specification and risk language.",
  },
];

export const salesConversationLocaleOptions: SalesConversationLocaleOption[] = [
  { id: "en", label: "English", shortLabel: "EN" },
  { id: "es", label: "Spanish", shortLabel: "ES" },
  { id: "fr", label: "French", shortLabel: "FR" },
  { id: "de", label: "German", shortLabel: "DE" },
];

const contextCopy: Record<SalesConversationLocale, Record<SalesConversationContext, SalesConversationContextCopy>> = {
  en: {
  salesHelper: {
    subject: "the customer call",
    nextStep: "Sales Helper notes or Call Cards",
  },
  callCards: {
    subject: "this call subject",
    nextStep: "the selected Wingman workflow",
  },
  discovery: {
    subject: "the room or application",
    nextStep: "Discovery or Finder",
  },
  finder: {
    subject: "the technical requirement",
    nextStep: "Finder results or pre-sales validation",
  },
  compare: {
    subject: "the comparison",
    nextStep: "Compare output or a WyreStorm specialist",
  },
  productPitch: {
    subject: "the product fit",
    nextStep: "Product Pitch or proposal wording",
  },
  productFamilies: {
    subject: "the system family",
    nextStep: "Product Pitch or Finder",
  },
  templates: {
    subject: "the room template",
    nextStep: "Template review or Proposal",
  },
  videowall: {
    subject: "the wall behaviour",
    nextStep: "Video Wall Builder or pre-sales validation",
  },
  },
  es: {
    salesHelper: {
      subject: "la llamada con el cliente",
      nextStep: "notas de Sales Helper o Call Cards",
    },
    callCards: {
      subject: "este tema de llamada",
      nextStep: "el flujo de Wingman seleccionado",
    },
    discovery: {
      subject: "la sala o aplicacion",
      nextStep: "Discovery o Finder",
    },
    finder: {
      subject: "el requisito tecnico",
      nextStep: "resultados de Finder o validacion de preventa",
    },
    compare: {
      subject: "la comparacion",
      nextStep: "salida de Compare o un especialista de WyreStorm",
    },
    productPitch: {
      subject: "el encaje del producto",
      nextStep: "Product Pitch o texto de propuesta",
    },
    productFamilies: {
      subject: "la familia de sistema",
      nextStep: "Product Pitch o Finder",
    },
    templates: {
      subject: "la plantilla de sala",
      nextStep: "revision de plantilla o Proposal",
    },
    videowall: {
      subject: "el comportamiento del videowall",
      nextStep: "Video Wall Builder o validacion de preventa",
    },
  },
  fr: {
    salesHelper: {
      subject: "l'appel client",
      nextStep: "les notes Sales Helper ou Call Cards",
    },
    callCards: {
      subject: "ce sujet d'appel",
      nextStep: "le parcours Wingman selectionne",
    },
    discovery: {
      subject: "la salle ou l'application",
      nextStep: "Discovery ou Finder",
    },
    finder: {
      subject: "l'exigence technique",
      nextStep: "les resultats Finder ou la validation avant-vente",
    },
    compare: {
      subject: "la comparaison",
      nextStep: "la sortie Compare ou un specialiste WyreStorm",
    },
    productPitch: {
      subject: "l'adequation produit",
      nextStep: "Product Pitch ou le texte de proposition",
    },
    productFamilies: {
      subject: "la famille de systeme",
      nextStep: "Product Pitch ou Finder",
    },
    templates: {
      subject: "le modele de salle",
      nextStep: "la revue du modele ou Proposal",
    },
    videowall: {
      subject: "le comportement du mur video",
      nextStep: "Video Wall Builder ou la validation avant-vente",
    },
  },
  de: {
    salesHelper: {
      subject: "das Kundengesprach",
      nextStep: "Sales Helper Notizen oder Call Cards",
    },
    callCards: {
      subject: "dieses Gesprachsthema",
      nextStep: "den ausgewahlten Wingman Workflow",
    },
    discovery: {
      subject: "den Raum oder die Anwendung",
      nextStep: "Discovery oder Finder",
    },
    finder: {
      subject: "die technische Anforderung",
      nextStep: "Finder Ergebnisse oder Presales Validierung",
    },
    compare: {
      subject: "den Vergleich",
      nextStep: "Compare Ausgabe oder einen WyreStorm Spezialisten",
    },
    productPitch: {
      subject: "die Produktpassung",
      nextStep: "Product Pitch oder Angebotstext",
    },
    productFamilies: {
      subject: "die Systemfamilie",
      nextStep: "Product Pitch oder Finder",
    },
    templates: {
      subject: "die Raumvorlage",
      nextStep: "Vorlagenprufung oder Proposal",
    },
    videowall: {
      subject: "das Videowand-Verhalten",
      nextStep: "Video Wall Builder oder Presales Validierung",
    },
  },
};

export function normalizeSalesConversationToneId(value: unknown): SalesConversationToneId {
  if (value === "warm" || value === "problem") {
    return "trade";
  }

  if (value === "value") {
    return "user";
  }

  if (value === "expert" || value === "handoff") {
    return "consultant";
  }

  const match = salesConversationToneOptions.find((option) => option.id === value);

  return match?.id ?? DEFAULT_SALES_CONVERSATION_TONE_ID;
}

export function normalizeSalesConversationLocale(value: unknown): SalesConversationLocale {
  const match = salesConversationLocaleOptions.find((option) => option.id === value);

  return match?.id ?? DEFAULT_SALES_CONVERSATION_LOCALE;
}

export function buildSalesConversationToneCopy(
  context: SalesConversationContext,
  toneId: SalesConversationToneId,
  localeId: SalesConversationLocale = DEFAULT_SALES_CONVERSATION_LOCALE,
): SalesConversationToneCopy {
  const locale = normalizeSalesConversationLocale(localeId);
  const copy = contextCopy[locale][context];

  if (locale === "es") {
    if (toneId === "user") {
      return {
        title: "Vende la experiencia del usuario.",
        opener: `Que deberian poder hacer las personas con ${copy.subject} sin pensar en la tecnologia?`,
        followUp: "Que les frustra hoy y que haria que el espacio se sintiera mas facil o fiable?",
        handoff: `Captura el resultado para el usuario en lenguaje claro y pasa a ${copy.nextStep}.`,
      };
    }

    if (toneId === "consultant") {
      return {
        title: "Vende la logica del diseno.",
        opener: `Que partes de ${copy.subject} son requisitos fijos y cuales siguen abiertas para validar?`,
        followUp: "Cuales son los requisitos de I/O, resolucion, USB, latencia, audio, control y red?",
        handoff: "Captura requisitos firmes, supuestos y riesgos, y envia el resumen a expertos de WyreStorm para validacion.",
      };
    }

    return {
      title: "Vende la ruta al distribuidor o instalador.",
      opener: `Para ${copy.subject}, que importa mas al canal: cotizar rapido, instalacion limpia, soporte o margen?`,
      followUp: "Que haria esto mas facil de especificar, instalar, entregar y mantener?",
      handoff: `Captura restricciones de instalacion y prioridades comerciales, y pasa a ${copy.nextStep}.`,
    };
  }

  if (locale === "fr") {
    if (toneId === "user") {
      return {
        title: "Vendre l'experience utilisateur.",
        opener: `Que doivent pouvoir faire les utilisateurs avec ${copy.subject} sans penser a la technologie ?`,
        followUp: "Qu'est-ce qui les frustre aujourd'hui, et qu'est-ce qui rendrait l'espace plus simple ou plus fiable ?",
        handoff: `Capturez le resultat attendu en langage clair, puis passez a ${copy.nextStep}.`,
      };
    }

    if (toneId === "consultant") {
      return {
        title: "Vendre la logique de conception.",
        opener: `Quelles parties de ${copy.subject} sont des exigences fixes, et lesquelles restent a valider ?`,
        followUp: "Quels sont les besoins I/O, resolution, USB, latence, audio, controle et reseau ?",
        handoff: "Capturez les exigences fermes, les hypotheses et les risques, puis envoyez le resume aux experts WyreStorm pour validation.",
      };
    }

    return {
      title: "Vendre le chemin au revendeur ou installateur.",
      opener: `Pour ${copy.subject}, qu'est-ce qui compte le plus pour le canal : devis rapide, installation propre, support ou marge ?`,
      followUp: "Qu'est-ce qui rendrait cela plus simple a specifier, installer, livrer et maintenir ?",
      handoff: `Capturez les contraintes d'installation et les priorites commerciales, puis passez a ${copy.nextStep}.`,
    };
  }

  if (locale === "de") {
    if (toneId === "user") {
      return {
        title: "Verkaufe das Nutzererlebnis.",
        opener: `Was sollen Nutzer mit ${copy.subject} tun konnen, ohne uber die Technik nachzudenken?`,
        followUp: "Was frustriert Nutzer heute, und wodurch wurde der Raum einfacher oder zuverlassiger wirken?",
        handoff: `Halte das Nutzerziel in einfacher Sprache fest und gehe dann zu ${copy.nextStep}.`,
      };
    }

    if (toneId === "consultant") {
      return {
        title: "Verkaufe die Designlogik.",
        opener: `Welche Teile von ${copy.subject} sind feste Anforderungen, und welche mussen noch validiert werden?`,
        followUp: "Welche Anforderungen gibt es an I/O, Auflosung, USB, Latenz, Audio, Steuerung und Netzwerk?",
        handoff: "Halte harte Anforderungen, Annahmen und Risiken fest und gib die Zusammenfassung zur Validierung an WyreStorm Experten.",
      };
    }

    return {
      title: "Verkaufe den Weg an Handler oder Installateure.",
      opener: `Was zahlt bei ${copy.subject} fur den Fachhandel am meisten: schnelles Angebot, saubere Installation, Support oder Marge?`,
      followUp: "Was wurde Spezifikation, Installation, Ubergabe und Support einfacher machen?",
      handoff: `Halte Installationsgrenzen und kommerzielle Prioritaten fest und gehe dann zu ${copy.nextStep}.`,
    };
  }

  if (toneId === "user") {
    return {
      title: "Sell the user experience.",
      opener: `What should people be able to do with ${copy.subject} without thinking about the technology?`,
      followUp: "What is frustrating users today, and what would make the space feel easier or more reliable?",
      handoff: `Capture the user outcome in plain language, then move to ${copy.nextStep}.`,
    };
  }

  if (toneId === "consultant") {
    return {
      title: "Sell the design logic.",
      opener: `Which parts of ${copy.subject} are fixed requirements, and which parts are still open for validation?`,
      followUp: "What are the required I/O, resolution, USB, latency, audio, control and network constraints?",
      handoff: "Capture hard requirements, assumptions and risks, then pass the summary to WyreStorm experts for validation.",
    };
  }

  return {
    title: "Sell the route to a dealer or installer.",
    opener: `For ${copy.subject}, what matters most to the trade: quick quoting, clean installation, supportability, or margin?`,
    followUp: "What would make this easier to specify, install, hand over and support?",
    handoff: `Capture install constraints and commercial priorities, then move to ${copy.nextStep}.`,
  };
}
