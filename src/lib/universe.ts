// Liste des actifs suivis. Les symboles sont ceux de Yahoo Finance.

export type Region = "europe" | "usa" | "asie";

export const REGION_LABEL: Record<Region, string> = {
  europe: "Europe",
  usa: "États-Unis",
  asie: "Asie-Pacifique",
};

export interface IndexDef {
  symbol: string;
  name: string;
  region: Region;
  country: string;
}

export const INDICES: IndexDef[] = [
  { symbol: "^FCHI", name: "CAC 40", region: "europe", country: "FR" },
  { symbol: "^STOXX50E", name: "Euro Stoxx 50", region: "europe", country: "EU" },
  { symbol: "^GDAXI", name: "DAX", region: "europe", country: "DE" },
  { symbol: "^FTSE", name: "FTSE 100", region: "europe", country: "GB" },
  { symbol: "FTSEMIB.MI", name: "FTSE MIB", region: "europe", country: "IT" },
  { symbol: "^IBEX", name: "IBEX 35", region: "europe", country: "ES" },
  { symbol: "^AEX", name: "AEX", region: "europe", country: "NL" },
  { symbol: "^SSMI", name: "SMI", region: "europe", country: "CH" },
  { symbol: "^GSPC", name: "S&P 500", region: "usa", country: "US" },
  { symbol: "^IXIC", name: "Nasdaq", region: "usa", country: "US" },
  { symbol: "^DJI", name: "Dow Jones", region: "usa", country: "US" },
  { symbol: "^RUT", name: "Russell 2000", region: "usa", country: "US" },
  { symbol: "^N225", name: "Nikkei 225", region: "asie", country: "JP" },
  { symbol: "^HSI", name: "Hang Seng", region: "asie", country: "HK" },
  { symbol: "000001.SS", name: "Shanghai Composite", region: "asie", country: "CN" },
  { symbol: "^KS11", name: "KOSPI", region: "asie", country: "KR" },
  { symbol: "^TWII", name: "Taïwan TAIEX", region: "asie", country: "TW" },
  { symbol: "^BSESN", name: "Sensex", region: "asie", country: "IN" },
  { symbol: "^AXJO", name: "ASX 200", region: "asie", country: "AU" },
];

/** Indices mis en avant sur l'accueil (2 par région, équilibré). */
export const HEADLINE_INDICES = ["^FCHI", "^STOXX50E", "^GSPC", "^IXIC", "^N225", "^HSI"];

export interface SimpleDef {
  symbol: string;
  name: string;
}

export const FOREX: SimpleDef[] = [
  { symbol: "EURUSD=X", name: "EUR / USD" },
  { symbol: "EURGBP=X", name: "EUR / GBP" },
  { symbol: "EURJPY=X", name: "EUR / JPY" },
  { symbol: "EURCHF=X", name: "EUR / CHF" },
  { symbol: "EURCNY=X", name: "EUR / CNY" },
  { symbol: "JPY=X", name: "USD / JPY" },
];

export const COMMODITIES: SimpleDef[] = [
  { symbol: "GC=F", name: "Or" },
  { symbol: "SI=F", name: "Argent" },
  { symbol: "BZ=F", name: "Pétrole Brent" },
  { symbol: "CL=F", name: "Pétrole WTI" },
  { symbol: "NG=F", name: "Gaz naturel" },
  { symbol: "HG=F", name: "Cuivre" },
];

export const RATES: SimpleDef[] = [
  { symbol: "^TNX", name: "Taux US 10 ans" },
  { symbol: "^TYX", name: "Taux US 30 ans" },
  { symbol: "^VIX", name: "VIX (volatilité US)" },
];

export interface StockDef {
  symbol: string;
  name: string;
  region: Region;
  country: string;
  sector: string;
}

const S = (symbol: string, name: string, region: Region, country: string, sector: string): StockDef => ({
  symbol,
  name,
  region,
  country,
  sector,
});

