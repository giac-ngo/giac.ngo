// Stub: @shared/buddhistCenters
// bodhi-lab's Discovery page imports this data
export interface BuddhistCenter {
  id: string;
  name: string;
  tradition: string;
  location: string;
  country: string;
  description: string;
  website?: string;
  imageUrl?: string;
}

export const buddhistCenters: BuddhistCenter[] = [
  {
    id: '1',
    name: 'Làng Mai',
    tradition: 'Thiền Tông',
    location: 'Dordogne, France',
    country: 'France',
    description: 'Tu viện thiền định được sáng lập bởi Thiền sư Thích Nhất Hạnh.',
    website: 'https://plumvillage.org',
  },
  {
    id: '2',
    name: 'Thiền Viện Trúc Lâm',
    tradition: 'Thiền Tông Trúc Lâm',
    location: 'Đà Lạt, Lâm Đồng',
    country: 'Vietnam',
    description: 'Thiền viện lớn của Phật giáo Thiền tông Trúc Lâm tại Đà Lạt.',
  },
  {
    id: '3',
    name: 'Chùa Bái Đính',
    tradition: 'Phật Giáo Bắc Tông',
    location: 'Ninh Bình',
    country: 'Vietnam',
    description: 'Quần thể chùa lớn nhất Việt Nam với nhiều kỷ lục Đông Nam Á.',
  },
];

export const buddhistAgents = [
  { id: 'agent-1', name: 'Giác Ngộ AI', tradition: 'Phật Giáo Đại Thừa', imageUrl: '/assets/agent-giac-ngo-artwork.webp' },
  { id: 'agent-2', name: 'Tâm An', tradition: 'Thiền Tông', imageUrl: '/assets/agent-tam-an-artwork.webp' },
  { id: 'agent-3', name: 'Đốn Ngộ', tradition: 'Thiền Tông', imageUrl: '/assets/agent-don-ngo-artwork.webp' },
];
