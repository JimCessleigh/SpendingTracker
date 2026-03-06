// keyword (lowercase) → domain
export const BANK_DOMAINS: Record<string, string> = {
  'chase':            'chase.com',
  'citi':             'citi.com',
  'citibank':         'citi.com',
  'bank of america':  'bankofamerica.com',
  ' boa ':            'bankofamerica.com',
  'american express': 'americanexpress.com',
  'amex':             'americanexpress.com',
  'capital one':      'capitalone.com',
  'wells fargo':      'wellsfargo.com',
  'discover':         'discover.com',
  'us bank':          'usbank.com',
  'usbank':           'usbank.com',
  'barclays':         'barclays.com',
  'hsbc':             'hsbc.com',
  'td bank':          'td.com',
  'bmo':              'bmo.com',
  'rbc':              'rbc.com',
  'scotiabank':       'scotiabank.com',
  'cibc':             'cibc.com',
  'pnc':              'pnc.com',
  'ally':             'ally.com',
  'navy federal':     'navyfederal.org',
  'usaa':             'usaa.com',
  'fidelity':         'fidelity.com',
  'schwab':           'schwab.com',
  'charles schwab':   'schwab.com',
  'goldman sachs':    'goldmansachs.com',
  'marcus':           'marcus.com',
  'synchrony':        'synchrony.com',
  'lloyds':           'lloyds.com',
  'natwest':          'natwest.com',
  'santander':        'santander.com',
  'ing':              'ing.com.au',
  'ing australia':    'ing.com.au',
  'bnp':              'bnpparibas.com',
  'deutsche':         'db.com',
  'icbc':             'icbc.com.cn',
  'ccb':              'ccb.com',
  '中国建设银行':      'ccb.com',
  '工商银行':          'icbc.com.cn',
  'abc':              'abchina.com',
  '农业银行':          'abchina.com',
  'boc':              'boc.cn',
  '中国银行':          'boc.cn',
  'cmb':              'cmbchina.com',
  '招商银行':          'cmbchina.com',
  '招商':              'cmbchina.com',
  'spdb':             'spdb.com.cn',
  '浦发':              'spdb.com.cn',
  'ceb':              'cebbank.com',
  '光大':              'cebbank.com',
  'paypal':           'paypal.com',
  'apple':            'apple.com',
  'revolut':          'revolut.com',
  'monzo':            'monzo.com',
  'n26':              'n26.com',
  'wise':             'wise.com',
  'transferwise':     'wise.com',
  // Australian banks
  'commonwealth':     'commbank.com.au',
  'commbank':         'commbank.com.au',
  'cba':              'commbank.com.au',
  'westpac':          'westpac.com.au',
  'anz':              'anz.com.au',
  'nab':              'nab.com.au',
  'national australia': 'nab.com.au',
  'macquarie':        'macquarie.com',
  'bendigo':          'bendigobank.com.au',
  'suncorp':          'suncorp.com.au',
  'bankwest':         'bankwest.com.au',
  'st george':        'stgeorge.com.au',
  'bank of queensland': 'boq.com.au',
  'boq':              'boq.com.au',
  'amp':              'amp.com.au',
  'ubank':            'ubank.com.au',
};

export interface BankInfo {
  name: string;
  domain: string;
  color: string; // brand color for badge background
}