export const STOCKS: StockDef[] = [
  // France — CAC 40
  S("AI.PA", "Air Liquide", "europe", "FR", "Matériaux"),
  S("AIR.PA", "Airbus", "europe", "FR", "Industrie"),
  S("ALO.PA", "Alstom", "europe", "FR", "Industrie"),
  S("MT.AS", "ArcelorMittal", "europe", "FR", "Matériaux"),
  S("CS.PA", "AXA", "europe", "FR", "Finance"),
  S("BNP.PA", "BNP Paribas", "europe", "FR", "Finance"),
  S("EN.PA", "Bouygues", "europe", "FR", "Industrie"),
  S("BVI.PA", "Bureau Veritas", "europe", "FR", "Industrie"),
  S("CAP.PA", "Capgemini", "europe", "FR", "Technologie"),
  S("CA.PA", "Carrefour", "europe", "FR", "Distribution"),
  S("ACA.PA", "Crédit Agricole", "europe", "FR", "Finance"),
  S("BN.PA", "Danone", "europe", "FR", "Consommation"),
  S("DSY.PA", "Dassault Systèmes", "europe", "FR", "Technologie"),
  S("ENGI.PA", "Engie", "europe", "FR", "Énergie"),
  S("EL.PA", "EssilorLuxottica", "europe", "FR", "Santé"),
  S("ERF.PA", "Eurofins Scientific", "europe", "FR", "Santé"),
  S("RMS.PA", "Hermès", "europe", "FR", "Luxe"),
  S("KER.PA", "Kering", "europe", "FR", "Luxe"),
  S("OR.PA", "L'Oréal", "europe", "FR", "Consommation"),
  S("LR.PA", "Legrand", "europe", "FR", "Industrie"),
  S("MC.PA", "LVMH", "europe", "FR", "Luxe"),
  S("ML.PA", "Michelin", "europe", "FR", "Automobile"),
  S("ORA.PA", "Orange", "europe", "FR", "Télécoms"),
  S("RI.PA", "Pernod Ricard", "europe", "FR", "Consommation"),
  S("PUB.PA", "Publicis", "europe", "FR", "Médias"),
  S("RNO.PA", "Renault", "europe", "FR", "Automobile"),
  S("SAF.PA", "Safran", "europe", "FR", "Industrie"),
  S("SGO.PA", "Saint-Gobain", "europe", "FR", "Matériaux"),
  S("SAN.PA", "Sanofi", "europe", "FR", "Santé"),
  S("SU.PA", "Schneider Electric", "europe", "FR", "Industrie"),
  S("GLE.PA", "Société Générale", "europe", "FR", "Finance"),
  S("STLAP.PA", "Stellantis", "europe", "FR", "Automobile"),
  S("STMPA.PA", "STMicroelectronics", "europe", "FR", "Semi-conducteurs"),
  S("TEP.PA", "Teleperformance", "europe", "FR", "Technologie"),
  S("HO.PA", "Thales", "europe", "FR", "Industrie"),
  S("TTE.PA", "TotalEnergies", "europe", "FR", "Énergie"),
  S("URW.PA", "Unibail-Rodamco-Westfield", "europe", "FR", "Immobilier"),
  S("VIE.PA", "Veolia", "europe", "FR", "Services publics"),
  S("DG.PA", "Vinci", "europe", "FR", "Industrie"),
  // Reste de l'Europe
  S("ASML.AS", "ASML", "europe", "NL", "Semi-conducteurs"),
  S("ADYEN.AS", "Adyen", "europe", "NL", "Technologie"),
  S("SAP.DE", "SAP", "europe", "DE", "Technologie"),
  S("SIE.DE", "Siemens", "europe", "DE", "Industrie"),
  S("ALV.DE", "Allianz", "europe", "DE", "Finance"),
  S("RHM.DE", "Rheinmetall", "europe", "DE", "Industrie"),
  S("NOVO-B.CO", "Novo Nordisk", "europe", "DK", "Santé"),
  S("NESN.SW", "Nestlé", "europe", "CH", "Consommation"),
  S("RO.SW", "Roche", "europe", "CH", "Santé"),
  S("NOVN.SW", "Novartis", "europe", "CH", "Santé"),
  S("AZN.L", "AstraZeneca", "europe", "GB", "Santé"),
  S("SHEL.L", "Shell", "europe", "GB", "Énergie"),
  S("HSBA.L", "HSBC", "europe", "GB", "Finance"),
  S("ULVR.L", "Unilever", "europe", "GB", "Consommation"),
  S("ITX.MC", "Inditex", "europe", "ES", "Distribution"),
  S("SAN.MC", "Banco Santander", "europe", "ES", "Finance"),
  S("RACE.MI", "Ferrari", "europe", "IT", "Automobile"),
  S("ENEL.MI", "Enel", "europe", "IT", "Services publics"),
  // États-Unis
  S("AAPL", "Apple", "usa", "US", "Technologie"),
  S("MSFT", "Microsoft", "usa", "US", "Technologie"),
  S("NVDA", "Nvidia", "usa", "US", "Semi-conducteurs"),
  S("AMZN", "Amazon", "usa", "US", "Distribution"),
  S("GOOGL", "Alphabet", "usa", "US", "Technologie"),
  S("META", "Meta Platforms", "usa", "US", "Technologie"),
  S("TSLA", "Tesla", "usa", "US", "Automobile"),
  S("AVGO", "Broadcom", "usa", "US", "Semi-conducteurs"),
  S("AMD", "AMD", "usa", "US", "Semi-conducteurs"),
  S("INTC", "Intel", "usa", "US", "Semi-conducteurs"),
  S("ORCL", "Oracle", "usa", "US", "Technologie"),
  S("CRM", "Salesforce", "usa", "US", "Technologie"),
  S("ADBE", "Adobe", "usa", "US", "Technologie"),
  S("NFLX", "Netflix", "usa", "US", "Médias"),
  S("PLTR", "Palantir", "usa", "US", "Technologie"),
  S("UBER", "Uber", "usa", "US", "Technologie"),
  S("BRK-B", "Berkshire Hathaway", "usa", "US", "Finance"),
  S("JPM", "JPMorgan Chase", "usa", "US", "Finance"),
  S("GS", "Goldman Sachs", "usa", "US", "Finance"),
  S("BAC", "Bank of America", "usa", "US", "Finance"),
  S("V", "Visa", "usa", "US", "Finance"),
  S("MA", "Mastercard", "usa", "US", "Finance"),
  S("COIN", "Coinbase", "usa", "US", "Finance"),
  S("MSTR", "Strategy", "usa", "US", "Technologie"),
  S("LLY", "Eli Lilly", "usa", "US", "Santé"),
  S("UNH", "UnitedHealth", "usa", "US", "Santé"),
  S("JNJ", "Johnson & Johnson", "usa", "US", "Santé"),
  S("PFE", "Pfizer", "usa", "US", "Santé"),
  S("MRK", "Merck & Co", "usa", "US", "Santé"),
  S("XOM", "ExxonMobil", "usa", "US", "Énergie"),
  S("WMT", "Walmart", "usa", "US", "Distribution"),
  S("COST", "Costco", "usa", "US", "Distribution"),
  S("HD", "Home Depot", "usa", "US", "Distribution"),
  S("PG", "Procter & Gamble", "usa", "US", "Consommation"),
  S("KO", "Coca-Cola", "usa", "US", "Consommation"),
  S("PEP", "PepsiCo", "usa", "US", "Consommation"),
  S("NKE", "Nike", "usa", "US", "Consommation"),
  S("DIS", "Disney", "usa", "US", "Médias"),
  S("BA", "Boeing", "usa", "US", "Industrie"),
  S("CAT", "Caterpillar", "usa", "US", "Industrie"),
  // Asie-Pacifique
  S("7203.T", "Toyota", "asie", "JP", "Automobile"),
  S("6758.T", "Sony", "asie", "JP", "Technologie"),
  S("9984.T", "SoftBank Group", "asie", "JP", "Technologie"),
  S("8306.T", "Mitsubishi UFJ", "asie", "JP", "Finance"),
  S("6861.T", "Keyence", "asie", "JP", "Industrie"),
  S("9983.T", "Fast Retailing (Uniqlo)", "asie", "JP", "Distribution"),
  S("7974.T", "Nintendo", "asie", "JP", "Médias"),
  S("8035.T", "Tokyo Electron", "asie", "JP", "Semi-conducteurs"),
  S("6501.T", "Hitachi", "asie", "JP", "Industrie"),
  S("2330.TW", "TSMC", "asie", "TW", "Semi-conducteurs"),
  S("2317.TW", "Hon Hai (Foxconn)", "asie", "TW", "Technologie"),
  S("005930.KS", "Samsung Electronics", "asie", "KR", "Semi-conducteurs"),
  S("000660.KS", "SK Hynix", "asie", "KR", "Semi-conducteurs"),
  S("0700.HK", "Tencent", "asie", "CN", "Technologie"),
  S("9988.HK", "Alibaba", "asie", "CN", "Distribution"),
  S("3690.HK", "Meituan", "asie", "CN", "Technologie"),
  S("1810.HK", "Xiaomi", "asie", "CN", "Technologie"),
  S("1211.HK", "BYD", "asie", "CN", "Automobile"),
  S("0941.HK", "China Mobile", "asie", "CN", "Télécoms"),
  S("1299.HK", "AIA Group", "asie", "HK", "Finance"),
  S("600519.SS", "Kweichow Moutai", "asie", "CN", "Consommation"),
  S("300750.SZ", "CATL", "asie", "CN", "Industrie"),
  S("RELIANCE.NS", "Reliance Industries", "asie", "IN", "Énergie"),
  S("TCS.NS", "Tata Consultancy", "asie", "IN", "Technologie"),
  S("INFY.NS", "Infosys", "asie", "IN", "Technologie"),
  S("HDFCBANK.NS", "HDFC Bank", "asie", "IN", "Finance"),
  S("BHP.AX", "BHP Group", "asie", "AU", "Matériaux"),
  S("CBA.AX", "Commonwealth Bank", "asie", "AU", "Finance"),
];

