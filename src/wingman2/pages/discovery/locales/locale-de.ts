// German guided-interview tables — lazy-loaded only when the capture
// language is selected (see discoveryGuidedInterviewI18n.loadInterviewLanguage),
// so the Discovery chunk does not ship every language's phrase data upfront.
import type { LanguageTable } from "./localeTypes";

const table: LanguageTable = {
  stopwords: new Set(["der","die","das","ein","eine","einen","einem","einer","und","oder","zu","zum","zur","für","fuer","mit","auf","in","über","ueber","ber","wir","sie","es","ist","sind","haben","brauchen","braucht","wollen","möchte","moechte","chte","nur","etwa","ungefähr","ungefaehr","ungefhr","wahrscheinlich","vielleicht","auch","beide","benutzen","benutzt","verwenden","verwendet","wird","gehen","diese","dieser","dieses","was","wie","macht","machen","soll","sollen","kann","können","koennen","gibt"]),
  unknown: ["ich weiß nicht","ich weiss nicht","nicht sicher","unsicher","unentschieden","keine ahnung","noch nicht","nicht bestätigt","nicht bestaetigt","weiß nicht","weiss nicht"],
  curated: {
    "opportunity": {
      "meeting-room": [
        "besprechungsraum",
        "konferenzraum",
        "vorstandszimmer",
        "huddle",
        "executive raum",
        "seminarraum",
        "büro",
        "besprechung"
      ],
      "classroom": [
        "klassenzimmer",
        "unterricht",
        "vorlesungsraum",
        "hörsaal",
        "schulungsraum",
        "lektion",
        "schule",
        "universität",
        "college",
        "bildung",
        "vorlesung"
      ],
      "hospitality": [
        "bar",
        "restaurant",
        "lokal",
        "pub",
        "hotel",
        "lounge",
        "gastgewerbe",
        "café",
        "cafe",
        "empfang",
        "club"
      ],
      "video-wall": [
        "videowand",
        "led wand",
        "led-wand",
        "bildschirmwand",
        "wand aus bildschirmen",
        "digital signage wand",
        "led bildschirm"
      ],
      "av-over-ip": [
        "über ip",
        "übers netzwerk",
        "verteiltes video",
        "campus",
        "vernetzt",
        "viele räume",
        "mehrere räume",
        "multi raum",
        "ip video",
        "netzwerkverteilung"
      ],
      "not-sure": [
        "nicht sicher",
        "unsicher",
        "unentschieden",
        "ich weiß nicht",
        "keine ahnung",
        "unbekannt"
      ]
    },
    "scale": {
      "single-small-room": [
        "kleiner raum",
        "huddle raum",
        "ein raum",
        "einzelner raum",
        "1 raum",
        "klein"
      ],
      "single-large-room": [
        "großer raum",
        "großer raum",
        "ein großer raum",
        "einzelnes großes",
        "groß"
      ],
      "multi-room": [
        "mehrere räume",
        "multi raum",
        "zwei räume",
        "drei räume",
        "einige räume",
        "mehrere"
      ],
      "building-wide": [
        "gebäude",
        "campus",
        "ganze etage",
        "gesamte etage",
        "ganzes gebäude",
        "gesamtes gebäude",
        "standortweit",
        "etage"
      ],
      "unknown-scale": [
        "nicht sicher",
        "unbekannt",
        "ich weiß nicht"
      ]
    },
    "sources": {
      "one-source": [
        "eine quelle",
        "einzelne quelle",
        "1 quelle",
        "ein laptop",
        "ein einzelner laptop"
      ],
      "two-four-sources": [
        "zwei",
        "2",
        "vier",
        "4",
        "ein paar",
        "paar",
        "zwei laptops",
        "zwei quellen",
        "wenige quellen"
      ],
      "five-eight-sources": [
        "fünf",
        "5",
        "sechs",
        "6",
        "sieben",
        "7",
        "acht",
        "8"
      ],
      "nine-plus-sources": [
        "neun",
        "9",
        "zehn",
        "10",
        "dutzend",
        "viele",
        "viele quellen",
        "elf",
        "zwölf"
      ],
      "unknown-sources": [
        "nicht sicher",
        "unbekannt",
        "ich weiß nicht"
      ]
    },
    "displays": {
      "one-display": [
        "ein display",
        "einzelnes display",
        "ein bildschirm",
        "einzelner bildschirm",
        "1 bildschirm",
        "nur einer"
      ],
      "two-displays": [
        "zwei displays",
        "zwei bildschirme",
        "dual",
        "2 bildschirme",
        "paar bildschirme"
      ],
      "three-eight-displays": [
        "drei",
        "3",
        "vier",
        "4",
        "fünf",
        "5",
        "sechs",
        "6",
        "sieben",
        "7",
        "acht",
        "8",
        "ein paar bildschirme"
      ],
      "nine-plus-displays": [
        "neun",
        "9",
        "zehn",
        "10",
        "dutzend",
        "viele bildschirme",
        "viele displays"
      ],
      "video-wall-output": [
        "videowand",
        "led wand",
        "led-wand",
        "bildschirmwand",
        "led prozessor"
      ]
    },
    "display-behaviour": {
      "same-content-all-displays": [
        "gleicher inhalt",
        "gleich auf allen",
        "spiegel",
        "gespiegelt",
        "alle bildschirme",
        "alles gleich",
        "gleiches bild"
      ],
      "independent-routing-per-display": [
        "verschiedener inhalt",
        "unabhängig",
        "jeder bildschirm",
        "jedes display",
        "getrennt",
        "einzeln",
        "zone",
        "überall hin"
      ],
      "video-wall-or-processor-feed": [
        "videowand",
        "led wand",
        "prozessor feed",
        "volle leinwand",
        "wandprozessor"
      ],
      "multiview-on-one-output": [
        "multiview",
        "multi view",
        "mehrere quellen",
        "komponiert",
        "fenster auf einem",
        "ein ausgang"
      ],
      "unknown-display-behaviour": [
        "nicht sicher",
        "unbekannt",
        "ich weiß nicht"
      ]
    },
    "signal-standard": {
      "1080p-standard-hdmi": [
        "1080p",
        "1080",
        "standard hd",
        "full hd",
        "hd bild"
      ],
      "4k60-standard": [
        "standard 4k",
        "4k60",
        "uhd",
        "3840",
        "normales 4k"
      ],
      "4k60-hdr-hdcp": [
        "4k hdr",
        "hdr",
        "hdcp",
        "premium 4k",
        "hoher dynamikbereich",
        "4k mit hdr"
      ],
      "legacy-edid-risk": [
        "edid",
        "legacy",
        "ältere bildschirme",
        "alte bildschirme",
        "gemischte bildschirme",
        "kompatibilitätsprobleme",
        "alt und neu"
      ],
      "unknown-signal-standard": [
        "nicht sicher",
        "unbekannt",
        "ich weiß nicht"
      ]
    },
    "source-connection": {
      "fixed-hdmi-sources": [
        "media player",
        "raum pc",
        "signage player",
        "set top box",
        "apple tv",
        "fest",
        "permanent",
        "kabelbox",
        "blu ray",
        "feste quellen"
      ],
      "laptops-wireless-inputs": [
        "laptop",
        "usb c",
        "usb-c",
        "drahtlose präsentation",
        "airplay",
        "miracast",
        "bildschirm teilen",
        "casting",
        "byod",
        "laptops"
      ],
      "mixed-hdmi-usbc": [
        "gemischt",
        "beides",
        "fest und",
        "und laptops",
        "mischung"
      ],
      "network-video-sources": [
        "netzwerk video",
        "ndi",
        "über ip",
        "streams",
        "netzwerkquellen",
        "ip kameras"
      ],
      "unknown-source-connectors": [
        "nicht sicher",
        "unbekannt",
        "ich weiß nicht"
      ]
    },
    "uc-purpose": {
      "video-conferencing": [
        "videokonferenz",
        "konferenz",
        "teams",
        "zoom",
        "anrufe",
        "videoanruf",
        "skype",
        "webex",
        "online besprechung",
        "telefonanrufe"
      ],
      "recording-streaming": [
        "aufnahme",
        "aufnehmen",
        "streaming",
        "stream",
        "vorlesungsaufzeichnung",
        "webcast",
        "live stream",
        "capture"
      ],
      "camera-distribution-only": [
        "kameraverteilung",
        "kamera senden",
        "kamera routen",
        "kamera zum display",
        "kamera zum bildschirm",
        "kamera zum fernseher"
      ],
      "microphones-only": [
        "nur mikrofone",
        "nur mics",
        "nur mikro",
        "keine kamera",
        "sprachverstärkung",
        "durchsage",
        "ansage",
        "beschallung"
      ],
      "no-uc": [
        "keine kamera",
        "kein mikrofon",
        "keine kameras",
        "keine mics",
        "keine konferenz",
        "keine videokonferenz",
        "nichts",
        "keins"
      ],
      "unknown-uc": [
        "nicht sicher",
        "unbekannt",
        "ich weiß nicht"
      ]
    },
    "uc-camera": {
      "fixed-usb-camera": [
        "webcam",
        "feste kamera",
        "usb kamera",
        "meeting owl",
        "eingebaute kamera",
        "logitech",
        "festes usb"
      ],
      "usb-ptz-camera": [
        "usb ptz",
        "ptz kamera",
        "pan tilt",
        "schwenk neige",
        "ptz"
      ],
      "hdmi-ptz-camera": [
        "hdmi ptz",
        "hdmi kamera",
        "kamera mit hdmi"
      ],
      "ndi-network-camera": [
        "ndi",
        "netzwerkkamera",
        "ip kamera",
        "netzwerk ptz",
        "ndi ptz"
      ],
      "other-camera": [
        "vorhandene kamera",
        "sdi",
        "alte kamera",
        "analoge kamera",
        "andere kamera"
      ],
      "unknown-camera": [
        "nicht sicher",
        "unbekannt",
        "ich weiß nicht"
      ]
    },
    "uc-camera-count": {
      "one-camera": [
        "eine kamera",
        "eine einzige kamera",
        "1 kamera",
        "nur eine"
      ],
      "two-cameras": [
        "zwei kameras",
        "2 kameras",
        "paar kameras",
        "doppelte kameras"
      ],
      "three-four-cameras": [
        "drei",
        "3",
        "vier",
        "4",
        "drei kameras",
        "vier kameras"
      ],
      "five-plus-cameras": [
        "fünf",
        "5",
        "mehr als vier",
        "sechs",
        "6",
        "mehrere kameras"
      ],
      "unknown-camera-count": [
        "nicht sicher",
        "unbekannt",
        "ich weiß nicht"
      ]
    },
    "uc-microphones": {
      "speakerphone": [
        "freisprecheinrichtung",
        "konferenzlautsprecher",
        "soundbar",
        "jabra",
        "poly",
        "tischlautsprecher"
      ],
      "table-microphone": [
        "tischmikrofon",
        "tisch mikro",
        "schreibtischmikro",
        "gooseneck",
        "mikro auf dem tisch"
      ],
      "ceiling-microphone-array": [
        "decke",
        "decken array",
        "überkopf",
        "decken mikro",
        "deckenmikrofon",
        "array"
      ],
      "wireless-microphone": [
        "drahtlos",
        "funkmikro",
        "ansteckmikrofon",
        "lavalier",
        "handmikrofon",
        "kopfhörer",
        "drahtloses mikro"
      ],
      "lectern-microphone": [
        "pult",
        "podium",
        "katheder",
        "pultmikrofon"
      ],
      "existing-microphone-system": [
        "vorhanden",
        "haben wir schon",
        "installiert",
        "bestehendes system"
      ],
      "no-microphones": [
        "keine mikrofone",
        "keine mics",
        "kein mikro",
        "keins",
        "kein mikrofon"
      ],
      "unknown-microphones": [
        "nicht sicher",
        "unbekannt",
        "ich weiß nicht"
      ]
    },
    "uc-microphone-count": {
      "one-microphone-feed": [
        "eins",
        "einzelnes",
        "1",
        "ein feed",
        "ein mikro"
      ],
      "two-four-microphone-feeds": [
        "zwei",
        "2",
        "drei",
        "3",
        "vier",
        "4",
        "ein paar",
        "paar"
      ],
      "five-eight-microphone-feeds": [
        "fünf",
        "5",
        "sechs",
        "6",
        "sieben",
        "7",
        "acht",
        "8"
      ],
      "nine-plus-microphone-feeds": [
        "neun",
        "9",
        "zehn",
        "10",
        "viele",
        "zahlreiche"
      ],
      "unknown-microphone-count": [
        "nicht sicher",
        "unbekannt",
        "ich weiß nicht"
      ]
    },
    "usb": {
      "no-usb": [
        "kein usb",
        "keine usb",
        "ohne usb",
        "kein usb transport"
      ],
      "byod-byom": [
        "gast laptop",
        "laptop gehört",
        "ihr laptop",
        "mein laptop",
        "benutzer laptop",
        "laptop nutzt",
        "ihren laptop anschließen",
        "byod"
      ],
      "room-pc-uc": [
        "raum pc",
        "teams raum gehört",
        "gerät gehört",
        "raumcomputer",
        "der raum gehört",
        "fester pc"
      ],
      "switchable-host-usb": [
        "umschalten",
        "umschaltbar",
        "host umschaltung",
        "host wechseln",
        "übernehmen"
      ],
      "room-host-usb2": [
        "usb 2",
        "standard usb",
        "usb 2.0",
        "basis usb"
      ],
      "usb3-high-bandwidth-path": [
        "usb 3",
        "usb3",
        "hohe bandbreite",
        "3.0",
        "schnelles usb"
      ],
      "usb-extension-required": [
        "verlängern",
        "erweiterung",
        "lange strecke",
        "distanz",
        "weit weg",
        "lange leitung",
        "usb über"
      ],
      "interactive-usb": [
        "touch",
        "interaktiv",
        "annotation",
        "touchback"
      ],
      "unknown-usb": [
        "nicht sicher",
        "unbekannt",
        "ich weiß nicht"
      ]
    },
    "audio": {
      "no-room-audio": [
        "kein audio",
        "keine lautsprecher",
        "kein raum audio",
        "keins",
        "kein ton"
      ],
      "display-audio": [
        "bildschirm lautsprecher",
        "monitor lautsprecher",
        "tv lautsprecher",
        "soundbar am display",
        "display audio",
        "lautsprecher im bildschirm"
      ],
      "source-audio-deembed": [
        "de embed",
        "de-embed",
        "audio extrahieren",
        "separater audio ausgang",
        "audio zum mischer",
        "extrahieren"
      ],
      "room-audio": [
        "raum lautsprecher",
        "deckenlautsprecher",
        "verstärker",
        "amp",
        "lautsprecher",
        "lautsprecher im raum",
        "aktive lautsprecher",
        "raum audio"
      ],
      "stereo-low-impedance": [
        "stereo",
        "niedrige impedanz",
        "4 ohm",
        "8 ohm",
        "hi fi"
      ],
      "multichannel-audio": [
        "surround",
        "5.1",
        "7.1",
        "mehrkanal",
        "multi kanal"
      ],
      "distributed-70v-100v": [
        "70 volt",
        "70v",
        "100v",
        "verteilte lautsprecher",
        "hintergrundmusik",
        "zonen",
        "gezont",
        "konstantspannung"
      ],
      "separate-programme-voice": [
        "getrenntes programm",
        "sprachverstärkung",
        "sprache und musik",
        "programm und sprache"
      ],
      "analogue-audio-override": [
        "analog",
        "fallback",
        "lokale übersteuerung"
      ],
      "digital-audio-interface": [
        "digital audio",
        "aes",
        "spdif",
        "spdif ausgang",
        "aes ebu"
      ],
      "dante-network-audio": [
        "dante",
        "netzwerk audio",
        "aes67"
      ],
      "unknown-audio": [
        "nicht sicher",
        "unbekannt",
        "ich weiß nicht"
      ]
    },
    "control": {
      "simple-auto": [
        "automatisch",
        "auto",
        "einfach",
        "ein knopf",
        "preset",
        "keine steuerung",
        "funktioniert einfach"
      ],
      "front-panel-remote": [
        "fernbedienung",
        "front panel",
        "ir fernbedienung",
        "handfernbedienung"
      ],
      "touch-panel": [
        "touch panel",
        "touchscreen",
        "touch screen",
        "wandpanel",
        "keypad",
        "touch"
      ],
      "software-app-control": [
        "app",
        "software",
        "browser",
        "tablet app",
        "mobile app",
        "webseite"
      ],
      "third-party-control": [
        "crestron",
        "control4",
        "qsys",
        "q-sys",
        "amx",
        "extron",
        "steuerungssystem",
        "integration",
        "bms"
      ],
      "unknown-control": [
        "nicht sicher",
        "unbekannt",
        "ich weiß nicht"
      ]
    }
  },
  questionTranslations: {
    "opportunity": {
      "question": "Um welche Art von Projekt handelt es sich?",
      "prompt": "Wählen Sie die am nächsten liegende Kundenanwendung."
    },
    "scale": {
      "question": "Wie groß ist der Raum oder das System ungefähr?",
      "prompt": "Wählen Sie den nächstliegenden Maßstab. Genaue Maße können im Notizfeld erfasst werden."
    },
    "sources": {
      "question": "Wie viele Quellen sind wahrscheinlich?",
      "prompt": "Denken Sie an Laptops, PCs, Mediaplayer, Signage-Player und drahtlose Präsentationseingänge."
    },
    "source-connection": {
      "question": "Welches Quellenprofil beschreibt den Raum am besten?",
      "prompt": "Wählen Sie den insgesamt passendsten Quellen-Workflow. Kamera- und Mikrofonanforderungen werden separat unter Unified Communications erfasst."
    },
    "displays": {
      "question": "Wie viele Displays oder Ausgänge werden benötigt?",
      "prompt": "Schließen Sie Projektoren, Kontrollmonitore, Zusatzdisplays, Videowände und LED-Prozessoren ein."
    },
    "display-behaviour": {
      "question": "Wie sollen sich die Displays verhalten?",
      "prompt": "Geben Sie an, ob Ausgänge gespiegelt, unabhängig geroutet, einen Wandprozessor speisen oder mehrere Quellen auf einer Leinwand zeigen."
    },
    "signal-standard": {
      "question": "Wie scharf muss das Bild sein?",
      "prompt": "Wählen Sie die nächstliegende Bildqualität. Wenn die Displays gemischt alt und neu oder sehr hochwertig sind, sagen Sie es — die technischen Prüfungen (HDR, HDCP, EDID) laufen im Hintergrund."
    },
    "uc-purpose": {
      "question": "Welche Kamera-, Mikrofon- oder Aufzeichnungsworkflows werden benötigt?",
      "prompt": "Wählen Sie jeden zutreffenden Workflow. Konferenz, Aufzeichnung und Kameradistribution können zusammen benötigt werden."
    },
    "uc-platform": {
      "question": "Was führt den Anruf- oder Aufzeichnungsworkflow aus?",
      "prompt": "Identifizieren Sie die Konferenz- oder Aufzeichnungsplattform, bevor Sie über USB-Eigentum und Host-Umschaltung entscheiden."
    },
    "mtr-av-integration": {
      "question": "Wie muss der Microsoft Teams Room an das AV-System angebunden werden?",
      "prompt": "Bestätigen Sie beide Signalrichtungen. Ein Teams Room benötigt üblicherweise eine AV-Einspeisung in den MTR zum Teilen oder Aufzeichnen sowie einen MTR-Ausgang zurück ins AV-System zur Verteilung an die Raumdisplays."
    },
    "uc-camera": {
      "question": "Welche Kameratypen werden benötigt?",
      "prompt": "Wählen Sie jeden zutreffenden Kameratyp. Anzahl, Positionen und genaue Modelle können in den Notizen erfasst werden."
    },
    "uc-camera-count": {
      "question": "Wie viele Kameras soll der Videokonferenzraum verwenden?",
      "prompt": "Ein Raum mit mehr als einer Kamera benötigt eine Kamera-Bridge oder einen Compositing-Pfad, damit der Konferenzhost ein nutzbares Programm-Signal erhält."
    },
    "uc-multi-camera-path": {
      "question": "Wird der Multi-Kamera-Raum NDI-Kameras verwenden?",
      "prompt": "Wählen Sie den Kamera-Transport, damit Wingman die richtige Bridge-Architektur anwendet."
    },
    "uc-camera-routing": {
      "question": "Wo müssen die Kamerabilder verwendet werden?",
      "prompt": "Eine Kamera zählt nur dann als geroutete AV-Quelle, wenn ihr Signal den Konferenz-Peripheriepfad verlassen muss."
    },
    "uc-microphones": {
      "question": "Welche Mikrofontypen werden benötigt?",
      "prompt": "Erfassen Sie hier die Spracheingaben. Lautsprecher, Verstärkung und allgemeine Raum-Audio bleiben im separaten Schritt Audio."
    },
    "uc-microphone-connection": {
      "question": "Wie werden die Mikrofone angeschlossen?",
      "prompt": "Wählen Sie jede zutreffende Mikrofon-Schnittstelle, Stromversorgung und Signalpfad."
    },
    "uc-microphone-count": {
      "question": "Wie viele Mikrofon-Signale oder Aufnahmezonen werden benötigt?",
      "prompt": "Zählen Sie unabhängige Arrays, Kanäle und Zonen."
    },
    "usb": {
      "question": "Wem gehören die USB-Geräte und wie muss USB übertragen werden?",
      "prompt": "Wählen Sie die Anforderungen an Host, Umschaltung und Bandbreite für Kameras, Freisprecheinrichtungen, Touch-Displays und Capture-Geräte."
    },
    "audio": {
      "question": "Wie soll das Raum-Audio angeschlossen und betrieben werden?",
      "prompt": "Wählen Sie die Anforderungen an Wiedergabe, Verstärkung, Verteilung und Beschallung."
    },
    "control": {
      "question": "Wie sollen die Personen im Raum das System bedienen?",
      "prompt": "Denken Sie an Personalnutzung, Wandsteuerung, Touch-Panels, Software- oder App-Steuerung, Fremdsteuerung, Automatisierung oder einfache Quellenwahl."
    },
    "locations-connections": {
      "question": "Wo befindet sich die Ausrüstung und wie weit müssen die Signale reisen?",
      "prompt": "Wählen Sie grobe Raumpositionen, die längste Videostrecke und den wahrscheinlichen Kabelweg. Genaue Messungen werden bei der Baustellenbesichtigung bestätigt."
    },
    "avoip-profile": {
      "question": "Welche dieser Optionen kommt dem am nächsten, was der Kunde braucht?",
      "prompt": "Bleiben Sie einfach — wählen Sie, was am wichtigsten ist: Kosten, Bildqualität, Geräteverbindungen oder mehrere Quellen gleichzeitig auf einem Bildschirm."
    },
    "video-wall-technology": {
      "question": "Welche Art von Videowand ist geplant?",
      "prompt": "Wählen Sie die physische Anzeigetechnologie. Wenn sie nicht bestätigt ist, hält Wingman beide Designpfade offen."
    },
    "video-wall-purpose": {
      "question": "Wie soll die Wand Inhalte darstellen?",
      "prompt": "Wählen Sie das nächstliegende Betriebsmodell. Diese Entscheidung bestimmt, ob detaillierte Multiview-Fragen nötig sind."
    },
    "source-device-workflows": {
      "question": "Welche Geräte und Signale werden die Personen verwenden?",
      "prompt": "Wählen Sie jede Quellenfamilie."
    },
    "wireless-presentation-operation": {
      "question": "Wie soll die drahtlose Präsentation funktionieren?",
      "prompt": "Wählen Sie das Verhalten für Beitritt, Sicherheit und Teilen."
    },
    "multiview-destination": {
      "question": "Wo soll Multiview erscheinen?",
      "prompt": "Wählen Sie jedes Ziel."
    },
    "multiview-operation": {
      "question": "Wie sollen Multiview-Layouts funktionieren?",
      "prompt": "Legen Sie Quellenanzahl, Layout und Steuerung fest."
    },
    "uc-audio-processing": {
      "question": "Wie müssen Mikrofon- und Programm-Audio funktionieren?",
      "prompt": "Wählen Sie die Ergebnisse für Mischung, Bridging, DSP und Ausgänge."
    }
  },
  voicePreview: "Hallo. Ich stelle Ihnen ein paar Fragen zu diesem Raum, und Wingman baut das System Schritt für Schritt auf.",
};

export default table;
