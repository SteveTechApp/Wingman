// Dutch guided-interview tables — lazy-loaded only when the capture
// language is selected (see discoveryGuidedInterviewI18n.loadInterviewLanguage),
// so the Discovery chunk does not ship every language's phrase data upfront.
import type { LanguageTable } from "./localeTypes";

const table: LanguageTable = {
  stopwords: new Set(["de","het","een","en","of","van","voor","met","zonder","we","wij","ze","zij","is","zijn","hebben","hebt","nodig","wil","willen","zou","zouden","alleen","maar","ongeveer","waarschijnlijk","misschien","ook","gebruiken","gebruikt","gebruik","gaat","gaan","dit","deze","dat","die","wat","hoe","doet","doen","er","kan","kunnen","graag","paar","even","al"]),
  unknown: ["ik weet het niet","weet ik niet","niet zeker","onzeker","onbeslist","geen idee","nog niet","niet bevestigd","niet besloten","geen flauw idee"],
  curated: {
    "opportunity": {
      "meeting-room": [
        "vergaderruimte",
        "vergaderzaal",
        "boardroom",
        "conferentieruimte",
        "huddle",
        "directiekamer",
        "seminarruimte",
        "kantoor",
        "vergadering"
      ],
      "classroom": [
        "klaslokaal",
        "lokaal",
        "onderwijs",
        "collegezaal",
        "hoorcollege",
        "trainingsruimte",
        "les",
        "school",
        "universiteit",
        "hogeschool"
      ],
      "hospitality": [
        "bar",
        "restaurant",
        "locatie",
        "pub",
        "hotel",
        "lounge",
        "horeca",
        "café",
        "cafe",
        "receptie",
        "club"
      ],
      "video-wall": [
        "videowall",
        "led wall",
        "schermwand",
        "muur van schermen",
        "videomuur",
        "digital signage wand",
        "led scherm"
      ],
      "av-over-ip": [
        "over ip",
        "via ip",
        "gedistribueerde video",
        "campus",
        "netwerk",
        "meerdere ruimtes",
        "multi ruimte",
        "ip video",
        "netwerkdistributie"
      ],
      "not-sure": [
        "niet zeker",
        "onzeker",
        "onbeslist",
        "weet ik niet",
        "geen idee",
        "onbekend"
      ]
    },
    "scale": {
      "single-small-room": [
        "kleine ruimte",
        "klein lokaal",
        "huddle ruimte",
        "een ruimte",
        "een enkele ruimte",
        "1 ruimte",
        "klein"
      ],
      "single-large-room": [
        "grote ruimte",
        "groot lokaal",
        "een grote ruimte",
        "groot",
        "boardroom"
      ],
      "multi-room": [
        "meerdere ruimtes",
        "multi ruimte",
        "verschillende ruimtes",
        "twee ruimtes",
        "drie ruimtes",
        "enkele ruimtes",
        "meerdere"
      ],
      "building-wide": [
        "gebouw",
        "campus",
        "de hele verdieping",
        "de volledige verdieping",
        "het hele gebouw",
        "het volledige gebouw",
        "verdieping"
      ],
      "unknown-scale": [
        "niet zeker",
        "onbekend",
        "weet ik niet"
      ]
    },
    "sources": {
      "one-source": [
        "een bron",
        "één bron",
        "1 bron",
        "een laptop",
        "een enkele laptop"
      ],
      "two-four-sources": [
        "twee",
        "2",
        "vier",
        "4",
        "een paar",
        "twee laptops",
        "twee bronnen",
        "weinig bronnen"
      ],
      "five-eight-sources": [
        "vijf",
        "5",
        "zes",
        "6",
        "zeven",
        "7",
        "acht",
        "8"
      ],
      "nine-plus-sources": [
        "negen",
        "9",
        "tien",
        "10",
        "dozijn",
        "veel bronnen",
        "elf",
        "twaalf"
      ],
      "unknown-sources": [
        "niet zeker",
        "onbekend",
        "weet ik niet"
      ]
    },
    "displays": {
      "one-display": [
        "een display",
        "een scherm",
        "een monitor",
        "1 scherm",
        "slechts een",
        "maar een"
      ],
      "two-displays": [
        "twee displays",
        "twee schermen",
        "dubbel",
        "2 schermen",
        "paar schermen"
      ],
      "three-eight-displays": [
        "drie",
        "3",
        "vier",
        "4",
        "vijf",
        "5",
        "zes",
        "6",
        "zeven",
        "7",
        "acht",
        "8",
        "een paar schermen"
      ],
      "nine-plus-displays": [
        "negen",
        "9",
        "tien",
        "10",
        "dozijn",
        "veel schermen",
        "veel displays"
      ],
      "video-wall-output": [
        "videowall",
        "led wall",
        "schermwand",
        "videomuur",
        "led processor"
      ]
    },
    "display-behaviour": {
      "same-content-all-displays": [
        "zelfde inhoud",
        "zelfde beeld",
        "op alle",
        "spiegel",
        "gespiegeld",
        "alle schermen",
        "alles hetzelfde"
      ],
      "independent-routing-per-display": [
        "andere inhoud",
        "verschillende inhoud",
        "onafhankelijk",
        "elk scherm",
        "elk display",
        "gescheiden",
        "individueel",
        "zone",
        "overal naar overal"
      ],
      "video-wall-or-processor-feed": [
        "videowall",
        "led wall",
        "processor feed",
        "volledig canvas",
        "muurprocessor"
      ],
      "multiview-on-one-output": [
        "multiview",
        "meerdere bronnen",
        "verschillende bronnen op een",
        "samengesteld",
        "vensters op een",
        "een uitgang"
      ],
      "unknown-display-behaviour": [
        "niet zeker",
        "onbekend",
        "weet ik niet"
      ]
    },
    "signal-standard": {
      "1080p-standard-hdmi": [
        "1080p",
        "1080",
        "standaard hd",
        "full hd",
        "hd beeld"
      ],
      "4k60-standard": [
        "standaard 4k",
        "4k60",
        "uhd",
        "3840",
        "normaal 4k"
      ],
      "4k60-hdr-hdcp": [
        "4k hdr",
        "hdr",
        "hdcp",
        "premium 4k",
        "hoog dynamisch bereik",
        "4k met hdr"
      ],
      "legacy-edid-risk": [
        "edid",
        "oudere schermen",
        "oude schermen",
        "gemengde schermen",
        "compatibiliteitsproblemen",
        "oud en nieuw"
      ],
      "unknown-signal-standard": [
        "niet zeker",
        "onbekend",
        "weet ik niet"
      ]
    },
    "source-connection": {
      "fixed-hdmi-sources": [
        "media player",
        "room pc",
        "signage player",
        "set top box",
        "apple tv",
        "vast",
        "vaste",
        "permanent",
        "decoder",
        "blu ray",
        "vaste bronnen"
      ],
      "laptops-wireless-inputs": [
        "laptop",
        "usb c",
        "usb-c",
        "draadloze presentatie",
        "airplay",
        "miracast",
        "scherm delen",
        "casting",
        "byod",
        "laptops"
      ],
      "mixed-hdmi-usbc": [
        "gemengd",
        "beide",
        "vast en",
        "en laptops",
        "laptops en",
        "mix van"
      ],
      "network-video-sources": [
        "netwerk video",
        "ndi",
        "over ip",
        "streams",
        "netwerkbronnen",
        "ip camera's"
      ],
      "unknown-source-connectors": [
        "niet zeker",
        "onbekend",
        "weet ik niet"
      ]
    },
    "uc-purpose": {
      "video-conferencing": [
        "videoconferentie",
        "conferentie",
        "teams",
        "zoom",
        "gesprekken",
        "videogesprek",
        "skype",
        "webex",
        "online vergadering",
        "telefoongesprekken"
      ],
      "recording-streaming": [
        "opname",
        "opnemen",
        "streaming",
        "stream",
        "college capture",
        "webcast",
        "live stream",
        "vastleggen"
      ],
      "camera-distribution-only": [
        "camera distributie",
        "camera sturen",
        "camera routeren",
        "camera naar scherm",
        "camera naar de tv",
        "camera routing"
      ],
      "microphones-only": [
        "alleen microfoons",
        "alleen mics",
        "geen camera",
        "spraakversterking",
        "omroep",
        "aankondiging",
        "geluidsversterking"
      ],
      "no-uc": [
        "geen camera",
        "geen microfoon",
        "geen camera's",
        "geen mics",
        "geen conferentie",
        "geen videoconferentie",
        "niets",
        "geen"
      ],
      "unknown-uc": [
        "niet zeker",
        "onbekend",
        "weet ik niet"
      ]
    },
    "uc-camera": {
      "fixed-usb-camera": [
        "webcam",
        "vaste camera",
        "usb camera",
        "meeting owl",
        "ingebouwde camera",
        "logitech",
        "vast usb"
      ],
      "usb-ptz-camera": [
        "usb ptz",
        "ptz camera",
        "pan tilt",
        "bewegende camera",
        "ptz"
      ],
      "hdmi-ptz-camera": [
        "hdmi ptz",
        "hdmi camera",
        "camera met hdmi"
      ],
      "ndi-network-camera": [
        "ndi",
        "netwerkcamera",
        "ip camera",
        "netwerk ptz",
        "ndi ptz"
      ],
      "other-camera": [
        "bestaande camera",
        "sdi",
        "oude camera",
        "analoge camera",
        "andere camera"
      ],
      "unknown-camera": [
        "niet zeker",
        "onbekend",
        "weet ik niet"
      ]
    },
    "uc-camera-count": {
      "one-camera": [
        "een camera",
        "enkele camera",
        "1 camera",
        "slechts een"
      ],
      "two-cameras": [
        "twee camera's",
        "2 camera's",
        "paar camera's",
        "dubbele camera's"
      ],
      "three-four-cameras": [
        "drie",
        "3",
        "vier",
        "4",
        "drie camera's",
        "vier camera's"
      ],
      "five-plus-cameras": [
        "vijf",
        "5",
        "meer dan vier",
        "zes",
        "6",
        "verschillende camera's"
      ],
      "unknown-camera-count": [
        "niet zeker",
        "onbekend",
        "weet ik niet"
      ]
    },
    "uc-microphones": {
      "speakerphone": [
        "speakerphone",
        "conferentiebox",
        "soundbar",
        "tafelbox",
        "jabra",
        "poly",
        "tafel luidspreker"
      ],
      "table-microphone": [
        "tafelmicrofoon",
        "tafel mic",
        "bureaumicrofoon",
        "zwanenhals",
        "gooseneck"
      ],
      "ceiling-microphone-array": [
        "plafond",
        "plafond array",
        "boven het hoofd",
        "plafondmicrofoon",
        "array"
      ],
      "wireless-microphone": [
        "draadloos",
        "draadloze microfoon",
        "radio mic",
        "lavalier",
        "handheld",
        "koptelefoon",
        "headset"
      ],
      "lectern-microphone": [
        "spreekgestoelte",
        "podium",
        "katheder",
        "lessenaar microfoon"
      ],
      "existing-microphone-system": [
        "bestaand",
        "al aanwezig",
        "geïnstalleerd",
        "bestaand systeem"
      ],
      "no-microphones": [
        "geen microfoons",
        "geen mics",
        "geen microfoon",
        "geen",
        "niets"
      ],
      "unknown-microphones": [
        "niet zeker",
        "onbekend",
        "weet ik niet"
      ]
    },
    "uc-microphone-count": {
      "one-microphone-feed": [
        "een",
        "enkel",
        "1",
        "een feed",
        "een microfoon"
      ],
      "two-four-microphone-feeds": [
        "twee",
        "2",
        "drie",
        "3",
        "vier",
        "4",
        "een paar"
      ],
      "five-eight-microphone-feeds": [
        "vijf",
        "5",
        "zes",
        "6",
        "zeven",
        "7",
        "acht",
        "8"
      ],
      "nine-plus-microphone-feeds": [
        "negen",
        "9",
        "tien",
        "10",
        "veel",
        "vele"
      ],
      "unknown-microphone-count": [
        "niet zeker",
        "onbekend",
        "weet ik niet"
      ]
    },
    "usb": {
      "no-usb": [
        "geen usb",
        "zonder usb",
        "geen usb transport"
      ],
      "byod-byom": [
        "bezoekerslaptop",
        "gastlaptop",
        "de laptop is de eigenaar",
        "mijn laptop",
        "gebruikerslaptop",
        "hun laptop aansluiten",
        "byod"
      ],
      "room-pc-uc": [
        "room pc",
        "de teams room is de eigenaar",
        "het apparaat is de eigenaar",
        "room computer",
        "vaste pc"
      ],
      "switchable-host-usb": [
        "wisselen",
        "schakelbaar",
        "host switch",
        "wisselen tussen",
        "overnemen",
        "host wijzigen"
      ],
      "room-host-usb2": [
        "usb 2",
        "standaard usb",
        "usb 2.0",
        "basis usb"
      ],
      "usb3-high-bandwidth-path": [
        "usb 3",
        "usb3",
        "hoge bandbreedte",
        "3.0",
        "snel usb"
      ],
      "usb-extension-required": [
        "verlengen",
        "extensie",
        "lange afstand",
        "ver weg",
        "usb over"
      ],
      "interactive-usb": [
        "touch",
        "aanraking",
        "interactief",
        "annotatie",
        "touchback"
      ],
      "unknown-usb": [
        "niet zeker",
        "onbekend",
        "weet ik niet"
      ]
    },
    "audio": {
      "no-room-audio": [
        "geen audio",
        "geen luidsprekers",
        "geen ruimte audio",
        "geen",
        "geen geluidssysteem"
      ],
      "display-audio": [
        "scherm luidsprekers",
        "display luidsprekers",
        "tv luidsprekers",
        "soundbar op het scherm",
        "audio van het scherm"
      ],
      "source-audio-deembed": [
        "de-embed",
        "audio extraheren",
        "audio eruit",
        "audio naar de mixer",
        "extraheren"
      ],
      "room-audio": [
        "ruimte luidsprekers",
        "plafondluidsprekers",
        "versterker",
        "amp",
        "luidsprekers in de ruimte",
        "ruimte audio"
      ],
      "stereo-low-impedance": [
        "stereo",
        "lage impedantie",
        "4 ohm",
        "8 ohm",
        "hifi"
      ],
      "multichannel-audio": [
        "surround",
        "5.1",
        "7.1",
        "multikanaal"
      ],
      "distributed-70v-100v": [
        "70 volt",
        "70v",
        "100v",
        "gedistribueerde luidsprekers",
        "achtergrondmuziek",
        "zones",
        "gezoneerd",
        "constante spanning"
      ],
      "separate-programme-voice": [
        "gescheiden programma",
        "spraakversterking",
        "spraak en muziek",
        "programma en stem"
      ],
      "analogue-audio-override": [
        "analoog",
        "fallback",
        "lokale override"
      ],
      "digital-audio-interface": [
        "digitaal audio",
        "aes",
        "spdif",
        "spdif uitgang",
        "aes ebu"
      ],
      "dante-network-audio": [
        "dante",
        "netwerk audio",
        "aes67"
      ],
      "unknown-audio": [
        "niet zeker",
        "onbekend",
        "weet ik niet"
      ]
    },
    "control": {
      "simple-auto": [
        "automatisch",
        "auto",
        "eenvoudig",
        "een knop",
        "preset",
        "geen bediening",
        "werkt vanzelf"
      ],
      "front-panel-remote": [
        "afstandsbediening",
        "voorpaneel",
        "ir afstandsbediening",
        "handheld afstandsbediening"
      ],
      "touch-panel": [
        "touch panel",
        "touchscreen",
        "aanraakscherm",
        "wandpaneel",
        "toetsenbord",
        "toetsenpaneel",
        "touch"
      ],
      "software-app-control": [
        "app",
        "software",
        "browser",
        "tablet app",
        "mobiele app",
        "webpagina"
      ],
      "third-party-control": [
        "crestron",
        "control4",
        "qsys",
        "q-sys",
        "amx",
        "extron",
        "besturingssysteem",
        "integratie",
        "bms"
      ],
      "unknown-control": [
        "niet zeker",
        "onbekend",
        "weet ik niet"
      ]
    }
  },
  questionTranslations: {
    "opportunity": {
      "question": "Wat voor soort project is dit?",
      "prompt": "Selecteer de dichtstbijzijnde klanttoepassing."
    },
    "scale": {
      "question": "Wat is de geschatte schaal van de ruimte of het systeem?",
      "prompt": "Kies de dichtstbijzijnde schaal. Exacte afmetingen kunnen in het notitieveld worden vastgelegd."
    },
    "sources": {
      "question": "Hoeveel bronnen zijn er waarschijnlijk?",
      "prompt": "Denk aan laptops, pc's, media players, signage players en draadloze presentatie-ingangen."
    },
    "source-connection": {
      "question": "Welk bronprofiel beschrijft de ruimte het best?",
      "prompt": "Kies de meest nabije algehele bronworkflow. Camera- en microfoonvereisten worden apart vastgelegd in Unified Communications."
    },
    "displays": {
      "question": "Hoeveel displays of uitgangen zijn er nodig?",
      "prompt": "Inclusief projectoren, confidence monitors, overflow displays, videowalls en led-processors."
    },
    "display-behaviour": {
      "question": "Hoe moeten de displays zich gedragen?",
      "prompt": "Geef aan of uitgangen spiegelen, onafhankelijk routeren, een muurprocessor voeden of meerdere bronnen op één canvas tonen."
    },
    "signal-standard": {
      "question": "Hoe scherp moet het beeld zijn?",
      "prompt": "Kies de dichtstbijzijnde beeldkwaliteit. Als de displays een mix van oud en nieuw zijn, of zeer high-end, zeg het dan hieronder — de technische controles (HDR, HDCP, EDID) worden op de achtergrond afgehandeld."
    },
    "uc-purpose": {
      "question": "Welke camera-, microfoon- of capture-workflows zijn vereist?",
      "prompt": "Selecteer elke toepasselijke workflow. Conferencing, opname en cameradistributie kunnen samen nodig zijn."
    },
    "uc-platform": {
      "question": "Wat zal de oproep of capture-workflow uitvoeren?",
      "prompt": "Identificeer het conferentie- of captureplatform voordat u USB-eigendom en host-switching bepaalt."
    },
    "mtr-av-integration": {
      "question": "Hoe moet de Microsoft Teams Room verbinding maken met het AV-systeem?",
      "prompt": "Bevestig beide signaalrichtingen. Een Teams Room heeft doorgaans een AV-systeemfeed in de MTR nodig voor delen of vastleggen, plus een MTR-uitgang terug in het AV-systeem voor distributie naar de ruimtedisplays."
    },
    "uc-camera": {
      "question": "Welke cameratypen zijn vereist?",
      "prompt": "Selecteer elk toepasselijk cameratype. Aantal, posities en exacte modellen kunnen in de notities worden vastgelegd."
    },
    "uc-camera-count": {
      "question": "Hoeveel camera's moet de videoconferentieruimte gebruiken?",
      "prompt": "Een ruimte met meer dan één camera heeft een camera-bridge of compositing-pad nodig zodat de conferentiehost een bruikbare programmefeed ontvangt."
    },
    "uc-multi-camera-path": {
      "question": "Gebruikt de multi-cameraruimte NDI-camera's?",
      "prompt": "Kies het cameratransport zodat Wingman de juiste bridge-architectuur kan toepassen."
    },
    "uc-camera-routing": {
      "question": "Waar moeten de camerafeeds worden gebruikt?",
      "prompt": "Een camera telt alleen als gerouteerde AV-bron wanneer de feed het conferentie-periferiepad moet verlaten."
    },
    "uc-microphones": {
      "question": "Welke microfoontypen zijn vereist?",
      "prompt": "Leg hier spraakingangen vast. Luidsprekers, versterking en algemene ruimte-audio blijven in de afzonderlijke Audiostap."
    },
    "uc-microphone-connection": {
      "question": "Hoe worden de microfoons aangesloten?",
      "prompt": "Selecteer elke toepasselijke microfooninterface, voeding en signaalpad."
    },
    "uc-microphone-count": {
      "question": "Hoeveel microfoonfeeds of pickupzones zijn vereist?",
      "prompt": "Tel onafhankelijke arrays, kanalen en zones."
    },
    "usb": {
      "question": "Wie is de eigenaar van de USB-apparaten en hoe moet het USB-signaal reizen?",
      "prompt": "Selecteer de host-, switch- en bandbreedtevereisten voor camera's, speakerphones, touchdisplays en capture-apparaten."
    },
    "audio": {
      "question": "Hoe moet ruimte-audio worden aangesloten en bediend?",
      "prompt": "Selecteer de vereisten voor weergave, versterking, distributie en spraakversterking."
    },
    "control": {
      "question": "Hoe moeten mensen in de ruimte het systeem bedienen?",
      "prompt": "Denk aan personeelsgebruik, wandbediening, touchpanels, software- of app-bediening, bediening door derden, automatisering of eenvoudige bronselectie."
    },
    "locations-connections": {
      "question": "Waar staat de apparatuur en hoe ver moeten signalen reizen?",
      "prompt": "Kies brede ruimteposities, de langste videoroute en het waarschijnlijke kabelpad. Leg alleen vast wat de hardwarekeuze beïnvloedt — exacte metingen, montagehoogte van displays, kabelgoten en rackposities worden bevestigd tijdens de sitesurvey, niet hier."
    },
    "avoip-profile": {
      "question": "Welke van deze opties klinkt het meest als wat de klant nodig heeft?",
      "prompt": "Houd het eenvoudig — kies wat het meest telt: kosten, beeldkwaliteit, apparaten verbinden of meerdere bronnen tegelijk op één scherm tonen."
    },
    "video-wall-technology": {
      "question": "Wat voor videowall wordt gepland?",
      "prompt": "Kies de fysieke displaytechnologie. Als het niet bevestigd is, houdt Wingman beide ontwerppaden open."
    },
    "video-wall-purpose": {
      "question": "Hoe moet de muur inhoud presenteren?",
      "prompt": "Selecteer het dichtstbijzijnde operationele model. Deze beslissing bepaalt of gedetailleerde multiview-vragen nodig zijn."
    },
    "source-device-workflows": {
      "question": "Welke apparaten en feeds zullen mensen gebruiken?",
      "prompt": "Selecteer elke bronfamilie."
    },
    "wireless-presentation-operation": {
      "question": "Hoe moet draadloze presentatie werken?",
      "prompt": "Kies het verbindings-, beveiligings- en deelgedrag."
    },
    "multiview-destination": {
      "question": "Waar moet multiview verschijnen?",
      "prompt": "Selecteer elke bestemming."
    },
    "multiview-operation": {
      "question": "Hoe moeten multiview-layouts werken?",
      "prompt": "Definieer bronaantal, lay-out en bediening."
    },
    "uc-audio-processing": {
      "question": "Hoe moeten microfoon- en programmaudio werken?",
      "prompt": "Selecteer de uitkomsten voor mix, bridging, DSP en uitgangen."
    }
  },
  voicePreview: "Hallo. Ik stel u een paar vragen over deze ruimte, en Wingman bouwt het systeem terwijl we verder gaan.",
};

export default table;