// ---------- ETF ----------

export type EtfCategory =
  | "Monde"
  | "États-Unis"
  | "Europe"
  | "France"
  | "Émergents"
  | "Asie & Japon"
  | "Thématique"
  | "Dividendes"
  | "Obligations"
  | "Monétaire"
  | "Or";

export interface EtfDef {
  symbol: string;
  name: string;
  category: EtfCategory;
  /** Éligible au Plan d'épargne en actions */
  pea: boolean;
  /** Frais courants annuels en % (indicatifs ; Yahoo Finance prime s'il fournit la valeur) */
  ter?: number;
  issuer: string;
  /** Indice ou actif suivi */
  tracks: string;
}

const E = (symbol: string, name: string, category: EtfCategory, pea: boolean, issuer: string, tracks: string, ter?: number): EtfDef => ({
  symbol,
  name,
  category,
  pea,
  issuer,
  tracks,
  ter,
});

/** ETF courants accessibles depuis la France (cotations en euros quand elles existent). */
export const ETFS: EtfDef[] = [
  // Éligibles PEA
  E("CW8.PA", "Amundi MSCI World", "Monde", true, "Amundi", "MSCI World", 0.38),
  E("WPEA.PA", "iShares MSCI World Swap PEA", "Monde", true, "iShares", "MSCI World", 0.2),
  E("DCAM.PA", "Amundi PEA Monde (MSCI World)", "Monde", true, "Amundi", "MSCI World", 0.2),
  E("ESE.PA", "BNP Paribas Easy S&P 500", "États-Unis", true, "BNP Paribas AM", "S&P 500", 0.15),
  E("PSP5.PA", "Amundi PEA S&P 500", "États-Unis", true, "Amundi", "S&P 500", 0.12),
  E("PUST.PA", "Amundi PEA Nasdaq-100", "États-Unis", true, "Amundi", "Nasdaq-100", 0.3),
  E("ETZ.PA", "BNP Paribas Easy Stoxx Europe 600", "Europe", true, "BNP Paribas AM", "Stoxx Europe 600", 0.18),
  E("PCEU.PA", "Amundi PEA MSCI Europe", "Europe", true, "Amundi", "MSCI Europe", 0.15),
  E("MSE.PA", "Amundi Euro Stoxx 50", "Europe", true, "Amundi", "Euro Stoxx 50", 0.2),
  E("CAC.PA", "Amundi CAC 40", "France", true, "Amundi", "CAC 40", 0.25),
  E("PAEEM.PA", "Amundi PEA Émergents (MSCI EM)", "Émergents", true, "Amundi", "MSCI Emerging Markets ESG", 0.3),
  E("PAASI.PA", "Amundi PEA Asie émergente", "Asie & Japon", true, "Amundi", "MSCI EM Asia"),
  E("PTPXE.PA", "Amundi PEA Japon (Topix)", "Asie & Japon", true, "Amundi", "Topix"),
  E("OBLI.PA", "Amundi PEA Euro Court Terme", "Monétaire", true, "Amundi", "Taux monétaires de la zone euro"),
  // Compte-titres
  E("IWDA.AS", "iShares Core MSCI World", "Monde", false, "iShares", "MSCI World", 0.2),
  E("VWCE.DE", "Vanguard FTSE All-World", "Monde", false, "Vanguard", "FTSE All-World"),
  E("IUSN.DE", "iShares MSCI World Small Cap", "Monde", false, "iShares", "MSCI World Small Cap", 0.35),
  E("CSPX.AS", "iShares Core S&P 500", "États-Unis", false, "iShares", "S&P 500", 0.07),
  E("EQQQ.PA", "Invesco Nasdaq-100", "États-Unis", false, "Invesco", "Nasdaq-100", 0.3),
  E("IS3N.DE", "iShares Core MSCI EM IMI", "Émergents", false, "iShares", "MSCI Emerging Markets IMI", 0.18),
  E("HLT.PA", "Amundi Stoxx Europe 600 Santé", "Thématique", false, "Amundi", "Stoxx Europe 600 Health Care", 0.3),
  E("BNK.PA", "Amundi Stoxx Europe 600 Banques", "Thématique", false, "Amundi", "Stoxx Europe 600 Banks", 0.3),
  E("TDIV.AS", "VanEck Dividend Leaders (pays développés)", "Dividendes", false, "VanEck", "Morningstar Developed Markets Dividend Leaders", 0.38),
  E("SPYD.DE", "SPDR S&P US Dividend Aristocrats", "Dividendes", false, "State Street", "S&P High Yield Dividend Aristocrats", 0.35),
  E("XGLE.DE", "Xtrackers Obligations d'État zone euro", "Obligations", false, "Xtrackers", "iBoxx € Eurozone Sovereigns", 0.07),
  E("IEAC.AS", "iShares Obligations d'entreprises en euros", "Obligations", false, "iShares", "Bloomberg Euro Aggregate Corporate", 0.2),
  E("AGGH.AS", "iShares Obligations mondiales (couvert en €)", "Obligations", false, "iShares", "Bloomberg Global Aggregate", 0.1),
  E("GOLD.PA", "Amundi Physical Gold (ETC)", "Or", false, "Amundi", "Prix de l'once d'or", 0.12),
];