export const KNOWN_BANKS: BankInfo[] = [
  { name: 'Chase',            domain: 'chase.com',            color: '#005EB8' },
  { name: 'Citi',             domain: 'citi.com',             color: '#003B8E' },
  { name: 'Bank of America',  domain: 'bankofamerica.com',    color: '#E31837' },
  { name: 'American Express', domain: 'americanexpress.com',  color: '#016FD0' },
  { name: 'Capital One',      domain: 'capitalone.com',       color: '#D22630' },
  { name: 'Wells Fargo',      domain: 'wellsfargo.com',       color: '#D71E28' },
  { name: 'Discover',         domain: 'discover.com',         color: '#F76F20' },
  { name: 'US Bank',          domain: 'usbank.com',           color: '#0C2074' },
  { name: 'Barclays',         domain: 'barclays.com',         color: '#00AEEF' },
  { name: 'HSBC',             domain: 'hsbc.com',             color: '#DB0011' },
  { name: 'TD Bank',          domain: 'td.com',               color: '#34B233' },
  { name: 'BMO',              domain: 'bmo.com',              color: '#0075BE' },
  { name: 'RBC',              domain: 'rbc.com',              color: '#005DAA' },
  { name: 'Scotiabank',       domain: 'scotiabank.com',       color: '#EC111A' },
  { name: 'CIBC',             domain: 'cibc.com',             color: '#C41F3E' },
  { name: 'PNC',              domain: 'pnc.com',              color: '#F58025' },
  { name: 'Ally',             domain: 'ally.com',             color: '#8A2BE2' },
  { name: 'Navy Federal',     domain: 'navyfederal.org',      color: '#003087' },
  { name: 'USAA',             domain: 'usaa.com',             color: '#003087' },
  { name: 'Goldman Sachs',    domain: 'goldmansachs.com',     color: '#3D4A4F' },
  { name: 'Synchrony',        domain: 'synchrony.com',        color: '#3B5998' },
  { name: 'Lloyds',           domain: 'lloyds.com',           color: '#006A4E' },
  { name: 'Santander',        domain: 'santander.com',        color: '#EC0000' },
  { name: 'Revolut',          domain: 'revolut.com',          color: '#191C1F' },
  { name: 'Monzo',            domain: 'monzo.com',            color: '#FF3464' },
  { name: 'Wise',             domain: 'wise.com',             color: '#00B9A0' },
  { name: 'ICBC 工商银行',     domain: 'icbc.com.cn',          color: '#C8102E' },
  { name: 'CCB 建设银行',      domain: 'ccb.com',              color: '#0062AE' },
  { name: 'ABC 农业银行',      domain: 'abchina.com',          color: '#007A3D' },
  { name: 'BOC 中国银行',      domain: 'boc.cn',               color: '#C8102E' },
  { name: 'CMB 招商银行',      domain: 'cmbchina.com',         color: '#C8102E' },
  { name: 'SPDB 浦发银行',     domain: 'spdb.com.cn',          color: '#005BAC' },
  { name: 'CEB 光大银行',      domain: 'cebbank.com',          color: '#003087' },
  { name: 'PayPal',           domain: 'paypal.com',           color: '#003087' },
  { name: 'Apple Card',       domain: 'apple.com',            color: '#555555' },
  // Australian banks
  { name: 'Commonwealth Bank', domain: 'commbank.com.au',     color: '#C8A000' },
  { name: 'Westpac',           domain: 'westpac.com.au',      color: '#D5002B' },
  { name: 'ANZ',               domain: 'anz.com.au',          color: '#007DBB' },
  { name: 'NAB',               domain: 'nab.com.au',          color: '#CC0000' },
  { name: 'ING Australia',     domain: 'ing.com.au',          color: '#FF6200' },
  { name: 'Macquarie',         domain: 'macquarie.com',       color: '#000000' },
  { name: 'Bendigo Bank',      domain: 'bendigobank.com.au',  color: '#E31837' },
  { name: 'Suncorp',           domain: 'suncorp.com.au',      color: '#EE3224' },
  { name: 'Bankwest',          domain: 'bankwest.com.au',     color: '#0067B1' },
  { name: 'St.George',         domain: 'stgeorge.com.au',     color: '#E5002B' },
  { name: 'BOQ',               domain: 'boq.com.au',          color: '#E31837' },
  { name: 'ubank',             domain: 'ubank.com.au',        color: '#FF5B00' },
];

// domain → BankInfo for fast lookup
const DOMAIN_MAP: Record<string, BankInfo> = {};
KNOWN_BANKS.forEach(b => { DOMAIN_MAP[b.domain] = b; });

export function getBankInfo(domain: string): BankInfo | null {
  return DOMAIN_MAP[domain] || null;
}

export function detectBankDomain(cardName: string): string | null {
  const lower = cardName.toLowerCase();
  for (const [keyword, domain] of Object.entries(BANK_DOMAINS)) {
    if (lower.includes(keyword.trim())) return domain;
  }
  return null;
}

// Google's favicon CDN — reliable on mobile, no API key needed
export function logoUrl(domain: string): string {
  return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`;
}
