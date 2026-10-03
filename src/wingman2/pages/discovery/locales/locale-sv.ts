// Swedish guided-interview tables — lazy-loaded only when the capture
// language is selected (see discoveryGuidedInterviewI18n.loadInterviewLanguage),
// so the Discovery chunk does not ship every language's phrase data upfront.
import type { LanguageTable } from "./localeTypes";

const table: LanguageTable = {
  stopwords: new Set(["en","ett","och","eller","av","för","med","utan","vi","de","dem","det","den","är","har","behöver","vill","skulle","bara","endast","ungefär","förmodligen","kanske","också","använda","använder","används","går","gå","detta","denna","dessa","som","hur","gör","göra","finns","kan","kommer","lite","några","två","tre","vi ska","vi vill"]),
  unknown: ["jag vet inte","vet inte","inte säker","osäker","obestämd","ingen aning","inte än","inte bekräftat","inte bestämt","vet ej"],
  curated: {
    "opportunity": {
      "meeting-room": [
        "mötesrum",
        "konferensrum",
        "styrelserum",
        "huddle",
        "sammanträdesrum",
        "seminarerum",
        "kontor",
        "möte"
      ],
      "classroom": [
        "klassrum",
        "undervisning",
        "föreläsningssal",
        "lektionssal",
        "utbildningsrum",
        "lektion",
        "skola",
        "universitet",
        "högskola",
        "utbildning"
      ],
      "hospitality": [
        "bar",
        "restaurang",
        "lokal",
        "pub",
        "hotell",
        "lounge",
        "gästfrihet",
        "café",
        "kafé",
        "reception",
        "klubb"
      ],
      "video-wall": [
        "videovägg",
        "led vägg",
        "skärmvägg",
        "vägg av skärmar",
        "digital signage vägg",
        "led skärm"
      ],
      "av-over-ip": [
        "över ip",
        "via nätverk",
        "distribuerad video",
        "campus",
        "nätverksansluten",
        "flera rum",
        "multi rum",
        "ip video",
        "nätverksdistribution"
      ],
      "not-sure": [
        "inte säker",
        "osäker",
        "obestämd",
        "vet inte",
        "ingen aning",
        "okänd"
      ]
    },
    "scale": {
      "single-small-room": [
        "litet rum",
        "lilla rummet",
        "huddle rum",
        "ett rum",
        "1 rum",
        "liten"
      ],
      "single-large-room": [
        "stort rum",
        "stora rummet",
        "ett stort rum",
        "stor",
        "styrelserum"
      ],
      "multi-room": [
        "flera rum",
        "multi rum",
        "två rum",
        "tre rum",
        "några rum",
        "flera"
      ],
      "building-wide": [
        "byggnad",
        "campus",
        "hela våningen",
        "hela våningsplanet",
        "hela byggnaden",
        "våning"
      ],
      "unknown-scale": [
        "inte säker",
        "okänd",
        "vet inte"
      ]
    },
    "sources": {
      "one-source": [
        "en källa",
        "enda källan",
        "1 källa",
        "en laptop",
        "en bärbar dator"
      ],
      "two-four-sources": [
        "två",
        "2",
        "fyra",
        "4",
        "ett par",
        "två laptops",
        "två källor",
        "få källor"
      ],
      "five-eight-sources": [
        "fem",
        "5",
        "sex",
        "6",
        "sju",
        "7",
        "åtta",
        "8"
      ],
      "nine-plus-sources": [
        "nio",
        "9",
        "tio",
        "10",
        "dussin",
        "många källor",
        "elva",
        "tolv"
      ],
      "unknown-sources": [
        "inte säker",
        "okänd",
        "vet inte"
      ]
    },
    "displays": {
      "one-display": [
        "en display",
        "en skärm",
        "enda skärmen",
        "1 skärm",
        "bara en",
        "endast en"
      ],
      "two-displays": [
        "två displayer",
        "två skärmar",
        "dubbel",
        "2 skärmar",
        "par skärmar"
      ],
      "three-eight-displays": [
        "tre",
        "3",
        "fyra",
        "4",
        "fem",
        "5",
        "sex",
        "6",
        "sju",
        "7",
        "åtta",
        "8",
        "några skärmar"
      ],
      "nine-plus-displays": [
        "nio",
        "9",
        "tio",
        "10",
        "dussin",
        "många skärmar"
      ],
      "video-wall-output": [
        "videovägg",
        "led vägg",
        "skärmvägg",
        "led processor"
      ]
    },
    "display-behaviour": {
      "same-content-all-displays": [
        "samma innehåll",
        "samma på alla",
        "spegel",
        "speglat",
        "alla skärmar",
        "allt likadant",
        "samma bild"
      ],
      "independent-routing-per-display": [
        "olika innehåll",
        "oberoende",
        "varje skärm",
        "varje display",
        "separat",
        "individuell",
        "zon",
        "vilken källa som helst"
      ],
      "video-wall-or-processor-feed": [
        "videovägg",
        "led vägg",
        "processor feed",
        "full canvas",
        "väggprocessor"
      ],
      "multiview-on-one-output": [
        "multiview",
        "flera källor",
        "flera källor på en",
        "komponerad",
        "fönster på en",
        "en utgång"
      ],
      "unknown-display-behaviour": [
        "inte säker",
        "okänd",
        "vet inte"
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
        "vanlig 4k"
      ],
      "4k60-hdr-hdcp": [
        "4k hdr",
        "hdr",
        "hdcp",
        "premium 4k",
        "högt dynamiskt omfång",
        "4k med hdr"
      ],
      "legacy-edid-risk": [
        "edid",
        "äldre skärmar",
        "gamla skärmar",
        "blandade skärmar",
        "kompatibilitetsproblem",
        "gammalt och nytt"
      ],
      "unknown-signal-standard": [
        "inte säker",
        "okänd",
        "vet inte"
      ]
    },
    "source-connection": {
      "fixed-hdmi-sources": [
        "media player",
        "rum pc",
        "signage player",
        "set top box",
        "apple tv",
        "fast",
        "fasta",
        "permanent",
        "kabelbox",
        "blu ray",
        "fasta källor"
      ],
      "laptops-wireless-inputs": [
        "laptop",
        "bärbar dator",
        "usb c",
        "usb-c",
        "trådlös presentation",
        "airplay",
        "miracast",
        "skärmdelning",
        "casting",
        "byod",
        "laptops"
      ],
      "mixed-hdmi-usbc": [
        "blandat",
        "båda",
        "fasta och",
        "och laptops",
        "laptops och",
        "mix av"
      ],
      "network-video-sources": [
        "nätverksvideo",
        "ndi",
        "över ip",
        "strömmar",
        "nätverkskällor",
        "ip kameror"
      ],
      "unknown-source-connectors": [
        "inte säker",
        "okänd",
        "vet inte"
      ]
    },
    "uc-purpose": {
      "video-conferencing": [
        "videokonferens",
        "konferens",
        "teams",
        "zoom",
        "samtal",
        "videosamtal",
        "skype",
        "webex",
        "möte online",
        "telefonsamtal"
      ],
      "recording-streaming": [
        "inspelning",
        "spela in",
        "streaming",
        "ström",
        "föreläsningsinspelning",
        "webcast",
        "live stream",
        "fånga"
      ],
      "camera-distribution-only": [
        "kameradistribution",
        "skicka kamera",
        "dirigera kamera",
        "kamera till skärm",
        "kamera till tv",
        "kamerarouting"
      ],
      "microphones-only": [
        "endast mikrofoner",
        "bara mics",
        "ingen kamera",
        "talförstärkning",
        "utrop",
        "meddelande",
        "ljudförstärkning"
      ],
      "no-uc": [
        "ingen kamera",
        "ingen mikrofon",
        "inga kameror",
        "inga mics",
        "ingen konferens",
        "ingen videokonferens",
        "inget",
        "ingen"
      ],
      "unknown-uc": [
        "inte säker",
        "okänd",
        "vet inte"
      ]
    },
    "uc-camera": {
      "fixed-usb-camera": [
        "webkamera",
        "fast kamera",
        "usb kamera",
        "meeting owl",
        "inbyggd kamera",
        "logitech",
        "fast usb"
      ],
      "usb-ptz-camera": [
        "usb ptz",
        "ptz kamera",
        "pan tilt",
        "motoriserad kamera",
        "ptz"
      ],
      "hdmi-ptz-camera": [
        "hdmi ptz",
        "hdmi kamera",
        "kamera med hdmi"
      ],
      "ndi-network-camera": [
        "ndi",
        "nätverkskamera",
        "ip kamera",
        "nätverk ptz",
        "ndi ptz"
      ],
      "other-camera": [
        "befintlig kamera",
        "sdi",
        "gammal kamera",
        "analog kamera",
        "annan kamera"
      ],
      "unknown-camera": [
        "inte säker",
        "okänd",
        "vet inte"
      ]
    },
    "uc-camera-count": {
      "one-camera": [
        "en kamera",
        "enda kameran",
        "1 kamera",
        "bara en"
      ],
      "two-cameras": [
        "två kameror",
        "2 kameror",
        "par kameror",
        "dubbla kameror"
      ],
      "three-four-cameras": [
        "tre",
        "3",
        "fyra",
        "4",
        "tre kameror",
        "fyra kameror"
      ],
      "five-plus-cameras": [
        "fem",
        "5",
        "fler än fyra",
        "sex",
        "6",
        "flera kameror"
      ],
      "unknown-camera-count": [
        "inte säker",
        "okänd",
        "vet inte"
      ]
    },
    "uc-microphones": {
      "speakerphone": [
        "högtalartelefon",
        "speakerphone",
        "soundbar",
        "bordsenhet",
        "jabra",
        "poly",
        "bordshögtalare"
      ],
      "table-microphone": [
        "bordsmikrofon",
        "bord mic",
        "skrivbordsmikrofon",
        "gåshals",
        "gooseneck"
      ],
      "ceiling-microphone-array": [
        "tak",
        "tak array",
        "ovanför",
        "takmikrofon",
        "array"
      ],
      "wireless-microphone": [
        "trådlös",
        "radio mic",
        "lavalier",
        "handhållen",
        "headset",
        "trådlös mikrofon"
      ],
      "lectern-microphone": [
        "kateder",
        "podium",
        "talarstol",
        "katedermikrofon"
      ],
      "existing-microphone-system": [
        "befintlig",
        "redan installerad",
        "installerad",
        "befintligt system"
      ],
      "no-microphones": [
        "inga mikrofoner",
        "inga mics",
        "ingen mikrofon",
        "inget",
        "ingen"
      ],
      "unknown-microphones": [
        "inte säker",
        "okänd",
        "vet inte"
      ]
    },
    "uc-microphone-count": {
      "one-microphone-feed": [
        "en",
        "enda",
        "1",
        "en feed",
        "en mikrofon"
      ],
      "two-four-microphone-feeds": [
        "två",
        "2",
        "tre",
        "3",
        "fyra",
        "4",
        "ett par"
      ],
      "five-eight-microphone-feeds": [
        "fem",
        "5",
        "sex",
        "6",
        "sju",
        "7",
        "åtta",
        "8"
      ],
      "nine-plus-microphone-feeds": [
        "nio",
        "9",
        "tio",
        "10",
        "många",
        "flera"
      ],
      "unknown-microphone-count": [
        "inte säker",
        "okänd",
        "vet inte"
      ]
    },
    "usb": {
      "no-usb": [
        "ingen usb",
        "utan usb",
        "inget usb",
        "ingen usb transport"
      ],
      "byod-byom": [
        "besökslaptop",
        "gästlaptop",
        "laptopen äger",
        "min laptop",
        "användarens laptop",
        "koppla in sin laptop",
        "byod"
      ],
      "room-pc-uc": [
        "rum pc",
        "teams room äger",
        "enheten äger",
        "rumsdator",
        "fast pc"
      ],
      "switchable-host-usb": [
        "växla",
        "växlingsbar",
        "host switch",
        "växla mellan",
        "ta över",
        "ändra host"
      ],
      "room-host-usb2": [
        "usb 2",
        "standard usb",
        "usb 2.0",
        "grundläggande usb"
      ],
      "usb3-high-bandwidth-path": [
        "usb 3",
        "usb3",
        "hög bandbredd",
        "3.0",
        "snabb usb"
      ],
      "usb-extension-required": [
        "förlänga",
        "förlängning",
        "lång sträcka",
        "långt bort",
        "lång distans",
        "usb över"
      ],
      "interactive-usb": [
        "touch",
        "pekskärm",
        "interaktiv",
        "anteckning",
        "touchback"
      ],
      "unknown-usb": [
        "inte säker",
        "okänd",
        "vet inte"
      ]
    },
    "audio": {
      "no-room-audio": [
        "inget ljud",
        "inga högtalare",
        "ingen rumsaudio",
        "inget",
        "inget ljudsystem"
      ],
      "display-audio": [
        "skärmhögtalare",
        "displayhögtalare",
        "tv högtalare",
        "soundbar på skärmen",
        "skärmens ljud"
      ],
      "source-audio-deembed": [
        "de-embed",
        "extrahera ljud",
        "separat ljudutgång",
        "ljud till mixern",
        "extrahera"
      ],
      "room-audio": [
        "rumshögtalare",
        "takhögtalare",
        "förstärkare",
        "högtalare i rummet",
        "rumsaudio"
      ],
      "stereo-low-impedance": [
        "stereo",
        "låg impedans",
        "4 ohm",
        "8 ohm",
        "hi-fi"
      ],
      "multichannel-audio": [
        "surround",
        "5.1",
        "7.1",
        "flerkanaligt"
      ],
      "distributed-70v-100v": [
        "70 volt",
        "70v",
        "100v",
        "distribuerade högtalare",
        "bakgrundsmusik",
        "zoner",
        "zonerad",
        "konstant spänning"
      ],
      "separate-programme-voice": [
        "separat program",
        "talförstärkning",
        "tal och musik",
        "program och röst"
      ],
      "analogue-audio-override": [
        "analog",
        "fallback",
        "lokal override"
      ],
      "digital-audio-interface": [
        "digitalt ljud",
        "aes",
        "spdif",
        "spdif ut",
        "aes ebu"
      ],
      "dante-network-audio": [
        "dante",
        "nätverksljud",
        "aes67"
      ],
      "unknown-audio": [
        "inte säker",
        "okänd",
        "vet inte"
      ]
    },
    "control": {
      "simple-auto": [
        "automatisk",
        "auto",
        "enkel",
        "en knapp",
        "förinställning",
        "ingen styrning",
        "fungerar av sig själv"
      ],
      "front-panel-remote": [
        "fjärrkontroll",
        "frontpanel",
        "ir fjärrkontroll",
        "handhållen fjärrkontroll"
      ],
      "touch-panel": [
        "touch panel",
        "pekskärm",
        "väggpanel",
        "knappsats",
        "touch"
      ],
      "software-app-control": [
        "app",
        "programvara",
        "webbläsare",
        "tablet app",
        "mobilapp",
        "webbsida"
      ],
      "third-party-control": [
        "crestron",
        "control4",
        "qsys",
        "q-sys",
        "amx",
        "extron",
        "styrsystem",
        "integration",
        "bms"
      ],
      "unknown-control": [
        "inte säker",
        "okänd",
        "vet inte"
      ]
    }
  },
  questionTranslations: {
    "opportunity": {
      "question": "Vilken typ av projekt är detta?",
      "prompt": "Välj den närmaste kundapplikationen."
    },
    "scale": {
      "question": "Vilken ungefärlig skala har rummet eller systemet?",
      "prompt": "Välj den närmaste skalan. Exakta mått kan antecknas i anteckningsrutan."
    },
    "sources": {
      "question": "Hur många källpositioner är troliga?",
      "prompt": "Tänk på laptops, datorer, media players, signage players och trådlösa presentationsingångar."
    },
    "source-connection": {
      "question": "Vilken källprofil beskriver rummet bäst?",
      "prompt": "Välj det närmaste övergripande källarbetsflödet. Kamera- och mikrofonbehov fångas separat under Unified Communications."
    },
    "displays": {
      "question": "Hur många displayer eller utgångar behövs?",
      "prompt": "Inkludera projektorer, övervakningsskärmar, extra skärmar, videoväggar och led-processorer."
    },
    "display-behaviour": {
      "question": "Hur ska displayerna bete sig?",
      "prompt": "Ange om utgångarna speglar, dirigeras oberoende, matar en väggprocessor eller visar flera källor på en enda yta."
    },
    "signal-standard": {
      "question": "Hur skarp måste bilden vara?",
      "prompt": "Välj den närmaste bildkvaliteten. Om displayerna är en blandning av gamla och nya, eller väldigt high-end, säg till nedan — de tekniska kontrollerna (HDR, HDCP, EDID) hanteras i bakgrunden."
    },
    "uc-purpose": {
      "question": "Vilka kamera-, mikrofon- eller inspelningsarbetsflöden krävs?",
      "prompt": "Välj varje arbetsflöde som gäller. Konferens, inspelning och kameradistribution kan behövas tillsammans."
    },
    "uc-platform": {
      "question": "Vad ska köra samtalet eller inspelningsarbetsflödet?",
      "prompt": "Identifiera konferens- eller inspelningsplattformen innan du bestämmer usb-ägande och host-växling."
    },
    "mtr-av-integration": {
      "question": "Hur ska Microsoft Teams Room ansluta till AV-systemet?",
      "prompt": "Bekräfta båda signalriktningarna. En Teams Room behöver vanligtvis en AV-systemfeed in i MTR:n för delning eller inspelning, plus en MTR-utgång tillbaka in i AV-systemet för distribution till rummets displayer."
    },
    "uc-camera": {
      "question": "Vilka kameratyper krävs?",
      "prompt": "Välj varje kameratyp som gäller. Antal, positioner och exakta modeller kan antecknas."
    },
    "uc-camera-count": {
      "question": "Hur många kameror ska videokonferensrummet använda?",
      "prompt": "Ett rum med mer än en kamera behöver en kamera-bridge eller komponeringsväg så att konferensvärden får en användbar programfeed."
    },
    "uc-multi-camera-path": {
      "question": "Kommer flerkamerasrummet att använda NDI-kameror?",
      "prompt": "Välj kameraöverföring så att Wingman kan tillämpa rätt bridge-arkitektur."
    },
    "uc-camera-routing": {
      "question": "Var ska kameraflödena användas?",
      "prompt": "En kamera räknas bara som en dirigerad AV-källa när dess feed måste lämna konferensperiferivägen."
    },
    "uc-microphones": {
      "question": "Vilka mikrofontyper krävs?",
      "prompt": "Fånga talinmatning här. Högtalare, förstärkning och allmän rumsaudio ligger kvar i det separata ljudsteget."
    },
    "uc-microphone-connection": {
      "question": "Hur ska mikrofonerna anslutas?",
      "prompt": "Välj varje mikrofonanslutning, strömförsörjning och signalväg som gäller."
    },
    "uc-microphone-count": {
      "question": "Hur många mikrofonflöden eller upptagningszoner krävs?",
      "prompt": "Räkna oberoende arrayer, kanaler och zoner."
    },
    "usb": {
      "question": "Vem äger usb-enheterna och hur ska usb färdas?",
      "prompt": "Välj krav på host, växling och bandbredd för kameror, högtalartelefoner, pekskärmar och inspelningsenheter."
    },
    "audio": {
      "question": "Hur ska rumsljudet anslutas och hanteras?",
      "prompt": "Välj krav för uppspelning, förstärkning, distribution och ljudförstärkning."
    },
    "control": {
      "question": "Hur ska människorna i rummet styra systemet?",
      "prompt": "Tänk på hur personalen använder systemet, väggstyrning, touchpaneler, program- eller appstyrning, tredjepartsstyrning, automatisering eller enkel källval."
    },
    "locations-connections": {
      "question": "Var finns utrustningen och hur långt måste signalerna färdas?",
      "prompt": "Välj breda rumsplaceringar, den längsta videovägen och det troliga kabeldraget. Fånga bara det som påverkar hårdvaruvalet — exakta mått, displaymonteringshöjd, kabelkanaler och rackplaceringar bekräftas under platsbesiktningen, inte här."
    },
    "avoip-profile": {
      "question": "Vilken av dessa låter närmast det kunden behöver?",
      "prompt": "Håll det enkelt — välj det som betyder mest: kostnad, bildkvalitet, anslutning av enheter eller att visa flera källor på en skärm samtidigt."
    },
    "video-wall-technology": {
      "question": "Vilken typ av videovägg planeras?",
      "prompt": "Välj den fysiska displaytekniken. Om den inte är bekräftad håller Wingman båda designvägarna öppna."
    },
    "video-wall-purpose": {
      "question": "Hur ska väggen presentera innehåll?",
      "prompt": "Välj den närmaste driftsmodellen. Detta beslut styr om detaljerade multiview-frågor behövs."
    },
    "source-device-workflows": {
      "question": "Vilka enheter och flöden kommer människor att använda?",
      "prompt": "Välj varje källfamilj."
    },
    "wireless-presentation-operation": {
      "question": "Hur ska trådlös presentation fungera?",
      "prompt": "Välj anslutnings-, säkerhets- och delningsbeteende."
    },
    "multiview-destination": {
      "question": "Var ska multiview visas?",
      "prompt": "Välj varje destination."
    },
    "multiview-operation": {
      "question": "Hur ska multiview-layouter fungera?",
      "prompt": "Definiera antal källor, layout och styrning."
    },
    "uc-audio-processing": {
      "question": "Hur ska mikrofon- och programljud fungera?",
      "prompt": "Välj resultat för mix, bridging, DSP och utgångar."
    }
  },
  voicePreview: "Hej. Jag ställer några frågor om det här rummet, och Wingman bygger systemet allt eftersom.",
};

export default table;
