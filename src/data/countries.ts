export interface MoMoCountry {
  name: string;
  code: string;
  flag: string;
  iso: string;
}

export const momoCountries: MoMoCountry[] = [
  { name: 'Uganda', code: '+256', flag: '🇺🇬', iso: 'ug' },
  { name: 'Zambia', code: '+260', flag: '🇿🇲', iso: 'zm' },
  { name: 'Ghana', code: '+233', flag: '🇬🇭', iso: 'gh' },
  { name: 'Rwanda', code: '+250', flag: '🇷🇼', iso: 'rw' },
  { name: 'Benin', code: '+229', flag: '🇧🇯', iso: 'bj' },
  { name: 'Cameroon', code: '+237', flag: '🇨🇲', iso: 'cm' },
  { name: "Côte d'Ivoire", code: '+225', flag: '🇨🇮', iso: 'ci' },
  { name: 'Congo Brazzaville', code: '+242', flag: '🇨🇬', iso: 'cg' },
  { name: 'Eswatini', code: '+268', flag: '🇸🇿', iso: 'sz' },
  { name: 'Liberia', code: '+231', flag: '🇱🇷', iso: 'lr' },
];

