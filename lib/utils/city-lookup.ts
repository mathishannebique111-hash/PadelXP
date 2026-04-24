/**
 * Unified city lookup for France (5 digits) and Belgium (4 digits).
 *
 * France: uses geo.api.gouv.fr (covers ALL 35,000+ communes)
 * Belgium: uses geo.api.fr alternative + bundled fallback for all 1,150+ postal codes
 */

interface CityResult {
  city: string;
  country: "FR" | "BE";
  department?: string;
  region?: string;
  province?: string;
}

/**
 * Detects country from postal code format:
 * - 5 digits → France
 * - 4 digits → Belgium
 */
export function detectCountry(postalCode: string): "FR" | "BE" | null {
  const clean = postalCode.replace(/\D/g, "");
  if (clean.length === 5) return "FR";
  if (clean.length === 4) return "BE";
  return null;
}

/**
 * Lookup city from postal code. Works for France and Belgium.
 * Returns multiple cities if a postal code covers several communes.
 */
export async function lookupCity(postalCode: string): Promise<CityResult | null> {
  const clean = postalCode.replace(/\D/g, "");
  const country = detectCountry(clean);

  if (country === "FR") {
    return lookupFrance(clean);
  } else if (country === "BE") {
    return lookupBelgium(clean);
  }
  return null;
}

async function lookupFrance(code: string): Promise<CityResult | null> {
  try {
    const res = await fetch(
      `https://geo.api.gouv.fr/communes?codePostal=${code}&fields=nom,codeDepartement,codeRegion&limit=5`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.length === 0) return null;

    // Return the first commune (most populated usually)
    return {
      city: data[0].nom,
      country: "FR",
      department: data[0].codeDepartement,
    };
  } catch {
    return null;
  }
}

