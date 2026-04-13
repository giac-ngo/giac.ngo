import { useState } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, Users, Star, Sparkles, Briefcase, BookOpen, Calendar, HandHeart } from "lucide-react";
import { buddhistCenters } from "../../shared/buddhistCenters";
import { Link, useNavigate } from "react-router-dom";
import { TracingBeam } from "@/components/TracingBeam";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { discoveryTranslations } from "@/translations/discovery";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function Discovery() {
  const { language } = useLanguage();
  const t = discoveryTranslations[language];
  useDocumentTitle("Discovery", "Explore Buddhist temples, monasteries, and meditation centers powered by Bodhi Technology Lab.");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: t.categories.all, icon: "🏛️" },
    { id: "monastery", label: t.categories.monastery, icon: "🏯" },
    { id: "meditation-center", label: t.categories.meditationCenter, icon: "🧘" },
    { id: "temple", label: t.categories.temple, icon: "⛩️" },
    { id: "retreat-center", label: t.categories.retreatCenter, icon: "🌄" },
  ];

  const filteredCenters = buddhistCenters.filter((center) => {
    const matchesSearch =
      center.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      center.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      center.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      center.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      center.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || center.type === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const CenterCard = ({ center }: { center: typeof buddhistCenters[0] }) => {
    const categoryLabel = categories.find((c) => c.id === center.type)?.label || "Khác";
    const categoryIcon = categories.find((c) => c.id === center.type)?.icon || "🏛️";

    const getStatusBadge = () => {
      switch (center.status) {
        case "open":
          return (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-700 rounded-lg text-xs font-semibold">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              {t.status.open}
            </div>
          );
        case "closed":
          return (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-700 rounded-lg text-xs font-semibold">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              {t.status.closed}
            </div>
          );
        case "retreat":
          return (
            <div className="flex items-center gap-1 px-2 py-1 bg-[#991b1b]/20 text-[#991b1b] rounded-lg text-xs font-semibold">
              <div className="w-1.5 h-1.5 bg-[#991b1b] rounded-full" />
              {t.status.retreat}
            </div>
          );
        case "by-appointment":
          return (
            <div className="flex items-center gap-1 px-2 py-1 bg-[#2c2c2c]/20 text-[#2c2c2c] rounded-lg text-xs font-semibold">
              <div className="w-1.5 h-1.5 bg-[#2c2c2c] rounded-full" />
              {t.status.byAppointment}
            </div>
          );
      }
    };

    return (
      <Link to={`/center/${center.id}`}>
        <a>
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white/50 backdrop-blur-md border border-[#8B4513]/30 rounded-2xl overflow-hidden
              shadow-md hover:shadow-lg transition-all cursor-pointer h-full"
            data-testid={`card-discovery-center-${center.id}`}
          >
        <div className="relative h-48 overflow-hidden">
          {center.image && (
            <>
              <img
                src={center.image}
                alt={center.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60"></div>
            </>
          )}
          {!center.image && (
            <div
              className="w-full h-full"
              style={{
                background: `linear-gradient(135deg, ${center.accentColor}40 0%, ${center.accentColor}60 100%)`,
              }}
            />
          )}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <div className="bg-[#991b1b] text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
              #{center.rank}
            </div>
            <div className="bg-[#8B4513]/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
              {t.hero.badge}
            </div>
          </div>
          <div className="absolute top-3 right-3">
            {getStatusBadge()}
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 border-white shadow-lg flex-shrink-0"
                style={{ backgroundColor: center.accentColor }}
              >
                {categoryIcon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-serif font-bold text-sm truncate drop-shadow-lg">
                  {center.name}
                </div>
                <div className="text-white/90 font-serif text-xs truncate drop-shadow-lg">
                  {center.location}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-xl font-serif font-bold text-[#2c2c2c] mb-2">{center.name}</h3>
          <p className="text-sm font-serif text-[#8B4513]/70 mb-4 line-clamp-2">{center.description}</p>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-[#2c2c2c]/70">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-serif">{center.location}, {center.country}</span>
            </div>
            <div className="flex items-center gap-3 text-[#2c2c2c]/70">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-serif">{center.members.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-[#d4af37] text-[#d4af37]" />
                <span className="text-xs font-serif font-semibold">{center.rating}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {center.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 rounded-lg text-xs font-serif font-semibold"
                style={{
                  backgroundColor: `${center.accentColor}20`,
                  color: center.accentColor,
                }}
              >
                #{tag}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span
              className="px-3 py-1.5 rounded-lg text-xs font-serif font-semibold"
              style={{
                backgroundColor: `${center.accentColor}15`,
                color: center.accentColor,
              }}
            >
              {categoryLabel}
            </span>
            <button
              className="flex items-center gap-1 px-4 py-2 bg-[#991b1b] text-white rounded-lg
                hover:bg-[#7a1515] transition-colors font-serif font-semibold text-xs"
              data-testid={`button-explore-center-${center.id}`}
            >
              <Sparkles className="w-3 h-3" />
              {t.centerCard.donateButton}
            </button>
          </div>
        </div>
          </motion.div>
        </a>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#EFE0BD] text-[#8B4513] overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#EFE0BD] via-[#E5D5B7] to-[#EFE0BD]"></div>
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(rgba(139, 69, 19, 0.3) 1px, transparent 1px)`,
            backgroundSize: "30px 30px",
          }}
        ></div>
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[#991b1b]/10 blur-[100px] animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-[#8B4513]/10 blur-[80px] animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative z-10">
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[#EFE0BD]/80 border-b border-[#8B4513]/20">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="relative group">
              <Link to="/" className="flex items-center" data-testid="link-brand">
                  <span className="font-serif font-bold text-[#991b1b] text-lg">{t.header.brand}</span>
              </Link>
              
              {/* Dropdown Menu */}
              <div className="absolute top-full left-0 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-out transform group-hover:translate-y-0 -translate-y-2">
                <div className="bg-gradient-to-br from-[#EFE0BD] to-[#E5D5B7] backdrop-blur-xl border border-[#8B4513]/30 rounded-3xl shadow-2xl overflow-hidden w-[250px]"
                  style={{ boxShadow: 'inset 0 1px 2px rgba(139, 69, 19, 0.1), 0 20px 60px rgba(139, 69, 19, 0.15)' }}>
                  <div className="p-6">
                    <h3 className="font-serif font-bold text-[#991b1b] mb-5 text-xs uppercase tracking-wider flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#991b1b]/10 flex items-center justify-center">
                        <Briefcase className="w-3.5 h-3.5 text-[#991b1b]" />
                      </div>
                      {t.header.company}
                    </h3>
                    <div className="space-y-3">
                      <Link to="/career" className="group/item flex items-center gap-2 font-serif text-[#8B4513]/80 hover:text-[#991b1b] transition-all text-sm py-1.5 px-2 rounded-lg hover:bg-[#991b1b]/10" data-testid="link-career">
                        <div className="w-1 h-1 rounded-full bg-[#8B4513]/40 group-hover/item:bg-[#991b1b]"></div>
                        {t.header.companyDropdown.career}
                      </Link>
                      <Link to="/terms" className="group/item flex items-center gap-2 font-serif text-[#8B4513]/80 hover:text-[#991b1b] transition-all text-sm py-1.5 px-2 rounded-lg hover:bg-[#991b1b]/10" data-testid="link-terms">
                        <div className="w-1 h-1 rounded-full bg-[#8B4513]/40 group-hover/item:bg-[#991b1b]"></div>
                        {t.header.companyDropdown.terms}
                      </Link>
                      <Link to="/privacy" className="group/item flex items-center gap-2 font-serif text-[#8B4513]/80 hover:text-[#991b1b] transition-all text-sm py-1.5 px-2 rounded-lg hover:bg-[#991b1b]/10" data-testid="link-privacy">
                        <div className="w-1 h-1 rounded-full bg-[#8B4513]/40 group-hover/item:bg-[#991b1b]"></div>
                        {t.header.companyDropdown.privacy}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/platform" className="font-serif text-[#8B4513]/70 hover:text-[#991b1b] px-4 py-2 rounded-full hover:bg-[#8B4513]/5 transition-colors" data-testid="link-platform">
                  {t.header.nav.platform}
              </Link>
              <a href="/#capabilities" className="font-serif text-[#8B4513]/70 hover:text-[#991b1b] px-4 py-2 rounded-full hover:bg-[#8B4513]/5 transition-colors" data-testid="link-services">
                {t.header.nav.services}
              </a>
              <a href="/#services" className="font-serif text-[#8B4513]/70 hover:text-[#991b1b] px-4 py-2 rounded-full hover:bg-[#8B4513]/5 transition-colors" data-testid="link-pricing">
                {t.header.nav.pricing}
              </a>
              <Link to="/discovery" className="font-serif text-[#991b1b] px-4 py-2 rounded-full bg-[#8B4513]/10 transition-colors" data-testid="link-discovery">
                  {t.header.nav.discovery}
              </Link>
              <Link to="/docs/overview" className="font-serif text-[#8B4513]/70 hover:text-[#991b1b] px-4 py-2 rounded-full hover:bg-[#8B4513]/5 transition-colors" data-testid="link-docs">
                  {t.header.nav.docs}
              </Link>
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        <TracingBeam className="pt-24">
          <section className="min-h-screen px-4 py-16">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h1 className="font-serif text-5xl md:text-6xl font-bold mb-6 text-[#991b1b]" data-testid="text-discovery-title">
                  {t.hero.title}
                </h1>
                <p className="font-serif text-xl text-[#8B4513]/70 max-w-2xl mx-auto mb-8">
                  {t.hero.subtitle}
                </p>

                <div className="max-w-2xl mx-auto mb-8">
                  <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md border border-[#8B4513]/30 rounded-full px-6 py-4 shadow-sm">
                    <Search className="w-5 h-5 text-[#8B4513]/50" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.hero.searchPlaceholder}
                      className="flex-1 bg-transparent outline-none text-base font-serif text-[#8B4513] placeholder:text-[#8B4513]/50"
                      data-testid="input-discovery-search"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 flex-wrap mb-12">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all font-serif font-semibold text-sm
                        ${
                          selectedCategory === category.id
                            ? "bg-[#991b1b] text-white shadow-md"
                            : "bg-white/30 backdrop-blur-md text-[#8B4513] border border-[#8B4513]/20 hover:bg-white/50"
                        }`}
                      data-testid={`button-category-${category.id}`}
                    >
                      <span className="text-lg">{category.icon}</span>
                      <span>{category.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <p className="font-serif text-lg text-[#8B4513]/70">
                  {t.results.found} <span className="font-bold text-[#991b1b]">{filteredCenters.length}</span> {filteredCenters.length === 1 ? t.results.community : t.results.communities}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCenters.map((center) => (
                  <CenterCard key={center.id} center={center} />
                ))}
              </div>

              {filteredCenters.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🏯</div>
                  <h3 className="font-serif text-2xl font-bold text-[#2c2c2c] mb-2">{t.emptyState.title}</h3>
                  <p className="font-serif text-lg text-[#8B4513]/70">
                    {t.emptyState.description}
                  </p>
                </div>
              )}
            </div>
          </section>
        </TracingBeam>

        <footer className="border-t border-[#8B4513]/20 py-8 bg-[#EFE0BD]/50 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <span className="font-serif font-bold text-[#991b1b]">{t.footer.brand}</span>
              <div className="flex gap-6">
                <Link to="/" className="font-serif text-[#8B4513]/50 hover:text-[#991b1b] transition-colors">
                    {t.footer.platform}
</Link>
                <Link to="/" className="font-serif text-[#8B4513]/50 hover:text-[#991b1b] transition-colors">
                    {t.footer.services}
</Link>
                <Link to="/discovery" className="font-serif text-[#8B4513]/50 hover:text-[#991b1b] transition-colors">
                    {t.footer.discovery}
</Link>
                <Link to="/docs/overview" className="font-serif text-[#8B4513]/50 hover:text-[#991b1b] transition-colors">
                    {t.footer.docs}
</Link>
              </div>
              <div className="font-serif text-[#8B4513]/50">{t.footer.copyright.replace('{year}', new Date().getFullYear().toString())}</div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}


