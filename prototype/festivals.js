// festivals.js — a curated, open list of real film festivals, for filling in a laurel's words correctly.
//
// Text only, on purpose. Festival logos and laurels are the festivals' trademarked artwork: Daphne ships none and draws
// no lookalikes. What it can do is spell the festival's current official name right, add its city, link to its
// official site (where selected films get the official laurel) and show its published rules (rules.js, joined by id).
//
// Each entry: id, name (the official name as it's written on laurels), city, country (ISO 3166 code), month it usually
// runs (1–12), tier (1 = names that carry furthest on a poster, 2 = internationally known, 3 = respected and regional:
// a rough sense used only to order a row, never a judgment), focus, site, and optionally:
//   short (a short form festivals use themselves), aka (other names people type), local (the name in the festival's
//   own language), founded, note (anything that changes the words, such as a move), sections (program names).
// Compiled October 2026 from the festivals' own sites and press. Names, cities and sections change: the app always says
// to check the festival's site. Corrections and additions are welcome: one line each.

const COUNTRIES = {
  AR: 'Argentina', AM: 'Armenia', AT: 'Austria', AU: 'Australia', BA: 'Bosnia and Herzegovina', BE: 'Belgium', BF: 'Burkina Faso', BG: 'Bulgaria',
  BR: 'Brazil', CA: 'Canada', CH: 'Switzerland', CL: 'Chile', CN: 'China', CO: 'Colombia', CU: 'Cuba', CZ: 'Czechia', DE: 'Germany', DK: 'Denmark',
  EE: 'Estonia', EG: 'Egypt', ES: 'Spain', FI: 'Finland', FR: 'France', GB: 'United Kingdom', GR: 'Greece', HK: 'Hong Kong', HR: 'Croatia',
  ID: 'Indonesia', IE: 'Ireland', IL: 'Israel', IN: 'India', IS: 'Iceland', IT: 'Italy', JP: 'Japan', KR: 'South Korea', LU: 'Luxembourg',
  MA: 'Morocco', MX: 'Mexico', NG: 'Nigeria', NL: 'Netherlands', NO: 'Norway', NZ: 'New Zealand', PE: 'Peru', PH: 'Philippines', PL: 'Poland',
  PT: 'Portugal', QA: 'Qatar', RO: 'Romania', RS: 'Serbia', SA: 'Saudi Arabia', SE: 'Sweden', SG: 'Singapore', SI: 'Slovenia', TN: 'Tunisia',
  TR: 'Türkiye', TW: 'Taiwan', TZ: 'Tanzania', UA: 'Ukraine', US: 'United States', ZA: 'South Africa',
};
export const countryName = (c) => COUNTRIES[c] || c;

// focus: what a festival mostly shows (a festival can have several)
export const FOCUS = { all: 'Features and shorts', feature: 'Features', short: 'Shorts', doc: 'Documentary', anim: 'Animation', genre: 'Genre and fantastic', lgbtq: 'LGBTQ+', kids: 'Children and youth', indie: 'Independent', tv: 'Series', craft: 'Cinematography', classic: 'Classics', nature: 'Mountain and nature' };

const F = (id, name, city, country, month, tier, focus, site, o = {}) => ({ id, name, city, country, month, tier, focus: focus.split(' '), site: site ? 'https://' + site : null, ...o });