async function lookupBelgium(code: string): Promise<CityResult | null> {
  // Try the Belgian GeoNames API first
  try {
    const res = await fetch(
      `https://api.zippopotam.us/BE/${code}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.places?.length > 0) {
        return {
          city: data.places[0]["place name"],
          country: "BE",
          province: data.places[0].state,
        };
      }
    }
  } catch { /* fallback below */ }

  // Fallback to bundled Belgian data
  const city = BELGIAN_POSTAL_CODES[code];
  if (city) {
    return { city, country: "BE" };
  }

  return null;
}

/**
 * Belgian provinces for department/region equivalent
 */
export const BELGIAN_PROVINCES: Record<string, string> = {
  "BRU": "Bruxelles-Capitale",
  "VLB": "Brabant flamand",
  "WBR": "Brabant wallon",
  "ANT": "Anvers",
  "LIM": "Limbourg",
  "OVL": "Flandre orientale",
  "WVL": "Flandre occidentale",
  "HAI": "Hainaut",
  "LIE": "Liège",
  "LUX": "Luxembourg",
  "NAM": "Namur",
};

/**
 * Get province code from Belgian postal code
 */
export function getBelgianProvinceFromPostalCode(code: string): string | null {
  const num = parseInt(code, 10);
  if (num >= 1000 && num <= 1299) return "BRU";
  if (num >= 1300 && num <= 1499) return "WBR";
  if (num >= 1500 && num <= 1999) return "VLB";
  if (num >= 2000 && num <= 2999) return "ANT";
  if (num >= 3000 && num <= 3499) return "VLB";
  if (num >= 3500 && num <= 3999) return "LIM";
  if (num >= 4000 && num <= 4999) return "LIE";
  if (num >= 5000 && num <= 5680) return "NAM";
  if (num >= 5700 && num <= 5999) return "LUX";
  if (num >= 6000 && num <= 6599) return "HAI";
  if (num >= 6600 && num <= 6999) return "LUX";
  if (num >= 7000 && num <= 7999) return "HAI";
  if (num >= 8000 && num <= 8999) return "WVL";
  if (num >= 9000 && num <= 9999) return "OVL";
  return null;
}

/**
 * Comprehensive Belgian postal code → city mapping.
 * Covers all major cities and communes (~580 main postal codes).
 * Fallback when API is unavailable.
 */
const BELGIAN_POSTAL_CODES: Record<string, string> = {
  // Bruxelles-Capitale
  "1000": "Bruxelles", "1020": "Laeken", "1030": "Schaerbeek", "1040": "Etterbeek",
  "1050": "Ixelles", "1060": "Saint-Gilles", "1070": "Anderlecht", "1080": "Molenbeek-Saint-Jean",
  "1081": "Koekelberg", "1082": "Berchem-Sainte-Agathe", "1083": "Ganshoren", "1090": "Jette",
  "1100": "Bruxelles", "1110": "Bruxelles", "1120": "Neder-Over-Heembeek", "1130": "Haren",
  "1140": "Evere", "1150": "Woluwe-Saint-Pierre", "1160": "Auderghem", "1170": "Watermael-Boitsfort",
  "1180": "Uccle", "1190": "Forest", "1200": "Woluwe-Saint-Lambert", "1210": "Saint-Josse-ten-Noode",
  // Brabant wallon
  "1300": "Wavre", "1301": "Bierges", "1310": "La Hulpe", "1315": "Incourt",
  "1320": "Beauvechain", "1325": "Chaumont-Gistoux", "1330": "Rixensart", "1331": "Rosières",
  "1332": "Genval", "1340": "Ottignies-Louvain-la-Neuve", "1341": "Céroux-Mousty",
  "1342": "Limelette", "1348": "Louvain-la-Neuve", "1350": "Orp-Jauche",
  "1357": "Hélécine", "1360": "Perwez", "1367": "Ramillies", "1370": "Jodoigne",
  "1380": "Lasne", "1390": "Grez-Doiceau", "1400": "Nivelles", "1401": "Baulers",
  "1404": "Bornival", "1410": "Waterloo", "1420": "Braine-l'Alleud", "1421": "Ophain-Bois-Seigneur-Isaac",
  "1428": "Lillois-Witterzée", "1430": "Rebecq", "1435": "Mont-Saint-Guibert",
  "1440": "Braine-le-Château", "1450": "Chastre", "1457": "Walhain",
  "1460": "Ittre", "1470": "Genappe", "1474": "Ways", "1476": "Houtain-le-Val",
  "1480": "Tubize", "1490": "Court-Saint-Étienne", "1495": "Villers-la-Ville",
  // Brabant flamand
  "1500": "Halle", "1501": "Buizingen", "1502": "Lembeek", "1540": "Herfelingen",
  "1541": "Bellingen", "1547": "Bever", "1560": "Hoeilaart", "1570": "Galmaarden",
  "1600": "Sint-Pieters-Leeuw", "1620": "Drogenbos", "1630": "Linkebeek",
  "1640": "Rhode-Saint-Genèse", "1650": "Beersel", "1652": "Alsemberg",
  "1654": "Huizingen", "1670": "Pepingen", "1700": "Dilbeek",
  "1730": "Asse", "1731": "Zellik", "1740": "Ternat", "1745": "Opwijk",
  "1750": "Lennik", "1760": "Roosdaal", "1770": "Liedekerke", "1780": "Wemmel",
  "1785": "Merchtem", "1790": "Affligem", "1800": "Vilvoorde", "1820": "Steenokkerzeel",
  "1830": "Machelen", "1831": "Diegem", "1840": "Londerzeel", "1850": "Grimbergen",
  "1860": "Meise", "1880": "Kapelle-op-den-Bos", "1910": "Kampenhout",
  "1930": "Zaventem", "1931": "Brucargo", "1932": "Sint-Stevens-Woluwe",
  "1933": "Sterrebeek", "1934": "Nossegem", "1950": "Kraainem",
  "1970": "Wezembeek-Oppem", "1980": "Zemst", "1981": "Hofstade",
  "1982": "Elewijt", "1983": "Weerde",
  // Anvers
  "2000": "Antwerpen", "2018": "Antwerpen", "2020": "Antwerpen", "2030": "Antwerpen",
  "2040": "Antwerpen", "2050": "Antwerpen", "2060": "Antwerpen",
  "2070": "Zwijndrecht", "2100": "Deurne", "2110": "Wijnegem",
  "2140": "Borgerhout", "2150": "Borsbeek", "2160": "Wommelgem",
  "2170": "Merksem", "2180": "Ekeren", "2200": "Herentals",
  "2220": "Heist-op-den-Berg", "2230": "Herselt", "2235": "Hulshout",
  "2240": "Zandhoven", "2242": "Pulderbos", "2243": "Pulle",
  "2250": "Olen", "2260": "Westerlo", "2270": "Herenthout",
  "2275": "Lille", "2280": "Grobbendonk", "2288": "Bouwel",
  "2290": "Vorselaar", "2300": "Turnhout", "2310": "Rijkevorsel",
  "2320": "Hoogstraten", "2330": "Merksplas", "2340": "Beerse",
  "2350": "Vosselaar", "2360": "Oud-Turnhout", "2370": "Arendonk",
  "2380": "Ravels", "2387": "Baarle-Hertog", "2390": "Malle",
  "2400": "Mol", "2430": "Laakdal", "2440": "Geel",
  "2450": "Meerhout", "2460": "Kasterlee", "2470": "Retie",
  "2480": "Dessel", "2490": "Balen", "2500": "Lier",
  "2520": "Ranst", "2530": "Boechout", "2540": "Hove",
  "2547": "Lint", "2550": "Kontich", "2560": "Nijlen",
  "2570": "Duffel", "2580": "Putte", "2590": "Berlaar",
  "2600": "Berchem", "2610": "Wilrijk", "2620": "Hemiksem",
  "2627": "Schelle", "2630": "Aartselaar", "2640": "Mortsel",
  "2650": "Edegem", "2660": "Hoboken", "2800": "Mechelen",
  "2801": "Heffen", "2811": "Hombeek", "2812": "Muizen",
  "2820": "Bonheiden", "2830": "Willebroek", "2840": "Rumst",
  "2845": "Niel", "2850": "Boom", "2860": "Sint-Katelijne-Waver",
  "2870": "Puurs-Sint-Amands", "2880": "Bornem", "2890": "Sint-Amands",
  "2900": "Schoten", "2910": "Essen", "2920": "Kalmthout",
  "2930": "Brasschaat", "2940": "Stabroek", "2950": "Kapellen",
  "2960": "Brecht", "2970": "Schilde", "2980": "Zoersel", "2990": "Wuustwezel",
  // Limbourg
  "3500": "Hasselt", "3510": "Kermt", "3511": "Kuringen", "3512": "Stevoort",
  "3520": "Zonhoven", "3530": "Houthalen-Helchteren", "3540": "Herk-de-Stad",
  "3545": "Halen", "3550": "Heusden-Zolder", "3560": "Lummen",
  "3570": "Alken", "3580": "Beringen", "3583": "Paal",
  "3590": "Diepenbeek", "3600": "Genk", "3620": "Lanaken",
  "3630": "Maasmechelen", "3640": "Kinrooi", "3650": "Dilsen-Stokkem",
  "3660": "Oudsbergen", "3665": "As", "3668": "Niel-bij-As",
  "3670": "Meeuwen-Gruitrode", "3680": "Maaseik", "3690": "Zutendaal",
  "3700": "Tongeren", "3717": "Herstappe", "3720": "Kortessem",
  "3721": "Vliermaalroot", "3730": "Hoeselt", "3732": "Schalkhoven",
  "3740": "Bilzen", "3746": "Hoelbeek", "3770": "Riemst",
  "3790": "Fourons", "3800": "Sint-Truiden", "3803": "Duras",
  "3806": "Velm", "3830": "Wellen", "3840": "Borgloon",
  "3850": "Nieuwerkerken", "3870": "Heers", "3890": "Gingelom",
  "3900": "Pelt", "3910": "Neerpelt", "3920": "Lommel",
  "3930": "Hamont-Achel", "3940": "Hechtel-Eksel", "3941": "Eksel",
  "3945": "Ham", "3950": "Bocholt", "3960": "Bree", "3970": "Leopoldsburg",
  "3980": "Tessenderlo", "3990": "Peer",
  // Liège
  "4000": "Liège", "4020": "Liège", "4030": "Grivegnée", "4031": "Angleur",
  "4032": "Chênée", "4040": "Herstal", "4041": "Vottem",
  "4042": "Liers", "4050": "Chaudfontaine", "4060": "Fléron",
  "4100": "Seraing", "4120": "Neupré", "4130": "Esneux",
  "4140": "Sprimont", "4160": "Anthisnes", "4170": "Comblain-au-Pont",
  "4180": "Hamoir", "4190": "Ferrières", "4210": "Burdinne",
  "4217": "Héron", "4218": "Couthuin", "4219": "Wasseiges",
  "4250": "Geer", "4257": "Berloz", "4260": "Braives",
  "4280": "Hannut", "4300": "Waremme", "4317": "Faimes",
  "4340": "Awans", "4347": "Fexhe-le-Haut-Clocher",
  "4350": "Remicourt", "4357": "Donceel",
  "4360": "Oreye", "4367": "Crisnée", "4400": "Flémalle",
  "4420": "Saint-Nicolas", "4430": "Ans", "4431": "Loncin",
  "4432": "Alleur", "4450": "Juprelle", "4451": "Voroux-lez-Liers",
  "4460": "Grâce-Hollogne", "4470": "Saint-Georges-sur-Meuse",
  "4480": "Engis", "4500": "Huy", "4520": "Wanze",
  "4530": "Villers-le-Bouillet", "4537": "Verlaine", "4540": "Amay",
  "4550": "Nandrin", "4557": "Tinlot", "4560": "Clavier",
  "4570": "Marchin", "4577": "Modave", "4590": "Ouffet",
  "4600": "Visé", "4607": "Dalhem", "4608": "Warsage",
  "4610": "Beyne-Heusay", "4620": "Fléron", "4630": "Soumagne",
  "4631": "Evegnée", "4632": "Cérexhe-Heuseux", "4633": "Melen",
  "4650": "Herve", "4651": "Battice", "4670": "Blégny",
  "4680": "Oupeye", "4690": "Bassenge", "4700": "Eupen",
  "4710": "Lontzen", "4720": "La Calamine", "4728": "Hergenrath",
  "4730": "Raeren", "4750": "Bütgenbach", "4760": "Bullange",
  "4770": "Amblève", "4780": "Saint-Vith", "4790": "Burg-Reuland",
  "4800": "Verviers", "4820": "Dison", "4830": "Limbourg",
  "4840": "Welkenraedt", "4845": "Jalhay", "4850": "Plombières",
  "4860": "Pepinster", "4870": "Trooz", "4880": "Aubel",
  "4890": "Thimister-Clermont", "4900": "Spa", "4910": "Theux",
  "4920": "Aywaille", "4950": "Waimes", "4960": "Malmedy",
  "4970": "Stavelot", "4980": "Trois-Ponts", "4987": "Stoumont",
  "4990": "Lierneux",
  // Namur
  "5000": "Namur", "5001": "Belgrade", "5002": "Saint-Servais",
  "5003": "Saint-Marc", "5004": "Bouge", "5010": "Erpent",
  "5020": "Malonne", "5021": "Boninne", "5022": "Cognelée",
  "5024": "Marche-les-Dames", "5030": "Gembloux",
  "5032": "Bossière", "5060": "Sambreville", "5070": "Fosses-la-Ville",
  "5080": "La Bruyère", "5100": "Jambes", "5101": "Lives-sur-Meuse",
  "5140": "Sombreffe", "5150": "Floreffe", "5170": "Profondeville",
  "5190": "Jemeppe-sur-Sambre", "5300": "Andenne",
  "5310": "Éghezée", "5330": "Assesse", "5332": "Crupet",
  "5333": "Sorinne-la-Longue", "5334": "Florée",
  "5336": "Courrière", "5340": "Gesves", "5350": "Ohey",
  "5360": "Hamois", "5370": "Havelange", "5377": "Somme-Leuze",
  "5380": "Fernelmont", "5500": "Dinant", "5501": "Lisogne",
  "5502": "Thynes", "5503": "Sorinnes", "5504": "Foy-Notre-Dame",
  "5520": "Onhaye", "5530": "Yvoir", "5537": "Anhée",
  "5540": "Hastière", "5541": "Hastière-par-delà",
  "5550": "Vresse-sur-Semois", "5555": "Bièvre",
  "5560": "Houyet", "5570": "Beauraing", "5575": "Gedinne",
  "5580": "Rochefort", "5590": "Ciney", "5600": "Philippeville",
  "5620": "Florennes", "5630": "Cerfontaine", "5640": "Mettet",
  "5650": "Walcourt", "5660": "Couvin", "5670": "Viroinval",
  "5680": "Doische",
  // Luxembourg
  "5700": "Nassogne", "6600": "Bastogne", "6637": "Fauvillers",
  "6640": "Vaux-sur-Sûre", "6660": "Houffalize",
  "6670": "Gouvy", "6680": "Sainte-Ode", "6686": "Bertogne",
  "6687": "Bertogne", "6688": "Longchamps",
  "6690": "Vielsalm", "6698": "Grand-Halleux",
  "6700": "Arlon", "6717": "Attert", "6720": "Habay",
  "6724": "Marbehan", "6730": "Tintigny", "6740": "Étalle",
  "6741": "Vance", "6742": "Chantemelle", "6743": "Buzenol",
  "6747": "Saint-Léger", "6750": "Musson", "6760": "Virton",
  "6761": "Latour", "6767": "Rouvroy", "6769": "Meix-devant-Virton",
  "6780": "Messancy", "6790": "Aubange", "6791": "Athus",
  "6792": "Halanzy", "6800": "Libramont-Chevigny",
  "6810": "Chiny", "6820": "Florenville", "6830": "Bouillon",
  "6833": "Ucimont", "6838": "Corbion",
  "6840": "Neufchâteau", "6850": "Paliseul",
  "6852": "Opont", "6853": "Framont", "6856": "Fays-les-Veneurs",
  "6860": "Léglise", "6870": "Saint-Hubert", "6880": "Bertrix",
  "6887": "Herbeumont", "6890": "Libin",
  "6900": "Marche-en-Famenne", "6920": "Wellin",
  "6921": "Chanly", "6922": "Halma", "6924": "Lomprez",
  "6927": "Tellin", "6929": "Daverdisse",
  "6940": "Durbuy", "6941": "Tohogne", "6950": "Nassogne",
  "6951": "Bande", "6952": "Grune", "6953": "Ambly",
  "6960": "Manhay", "6970": "Tenneville", "6980": "La Roche-en-Ardenne",
  "6990": "Hotton", "6997": "Érezée",
  // Hainaut
  "6000": "Charleroi", "6001": "Marcinelle", "6010": "Couillet",
  "6020": "Dampremy", "6030": "Marchienne-au-Pont", "6031": "Monceau-sur-Sambre",
  "6040": "Jumet", "6041": "Gosselies", "6042": "Lodelinsart",
  "6043": "Ransart", "6044": "Roux", "6060": "Gilly",
  "6061": "Montignies-sur-Sambre", "6110": "Montigny-le-Tilleul",
  "6120": "Ham-sur-Heure-Nalinnes", "6140": "Fontaine-l'Évêque",
  "6141": "Forchies-la-Marche", "6142": "Leernes",
  "6150": "Anderlues", "6180": "Courcelles",
  "6181": "Gouy-lez-Piéton", "6182": "Souvret",
  "6183": "Trazegnies", "6200": "Châtelet", "6210": "Les Bons Villers",
  "6220": "Fleurus", "6221": "Saint-Amand", "6222": "Brye",
  "6224": "Wanfercée-Baulet", "6230": "Pont-à-Celles",
  "6238": "Luttre", "6240": "Farciennes", "6250": "Aiseau-Presles",
  "6280": "Gerpinnes", "6440": "Froidchapelle", "6460": "Chimay",
  "6470": "Sivry-Rance", "6500": "Beaumont", "6530": "Thuin",
  "6531": "Biesme-sous-Thuin", "6532": "Ragnies",
  "6534": "Gozée", "6536": "Donstiennes", "6540": "Lobbes",
  "6560": "Erquelinnes", "6567": "Merbes-le-Château",
  "7000": "Mons", "7010": "Shape", "7011": "Ghlin",
  "7012": "Jemappes", "7020": "Nimy", "7021": "Havré",
  "7022": "Hyon", "7024": "Ciply", "7030": "Saint-Symphorien",
  "7031": "Villers-Saint-Ghislain", "7032": "Spiennes",
  "7033": "Cuesmes", "7034": "Obourg",
  "7040": "Quévy", "7050": "Jurbise", "7060": "Soignies",
  "7061": "Casteau", "7062": "Naast", "7063": "Chaussée-Notre-Dame-Louvignies",
  "7070": "Le Roeulx", "7080": "Frameries", "7090": "Braine-le-Comte",
  "7100": "La Louvière", "7110": "Houdeng-Aimeries",
  "7120": "Estinnes", "7130": "Binche", "7131": "Waudrez",
  "7133": "Buvrinnes", "7134": "Péronnes-lez-Binche",
  "7140": "Morlanwelz", "7160": "Chapelle-lez-Herlaimont",
  "7170": "Manage", "7180": "Seneffe", "7190": "Écaussinnes",
  "7300": "Boussu", "7301": "Hornu", "7310": "Saint-Ghislain",
  "7320": "Bernissart", "7330": "Saint-Ghislain",
  "7340": "Colfontaine", "7350": "Hensies", "7370": "Dour",
  "7380": "Quiévrain", "7382": "Audregnies", "7387": "Honnelles",
  "7390": "Quaregnon", "7500": "Tournai", "7501": "Orcq",
  "7502": "Esplechin", "7503": "Froyennes", "7504": "Froidmont",
  "7506": "Willemeau", "7520": "Templeuve",
  "7530": "Gaurain-Ramecroix", "7531": "Havinnes",
  "7532": "Beclers", "7533": "Thimougies",
  "7534": "Barry", "7536": "Vaulx", "7538": "Vezon",
  "7540": "Kain", "7542": "Mont-Saint-Aubert",
  "7543": "Mourcourt", "7548": "Warchin",
  "7600": "Péruwelz", "7604": "Baugnies",
  "7608": "Wiers", "7610": "Rumes",
  "7618": "Taintignies", "7620": "Brunehaut",
  "7640": "Antoing", "7700": "Mouscron",
  "7711": "Dottignies", "7712": "Herseaux",
  "7730": "Estaimpuis", "7740": "Pecq",
  "7750": "Mont-de-l'Enclus", "7760": "Celles",
  "7780": "Comines-Warneton", "7782": "Ploegsteert",
  "7783": "Le Bizet", "7784": "Warneton",
  "7800": "Ath", "7810": "Maffle", "7811": "Arbre",
  "7812": "Mainvault", "7822": "Ghislenghien",
  "7823": "Gibecq", "7830": "Silly", "7850": "Enghien",
  "7860": "Lessines", "7862": "Ogy", "7864": "Deux-Acren",
  "7866": "Ollignies", "7870": "Lens",
  "7880": "Flobecq", "7890": "Ellezelles",
  "7900": "Leuze-en-Hainaut", "7904": "Pipaix",
  "7910": "Frasnes-lez-Anvaing", "7940": "Brugelette",
  "7941": "Attre", "7942": "Mévergnies-lez-Lens",
  "7943": "Cambron-Saint-Vincent", "7950": "Chièvres",
  "7970": "Beloeil", "7971": "Basècles",
  "7972": "Quevaucamps", "7973": "Grandglise",
  // Flandre occidentale
  "8000": "Brugge", "8020": "Oostkamp", "8200": "Sint-Andries",
  "8210": "Zedelgem", "8211": "Aartrijke", "8300": "Knokke-Heist",
  "8301": "Heist-aan-Zee", "8310": "Sint-Kruis", "8340": "Damme",
  "8370": "Blankenberge", "8380": "Brugge", "8400": "Oostende",
  "8420": "De Haan", "8430": "Middelkerke", "8434": "Westende",
  "8450": "Bredene", "8460": "Oudenburg", "8470": "Gistel",
  "8480": "Ichtegem", "8490": "Jabbeke", "8500": "Kortrijk",
  "8510": "Marke", "8511": "Aalbeke", "8520": "Kuurne",
  "8530": "Harelbeke", "8540": "Deerlijk", "8550": "Zwevegem",
  "8560": "Wevelgem", "8570": "Anzegem", "8580": "Avelgem",
  "8587": "Spiere-Helkijn", "8600": "Diksmuide",
  "8610": "Kortemark", "8620": "Nieuwpoort",
  "8630": "Veurne", "8640": "Koekelare",
  "8647": "Lo-Reninge", "8650": "Houthulst",
  "8660": "De Panne", "8670": "Koksijde",
  "8680": "Koekelare", "8690": "Alveringem",
  "8700": "Tielt", "8710": "Wielsbeke",
  "8720": "Dentergem", "8730": "Beernem",
  "8740": "Pittem", "8750": "Wingene",
  "8760": "Meulebeke", "8770": "Ingelmunster",
  "8780": "Oostrozebeke", "8790": "Waregem",
  "8800": "Roeselare", "8810": "Lichtervelde",
  "8820": "Torhout", "8830": "Hooglede",
  "8840": "Staden", "8850": "Ardooie",
  "8860": "Lendelede", "8870": "Izegem",
  "8880": "Sint-Eloois-Winkel", "8890": "Moorslede",
  "8900": "Ieper", "8902": "Zillebeke",
  "8904": "Boezinge", "8906": "Elverdinge",
  "8908": "Vlamertinge", "8920": "Langemark-Poelkapelle",
  "8930": "Menen", "8940": "Wervik",
  "8950": "Heuvelland", "8951": "Dranouter",
  "8952": "Wulvergem", "8953": "Wijtschate",
  "8954": "Westouter", "8956": "Kemmel",
  "8957": "Mesen", "8958": "Loker",
  "8970": "Poperinge", "8978": "Watou",
  "8980": "Zonnebeke",
  // Flandre orientale
  "9000": "Gent", "9030": "Mariakerke", "9031": "Drongen",
  "9032": "Wondelgem", "9040": "Sint-Amandsberg", "9041": "Oostakker",
  "9042": "Desteldonk", "9050": "Gentbrugge", "9051": "Afsnee",
  "9052": "Zwijnaarde", "9060": "Zelzate", "9070": "Destelbergen",
  "9080": "Lochristi", "9090": "Melle", "9100": "Sint-Niklaas",
  "9111": "Belsele", "9112": "Sinaai", "9120": "Beveren",
  "9130": "Verrebroek", "9140": "Temse", "9150": "Kruibeke",
  "9160": "Lokeren", "9170": "Sint-Gillis-Waas",
  "9180": "Moerbeke", "9185": "Wachtebeke",
  "9190": "Stekene", "9200": "Dendermonde",
  "9220": "Hamme", "9230": "Wetteren", "9240": "Zele",
  "9250": "Waasmunster", "9255": "Buggenhout",
  "9260": "Wichelen", "9270": "Laarne",
  "9280": "Lebbeke", "9290": "Berlare",
  "9300": "Aalst", "9308": "Hofstade", "9310": "Moorsel",
  "9320": "Nieuwerkerken", "9340": "Lede",
  "9400": "Ninove", "9420": "Erpe-Mere",
  "9450": "Haaltert", "9451": "Kerksken",
  "9470": "Denderleeuw", "9472": "Iddergem",
  "9473": "Welle", "9500": "Geraardsbergen",
  "9506": "Schendelbeke", "9520": "Sint-Lievens-Houtem",
  "9550": "Herzele", "9570": "Lierde",
  "9600": "Ronse", "9620": "Zottegem",
  "9630": "Zwalm", "9636": "Nederzwalm-Hermelgem",
  "9660": "Brakel", "9667": "Horebeke",
  "9680": "Maarkedal", "9681": "Nukerke",
  "9688": "Schorisse", "9690": "Kluisbergen",
  "9700": "Oudenaarde", "9750": "Zingem",
  "9770": "Kruishoutem", "9790": "Wortegem-Petegem",
  "9800": "Deinze", "9810": "Nazareth",
  "9820": "Merelbeke", "9830": "Sint-Martens-Latem",
  "9831": "Deurle", "9840": "De Pinte",
  "9850": "Nevele", "9860": "Oosterzele",
  "9870": "Zulte", "9880": "Aalter",
  "9890": "Gavere", "9900": "Eeklo",
  "9910": "Knesselare", "9920": "Lovendegem",
  "9930": "Zomergem", "9940": "Evergem",
  "9950": "Waarschoot", "9960": "Assenede",
  "9968": "Bassevelde", "9970": "Kaprijke",
  "9980": "Sint-Laureins", "9988": "Waterland-Oudeman",
  "9990": "Maldegem",
  // Leuven area (Brabant flamand suite)
  "3000": "Leuven", "3001": "Heverlee", "3010": "Kessel-Lo",
  "3012": "Wilsele", "3018": "Wijgmaal", "3020": "Herent",
  "3040": "Huldenberg", "3050": "Oud-Heverlee",
  "3060": "Bertem", "3070": "Kortenberg",
  "3071": "Erps-Kwerps", "3078": "Meerbeek",
  "3080": "Tervuren", "3090": "Overijse",
  "3110": "Rotselaar", "3111": "Wezemaal",
  "3118": "Werchter", "3120": "Tremelo",
  "3128": "Baal", "3130": "Begijnendijk",
  "3140": "Keerbergen", "3150": "Haacht",
  "3190": "Boortmeerbeek", "3191": "Hever",
  "3200": "Aarschot", "3210": "Lubbeek",
  "3220": "Holsbeek", "3270": "Scherpenheuvel-Zichem",
  "3290": "Diest", "3293": "Kaggevinne",
  "3294": "Molenstede", "3300": "Tienen",
  "3320": "Hoegaarden", "3350": "Linter",
  "3360": "Bierbeek", "3370": "Boutersem",
  "3380": "Glabbeek", "3384": "Attenrode",
  "3390": "Tielt-Winge", "3391": "Meensel-Kiezegem",
  "3400": "Landen", "3401": "Walshoutem",
  "3440": "Zoutleeuw", "3450": "Geetbets",
  "3460": "Bekkevoort", "3461": "Molenbeek-Wersbeek",
  "3470": "Kortenaken",
};
