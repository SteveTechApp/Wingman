// Norwegian guided-interview tables — lazy-loaded only when the capture
// language is selected (see discoveryGuidedInterviewI18n.loadInterviewLanguage),
// so the Discovery chunk does not ship every language's phrase data upfront.
import type { LanguageTable } from "./localeTypes";

const table: LanguageTable = {
  stopwords: new Set(["en","et","og","eller","av","for","med","uten","vi","de","dem","det","den","er","har","trenger","vil","ville","bare","omtrent","sannsynligvis","kanskje","også","bruke","bruker","brukes","går","gå","dette","denne","disse","som","hvordan","gjør","gjøre","finnes","kan","litt","noen","to","tre","skal","skulle"]),
  unknown: ["jeg vet ikke","vet ikke","ikke sikker","usikker","ubestemt","ingen anelse","ikke ennå","ikke bekreftet","ikke bestemt","vet ikke ennå"],
  curated: {
    "opportunity": {
      "meeting-room": [
        "møterom",
        "konferanserom",
        "styremøterom",
        "huddle",
        "møtesal",
        "seminarrom",
        "kontor",
        "møte"
      ],
      "classroom": [
        "klasserom",
        "undervisning",
        "forelesningssal",
        "auditorium",
        "opplæringsrom",
        "time",
        "skole",
        "universitet",
        "høyskole",
        "utdanning"
      ],
      "hospitality": [
        "bar",
        "restaurant",
        "lokale",
        "pub",
        "hotell",
        "lounge",
        "gjestfrihet",
        "kafé",
        "kafe",
        "resepsjon",
        "klubb"
      ],
      "video-wall": [
        "videovegg",
        "led vegg",
        "skjermvegg",
        "vegg av skjermer",
        "digital signage vegg",
        "led skjerm"
      ],
      "av-over-ip": [
        "over ip",
        "via nettverk",
        "distribuert video",
        "campus",
        "nettverk",
        "flere rom",
        "multi rom",
        "ip video",
        "nettverksdistribusjon"
      ],
      "not-sure": [
        "ikke sikker",
        "usikker",
        "ubestemt",
        "vet ikke",
        "ingen anelse",
        "ukjent"
      ]
    },
    "scale": {
      "single-small-room": [
        "lite rom",
        "lille rommet",
        "huddle rom",
        "ett rom",
        "1 rom",
        "liten"
      ],
      "single-large-room": [
        "stort rom",
        "store rommet",
        "ett stort rom",
        "stor",
        "styremøterom"
      ],
      "multi-room": [
        "flere rom",
        "multi rom",
        "to rom",
        "tre rom",
        "noen rom",
        "flere"
      ],
      "building-wide": [
        "bygning",
        "campus",
        "hele etasjen",
        "hele bygningen",
        "etasje"
      ],
      "unknown-scale": [
        "ikke sikker",
        "ukjent",
        "vet ikke"
      ]
    },
    "sources": {
      "one-source": [
        "en kilde",
        "eneste kilde",
        "1 kilde",
        "en laptop",
        "en bærbar"
      ],
      "two-four-sources": [
        "to",
        "2",
        "fire",
        "4",
        "et par",
        "to laptops",
        "to kilder",
        "få kilder"
      ],
      "five-eight-sources": [
        "fem",
        "5",
        "seks",
        "6",
        "sju",
        "7",
        "åtte",
        "8"
      ],
      "nine-plus-sources": [
        "ni",
        "9",
        "ti",
        "10",
        "dusin",
        "mange kilder",
        "elleve",
        "tolv"
      ],
      "unknown-sources": [
        "ikke sikker",
        "ukjent",
        "vet ikke"
      ]
    },
    "displays": {
      "one-display": [
        "en skjerm",
        "et display",
        "eneste skjerm",
        "1 skjerm",
        "bare en",
        "kun en"
      ],
      "two-displays": [
        "to skjermer",
        "to displayer",
        "dobbel",
        "2 skjermer",
        "par skjermer"
      ],
      "three-eight-displays": [
        "tre",
        "3",
        "fire",
        "4",
        "fem",
        "5",
        "seks",
        "6",
        "sju",
        "7",
        "åtte",
        "8",
        "noen skjermer"
      ],
      "nine-plus-displays": [
        "ni",
        "9",
        "ti",
        "10",
        "dusin",
        "mange skjermer"
      ],
      "video-wall-output": [
        "videovegg",
        "led vegg",
        "skjermvegg",
        "led prosessor"
      ]
    },
    "display-behaviour": {
      "same-content-all-displays": [
        "samme innhold",
        "samme på alle",
        "speil",
        "speilet",
        "alle skjermer",
        "alt likt",
        "samme bilde"
      ],
      "independent-routing-per-display": [
        "forskjellig innhold",
        "uavhengig",
        "hver skjerm",
        "hvert display",
        "separat",
        "individuell",
        "sone",
        "hvilken som helst kilde"
      ],
      "video-wall-or-processor-feed": [
        "videovegg",
        "led vegg",
        "prosessor feed",
        "fullt lerret",
        "veggprosessor"
      ],
      "multiview-on-one-output": [
        "multiview",
        "flere kilder",
        "flere kilder på en",
        "komponert",
        "vinduer på en",
        "en utgang"
      ],
      "unknown-display-behaviour": [
        "ikke sikker",
        "ukjent",
        "vet ikke"
      ]
    },
    "signal-standard": {
      "1080p-standard-hdmi": [
        "1080p",
        "1080",
        "standard hd",
        "full hd",
        "hd bilde"
      ],
      "4k60-standard": [
        "standard 4k",
        "4k60",
        "uhd",
        "3840",
        "vanlig 4k"
      ],
      "4k60-hdr-hdcp": [
        "4k hdr",
        "hdr",
        "hdcp",
        "premium 4k",
        "høyt dynamisk omfang",
        "4k med hdr"
      ],
      "legacy-edid-risk": [
        "edid",
        "eldre skjermer",
        "gamle skjermer",
        "blandede skjermer",
        "kompatibilitetsproblemer",
        "gammelt og nytt"
      ],
      "unknown-signal-standard": [
        "ikke sikker",
        "ukjent",
        "vet ikke"
      ]
    },
    "source-connection": {
      "fixed-hdmi-sources": [
        "media player",
        "rom pc",
        "signage player",
        "set top box",
        "apple tv",
        "fast",
        "faste",
        "permanent",
        "kabelboks",
        "blu ray",
        "faste kilder"
      ],
      "laptops-wireless-inputs": [
        "laptop",
        "bærbar",
        "usb c",
        "usb-c",
        "trådløs presentasjon",
        "airplay",
        "miracast",
        "skjermdeling",
        "casting",
        "byod",
        "laptops"
      ],
      "mixed-hdmi-usbc": [
        "blandet",
        "begge",
        "fast og",
        "og bærbare",
        "bærbare og",
        "miks av"
      ],
      "network-video-sources": [
        "nettverksvideo",
        "ndi",
        "over ip",
        "strømmer",
        "nettverkskilder",
        "ip kameraer"
      ],
      "unknown-source-connectors": [
        "ikke sikker",
        "ukjent",
        "vet ikke"
      ]
    },
    "uc-purpose": {
      "video-conferencing": [
        "videokonferanse",
        "konferanse",
        "teams",
        "zoom",
        "samtaler",
        "videosamtale",
        "skype",
        "webex",
        "møte på nett",
        "telefonsamtaler"
      ],
      "recording-streaming": [
        "innspilling",
        "spille inn",
        "streaming",
        "strøm",
        "forelesningsopptak",
        "webcast",
        "live stream",
        "fange"
      ],
      "camera-distribution-only": [
        "kameradistribusjon",
        "sende kamera",
        "rute kamera",
        "kamera til skjerm",
        "kamera til tv",
        "kameraruting"
      ],
      "microphones-only": [
        "bare mikrofoner",
        "kun mics",
        "ingen kamera",
        "taleforstørking",
        "utrop",
        "kunngjøring",
        "lydforsterkning"
      ],
      "no-uc": [
        "ingen kamera",
        "ingen mikrofon",
        "ingen kameraer",
        "ingen mics",
        "ingen konferanse",
        "ingen videokonferanse",
        "ingenting",
        "ingen"
      ],
      "unknown-uc": [
        "ikke sikker",
        "ukjent",
        "vet ikke"
      ]
    },
    "uc-camera": {
      "fixed-usb-camera": [
        "webkamera",
        "fast kamera",
        "usb kamera",
        "meeting owl",
        "innebygd kamera",
        "logitech",
        "fast usb"
      ],
      "usb-ptz-camera": [
        "usb ptz",
        "ptz kamera",
        "pan tilt",
        "motorisert kamera",
        "ptz"
      ],
      "hdmi-ptz-camera": [
        "hdmi ptz",
        "hdmi kamera",
        "kamera med hdmi"
      ],
      "ndi-network-camera": [
        "ndi",
        "nettverkskamera",
        "ip kamera",
        "nettverk ptz",
        "ndi ptz"
      ],
      "other-camera": [
        "eksisterende kamera",
        "sdi",
        "gammelt kamera",
        "analogt kamera",
        "annet kamera"
      ],
      "unknown-camera": [
        "ikke sikker",
        "ukjent",
        "vet ikke"
      ]
    },
    "uc-camera-count": {
      "one-camera": [
        "ett kamera",
        "eneste kamera",
        "1 kamera",
        "bare ett"
      ],
      "two-cameras": [
        "to kameraer",
        "2 kameraer",
        "par kameraer",
        "doble kameraer"
      ],
      "three-four-cameras": [
        "tre",
        "3",
        "fire",
        "4",
        "tre kameraer",
        "fire kameraer"
      ],
      "five-plus-cameras": [
        "fem",
        "5",
        "mer enn fire",
        "seks",
        "6",
        "flere kameraer"
      ],
      "unknown-camera-count": [
        "ikke sikker",
        "ukjent",
        "vet ikke"
      ]
    },
    "uc-microphones": {
      "speakerphone": [
        "høyttalertelefon",
        "speakerphone",
        "soundbar",
        "bordsenhet",
        "jabra",
        "poly",
        "bordhøyttaler"
      ],
      "table-microphone": [
        "bordmikrofon",
        "bord mik",
        "skrivebordsmikrofon",
        "gåsehals",
        "gooseneck"
      ],
      "ceiling-microphone-array": [
        "tak",
        "tak array",
        "over hodet",
        "takmikrofon",
        "array"
      ],
      "wireless-microphone": [
        "trådløs",
        "radiomik",
        "lavalier",
        "håndholdt",
        "headset",
        "trådløs mikrofon"
      ],
      "lectern-microphone": [
        "kateter",
        "podium",
        "talerstol",
        "katetermikrofon"
      ],
      "existing-microphone-system": [
        "eksisterende",
        "allerede installert",
        "installert",
        "eksisterende system"
      ],
      "no-microphones": [
        "ingen mikrofoner",
        "ingen mics",
        "ingen mikrofon",
        "ingenting",
        "ingen"
      ],
      "unknown-microphones": [
        "ikke sikker",
        "ukjent",
        "vet ikke"
      ]
    },
    "uc-microphone-count": {
      "one-microphone-feed": [
        "en",
        "eneste",
        "1",
        "en feed",
        "en mikrofon"
      ],
      "two-four-microphone-feeds": [
        "to",
        "2",
        "tre",
        "3",
        "fire",
        "4",
        "et par"
      ],
      "five-eight-microphone-feeds": [
        "fem",
        "5",
        "seks",
        "6",
        "sju",
        "7",
        "åtte",
        "8"
      ],
      "nine-plus-microphone-feeds": [
        "ni",
        "9",
        "ti",
        "10",
        "mange",
        "flere"
      ],
      "unknown-microphone-count": [
        "ikke sikker",
        "ukjent",
        "vet ikke"
      ]
    },
    "usb": {
      "no-usb": [
        "ingen usb",
        "uten usb",
        "ikke noe usb",
        "ingen usb transport"
      ],
      "byod-byom": [
        "besøkslaptop",
        "gjestelaptop",
        "laptopen eier",
        "min laptop",
        "brukerens laptop",
        "koble inn laptop",
        "byod"
      ],
      "room-pc-uc": [
        "rom pc",
        "teams room eier",
        "enheten eier",
        "romdatamaskin",
        "fast pc"
      ],
      "switchable-host-usb": [
        "veksle",
        "omkobling",
        "host switch",
        "veksle mellom",
        "ta over",
        "endre host"
      ],
      "room-host-usb2": [
        "usb 2",
        "standard usb",
        "usb 2.0",
        "grunnleggende usb"
      ],
      "usb3-high-bandwidth-path": [
        "usb 3",
        "usb3",
        "høy båndbredde",
        "3.0",
        "rask usb"
      ],
      "usb-extension-required": [
        "forlenge",
        "forlenger",
        "lang avstand",
        "langt unna",
        "lang strekning",
        "usb over"
      ],
      "interactive-usb": [
        "touch",
        "berøring",
        "interaktiv",
        "annotering",
        "touchback"
      ],
      "unknown-usb": [
        "ikke sikker",
        "ukjent",
        "vet ikke"
      ]
    },
    "audio": {
      "no-room-audio": [
        "ingen lyd",
        "ingen høyttalere",
        "ingen romlyd",
        "ingenting",
        "ingen lydanlegg"
      ],
      "display-audio": [
        "skjermhøyttalere",
        "displayhøyttalere",
        "tv høyttalere",
        "soundbar på skjermen",
        "skjermens lyd"
      ],
      "source-audio-deembed": [
        "de-embed",
        "trekke ut lyd",
        "separat lydutgang",
        "lyd til mikseren",
        "ekstrahere"
      ],
      "room-audio": [
        "romhøyttalere",
        "takhøyttalere",
        "forsterker",
        "høyttalere i rommet",
        "romlyd"
      ],
      "stereo-low-impedance": [
        "stereo",
        "lav impedans",
        "4 ohm",
        "8 ohm",
        "hi-fi"
      ],
      "multichannel-audio": [
        "surround",
        "5.1",
        "7.1",
        "flerkanals"
      ],
      "distributed-70v-100v": [
        "70 volt",
        "70v",
        "100v",
        "distribuerte høyttalere",
        "bakgrunnsmusikk",
        "soner",
        "sonet",
        "konstant spenning"
      ],
      "separate-programme-voice": [
        "separat program",
        "taleforstørking",
        "tale og musikk",
        "program og stemme"
      ],
      "analogue-audio-override": [
        "analog",
        "fallback",
        "lokal override"
      ],
      "digital-audio-interface": [
        "digital lyd",
        "aes",
        "spdif",
        "spdif ut",
        "aes ebu"
      ],
      "dante-network-audio": [
        "dante",
        "nettverkslyd",
        "aes67"
      ],
      "unknown-audio": [
        "ikke sikker",
        "ukjent",
        "vet ikke"
      ]
    },
    "control": {
      "simple-auto": [
        "automatisk",
        "auto",
        "enkel",
        "en knapp",
        "forhåndsinnstilling",
        "ingen styring",
        "virker av seg selv"
      ],
      "front-panel-remote": [
        "fjernkontroll",
        "frontpanel",
        "ir fjernkontroll",
        "håndholdt fjernkontroll"
      ],
      "touch-panel": [
        "touch panel",
        "berøringsskjerm",
        "veggpanel",
        "tastatur",
        "knappsats",
        "touch"
      ],
      "software-app-control": [
        "app",
        "programvare",
        "nettleser",
        "tablet app",
        "mobilapp",
        "nettside"
      ],
      "third-party-control": [
        "crestron",
        "control4",
        "qsys",
        "q-sys",
        "amx",
        "extron",
        "styringssystem",
        "integrasjon",
        "bms"
      ],
      "unknown-control": [
        "ikke sikker",
        "ukjent",
        "vet ikke"
      ]
    }
  },
  questionTranslations: {
    "opportunity": {
      "question": "Hva slags prosjekt er dette?",
      "prompt": "Velg den nærmeste kundeapplikasjonen."
    },
    "scale": {
      "question": "Hva er den omtrentlige skalaen på rommet eller systemet?",
      "prompt": "Velg den nærmeste skalaen. Nøyaktige mål kan noteres i notatfeltet."
    },
    "sources": {
      "question": "Hvor mange kildeplasser er sannsynlige?",
      "prompt": "Tenk på laptops, pc-er, media players, signage players og trådløse presentasjonsinnganger."
    },
    "source-connection": {
      "question": "Hvilken kildeprofil beskriver rommet best?",
      "prompt": "Velg den nærmeste overordnede kildearbeidsflyten. Kamera- og mikrofonbehov fanges separat under Unified Communications."
    },
    "displays": {
      "question": "Hvor mange skjermer eller utganger trengs?",
      "prompt": "Inkluder projektorer, kontrollskjermer, ekstra skjermer, videovegger og led-prosessorer."
    },
    "display-behaviour": {
      "question": "Hvordan skal skjermene oppføre seg?",
      "prompt": "Angi om utgangene speiler, rutes uavhengig, mater en veggprosessor eller viser flere kilder på ett lerret."
    },
    "signal-standard": {
      "question": "Hvor skarpt må bildet være?",
      "prompt": "Velg den nærmeste bildekvaliteten. Hvis skjermene er en blanding av gamle og nye, eller veldig high-end, si fra nedenfor — de tekniske kontrollene (HDR, HDCP, EDID) håndteres i bakgrunnen."
    },
    "uc-purpose": {
      "question": "Hvilke kamera-, mikrofon- eller opptaksarbeidsflyter kreves?",
      "prompt": "Velg hver arbeidsflyt som gjelder. Konferanse, opptak og kameradistribusjon kan være nødvendige sammen."
    },
    "uc-platform": {
      "question": "Hva skal kjøre samtalen eller opptaksarbeidsflyten?",
      "prompt": "Identifiser konferanse- eller opptaksplattformen før du bestemmer usb-eierskap og host-veksling."
    },
    "mtr-av-integration": {
      "question": "Hvordan skal Microsoft Teams Room koble til AV-systemet?",
      "prompt": "Bekreft begge signalretningene. Et Teams Room trenger vanligvis en AV-systemfeed inn i MTR for deling eller opptak, pluss en MTR-utgang tilbake inn i AV-systemet for distribusjon til rommets skjermer."
    },
    "uc-camera": {
      "question": "Hvilke kameratyper kreves?",
      "prompt": "Velg hver kameratype som gjelder. Antall, plasseringer og eksakte modeller kan noteres."
    },
    "uc-camera-count": {
      "question": "Hvor mange kameraer skal videokonferanserommet bruke?",
      "prompt": "Et rom med mer enn ett kamera trenger en kamera-bro eller komponeringsvei slik at konferanseverten mottar en brukbar programfeed."
    },
    "uc-multi-camera-path": {
      "question": "Vil flerkamerarommet bruke NDI-kameraer?",
      "prompt": "Velg kameraoverføring så Wingman kan bruke riktig bro-arkitektur."
    },
    "uc-camera-routing": {
      "question": "Hvor skal kamerafeedene brukes?",
      "prompt": "Et kamera telles bare som en rutet AV-kilde når feeden må forlate konferanseperiferiveien."
    },
    "uc-microphones": {
      "question": "Hvilke mikrofontyper kreves?",
      "prompt": "Fang taleinnganger her. Høyttalere, forsterking og generell romlyd forblir i det separate lydsteget."
    },
    "uc-microphone-connection": {
      "question": "Hvordan skal mikrofonene kobles til?",
      "prompt": "Velg hver mikrofon-grensesnitt, strøm og signalvei som gjelder."
    },
    "uc-microphone-count": {
      "question": "Hvor mange mikrofonfeeds eller opptakssoner kreves?",
      "prompt": "Tell uavhengige arrays, kanaler og soner."
    },
    "usb": {
      "question": "Hvem eier usb-enhetene, og hvordan skal usb reise?",
      "prompt": "Velg krav til host, veksling og båndbredde for kameraer, høyttalertelefoner, touchskjermer og opptaksenheter."
    },
    "audio": {
      "question": "Hvordan skal romlyden kobles og brukes?",
      "prompt": "Velg krav til avspilling, forsterkning, distribusjon og taleforstørking."
    },
    "control": {
      "question": "Hvordan skal folk i rommet styre systemet?",
      "prompt": "Tenk på hvordan personalet bruker systemet, veggstyring, touchpaneler, programvare- eller appstyring, tredjepartsstyring, automatisering eller enkel kildevalg."
    },
    "locations-connections": {
      "question": "Hvor er utstyret, og hvor langt må signalene reise?",
      "prompt": "Velg brede romplasseringer, den lengste videoveien og det sannsynlige kabeltrekket. Fang bare det som påvirker maskinvarevalget — nøyaktige mål, monteringshøyde på skjermer, kabelkanaler og rackplasseringer bekreftes under stedsundersøkelsen, ikke her."
    },
    "avoip-profile": {
      "question": "Hvilken av disse høres nærmest ut som det kunden trenger?",
      "prompt": "Hold det enkelt — velg det som betyr mest: kostnad, bildekvalitet, tilkobling av enheter, eller å vise flere kilder på én skjerm samtidig."
    },
    "video-wall-technology": {
      "question": "Hva slags videovegg planlegges?",
      "prompt": "Velg den fysiske skjermteknologien. Hvis den ikke er bekreftet, holder Wingman begge designveiene åpne."
    },
    "video-wall-purpose": {
      "question": "Hvordan skal veggen presentere innhold?",
      "prompt": "Velg den nærmeste driftsmodellen. Denne avgjørelsen styrer om detaljerte multiview-spørsmål er nødvendige."
    },
    "source-device-workflows": {
      "question": "Hvilke enheter og feeds vil folk bruke?",
      "prompt": "Velg hver kildefamilie."
    },
    "wireless-presentation-operation": {
      "question": "Hvordan skal trådløs presentasjon fungere?",
      "prompt": "Velg tilkoblings-, sikkerhets- og delingsatferd."
    },
    "multiview-destination": {
      "question": "Hvor skal multiview vises?",
      "prompt": "Velg hver destinasjon."
    },
    "multiview-operation": {
      "question": "Hvordan skal multiview-layouts fungere?",
      "prompt": "Definer kildeantall, layout og styring."
    },
    "uc-audio-processing": {
      "question": "Hvordan skal mikrofon- og programlyd fungere?",
      "prompt": "Velg resultater for miks, bro, DSP og utganger."
    }
  },
  voicePreview: "Hei. Jeg stiller noen spørsmål om dette rommet, og Wingman bygger systemet etter hvert som vi går.",
};

export default table;