export const FESTIVAL_DB = [
  // ── the big names ──
  F('cannes', 'Festival de Cannes', 'Cannes', 'FR', 5, 1, 'all', 'www.festival-cannes.com', { short: 'Cannes', aka: ['Cannes Film Festival', 'Festival International du Film de Cannes'], founded: 1946, sections: ['Competition', 'Un Certain Regard', 'Out of Competition', 'Cannes Premiere', 'Special Screenings', 'Midnight Screenings', 'Short Film Competition', 'La Cinef', 'Cannes Classics'] }),
  F('venice', 'Venice International Film Festival', 'Venice', 'IT', 9, 1, 'all', 'www.labiennale.org', { short: 'Venice', aka: ['Biennale', 'Mostra', 'La Biennale di Venezia', 'Venezia', 'Venice Film Festival'], local: "Mostra Internazionale d'Arte Cinematografica", founded: 1932, sections: ['Venezia (Competition)', 'Orizzonti', 'Orizzonti Extra', 'Out of Competition', 'Venice Classics', 'Venice Immersive', 'Biennale College Cinema'] }),
  F('berlinale', 'Berlinale', 'Berlin', 'DE', 2, 1, 'all', 'www.berlinale.de', { aka: ['Berlin International Film Festival', 'Berlin Film Festival'], local: 'Internationale Filmfestspiele Berlin', founded: 1951, sections: ['Competition', 'Berlinale Special', 'Perspectives', 'Panorama', 'Forum', 'Forum Expanded', 'Generation Kplus', 'Generation 14plus', 'Berlinale Shorts'] }),
  F('sundance', 'Sundance Film Festival', 'Boulder, Colorado', 'US', 1, 1, 'all indie', 'festival.sundance.org', { aka: ['Sundance'], founded: 1978, note: 'Held in Park City, Utah until 2026; in Boulder from 2027.', sections: ['U.S. Dramatic Competition', 'U.S. Documentary Competition', 'World Cinema Dramatic Competition', 'World Cinema Documentary Competition', 'NEXT', 'Premieres', 'Spotlight', 'Midnight', 'Short Film Program', 'Special Screenings'] }),
  F('tiff', 'Toronto International Film Festival', 'Toronto', 'CA', 9, 1, 'all', 'www.tiff.net', { short: 'TIFF', founded: 1976, sections: ['Gala Presentations', 'Special Presentations', 'Platform', 'Discovery', 'Centrepiece', 'Wavelengths', 'Midnight Madness', 'TIFF Docs', 'Primetime', 'Short Cuts', 'Classics'] }),
  F('telluride', 'Telluride Film Festival', 'Telluride, Colorado', 'US', 9, 1, 'all', 'www.telluridefilmfestival.org', { short: 'Telluride', founded: 1974 }),
  F('nyff', 'New York Film Festival', 'New York', 'US', 9, 1, 'all', 'www.filmlinc.org/nyff', { short: 'NYFF', founded: 1963, sections: ['Main Slate', 'Spotlight', 'Currents', 'Revivals'] }),
  F('locarno', 'Locarno Film Festival', 'Locarno', 'CH', 8, 1, 'all', 'www.locarnofestival.ch', { short: 'Locarno', founded: 1946, sections: ['Concorso internazionale', 'Concorso Cineasti del presente', 'Piazza Grande', 'Pardi di domani', 'Fuori concorso', 'Histoire(s) du cinéma'] }),
  F('sansebastian', 'San Sebastián International Film Festival', 'San Sebastián', 'ES', 9, 1, 'all', 'www.sansebastianfestival.com', { short: 'San Sebastián', aka: ['San Sebastian', 'Donostia', 'Zinemaldia', 'SSIFF'], local: 'Donostiako Nazioarteko Zinemaldia · Festival Internacional de Cine de San Sebastián', founded: 1953, sections: ['Official Selection', 'New Directors', 'Horizontes Latinos', 'Perlak', 'Zabaltegi-Tabakalera', 'Nest'] }),
  F('kviff', 'Karlovy Vary International Film Festival', 'Karlovy Vary', 'CZ', 7, 1, 'all', 'www.kviff.com', { short: 'KVIFF', aka: ['Karlovy Vary'], founded: 1946, sections: ['Crystal Globe Competition', 'Proxima Competition', 'Special Screenings', 'Horizons'] }),
  F('iffr', 'International Film Festival Rotterdam', 'Rotterdam', 'NL', 1, 1, 'all', 'iffr.com', { short: 'IFFR', aka: ['Rotterdam'], founded: 1972, sections: ['Tiger Competition', 'Big Screen Competition', 'Harbour', 'Limelight', 'Bright Future', 'Short & Mid-length', 'Cinema Regained'] }),
  F('sxsw', 'SXSW Film & TV Festival', 'Austin, Texas', 'US', 3, 1, 'all tv', 'www.sxsw.com', { short: 'SXSW', aka: ['South by Southwest', 'SXSW Film Festival'], founded: 1994, note: 'Called SXSW Film Festival before 2023.', sections: ['Headliners', 'Narrative Feature Competition', 'Documentary Feature Competition', 'Narrative Spotlight', 'Documentary Spotlight', 'Visions', 'Midnighters', 'Festival Favorites', 'Shorts Program'] }),
  F('tribeca', 'Tribeca Festival', 'New York', 'US', 6, 2, 'all tv', 'tribecafilm.com', { short: 'Tribeca', aka: ['Tribeca Film Festival'], founded: 2002, note: 'Called Tribeca Film Festival until 2021.' }),
  F('annecy', 'Annecy International Animation Film Festival', 'Annecy', 'FR', 6, 1, 'anim', 'www.annecy.org', { short: 'Annecy', aka: ['Annecy Festival'], local: "Festival international du film d'animation d'Annecy", founded: 1960, sections: ['Official Selection', 'Contrechamp', 'Short Films', 'Perspectives', 'Graduation Films', 'TV Films', 'Commissioned Films'] }),
  F('clermont', 'Clermont-Ferrand International Short Film Festival', 'Clermont-Ferrand', 'FR', 2, 1, 'short', 'clermont-filmfest.org', { short: 'Clermont-Ferrand', aka: ['Clermont', 'Clermont Ferrand'], local: 'Festival international du court métrage de Clermont-Ferrand', founded: 1979, sections: ['International Competition', 'National Competition', 'Lab Competition'] }),
  F('idfa', 'International Documentary Film Festival Amsterdam', 'Amsterdam', 'NL', 11, 1, 'doc', 'www.idfa.nl', { short: 'IDFA', founded: 1988 }),
  F('busan', 'Busan International Film Festival', 'Busan', 'KR', 9, 2, 'all', 'www.biff.kr', { short: 'BIFF', aka: ['Busan', 'Pusan'], founded: 1996 }),
  F('quinzaine', "Directors' Fortnight", 'Cannes', 'FR', 5, 1, 'all', 'www.quinzaine-cineastes.fr', { short: 'Quinzaine', aka: ['Quinzaine des cinéastes', 'Quinzaine des réalisateurs'], local: 'Quinzaine des cinéastes', founded: 1969, note: 'Runs alongside the Festival de Cannes; renamed from Quinzaine des réalisateurs in 2022.' }),
  F('semaine', "Critics' Week", 'Cannes', 'FR', 5, 2, 'all', 'www.semainedelacritique.com', { aka: ['Semaine de la Critique', 'Cannes Critics Week'], local: 'Semaine de la Critique', founded: 1962, note: 'Runs alongside the Festival de Cannes.' }),
  F('giornate', 'Giornate degli Autori', 'Venice', 'IT', 9, 2, 'all', 'www.giornatedegliautori.com', { aka: ['Venice Days'], founded: 2004, note: 'Runs alongside the Venice International Film Festival.' }),
  F('sic', "Venice International Film Critics' Week", 'Venice', 'IT', 9, 2, 'all', 'www.sicvenezia.it', { aka: ['Settimana della Critica', 'SIC'], local: 'Settimana Internazionale della Critica', founded: 1984 }),

  // ── Europe ──
  F('bfi-lff', 'BFI London Film Festival', 'London', 'GB', 10, 2, 'all', 'www.bfi.org.uk/london-film-festival', { short: 'LFF', aka: ['London Film Festival'], founded: 1957 }),
  F('bfi-flare', 'BFI Flare: London LGBTIQ+ Film Festival', 'London', 'GB', 3, 2, 'lgbtq', 'www.bfi.org.uk/flare', { short: 'BFI Flare' }),
  F('edinburgh', 'Edinburgh International Film Festival', 'Edinburgh', 'GB', 8, 2, 'all', null, { short: 'EIFF', founded: 1947 }),
  F('sheffield', 'Sheffield DocFest', 'Sheffield', 'GB', 6, 2, 'doc', 'www.sheffdocfest.com', { aka: ['Sheffield Doc/Fest', 'Sheffield Documentary Festival'], founded: 1994 }),
  F('glasgow', 'Glasgow Film Festival', 'Glasgow', 'GB', 2, 2, 'all', 'glasgowfilm.org' ),
  F('encounters', 'Encounters Film Festival', 'Bristol', 'GB', 9, 2, 'short anim', null, { aka: ['Encounters Short Film Festival'] }),
  F('raindance', 'Raindance Film Festival', 'London', 'GB', 6, 2, 'indie', 'raindance.org', { short: 'Raindance', founded: 1993 }),
  F('lsff', 'London Short Film Festival', 'London', 'GB', 1, 3, 'short', 'www.shortfilms.org.uk', { short: 'LSFF' }),
  F('opencity', 'Open City Documentary Festival', 'London', 'GB', 9, 3, 'doc', 'opencitylondon.com'),
  F('frightfest', 'FrightFest', 'London', 'GB', 8, 3, 'genre', 'www.frightfest.co.uk', { aka: ['Arrow FrightFest'] }),
  F('leeds', 'Leeds International Film Festival', 'Leeds', 'GB', 11, 3, 'all', 'leedsfilm.com', { short: 'LIFF' }),
  F('asff', 'Aesthetica Short Film Festival', 'York', 'GB', 11, 3, 'short', 'asff.co.uk', { short: 'ASFF' }),
  F('iris', 'Iris Prize LGBTQ+ Film Festival', 'Cardiff', 'GB', 10, 3, 'lgbtq short', 'irisprize.org', { short: 'Iris Prize' }),
  F('wildscreen', 'Wildscreen Festival', 'Bristol', 'GB', 10, 3, 'nature doc', 'www.wildscreen.org'),
  F('diff', 'Dublin International Film Festival', 'Dublin', 'IE', 2, 2, 'all', 'www.diff.ie', { short: 'DIFF', aka: ['Virgin Media Dublin International Film Festival'] }),
  F('galway', 'Galway Film Fleadh', 'Galway', 'IE', 7, 3, 'all', 'www.galwayfilmfleadh.com'),
  F('cork', 'Cork International Film Festival', 'Cork', 'IE', 11, 3, 'all', 'corkfilmfest.org', { founded: 1956 }),
  F('cphdox', 'CPH:DOX', 'Copenhagen', 'DK', 3, 2, 'doc', 'cphdox.dk', { aka: ['CPH DOX', 'Copenhagen International Documentary Film Festival'], founded: 2003 }),
  F('odense', 'Odense International Film Festival', 'Odense', 'DK', 8, 3, 'short', 'filmfestival.dk', { short: 'OFF' }),
  F('goteborg', 'Göteborg Film Festival', 'Gothenburg', 'SE', 1, 2, 'all', 'goteborgfilmfestival.se', { aka: ['Goteborg', 'Gothenburg Film Festival'], founded: 1979 }),
  F('stockholm', 'Stockholm International Film Festival', 'Stockholm', 'SE', 11, 3, 'all', 'www.stockholmfilmfestival.se', { founded: 1990 }),
  F('uppsala', 'Uppsala Short Film Festival', 'Uppsala', 'SE', 10, 3, 'short', 'www.shortfilmfestival.com'),
  F('nordisk', 'Nordisk Panorama', 'Malmö', 'SE', 9, 3, 'doc short', 'www.nordiskpanorama.com'),
  F('tampere', 'Tampere Film Festival', 'Tampere', 'FI', 3, 2, 'short', 'tamperefilmfestival.fi', { founded: 1970 }),
  F('hiff', 'Helsinki International Film Festival', 'Helsinki', 'FI', 9, 3, 'all', 'hiff.fi', { aka: ['Love & Anarchy'] }),
  F('docpoint', 'DocPoint Helsinki Documentary Film Festival', 'Helsinki', 'FI', 1, 3, 'doc', 'docpoint.info', { short: 'DocPoint' }),
  F('biff-bergen', 'Bergen International Film Festival', 'Bergen', 'NO', 10, 3, 'all', 'www.biff.no', { short: 'BIFF' }),
  F('tromso', 'Tromsø International Film Festival', 'Tromsø', 'NO', 1, 3, 'all', 'tiff.no', { aka: ['Tromso'] }),
  F('riff', 'Reykjavík International Film Festival', 'Reykjavík', 'IS', 9, 3, 'all', 'riff.is', { short: 'RIFF', aka: ['Reykjavik'] }),
  F('dokleipzig', 'DOK Leipzig', 'Leipzig', 'DE', 10, 2, 'doc anim', 'www.dok-leipzig.de', { aka: ['International Leipzig Festival for Documentary and Animated Film'], founded: 1955 }),
  F('oberhausen', 'International Short Film Festival Oberhausen', 'Oberhausen', 'DE', 5, 2, 'short', 'www.kurzfilmtage.de', { aka: ['Oberhausen', 'Kurzfilmtage'], local: 'Internationale Kurzfilmtage Oberhausen', founded: 1954 }),
  F('munich', 'Munich International Film Festival', 'Munich', 'DE', 6, 2, 'all', 'www.filmfest-muenchen.de', { aka: ['Filmfest München'], local: 'Filmfest München', founded: 1983 }),
  F('hamburg', 'Filmfest Hamburg', 'Hamburg', 'DE', 10, 3, 'all', 'www.filmfesthamburg.de'),
  F('hamburg-short', 'Hamburg International Short Film Festival', 'Hamburg', 'DE', 6, 3, 'short', 'festival.shortfilm.com', { local: 'Internationales KurzFilmFestival Hamburg' }),
  F('interfilm', 'interfilm Berlin International Short Film Festival', 'Berlin', 'DE', 11, 3, 'short', 'www.interfilm.de', { short: 'interfilm' }),
  F('maxophuls', 'Max Ophüls Prize Film Festival', 'Saarbrücken', 'DE', 1, 3, 'all', 'www.ffmop.de', { aka: ['Max Ophuls'], local: 'Filmfestival Max Ophüls Preis' }),
  F('hof', 'Hof International Film Festival', 'Hof', 'DE', 10, 3, 'all', 'www.hofer-filmtage.com', { local: 'Internationale Hofer Filmtage' }),
  F('itfs', 'Stuttgart International Festival of Animated Film', 'Stuttgart', 'DE', 5, 2, 'anim', 'www.itfs.de', { short: 'ITFS' }),
  F('dokfest-munich', 'DOK.fest München', 'Munich', 'DE', 5, 3, 'doc', 'www.dokfest-muenchen.de', { aka: ['Munich International Documentary Film Festival'] }),
  F('cottbus', 'FilmFestival Cottbus', 'Cottbus', 'DE', 11, 3, 'all', 'www.filmfestivalcottbus.de'),
  F('viennale', 'Viennale', 'Vienna', 'AT', 10, 2, 'all', 'www.viennale.at', { aka: ['Vienna International Film Festival'], founded: 1960 }),
  F('viennashorts', 'Vienna Shorts', 'Vienna', 'AT', 5, 3, 'short', 'viennashorts.com'),
  F('zff', 'Zurich Film Festival', 'Zurich', 'CH', 10, 2, 'all', 'zff.com', { short: 'ZFF', founded: 2005 }),
  F('vdr', 'Visions du Réel', 'Nyon', 'CH', 4, 2, 'doc', 'www.visionsdureel.ch', { aka: ['Visions du Reel'], founded: 1969 }),
  F('solothurn', 'Solothurn Film Festival', 'Solothurn', 'CH', 1, 3, 'all', 'www.solothurnerfilmtage.ch', { local: 'Solothurner Filmtage' }),
  F('fantoche', 'Fantoche International Animation Film Festival', 'Baden', 'CH', 9, 3, 'anim', 'fantoche.ch', { short: 'Fantoche' }),
  F('nifff', 'Neuchâtel International Fantastic Film Festival', 'Neuchâtel', 'CH', 7, 3, 'genre', 'www.nifff.ch', { short: 'NIFFF' }),
  F('winterthur', 'Winterthur International Short Film Festival', 'Winterthur', 'CH', 11, 3, 'short', 'www.kurzfilmtage.ch', { local: 'Internationale Kurzfilmtage Winterthur' }),
  F('deauville', 'Deauville American Film Festival', 'Deauville', 'FR', 9, 3, 'feature', 'www.festival-deauville.com', { local: 'Festival du Cinéma Américain de Deauville' }),
  F('cinemadureel', 'Cinéma du Réel', 'Paris', 'FR', 3, 2, 'doc', 'www.cinemadureel.org', { aka: ['Cinema du Reel'] }),
  F('fipadoc', 'FIPADOC', 'Biarritz', 'FR', 1, 3, 'doc', 'www.fipadoc.com'),
  F('gerardmer', 'Gérardmer International Fantastic Film Festival', 'Gérardmer', 'FR', 1, 3, 'genre', 'festival-gerardmer.com', { aka: ['Gerardmer'], local: 'Festival international du film fantastique de Gérardmer' }),
  F('premiersplans', 'Premiers Plans Angers', 'Angers', 'FR', 1, 3, 'all', 'www.premiersplans.org', { local: "Festival Premiers Plans d'Angers" }),
  F('lumiere', 'Festival Lumière', 'Lyon', 'FR', 10, 2, 'classic', 'www.festival-lumiere.org', { aka: ['Lumière Festival'] }),
  F('lesarcs', 'Les Arcs Film Festival', 'Les Arcs', 'FR', 12, 3, 'all', 'lesarcs-filmfest.com'),
  F('fid', 'FIDMarseille', 'Marseille', 'FR', 7, 3, 'doc all', 'fidmarseille.org', { aka: ['FID Marseille'] }),
  F('champs', 'Champs-Élysées Film Festival', 'Paris', 'FR', 6, 3, 'indie', 'www.champselyseesfilmfestival.com'),
  F('brest', 'Brest European Short Film Festival', 'Brest', 'FR', 11, 3, 'short', 'www.filmcourt.fr', { local: 'Festival européen du film court de Brest' }),
  F('seriesmania', 'Series Mania', 'Lille', 'FR', 3, 2, 'tv', 'seriesmania.com'),
  F('canneseries', 'Canneseries', 'Cannes', 'FR', 4, 3, 'tv', 'www.canneseries.com'),
  F('sitges', 'Sitges Film Festival', 'Sitges', 'ES', 10, 2, 'genre', 'sitgesfilmfestival.com', { aka: ['Sitges'], local: 'Festival Internacional de Cinema Fantàstic de Catalunya', founded: 1968 }),
  F('malaga', 'Málaga Film Festival', 'Málaga', 'ES', 3, 3, 'all', 'festivaldemalaga.com', { aka: ['Malaga'], local: 'Festival de Málaga' }),
  F('seminci', 'Valladolid International Film Festival', 'Valladolid', 'ES', 10, 3, 'all', 'www.seminci.es', { short: 'Seminci' }),
  F('sevilla', 'Seville European Film Festival', 'Seville', 'ES', 11, 3, 'all', 'festivaldesevilla.eu', { local: 'Festival de Sevilla' }),
  F('gijon', 'Gijón International Film Festival', 'Gijón', 'ES', 11, 3, 'all indie', null, { short: 'FICX', aka: ['Gijon'] }),
  F('huesca', 'Huesca International Film Festival', 'Huesca', 'ES', 6, 3, 'short', 'www.huesca-filmfestival.com'),
  F('alcine', 'Alcine Alcalá de Henares Film Festival', 'Alcalá de Henares', 'ES', 11, 3, 'short', 'www.alcine.org', { short: 'Alcine' }),
  F('zinebi', 'ZINEBI Bilbao International Festival of Documentary and Short Film', 'Bilbao', 'ES', 11, 3, 'short doc', 'zinebi.eus', { short: 'ZINEBI' }),
  F('da', "D'A Film Festival Barcelona", 'Barcelona', 'ES', 4, 3, 'indie', 'www.dafilmfestival.com', { short: "D'A" }),
  F('indielisboa', 'IndieLisboa', 'Lisbon', 'PT', 5, 3, 'indie', 'indielisboa.com', { aka: ['IndieLisboa International Independent Film Festival'] }),
  F('doclisboa', 'Doclisboa', 'Lisbon', 'PT', 10, 3, 'doc', 'www.doclisboa.org'),
  F('curtas', 'Curtas Vila do Conde', 'Vila do Conde', 'PT', 7, 3, 'short', 'curtas.pt', { aka: ['Vila do Conde International Film Festival'] }),
  F('fantasporto', 'Fantasporto', 'Porto', 'PT', 3, 3, 'genre', 'www.fantasporto.com', { aka: ['Oporto International Film Festival'] }),
  F('torino', 'Torino Film Festival', 'Turin', 'IT', 11, 3, 'all', 'www.torinofilmfest.org', { aka: ['Turin Film Festival'] }),
  F('rome', 'Rome Film Fest', 'Rome', 'IT', 10, 3, 'all', 'www.romacinemafest.it', { local: 'Festa del Cinema di Roma' }),
  F('giffoni', 'Giffoni Film Festival', 'Giffoni Valle Piana', 'IT', 7, 2, 'kids', 'www.giffonifilmfestival.it', { short: 'Giffoni', founded: 1971 }),
  F('trieste', 'Trieste Film Festival', 'Trieste', 'IT', 1, 3, 'all', 'www.triestefilmfestival.it'),
  F('pesaro', 'Pesaro Film Festival', 'Pesaro', 'IT', 6, 3, 'all', 'www.pesarofilmfest.it', { local: 'Mostra Internazionale del Nuovo Cinema' }),
  F('popoli', 'Festival dei Popoli', 'Florence', 'IT', 11, 3, 'doc', 'www.festivaldeipopoli.org'),
  F('ritrovato', 'Il Cinema Ritrovato', 'Bologna', 'IT', 6, 3, 'classic', 'festival.ilcinemaritrovato.it'),
  F('fareast', 'Far East Film Festival', 'Udine', 'IT', 4, 3, 'feature', 'www.fareastfilm.com', { short: 'FEFF' }),
  F('trento', 'Trento Film Festival', 'Trento', 'IT', 5, 3, 'nature', 'trentofestival.it'),
  F('nff', 'Netherlands Film Festival', 'Utrecht', 'NL', 9, 3, 'all', 'www.filmfestival.nl', { short: 'NFF', local: 'Nederlands Film Festival' }),
  F('goshort', 'Go Short International Short Film Festival', 'Nijmegen', 'NL', 4, 3, 'short', 'goshort.nl', { short: 'Go Short' }),
  F('cinekid', 'Cinekid', 'Amsterdam', 'NL', 10, 3, 'kids', 'www.cinekid.nl'),
  F('gent', 'Film Fest Gent', 'Ghent', 'BE', 10, 3, 'all', 'filmfestival.be', { aka: ['Ghent'] }),
  F('bifff', 'Brussels International Fantastic Film Festival', 'Brussels', 'BE', 4, 3, 'genre', 'www.bifff.net', { short: 'BIFFF' }),
  F('anima', 'Anima Brussels', 'Brussels', 'BE', 3, 3, 'anim', 'animafestival.be', { aka: ['Anima'] }),
  F('leuven', 'Leuven International Short Film Festival', 'Leuven', 'BE', 12, 3, 'short', 'www.kortfilmfestival.be', { local: 'Internationaal Kortfilmfestival Leuven' }),
  F('luxfilm', 'Luxembourg City Film Festival', 'Luxembourg', 'LU', 3, 3, 'all', 'www.luxfilmfest.lu'),
  F('thessaloniki', 'Thessaloniki International Film Festival', 'Thessaloniki', 'GR', 11, 2, 'all', 'www.filmfestival.gr', { short: 'TIFF', founded: 1960 }),
  F('thessaloniki-doc', 'Thessaloniki Documentary Festival', 'Thessaloniki', 'GR', 3, 3, 'doc', 'www.filmfestival.gr'),
  F('drama', 'Drama International Short Film Festival', 'Drama', 'GR', 9, 3, 'short', 'www.dramafilmfestival.gr'),
  F('sarajevo', 'Sarajevo Film Festival', 'Sarajevo', 'BA', 8, 2, 'all', 'www.sff.ba', { short: 'SFF', founded: 1995 }),
  F('tallinn', 'Tallinn Black Nights Film Festival', 'Tallinn', 'EE', 11, 2, 'all', 'poff.ee', { short: 'PÖFF', aka: ['Black Nights', 'POFF'], founded: 1997 }),
  F('warsaw', 'Warsaw Film Festival', 'Warsaw', 'PL', 10, 3, 'all', 'www.wff.pl', { short: 'WFF' }),
  F('krakow', 'Krakow Film Festival', 'Kraków', 'PL', 6, 2, 'doc short anim', 'www.krakowfilmfestival.pl', { aka: ['Cracow', 'Krakow'], founded: 1961 }),
  F('newhorizons', 'New Horizons International Film Festival', 'Wrocław', 'PL', 7, 3, 'all', 'www.nowehoryzonty.pl', { local: 'Nowe Horyzonty' }),
  F('camerimage', 'EnergaCAMERIMAGE', 'Toruń', 'PL', 11, 2, 'craft', 'camerimage.pl', { aka: ['Camerimage'], founded: 1993 }),
  F('docsag', 'Millennium Docs Against Gravity', 'Warsaw', 'PL', 5, 3, 'doc', 'docsag.pl'),
  F('tiff-ro', 'Transilvania International Film Festival', 'Cluj-Napoca', 'RO', 6, 3, 'all', 'tiff.ro', { short: 'TIFF', founded: 2002 }),
  F('sofia', 'Sofia International Film Festival', 'Sofia', 'BG', 3, 3, 'all', 'siff.bg'),
  F('animafest', 'Animafest Zagreb', 'Zagreb', 'HR', 6, 2, 'anim', 'www.animafest.hr', { aka: ['World Festival of Animated Film'], founded: 1972 }),
  F('animateka', 'Animateka', 'Ljubljana', 'SI', 12, 3, 'anim', 'www.animateka.si'),
  F('fest-belgrade', 'FEST', 'Belgrade', 'RS', 2, 3, 'all', 'www.fest.rs', { aka: ['Belgrade International Film Festival'] }),
  F('jihlava', 'Ji.hlava International Documentary Film Festival', 'Jihlava', 'CZ', 10, 3, 'doc', 'www.ji-hlava.com', { short: 'Ji.hlava' }),
  F('oneworld', 'One World', 'Prague', 'CZ', 3, 3, 'doc', 'www.oneworld.cz', { aka: ['One World International Human Rights Documentary Film Festival'] }),
  F('zlin', 'Zlín Film Festival', 'Zlín', 'CZ', 5, 3, 'kids', 'www.zlinfest.cz', { aka: ['Zlin'] }),
  F('odesa', 'Odesa International Film Festival', 'Odesa', 'UA', 7, 3, 'all', 'oiff.com.ua', { short: 'OIFF' }),
  F('istanbul', 'Istanbul Film Festival', 'Istanbul', 'TR', 4, 3, 'all', 'film.iksv.org'),
  F('yerevan', 'Golden Apricot Yerevan International Film Festival', 'Yerevan', 'AM', 7, 3, 'all', 'www.gaiff.am', { short: 'Golden Apricot' }),

  // ── United States ──
  F('slamdance', 'Slamdance Film Festival', 'Los Angeles', 'US', 2, 2, 'indie', 'slamdance.com', { short: 'Slamdance', founded: 1995, note: 'Held in Park City, Utah until 2024; in Los Angeles since 2025.' }),
  F('afifest', 'AFI Fest', 'Los Angeles', 'US', 10, 2, 'all', 'fest.afi.com'),
  F('psiff', 'Palm Springs International Film Festival', 'Palm Springs, California', 'US', 1, 2, 'feature', 'www.psfilmfest.org', { short: 'PSIFF', founded: 1990 }),
  F('psshortfest', 'Palm Springs International ShortFest', 'Palm Springs, California', 'US', 6, 2, 'short', 'www.psfilmfest.org', { short: 'Palm Springs ShortFest', aka: ['ShortFest'], founded: 1995 }),
  F('fullframe', 'Full Frame Documentary Film Festival', 'Durham, North Carolina', 'US', 4, 2, 'doc', 'www.fullframefest.org', { short: 'Full Frame', founded: 1998 }),
  F('truefalse', 'True/False Film Fest', 'Columbia, Missouri', 'US', 3, 2, 'doc', 'truefalse.org', { short: 'True/False', founded: 2004 }),
  F('docnyc', 'DOC NYC', 'New York', 'US', 11, 2, 'doc', 'www.docnyc.net', { founded: 2010 }),
  F('fantasticfest', 'Fantastic Fest', 'Austin, Texas', 'US', 9, 2, 'genre', 'fantasticfest.com', { founded: 2005 }),
  F('chicago', 'Chicago International Film Festival', 'Chicago', 'US', 10, 2, 'all', 'www.chicagofilmfestival.com', { founded: 1964 }),
  F('austin', 'Austin Film Festival', 'Austin, Texas', 'US', 10, 2, 'all', 'austinfilmfestival.com', { founded: 1994 }),
  F('millvalley', 'Mill Valley Film Festival', 'Mill Valley, California', 'US', 10, 2, 'all', 'www.mvff.com', { short: 'MVFF', founded: 1978 }),
  F('sffilm', 'San Francisco International Film Festival', 'San Francisco', 'US', 4, 2, 'all', 'sffilm.org', { aka: ['SFFILM Festival', 'SFIFF'], founded: 1957 }),
  F('siff', 'Seattle International Film Festival', 'Seattle', 'US', 5, 2, 'all', 'www.siff.net', { short: 'SIFF', founded: 1976 }),
  F('hamptons', 'Hamptons International Film Festival', 'East Hampton, New York', 'US', 10, 2, 'all', 'hamptonsfilmfest.org', { short: 'HIFF', founded: 1993 }),
  F('sbiff', 'Santa Barbara International Film Festival', 'Santa Barbara, California', 'US', 2, 2, 'all', 'sbiff.org', { short: 'SBIFF', founded: 1986 }),
  F('annarbor', 'Ann Arbor Film Festival', 'Ann Arbor, Michigan', 'US', 3, 2, 'short', 'www.aafilmfest.org', { founded: 1963 }),
  F('aspen', 'Aspen Shortsfest', 'Aspen, Colorado', 'US', 4, 2, 'short', 'aspenfilm.org', { founded: 1991 }),
  F('outfest', 'Outfest Los Angeles LGBTQ+ Film Festival', 'Los Angeles', 'US', 7, 2, 'lgbtq', 'www.outfest.org', { short: 'Outfest' }),
  F('frameline', 'Frameline San Francisco International LGBTQ+ Film Festival', 'San Francisco', 'US', 6, 2, 'lgbtq', 'www.frameline.org', { short: 'Frameline' }),
  F('hollyshorts', 'HollyShorts Film Festival', 'Los Angeles', 'US', 8, 2, 'short', 'www.hollyshorts.com', { short: 'HollyShorts' }),
  F('denver', 'Denver Film Festival', 'Denver', 'US', 11, 3, 'all', 'denverfilm.org', { founded: 1978 }),
  F('woodstock', 'Woodstock Film Festival', 'Woodstock, New York', 'US', 10, 3, 'indie', 'woodstockfilmfestival.org', { founded: 2000 }),
  F('cleveland', 'Cleveland International Film Festival', 'Cleveland', 'US', 4, 3, 'all', 'www.clevelandfilm.org', { short: 'CIFF', founded: 1977 }),
  F('atlanta', 'Atlanta Film Festival', 'Atlanta', 'US', 4, 3, 'all', 'www.atlantafilmfestival.com', { founded: 1976 }),
  F('nashville', 'Nashville Film Festival', 'Nashville', 'US', 10, 3, 'all', 'nashvillefilmfestival.org', { founded: 1969 }),
  F('heartland', 'Heartland International Film Festival', 'Indianapolis', 'US', 10, 3, 'all', 'heartlandfilm.org', { founded: 1991 }),
  F('neworleans', 'New Orleans Film Festival', 'New Orleans', 'US', 10, 3, 'all', 'neworleansfilmsociety.org'),
  F('florida', 'Florida Film Festival', 'Orlando, Florida', 'US', 4, 3, 'all', 'floridafilmfestival.com'),
  F('miami', 'Miami Film Festival', 'Miami', 'US', 4, 3, 'all', 'miamifilmfestival.com'),
  F('savannah', 'SCAD Savannah Film Festival', 'Savannah, Georgia', 'US', 10, 3, 'all', 'filmfest.scad.edu', { short: 'Savannah Film Festival' }),
  F('middleburg', 'Middleburg Film Festival', 'Middleburg, Virginia', 'US', 10, 3, 'feature', 'middleburgfilm.org'),
  F('philadelphia', 'Philadelphia Film Festival', 'Philadelphia', 'US', 10, 3, 'all', 'filmadelphia.org'),
  F('blackstar', 'BlackStar Film Festival', 'Philadelphia', 'US', 8, 3, 'all', 'www.blackstarfest.org'),
  F('brooklyn', 'Brooklyn Film Festival', 'Brooklyn, New York', 'US', 6, 3, 'indie', 'www.brooklynfilmfestival.org'),
  F('newfest', 'NewFest', 'New York', 'US', 10, 3, 'lgbtq', 'www.newfest.org', { aka: ["NewFest: New York's LGBTQ+ Film Festival"] }),
  F('nantucket', 'Nantucket Film Festival', 'Nantucket, Massachusetts', 'US', 6, 3, 'all', 'nantucketfilmfestival.org'),
  F('provincetown', 'Provincetown International Film Festival', 'Provincetown, Massachusetts', 'US', 6, 3, 'all', 'www.provincetownfilm.org'),
  F('iffboston', 'Independent Film Festival Boston', 'Boston', 'US', 4, 3, 'indie', 'iffboston.org', { short: 'IFFBoston' }),
  F('woodshole', 'Woods Hole Film Festival', 'Woods Hole, Massachusetts', 'US', 7, 3, 'indie', 'woodsholefilmfestival.org'),
  F('rhodeisland', 'Rhode Island International Film Festival', 'Providence, Rhode Island', 'US', 8, 3, 'all', 'film-festival.org', { short: 'RIIFF' }),
  F('lashorts', 'LA Shorts International Film Festival', 'Los Angeles', 'US', 7, 3, 'short', 'lashortsfest.com', { short: 'LA Shorts' }),
  F('dwf', 'Dances With Films', 'Los Angeles', 'US', 6, 3, 'indie', 'danceswithfilms.com'),
  F('screamfest', 'Screamfest Horror Film Festival', 'Los Angeles', 'US', 10, 3, 'genre', 'www.screamfestla.com', { short: 'Screamfest' }),
  F('beyondfest', 'Beyond Fest', 'Los Angeles', 'US', 9, 3, 'genre', 'beyondfest.com'),
  F('paff', 'Pan African Film Festival', 'Los Angeles', 'US', 2, 3, 'all', 'www.paff.org', { short: 'PAFF' }),
  F('abff', 'American Black Film Festival', 'Miami', 'US', 6, 3, 'all', 'www.abff.com', { short: 'ABFF' }),
  F('caamfest', 'CAAMFest', 'San Francisco', 'US', 5, 3, 'all', 'caamedia.org'),
  F('iffla', 'Indian Film Festival of Los Angeles', 'Los Angeles', 'US', 5, 3, 'all', 'indianfilmfestival.org', { short: 'IFFLA' }),
  F('cinequest', 'Cinequest Film Festival', 'San Jose, California', 'US', 3, 3, 'indie', 'www.cinequest.org', { short: 'Cinequest' }),
  F('bentonville', 'Bentonville Film Festival', 'Bentonville, Arkansas', 'US', 6, 3, 'all', 'bentonvillefilmfestival.com'),
  F('tallahassee', 'Tallahassee Film Festival', 'Tallahassee, Florida', 'US', 4, 3, 'all', 'tallahasseefilmfestival.com'),
  F('hotsprings', 'Hot Springs Documentary Film Festival', 'Hot Springs, Arkansas', 'US', 10, 3, 'doc', 'hsdfi.org', { founded: 1992 }),
  F('bigsky', 'Big Sky Documentary Film Festival', 'Missoula, Montana', 'US', 2, 3, 'doc', 'www.bigskyfilmfest.org'),
  F('sidewalk', 'Sidewalk Film Festival', 'Birmingham, Alabama', 'US', 8, 3, 'indie', 'sidewalkfest.com'),
  F('stlouis', 'St. Louis International Film Festival', 'St. Louis, Missouri', 'US', 11, 3, 'all', 'cinemastlouis.org', { short: 'SLIFF' }),
  F('sedona', 'Sedona International Film Festival', 'Sedona, Arizona', 'US', 2, 3, 'indie', 'sedonafilmfestival.org'),
  F('hiff-hawaii', 'Hawaii International Film Festival', 'Honolulu', 'US', 10, 3, 'all', 'hiff.org', { short: 'HIFF' }),
  F('nyicff', "New York International Children's Film Festival", 'New York', 'US', 3, 3, 'kids', 'www.nyicff.org', { short: 'NYICFF' }),
  F('wildscenic', 'Wild & Scenic Film Festival', 'Nevada City, California', 'US', 2, 3, 'nature doc', 'www.wildandscenicfilmfestival.org'),

  // ── Canada ──
  F('hotdocs', 'Hot Docs Canadian International Documentary Festival', 'Toronto', 'CA', 4, 2, 'doc', 'hotdocs.ca', { short: 'Hot Docs', founded: 1993 }),
  F('fantasia', 'Fantasia International Film Festival', 'Montreal', 'CA', 7, 2, 'genre', 'fantasiafestival.com', { short: 'Fantasia', founded: 1996 }),
  F('viff', 'Vancouver International Film Festival', 'Vancouver', 'CA', 10, 2, 'all', 'viff.org', { short: 'VIFF' }),
  F('ottawa', 'Ottawa International Animation Festival', 'Ottawa', 'CA', 9, 2, 'anim', 'www.animationfestival.ca', { short: 'OIAF', founded: 1976 }),
  F('fnc', 'Festival du nouveau cinéma', 'Montreal', 'CA', 10, 3, 'all', 'nouveaucinema.ca', { short: 'FNC' }),
  F('ridm', 'RIDM Montreal International Documentary Festival', 'Montreal', 'CA', 11, 3, 'doc', 'ridm.ca', { short: 'RIDM' }),
  F('calgary', 'Calgary International Film Festival', 'Calgary', 'CA', 9, 3, 'all', 'www.calgaryfilm.com', { short: 'CIFF' }),
  F('fin', 'FIN Atlantic International Film Festival', 'Halifax', 'CA', 9, 3, 'all', 'finfestival.ca', { short: 'FIN' }),
  F('whistler', 'Whistler Film Festival', 'Whistler', 'CA', 12, 3, 'all', 'www.whistlerfilmfestival.com'),
  F('insideout', 'Inside Out Toronto LGBT Film Festival', 'Toronto', 'CA', 5, 3, 'lgbtq', 'insideout.ca', { short: 'Inside Out' }),
  F('banff', 'Banff Centre Mountain Film and Book Festival', 'Banff', 'CA', 11, 3, 'nature', 'www.banffcentre.ca', { aka: ['Banff Mountain Film Festival'] }),

  // ── Latin America and the Caribbean ──
  F('morelia', 'Morelia International Film Festival', 'Morelia', 'MX', 10, 2, 'all', 'moreliafilmfest.com', { short: 'FICM', local: 'Festival Internacional de Cine de Morelia', founded: 2003 }),
  F('guadalajara', 'Guadalajara International Film Festival', 'Guadalajara', 'MX', 6, 2, 'all', 'www.ficg.mx', { short: 'FICG', local: 'Festival Internacional de Cine en Guadalajara', founded: 1986 }),
  F('guanajuato', 'Guanajuato International Film Festival', 'Guanajuato', 'MX', 7, 3, 'all', 'www.giff.mx', { short: 'GIFF' }),
  F('ambulante', 'Ambulante', 'Mexico City', 'MX', 5, 3, 'doc', 'www.ambulante.org', { aka: ['Ambulante Documentary Film Festival'] }),
  F('havana', 'Havana Film Festival', 'Havana', 'CU', 12, 3, 'all', 'habanafilmfestival.com', { local: 'Festival Internacional del Nuevo Cine Latinoamericano' }),
  F('ficci', 'Cartagena International Film Festival', 'Cartagena', 'CO', 4, 3, 'all', 'www.ficcifestival.com', { short: 'FICCI', founded: 1960 }),
  F('mardelplata', 'Mar del Plata International Film Festival', 'Mar del Plata', 'AR', 11, 2, 'all', 'www.mardelplatafilmfest.com', { local: 'Festival Internacional de Cine de Mar del Plata', founded: 1954 }),
  F('bafici', 'Buenos Aires International Festival of Independent Cinema', 'Buenos Aires', 'AR', 4, 3, 'indie', null, { short: 'BAFICI' }),
  F('mostra-sp', 'São Paulo International Film Festival', 'São Paulo', 'BR', 10, 2, 'all', 'mostra.org', { aka: ['Mostra Internacional de Cinema em São Paulo', 'Sao Paulo'], founded: 1977 }),
  F('festivaldorio', 'Festival do Rio', 'Rio de Janeiro', 'BR', 10, 2, 'all', 'www.festivaldorio.com.br', { aka: ['Rio de Janeiro International Film Festival'] }),
  F('etudoverdade', "It's All True International Documentary Film Festival", 'São Paulo', 'BR', 4, 3, 'doc', 'etudoverdade.com.br', { local: 'É Tudo Verdade', founded: 1996 }),
  F('gramado', 'Gramado Film Festival', 'Gramado', 'BR', 8, 3, 'all', 'www.festivaldegramado.net', { local: 'Festival de Cinema de Gramado' }),
  F('kinoforum', 'São Paulo International Short Film Festival', 'São Paulo', 'BR', 8, 3, 'short', 'kinoforum.org.br', { aka: ['Kinoforum'] }),
  F('valdivia', 'Valdivia International Film Festival', 'Valdivia', 'CL', 10, 3, 'all', 'ficvaldivia.cl', { short: 'FICValdivia' }),
  F('sanfic', 'Santiago International Film Festival', 'Santiago', 'CL', 8, 3, 'all', 'sanfic.com', { short: 'SANFIC' }),
  F('lima', 'Lima Film Festival', 'Lima', 'PE', 8, 3, 'all', 'festivaldelima.com', { local: 'Festival de Cine de Lima PUCP' }),

  // ── Asia ──
  F('tokyo', 'Tokyo International Film Festival', 'Tokyo', 'JP', 10, 2, 'all', 'www.tiff-jp.net', { short: 'TIFF', founded: 1985 }),
  F('shortshorts', 'Short Shorts Film Festival & Asia', 'Tokyo', 'JP', 6, 3, 'short', 'www.shortshorts.org', { short: 'SSFF & ASIA', founded: 1999 }),
  F('yamagata', 'Yamagata International Documentary Film Festival', 'Yamagata', 'JP', 10, 2, 'doc', 'www.yidff.jp', { short: 'YIDFF', founded: 1989 }),
  F('osaka', 'Osaka Asian Film Festival', 'Osaka', 'JP', 3, 3, 'all', 'www.oaff.jp', { short: 'OAFF' }),
  F('filmex', 'Tokyo Filmex', 'Tokyo', 'JP', 11, 3, 'all', 'filmex.jp'),
  F('newchitose', 'New Chitose Airport International Animation Festival', 'Chitose', 'JP', 11, 3, 'anim', 'airport-anifes.jp'),
  F('jeonju', 'Jeonju International Film Festival', 'Jeonju', 'KR', 5, 3, 'indie', 'www.jeonjufest.kr', { short: 'JIFF' }),
  F('bifan', 'Bucheon International Fantastic Film Festival', 'Bucheon', 'KR', 7, 3, 'genre', 'www.bifan.kr', { short: 'BIFAN' }),
  F('shanghai', 'Shanghai International Film Festival', 'Shanghai', 'CN', 6, 2, 'all', 'www.siff.com', { short: 'SIFF', founded: 1993 }),
  F('first', 'FIRST International Film Festival', 'Xining', 'CN', 7, 3, 'indie', null, { aka: ['FIRST Xining'] }),
  F('hkiff', 'Hong Kong International Film Festival', 'Hong Kong', 'HK', 4, 2, 'all', 'www.hkiff.org.hk', { short: 'HKIFF', founded: 1977 }),
  F('goldenhorse', 'Taipei Golden Horse Film Festival', 'Taipei', 'TW', 11, 2, 'all', 'www.goldenhorse.org.tw', { short: 'Golden Horse' }),
  F('taipei', 'Taipei Film Festival', 'Taipei', 'TW', 6, 3, 'all', 'www.taipeiff.taipei'),
  F('kaohsiung', 'Kaohsiung Film Festival', 'Kaohsiung', 'TW', 10, 3, 'short', 'www.kff.tw'),
  F('tidf', 'Taiwan International Documentary Festival', 'Taipei', 'TW', 5, 3, 'doc', 'www.tidf.org.tw', { short: 'TIDF' }),
  F('sgiff', 'Singapore International Film Festival', 'Singapore', 'SG', 11, 3, 'all', 'sgiff.com', { short: 'SGIFF', founded: 1987 }),
  F('jaff', 'Jogja-NETPAC Asian Film Festival', 'Yogyakarta', 'ID', 12, 3, 'all', 'jaff-filmfest.org', { short: 'JAFF' }),
  F('cinemalaya', 'Cinemalaya Philippine Independent Film Festival', 'Manila', 'PH', 8, 3, 'indie', 'www.cinemalaya.org', { short: 'Cinemalaya' }),
  F('iffi', 'International Film Festival of India', 'Goa', 'IN', 11, 2, 'all', 'www.iffigoa.org', { short: 'IFFI', founded: 1952 }),
  F('mami', 'Jio MAMI Mumbai Film Festival', 'Mumbai', 'IN', 10, 3, 'all', 'www.mumbaifilmfestival.com', { short: 'MAMI', aka: ['Mumbai Film Festival'], founded: 1997 }),
  F('iffk', 'International Film Festival of Kerala', 'Thiruvananthapuram', 'IN', 12, 3, 'all', 'iffk.in', { short: 'IFFK', founded: 1996 }),
  F('dharamshala', 'Dharamshala International Film Festival', 'Dharamshala', 'IN', 11, 3, 'indie', 'diff.co.in', { short: 'DIFF' }),
  F('miff-mumbai', 'Mumbai International Film Festival', 'Mumbai', 'IN', 6, 3, 'doc short anim', 'miff.in', { short: 'MIFF' }),
  F('kashish', 'KASHISH Mumbai International Queer Film Festival', 'Mumbai', 'IN', 6, 3, 'lgbtq', 'mumbaiqueerfest.com', { short: 'KASHISH' }),

  // ── Middle East and Africa ──
  F('redsea', 'Red Sea International Film Festival', 'Jeddah', 'SA', 12, 2, 'all', 'redseafilmfest.com', { short: 'Red Sea', founded: 2021 }),
  F('cairo', 'Cairo International Film Festival', 'Cairo', 'EG', 11, 2, 'all', 'www.ciff.org.eg', { short: 'CIFF', founded: 1976 }),
  F('elgouna', 'El Gouna Film Festival', 'El Gouna', 'EG', 10, 3, 'all', 'elgounafilmfestival.com', { short: 'GFF' }),
  F('ajyal', 'Ajyal Film Festival', 'Doha', 'QA', 11, 3, 'kids', 'www.dohafilminstitute.com'),
  F('marrakech', 'Marrakech International Film Festival', 'Marrakech', 'MA', 12, 2, 'all', 'www.festivalmarrakech.info', { short: 'FIFM', founded: 2001 }),
  F('carthage', 'Carthage Film Festival', 'Tunis', 'TN', 12, 3, 'all', 'www.jcctunisie.org', { short: 'JCC', local: 'Journées Cinématographiques de Carthage', founded: 1966 }),
  F('fespaco', 'FESPACO', 'Ouagadougou', 'BF', 2, 2, 'all', null, { aka: ['Panafrican Film and Television Festival of Ouagadougou'], local: 'Festival panafricain du cinéma et de la télévision de Ouagadougou', founded: 1969 }),
  F('durban', 'Durban International Film Festival', 'Durban', 'ZA', 7, 3, 'all', 'www.durbanfilmfest.co.za', { short: 'DIFF', founded: 1979 }),
  F('encounters-za', 'Encounters South African International Documentary Festival', 'Cape Town', 'ZA', 6, 3, 'doc', 'www.encounters.co.za'),
  F('ziff', 'Zanzibar International Film Festival', 'Zanzibar', 'TZ', 7, 3, 'all', 'www.ziff.or.tz', { short: 'ZIFF' }),
  F('afriff', 'Africa International Film Festival', 'Lagos', 'NG', 11, 3, 'all', 'afriff.com', { short: 'AFRIFF' }),
  F('jerusalem', 'Jerusalem Film Festival', 'Jerusalem', 'IL', 7, 3, 'all', 'www.jff.org.il', { founded: 1984 }),
  F('haifa', 'Haifa International Film Festival', 'Haifa', 'IL', 10, 3, 'all', 'www.haifaff.co.il'),
  F('docaviv', 'Docaviv', 'Tel Aviv', 'IL', 5, 3, 'doc', 'www.docaviv.co.il', { aka: ['Docaviv International Documentary Film Festival'] }),

  // ── Australia and New Zealand ──
  F('miff', 'Melbourne International Film Festival', 'Melbourne', 'AU', 8, 2, 'all', 'miff.com.au', { short: 'MIFF', founded: 1952 }),
  F('sff', 'Sydney Film Festival', 'Sydney', 'AU', 6, 2, 'all', 'www.sff.org.au', { short: 'SFF', founded: 1954 }),
  F('flickerfest', 'Flickerfest International Short Film Festival', 'Sydney', 'AU', 1, 2, 'short', 'www.flickerfest.com.au', { short: 'Flickerfest', founded: 1991 }),
  F('adelaide', 'Adelaide Film Festival', 'Adelaide', 'AU', 10, 3, 'all', 'www.adelaidefilmfestival.org'),
  F('miaf', 'Melbourne International Animation Festival', 'Melbourne', 'AU', 6, 3, 'anim', 'www.miaf.net', { short: 'MIAF' }),
  F('stkilda', 'St Kilda Film Festival', 'Melbourne', 'AU', 6, 3, 'short', 'www.stkildafilmfestival.com.au'),
  F('tropfest', 'Tropfest', 'Sydney', 'AU', 12, 3, 'short', 'www.tropfest.com'),
  F('revelation', 'Revelation Perth International Film Festival', 'Perth', 'AU', 7, 3, 'indie', 'www.revelationfilmfest.org', { short: 'Rev' }),
  F('cinefestoz', 'CinefestOZ', 'Busselton', 'AU', 8, 3, 'all', 'cinefestoz.com'),
  F('mardigras', 'Mardi Gras Film Festival', 'Sydney', 'AU', 2, 3, 'lgbtq', 'queerscreen.org.au', { aka: ['Queer Screen'] }),
  F('nziff', 'Whānau Mārama: New Zealand International Film Festival', 'Auckland', 'NZ', 7, 3, 'all', 'www.nziff.co.nz', { short: 'NZIFF', aka: ['New Zealand International Film Festival', 'Whanau Marama'] }),
  F('showmeshorts', 'Show Me Shorts Film Festival', 'Auckland', 'NZ', 10, 3, 'short', 'www.showmeshorts.co.nz', { short: 'Show Me Shorts' }),
];

