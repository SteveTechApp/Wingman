// Italian guided-interview tables — lazy-loaded only when the capture
// language is selected (see discoveryGuidedInterviewI18n.loadInterviewLanguage),
// so the Discovery chunk does not ship every language's phrase data upfront.
import type { LanguageTable } from "./localeTypes";

const table: LanguageTable = {
  stopwords: new Set(["il","lo","la","i","gli","le","un","uno","una","di","del","della","dei","delle","in","nel","nella","nei","nelle","e","ed","o","per","con","senza","noi","loro","è","sono","avere","abbiamo","hanno","ha","bisogno","vuole","vogliono","vorrei","vorremmo","solo","soltanto","circa","probabilmente","forse","anche","usare","usa","usano","usato","usata","va","vanno","andare","questo","questa","questi","queste","quello","quella","quelli","quelle","che","come","fa","fare","c'è","ci sono","vogliamo","voglio","stiamo"]),
  unknown: ["non lo so","non so","non sono sicuro","non sono sicura","incerto","indeciso","nessuna idea","non ancora","non confermato","non deciso","non saprei"],
  curated: {
    "opportunity": {
      "meeting-room": [
        "sala riunioni",
        "sala riunione",
        "sala del consiglio",
        "sala conferenze",
        "huddle",
        "sala direzionale",
        "sala seminari",
        "ufficio",
        "riunione"
      ],
      "classroom": [
        "aula",
        "classe",
        "aula magna",
        "aula di lezione",
        "sala formazione",
        "lezione",
        "scuola",
        "università",
        "college",
        "educazione",
        "didattica"
      ],
      "hospitality": [
        "bar",
        "ristorante",
        "locale",
        "pub",
        "hotel",
        "lounge",
        "ospitalità",
        "caffè",
        "reception",
        "club"
      ],
      "video-wall": [
        "videowall",
        "parete video",
        "muro led",
        "parete di schermi",
        "muro di schermi",
        "digital signage",
        "schermo led"
      ],
      "av-over-ip": [
        "su ip",
        "sulla rete",
        "video distribuito",
        "campus",
        "in rete",
        "più sale",
        "piu sale",
        "multi sala",
        "video ip",
        "distribuzione di rete"
      ],
      "not-sure": [
        "non so",
        "non sono sicuro",
        "incerto",
        "indeciso",
        "non lo so",
        "nessuna idea",
        "sconosciuto"
      ]
    },
    "scale": {
      "single-small-room": [
        "sala piccola",
        "stanza piccola",
        "sala huddle",
        "una sala",
        "stanza singola",
        "1 sala",
        "piccolo",
        "piccola"
      ],
      "single-large-room": [
        "sala grande",
        "stanza grande",
        "una grande sala",
        "grande"
      ],
      "multi-room": [
        "più sale",
        "piu sale",
        "multi sala",
        "due sale",
        "tre sale",
        "alcune sale",
        "più stanze"
      ],
      "building-wide": [
        "edificio",
        "campus",
        "intero piano",
        "tutto il piano",
        "intero edificio",
        "tutto l'edificio",
        "piano"
      ],
      "unknown-scale": [
        "non so",
        "sconosciuto",
        "incerto"
      ]
    },
    "sources": {
      "one-source": [
        "una fonte",
        "unica fonte",
        "1 fonte",
        "un portatile",
        "un laptop",
        "un solo laptop"
      ],
      "two-four-sources": [
        "due",
        "2",
        "quattro",
        "4",
        "un paio",
        "due portatili",
        "due fonti",
        "poche fonti"
      ],
      "five-eight-sources": [
        "cinque",
        "5",
        "sei",
        "6",
        "sette",
        "7",
        "otto",
        "8"
      ],
      "nine-plus-sources": [
        "nove",
        "9",
        "dieci",
        "10",
        "dozzina",
        "molte fonti",
        "tante fonti",
        "undici",
        "dodici"
      ],
      "unknown-sources": [
        "non so",
        "sconosciuto",
        "incerto"
      ]
    },
    "displays": {
      "one-display": [
        "un display",
        "un monitor",
        "un solo schermo",
        "1 schermo",
        "solo uno",
        "uno solo"
      ],
      "two-displays": [
        "due display",
        "due schermi",
        "doppio",
        "2 schermi",
        "coppia di schermi"
      ],
      "three-eight-displays": [
        "tre",
        "3",
        "quattro",
        "4",
        "cinque",
        "5",
        "sei",
        "6",
        "sette",
        "7",
        "otto",
        "8",
        "alcuni schermi"
      ],
      "nine-plus-displays": [
        "nove",
        "9",
        "dieci",
        "10",
        "dozzina",
        "molti schermi",
        "tanti schermi"
      ],
      "video-wall-output": [
        "videowall",
        "parete video",
        "muro led",
        "parete di schermi",
        "processore led"
      ]
    },
    "display-behaviour": {
      "same-content-all-displays": [
        "stesso contenuto",
        "uguale su tutti",
        "specchio",
        "specchiato",
        "tutti gli schermi",
        "tutto uguale",
        "stessa immagine"
      ],
      "independent-routing-per-display": [
        "contenuti diversi",
        "indipendente",
        "ogni schermo",
        "ogni display",
        "separato",
        "individuale",
        "zona",
        "qualsiasi fonte"
      ],
      "video-wall-or-processor-feed": [
        "videowall",
        "parete video",
        "feed del processore",
        "a schermo intero",
        "processore di parete"
      ],
      "multiview-on-one-output": [
        "multiview",
        "multi vista",
        "più fonti",
        "piu fonti",
        "più fonti su uno",
        "composto",
        "finestre su uno",
        "una uscita"
      ],
      "unknown-display-behaviour": [
        "non so",
        "sconosciuto",
        "incerto"
      ]
    },
    "signal-standard": {
      "1080p-standard-hdmi": [
        "1080p",
        "1080",
        "hd standard",
        "full hd",
        "immagine hd"
      ],
      "4k60-standard": [
        "4k standard",
        "4k60",
        "uhd",
        "3840",
        "4k normale"
      ],
      "4k60-hdr-hdcp": [
        "4k hdr",
        "hdr",
        "hdcp",
        "4k premium",
        "alta gamma dinamica",
        "4k con hdr"
      ],
      "legacy-edid-risk": [
        "edid",
        "vecchi schermi",
        "schermi vecchi",
        "schermi misti",
        "problemi di compatibilità",
        "vecchi e nuovi"
      ],
      "unknown-signal-standard": [
        "non so",
        "sconosciuto",
        "incerto"
      ]
    },
    "source-connection": {
      "fixed-hdmi-sources": [
        "media player",
        "pc della sala",
        "player di segnaletica",
        "set top box",
        "apple tv",
        "fisso",
        "fissa",
        "permanente",
        "decoder",
        "blu ray",
        "fonti fisse"
      ],
      "laptops-wireless-inputs": [
        "portatile",
        "laptop",
        "usb c",
        "usb-c",
        "presentazione wireless",
        "presentazione senza fili",
        "airplay",
        "miracast",
        "condivisione schermo",
        "casting",
        "byod",
        "portatili"
      ],
      "mixed-hdmi-usbc": [
        "misto",
        "entrambi",
        "fissi e",
        "e portatili",
        "portatili e",
        "mix"
      ],
      "network-video-sources": [
        "video di rete",
        "ndi",
        "su ip",
        "stream",
        "sorgenti di rete",
        "telecamere ip"
      ],
      "unknown-source-connectors": [
        "non so",
        "sconosciuto",
        "incerto"
      ]
    },
    "uc-purpose": {
      "video-conferencing": [
        "videoconferenza",
        "conferenza",
        "teams",
        "zoom",
        "chiamate",
        "videochiamata",
        "skype",
        "webex",
        "riunione online",
        "chiamate telefoniche"
      ],
      "recording-streaming": [
        "registrazione",
        "registrare",
        "streaming",
        "stream",
        "cattura lezioni",
        "webcast",
        "diretta",
        "cattura"
      ],
      "camera-distribution-only": [
        "distribuzione telecamera",
        "invio telecamera",
        "instradare telecamera",
        "telecamera sullo schermo",
        "telecamera sulla tv",
        "routing telecamera"
      ],
      "microphones-only": [
        "solo microfoni",
        "solo micro",
        "senza telecamera",
        "rinforzo vocale",
        "diffusione",
        "annuncio",
        "sonorizzazione"
      ],
      "no-uc": [
        "senza telecamera",
        "senza microfono",
        "senza telecamere",
        "senza microfoni",
        "nessuna conferenza",
        "niente conferenza",
        "niente",
        "nessuno"
      ],
      "unknown-uc": [
        "non so",
        "sconosciuto",
        "incerto"
      ]
    },
    "uc-camera": {
      "fixed-usb-camera": [
        "webcam",
        "telecamera fissa",
        "telecamera usb",
        "meeting owl",
        "telecamera integrata",
        "logitech",
        "usb fissa"
      ],
      "usb-ptz-camera": [
        "usb ptz",
        "telecamera ptz",
        "pan tilt",
        "telecamera motorizzata",
        "ptz"
      ],
      "hdmi-ptz-camera": [
        "hdmi ptz",
        "telecamera hdmi",
        "telecamera con hdmi"
      ],
      "ndi-network-camera": [
        "ndi",
        "telecamera di rete",
        "telecamera ip",
        "ptz di rete",
        "ndi ptz"
      ],
      "other-camera": [
        "telecamera esistente",
        "sdi",
        "telecamera vecchia",
        "telecamera analogica",
        "altra telecamera"
      ],
      "unknown-camera": [
        "non so",
        "sconosciuto",
        "incerto"
      ]
    },
    "uc-camera-count": {
      "one-camera": [
        "una telecamera",
        "una sola telecamera",
        "1 telecamera",
        "solo una"
      ],
      "two-cameras": [
        "due telecamere",
        "2 telecamere",
        "coppia di telecamere",
        "doppia telecamera"
      ],
      "three-four-cameras": [
        "tre",
        "3",
        "quattro",
        "4",
        "tre telecamere",
        "quattro telecamere"
      ],
      "five-plus-cameras": [
        "cinque",
        "5",
        "più di quattro",
        "sei",
        "6",
        "diverse telecamere"
      ],
      "unknown-camera-count": [
        "non so",
        "sconosciuto",
        "incerto"
      ]
    },
    "uc-microphones": {
      "speakerphone": [
        "vivavoce",
        "speakerphone",
        "soundbar",
        "cassa da tavolo",
        "jabra",
        "poly",
        "altoparlante da tavolo"
      ],
      "table-microphone": [
        "microfono da tavolo",
        "micro da tavolo",
        "microfono da scrivania",
        "collo d'oca",
        "gooseneck"
      ],
      "ceiling-microphone-array": [
        "soffitto",
        "array da soffitto",
        "a soffitto",
        "microfono da soffitto",
        "array"
      ],
      "wireless-microphone": [
        "senza fili",
        "wireless",
        "microfono radio",
        "a spilla",
        "lavalier",
        "a mano",
        "cuffia",
        "auricolare",
        "microfono wireless"
      ],
      "lectern-microphone": [
        "leggio",
        "podio",
        "pulpito",
        "microfono da leggio"
      ],
      "existing-microphone-system": [
        "esistente",
        "già presente",
        "installato",
        "sistema esistente"
      ],
      "no-microphones": [
        "senza microfoni",
        "nessun microfono",
        "nessun micro",
        "niente microfoni",
        "niente"
      ],
      "unknown-microphones": [
        "non so",
        "sconosciuto",
        "incerto"
      ]
    },
    "uc-microphone-count": {
      "one-microphone-feed": [
        "uno",
        "unico",
        "1",
        "un feed",
        "un microfono"
      ],
      "two-four-microphone-feeds": [
        "due",
        "2",
        "tre",
        "3",
        "quattro",
        "4",
        "un paio"
      ],
      "five-eight-microphone-feeds": [
        "cinque",
        "5",
        "sei",
        "6",
        "sette",
        "7",
        "otto",
        "8"
      ],
      "nine-plus-microphone-feeds": [
        "nove",
        "9",
        "dieci",
        "10",
        "molti",
        "tanti"
      ],
      "unknown-microphone-count": [
        "non so",
        "sconosciuto",
        "incerto"
      ]
    },
    "usb": {
      "no-usb": [
        "senza usb",
        "niente usb",
        "nessun usb",
        "nessun trasporto usb"
      ],
      "byod-byom": [
        "portatile del visitatore",
        "il laptop è l'host",
        "il portatile è l'host",
        "il mio laptop",
        "il portatile dell'utente",
        "collegare il portatile",
        "byod"
      ],
      "room-pc-uc": [
        "pc della sala",
        "la teams room è l'host",
        "l'apparecchio è l'host",
        "computer della sala",
        "pc fisso"
      ],
      "switchable-host-usb": [
        "commutare",
        "commutabile",
        "commutazione host",
        "cambiare host",
        "prendere il controllo"
      ],
      "room-host-usb2": [
        "usb 2",
        "usb standard",
        "usb 2.0",
        "usb base"
      ],
      "usb3-high-bandwidth-path": [
        "usb 3",
        "usb3",
        "alta larghezza di banda",
        "3.0",
        "usb veloce"
      ],
      "usb-extension-required": [
        "estendere",
        "estensione",
        "lunga distanza",
        "lontano",
        "lungo tratto",
        "usb su"
      ],
      "interactive-usb": [
        "touch",
        "tattile",
        "interattivo",
        "annotazione",
        "touchback"
      ],
      "unknown-usb": [
        "non so",
        "sconosciuto",
        "incerto"
      ]
    },
    "audio": {
      "no-room-audio": [
        "senza audio",
        "nessun audio",
        "senza casse",
        "nessun altoparlante",
        "nessun sistema audio",
        "niente audio"
      ],
      "display-audio": [
        "casse dello schermo",
        "altoparlanti del monitor",
        "casse della tv",
        "soundbar sullo schermo",
        "audio dello schermo"
      ],
      "source-audio-deembed": [
        "de-embed",
        "estrarre l'audio",
        "audio separato",
        "audio al mixer",
        "estrarre"
      ],
      "room-audio": [
        "casse della sala",
        "altoparlanti a soffitto",
        "amplificatore",
        "ampli",
        "casse nella sala",
        "audio della sala"
      ],
      "stereo-low-impedance": [
        "stereo",
        "bassa impedenza",
        "4 ohm",
        "8 ohm",
        "hi-fi"
      ],
      "multichannel-audio": [
        "surround",
        "5.1",
        "7.1",
        "multicanale"
      ],
      "distributed-70v-100v": [
        "70 volt",
        "70v",
        "100v",
        "casse distribuite",
        "musica di sottofondo",
        "zone",
        "zonato",
        "tensione costante"
      ],
      "separate-programme-voice": [
        "programma separato",
        "rinforzo vocale",
        "voce e musica",
        "programma e voce"
      ],
      "analogue-audio-override": [
        "analogico",
        "fallback",
        "override locale",
        "bypass locale"
      ],
      "digital-audio-interface": [
        "audio digitale",
        "aes",
        "spdif",
        "uscita spdif",
        "aes ebu"
      ],
      "dante-network-audio": [
        "dante",
        "audio di rete",
        "aes67"
      ],
      "unknown-audio": [
        "non so",
        "sconosciuto",
        "incerto"
      ]
    },
    "control": {
      "simple-auto": [
        "automatico",
        "auto",
        "semplice",
        "un pulsante",
        "preset",
        "senza controllo",
        "funziona da solo"
      ],
      "front-panel-remote": [
        "telecomando",
        "pannello frontale",
        "telecomando ir",
        "telecomando manuale"
      ],
      "touch-panel": [
        "pannello touch",
        "touchscreen",
        "schermo tattile",
        "pannello a muro",
        "tastierino",
        "touch"
      ],
      "software-app-control": [
        "app",
        "software",
        "browser",
        "app tablet",
        "app mobile",
        "pagina web"
      ],
      "third-party-control": [
        "crestron",
        "control4",
        "qsys",
        "q-sys",
        "amx",
        "extron",
        "sistema di controllo",
        "integrazione",
        "bms"
      ],
      "unknown-control": [
        "non so",
        "sconosciuto",
        "incerto"
      ]
    }
  },
  questionTranslations: {
    "opportunity": {
      "question": "Che tipo di progetto è questo?",
      "prompt": "Seleziona l'applicazione cliente più vicina."
    },
    "scale": {
      "question": "Qual è la scala approssimativa della sala o del sistema?",
      "prompt": "Scegli la scala più vicina. Le dimensioni esatte possono essere registrate nella casella delle note."
    },
    "sources": {
      "question": "Quante sorgenti sono probabili?",
      "prompt": "Pensa a laptop, PC, media player, player di segnaletica e ingressi di presentazione wireless."
    },
    "source-connection": {
      "question": "Quale profilo di sorgenti descrive meglio la sala?",
      "prompt": "Scegli il flusso di sorgenti complessivo più vicino. I requisiti di telecamere e microfoni vengono catturati separatamente in Unified Communications."
    },
    "displays": {
      "question": "Quanti display o uscite sono necessari?",
      "prompt": "Includi proiettori, monitor di controllo, display aggiuntivi, videowall e processori LED."
    },
    "display-behaviour": {
      "question": "Come devono comportarsi i display?",
      "prompt": "Indica se le uscite specchiano, instradano in modo indipendente, alimentano un processore di parete o mostrano più sorgenti su un unico schermo."
    },
    "signal-standard": {
      "question": "Quanto deve essere nitida l'immagine?",
      "prompt": "Scegli la qualità immagine più vicina. Se i display sono un mix di vecchi e nuovi, o di fascia altissima, dillo qui sotto — i controlli tecnici (HDR, HDCP, EDID) sono gestiti in background."
    },
    "uc-purpose": {
      "question": "Quali flussi di telecamera, microfono o cattura sono richiesti?",
      "prompt": "Seleziona ogni flusso applicabile. Conferenza, registrazione e distribuzione telecamera possono essere richiesti insieme."
    },
    "uc-platform": {
      "question": "Cosa eseguirà la chiamata o il flusso di cattura?",
      "prompt": "Identifica la piattaforma di conferenza o cattura prima di decidere proprietà USB e commutazione host."
    },
    "mtr-av-integration": {
      "question": "Come deve collegarsi la Microsoft Teams Room al sistema AV?",
      "prompt": "Conferma entrambe le direzioni del segnale. Una Teams Room normalmente necessita di un flusso AV nel MTR per la condivisione o la cattura, più un'uscita MTR di ritorno nel sistema AV per la distribuzione ai display della sala."
    },
    "uc-camera": {
      "question": "Quali tipi di telecamera sono richiesti?",
      "prompt": "Seleziona ogni tipo di telecamera applicabile. Quantità, posizioni e modelli esatti possono essere registrati nelle note."
    },
    "uc-camera-count": {
      "question": "Quante telecamere deve usare la sala videoconferenza?",
      "prompt": "Una sala con più di una telecamera necessita di un bridge telecamera o di un percorso di composizione affinché l'host di conferenza riceva un feed di programma utilizzabile."
    },
    "uc-multi-camera-path": {
      "question": "La sala multi-telecamera userà telecamere NDI?",
      "prompt": "Scegli il trasporto della telecamera così Wingman può applicare la corretta architettura di bridge."
    },
    "uc-camera-routing": {
      "question": "Dove devono essere usati i feed delle telecamere?",
      "prompt": "Una telecamera conta come sorgente AV instradata solo quando il suo feed deve uscire dal percorso periferico della conferenza."
    },
    "uc-microphones": {
      "question": "Quali tipi di microfono sono richiesti?",
      "prompt": "Registra qui gli ingressi voce. Altoparlanti, amplificazione e audio generale della sala restano nel passo Audio separato."
    },
    "uc-microphone-connection": {
      "question": "Come si collegheranno i microfoni?",
      "prompt": "Seleziona ogni interfaccia, alimentazione e percorso di segnale del microfono applicabile."
    },
    "uc-microphone-count": {
      "question": "Quanti feed di microfono o zone di ripresa sono richiesti?",
      "prompt": "Conta array, canali e zone indipendenti."
    },
    "usb": {
      "question": "Chi è l'host dei dispositivi USB e come deve viaggiare l'USB?",
      "prompt": "Seleziona i requisiti di host, commutazione e larghezza di banda per telecamere, vivavoce, display touch e dispositivi di cattura."
    },
    "audio": {
      "question": "Come deve essere collegato e gestito l'audio della sala?",
      "prompt": "Seleziona i requisiti di riproduzione, amplificazione, distribuzione e rinforzo."
    },
    "control": {
      "question": "Come devono usare il sistema le persone nella sala?",
      "prompt": "Pensa all'uso del personale, al controllo a muro, ai pannelli touch, al controllo via software o app, al controllo di terze parti, all'automazione o alla semplice selezione sorgente."
    },
    "locations-connections": {
      "question": "Dove si trova l'attrezzatura e quanto lontano devono viaggiare i segnali?",
      "prompt": "Scegli posizioni ampie della sala, il percorso video più lungo e il probabile tragitto del cavo. Cattura solo ciò che influenza la scelta dell'hardware — misure esatte, altezza di montaggio del display, contenimento cavi e posizioni rack sono confermati durante il sopralluogo, non qui."
    },
    "avoip-profile": {
      "question": "Quale di queste opzioni assomiglia di più a ciò che serve al cliente?",
      "prompt": "Mantienilo semplice — scegli ciò che conta di più: costo, qualità immagine, collegamento dispositivi o mostrare più sorgenti su un unico schermo."
    },
    "video-wall-technology": {
      "question": "Che tipo di videowall si sta progettando?",
      "prompt": "Scegli la tecnologia fisica del display. Se non è confermata, Wingman manterrà aperti entrambi i percorsi di design."
    },
    "video-wall-purpose": {
      "question": "Come deve presentare il contenuto la parete?",
      "prompt": "Seleziona il modello operativo più vicino. Questa decisione controlla se sono necessarie domande dettagliate sul multiview."
    },
    "source-device-workflows": {
      "question": "Quali dispositivi e feed useranno le persone?",
      "prompt": "Seleziona ogni famiglia di sorgenti."
    },
    "wireless-presentation-operation": {
      "question": "Come deve funzionare la presentazione wireless?",
      "prompt": "Scegli il comportamento di accesso, sicurezza e condivisione."
    },
    "multiview-destination": {
      "question": "Dove deve apparire il multiview?",
      "prompt": "Seleziona ogni destinazione."
    },
    "multiview-operation": {
      "question": "Come devono funzionare i layout multiview?",
      "prompt": "Definisci numero di sorgenti, layout e controllo."
    },
    "uc-audio-processing": {
      "question": "Come devono funzionare l'audio del microfono e del programma?",
      "prompt": "Seleziona gli esiti di mix, bridge, DSP e uscite."
    }
  },
  voicePreview: "Ciao. Le farò alcune domande su questa sala e Wingman costruirà il sistema mentre procediamo.",
};

export default table;