export const ETF_CATEGORIES = Array.from(new Set(ETFS.map((e) => e.category)));

export function etfDef(symbol: string): EtfDef | undefined {
  return ETFS.find((e) => e.symbol === symbol);
}

export const SECTORS = Array.from(new Set(STOCKS.map((s) => s.sector))).sort((a, b) => a.localeCompare(b, "fr"));

const ALL_NAMES = new Map<string, string>([
  ...INDICES.map((i) => [i.symbol, i.name] as [string, string]),
  ...FOREX.map((i) => [i.symbol, i.name] as [string, string]),
  ...COMMODITIES.map((i) => [i.symbol, i.name] as [string, string]),
  ...RATES.map((i) => [i.symbol, i.name] as [string, string]),
  ...STOCKS.map((i) => [i.symbol, i.name] as [string, string]),
  ...ETFS.map((i) => [i.symbol, i.name] as [string, string]),
]);

export function knownName(symbol: string): string | undefined {
  return ALL_NAMES.get(symbol);
}

export function stockDef(symbol: string): StockDef | undefined {
  return STOCKS.find((s) => s.symbol === symbol);
}

export function indexDef(symbol: string): IndexDef | undefined {
  return INDICES.find((s) => s.symbol === symbol);
}

/** Encodage d'un symbole Yahoo pour une URL (^ et = posent problème). */
export function symbolToSlug(symbol: string): string {
  return encodeURIComponent(symbol);
}

export function slugToSymbol(slug: string): string {
  return decodeURIComponent(slug);
}