// ── search ──
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9:/&]+/g, ' ').trim();
const KEYS = new Map(FESTIVAL_DB.map((f) => [f.id, [f.name, f.short, ...(f.aka || []), f.local].filter(Boolean).map(fold)]));

// The festivals that best match what someone is typing: name, short name, other names, then city. Big names first on a tie.
export function searchFestivals(q, limit = 8) {
  const n = fold(q); if (n.length < 2) return [];
  const words = n.split(' ');
  const scored = [];
  for (const f of FESTIVAL_DB) {
    const keys = KEYS.get(f.id); let s = 0;
    for (const k of keys) {
      if (k === n) s = Math.max(s, 100);
      else if (k.startsWith(n)) s = Math.max(s, 80);
      else if (words.every((w) => k.split(' ').some((kw) => kw.startsWith(w)))) s = Math.max(s, 60);
      else if (k.includes(n)) s = Math.max(s, 40);
    }
    if (!s && fold(f.city).startsWith(n)) s = 30;
    if (s) scored.push([s + (4 - f.tier) * 3, f]);
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name)).slice(0, limit).map((x) => x[1]);
}

// The festival a line of text names, if it names one: an exact name or alias, or a short name as a whole word.
export function festivalFromText(text) {
  const n = fold(text); if (!n) return null;
  let best = null, bestLen = 0;
  for (const f of FESTIVAL_DB) for (const k of KEYS.get(f.id)) {
    if (k.length < 3) continue;
    const hit = n === k || (` ${n} `).includes(` ${k} `);
    if (hit && k.length > bestLen) { best = f; bestLen = k.length; }
  }
  return best;
}
export const festivalById = (id) => FESTIVAL_DB.find((f) => f.id === id) || null;
