import { useState } from "react";
import { useParams, Link } from "@/lib/wouter-stub";
import { motion } from "framer-motion";
import {
  MapPin,
  Users,
  Star,
  Globe,
  Phone,
  Mail,
  CalendarIcon,
  BookOpen,
  Bot,
  Heart,
  ArrowLeft,
  Clock,
  Video,
  FileText,
  Briefcase,
  Sparkles,
  HandHeart,
  Calendar,
  CreditCard,
  Landmark,
} from "lucide-react";
import { SiCashapp, SiApplepay } from "react-icons/si";
import { buddhistCenters } from "../../shared/buddhistCenters";
import { TracingBeam } from "@/components/TracingBeam";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import lotusIcon from "../assets/lotus-icon.webp";
import bellIcon from "../assets/bell-icon.webp";
import buddhaIcon from "../assets/buddha-icon.webp";
import sutraIcon from "../assets/sutra-scroll-icon.webp";

export default function CenterDetail() {
  const params = useParams();
  const centerId = params.id as string;
  const [activeTab, setActiveTab] = useState<"library" | "donation">("library");
  const [donationAmount, setDonationAmount] = useState(500000);
  const [customAmount, setCustomAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cashapp" | "applepay" | "venmo" | "bank">("card");
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const { toast } = useToast();

  const center = buddhistCenters.find((c) => c.id === centerId);

  const handleDonationSubmit = async () => {
    setIsCreatingPayment(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({
        title: "Demo Donation Complete",
        description: `Thank you for your ${donationAmount.toLocaleString()}đ donation to ${center?.name}!`,
      });
      setIsCreatingPayment(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "This is a demo. No actual payment was processed.",
        variant: "destructive",
      });
      setIsCreatingPayment(false);
    }
  };

  if (!center) {
    return (
      <div className="min-h-screen bg-[#EFE0BD] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-serif font-bold text-[#2c2c2c] mb-2">Không tìm thấy cộng đồng</h2>
          <Link to="/discovery" className="text-[#991b1b] hover:underline font-serif">Quay lại trang khám phá</Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "library", label: "Thư viện", icon: FileText },
    { id: "donation", label: "Cúng dường", icon: Heart },
  ];

  const getStatusBadge = () => {
    switch (center.status) {
      case "open":
        return (
          <div className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-700 rounded-lg text-sm font-semibold">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            Đang mở
          </div>
        );
      case "closed":
        return (
          <div className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-700 rounded-lg text-sm font-semibold">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            Đóng cửa
          </div>
        );
      case "retreat":
        return (
          <div className="flex items-center gap-1 px-3 py-1.5 bg-[#991b1b]/20 text-[#991b1b] rounded-lg text-sm font-semibold">
            <Clock className="w-4 h-4" />
            Đang tu tập
          </div>
        );
      case "by-appointment":
        return (
          <div className="flex items-center gap-1 px-3 py-1.5 bg-[#2c2c2c]/20 text-[#2c2c2c] rounded-lg text-sm font-semibold">
            <Clock className="w-4 h-4" />
            Theo lịch hẹn
          </div>
        );
    }
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
      </div>

      <div className="relative z-10">
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[#EFE0BD]/80 border-b border-[#8B4513]/20">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="relative group">
              <Link to="/" className="flex items-center" data-testid="link-brand">
                  <span className="font-serif font-bold text-[#991b1b] text-lg">Bodhi Technology Lab</span>
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
                      Company
                    </h3>
                    <div className="space-y-3">
                      <Link to="/career" className="group/item flex items-center gap-2 font-serif text-[#8B4513]/80 hover:text-[#991b1b] transition-all text-sm py-1.5 px-2 rounded-lg hover:bg-[#991b1b]/10" data-testid="link-career">
                        <div className="w-1 h-1 rounded-full bg-[#8B4513]/40 group-hover/item:bg-[#991b1b]"></div>
                        Career
                      </Link>
                      <Link to="/terms" className="group/item flex items-center gap-2 font-serif text-[#8B4513]/80 hover:text-[#991b1b] transition-all text-sm py-1.5 px-2 rounded-lg hover:bg-[#991b1b]/10" data-testid="link-terms">
                        <div className="w-1 h-1 rounded-full bg-[#8B4513]/40 group-hover/item:bg-[#991b1b]"></div>
                        Terms
                      </Link>
                      <Link to="/privacy" className="group/item flex items-center gap-2 font-serif text-[#8B4513]/80 hover:text-[#991b1b] transition-all text-sm py-1.5 px-2 rounded-lg hover:bg-[#991b1b]/10" data-testid="link-privacy">
                        <div className="w-1 h-1 rounded-full bg-[#8B4513]/40 group-hover/item:bg-[#991b1b]"></div>
                        Privacy
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/platform" className="font-serif text-[#8B4513]/70 hover:text-[#991b1b] px-4 py-2 rounded-full hover:bg-[#8B4513]/5 transition-colors" data-testid="link-platform">
                  Platform
              </Link>
              <a href="/#capabilities" className="font-serif text-[#8B4513]/70 hover:text-[#991b1b] px-4 py-2 rounded-full hover:bg-[#8B4513]/5 transition-colors" data-testid="link-services">
                Services
              </a>
              <a href="/#services" className="font-serif text-[#8B4513]/70 hover:text-[#991b1b] px-4 py-2 rounded-full hover:bg-[#8B4513]/5 transition-colors" data-testid="link-pricing">
                Pricing
              </a>
              <Link to="/discovery" className="font-serif text-[#8B4513]/70 hover:text-[#991b1b] px-4 py-2 rounded-full hover:bg-[#8B4513]/5 transition-colors" data-testid="link-discovery">
                  Discovery
              </Link>
              <Link to="/docs/overview" className="font-serif text-[#8B4513]/70 hover:text-[#991b1b] px-4 py-2 rounded-full hover:bg-[#8B4513]/5 transition-colors" data-testid="link-docs">
                  Docs
              </Link>
            </div>
          </div>
        </header>

        <TracingBeam className="pt-24">
          <div className="px-4 py-8">
            {/* Header with Cover */}
            <div className="relative h-64 rounded-3xl overflow-hidden mb-8 shadow-lg">
              {/* Background Image */}
              <img
                src={center.image}
                alt={center.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2c2c2c]/70 to-[#2c2c2c]/20 z-10" />

              <Link to="/discovery" className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md text-[#2c2c2c] rounded-xl
                  hover:bg-white transition-colors font-semibold z-20 shadow-md">
                  <ArrowLeft className="w-4 h-4" />
                  Quay lại
              </Link>

              <div className="absolute top-6 right-6 bg-[#991b1b] text-white px-4 py-2 rounded-full text-lg font-bold shadow-lg z-20">
                #{center.rank}
              </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto">
              {/* Info Card */}
              <div className="bg-white/50 backdrop-blur-md border border-[#8B4513]/30 rounded-3xl p-8 shadow-lg mb-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
                      <div>
                        <h1 className="text-4xl font-serif font-bold text-[#2c2c2c] mb-2">{center.name}</h1>
                        <p className="text-lg font-serif text-[#8B4513]/70">{center.description}</p>
                      </div>
                      {getStatusBadge()}
                    </div>

                    <div className="flex flex-wrap gap-6 mb-6">
                      <div className="flex items-center gap-2 text-[#2c2c2c]">
                        <Users className="w-5 h-5" />
                        <span className="font-serif font-semibold">{center.members.toLocaleString()} thành viên</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#2c2c2c]">
                        <Star className="w-5 h-5 fill-[#d4af37] text-[#d4af37]" />
                        <span className="font-serif font-semibold">{center.rating} / 5.0</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#2c2c2c]">
                        <MapPin className="w-5 h-5" />
                        <span className="font-serif font-semibold">
                          {center.location}, {center.country}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {center.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 rounded-lg text-sm font-serif font-semibold"
                          style={{
                            backgroundColor: `${center.accentColor}20`,
                            color: center.accentColor,
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="lg:w-80 bg-white border border-[#8B4513]/20 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-serif font-bold text-[#2c2c2c] mb-4">Liên hệ</h3>
                    <div className="space-y-3">
                      {center.website && (
                        <a
                          href={center.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-[#2c2c2c] hover:text-[#991b1b] transition-colors"
                        >
                          <Globe className="w-5 h-5" />
                          <span className="text-sm font-serif">Trang web</span>
                        </a>
                      )}
                      {center.phone && (
                        <a
                          href={`tel:${center.phone}`}
                          className="flex items-center gap-3 text-[#2c2c2c] hover:text-[#991b1b] transition-colors"
                        >
                          <Phone className="w-5 h-5" />
                          <span className="text-sm font-serif">{center.phone}</span>
                        </a>
                      )}
                      {center.email && (
                        <a
                          href={`mailto:${center.email}`}
                          className="flex items-center gap-3 text-[#2c2c2c] hover:text-[#991b1b] transition-colors"
                        >
                          <Mail className="w-5 h-5" />
                          <span className="text-sm font-serif">{center.email}</span>
                        </a>
                      )}
                    </div>

                    <button
                      className="w-full mt-6 px-6 py-3 bg-[#991b1b] text-white rounded-xl
                        hover:bg-[#7a1515] transition-colors font-serif font-bold text-base shadow-md"
                      data-testid="button-join-community"
                    >
                      Tham gia cộng đồng
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white/50 backdrop-blur-md border border-[#8B4513]/30 rounded-3xl overflow-hidden shadow-lg">
                <div className="flex items-center gap-2 p-3 border-b border-[#8B4513]/20 overflow-x-auto">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all whitespace-nowrap font-serif font-semibold text-sm
                          ${
                            activeTab === tab.id
                              ? "bg-[#991b1b] text-white shadow-md"
                              : "bg-transparent text-[#8B4513] hover:bg-white/50"
                          }`}
                        data-testid={`tab-${tab.id}`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="p-8">
                  {activeTab === "library" && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                      <h2 className="text-2xl font-serif font-bold text-[#2c2c2c] mb-4">Thư Viện</h2>
                      <p className="text-base font-serif text-[#8B4513]/70">
                        Tài liệu và kinh sách sẽ được cập nhật sớm...
                      </p>
                    </motion.div>
                  )}

                  {activeTab === "donation" && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                      {/* Header */}
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-3 mb-4">
                          <Heart className="w-8 h-8 text-[#991b1b]" />
                          <h2 className="font-serif text-3xl font-bold text-[#991b1b]">Support {center.name}</h2>
                        </div>
                        <p className="font-serif text-base text-[#8B4513]/70 max-w-2xl mx-auto">
                          Accept dāna with dignity—generous giving framed as spiritual practice, not transactional fundraising
                        </p>
                      </div>

                      {/* Three Feature Cards */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Recurring Dāna */}
                        <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6 hover:shadow-xl transition-all duration-300">
                          <div className="flex items-center gap-3 mb-4">
                            <img src={bellIcon} alt="Bell" className="w-10 h-10 object-contain" />
                            <h3 className="font-serif text-lg font-bold text-[#2c2c2c]">Recurring Dāna</h3>
                          </div>
                          <p className="font-serif text-sm text-[#2c2c2c]/70 mb-4">
                            Enable monthly commitments to honor supporters who dedicate long-term
                          </p>
                          <ul className="space-y-2 text-xs">
                            <li className="flex items-start gap-2">
                              <img src={lotusIcon} alt="Lotus" className="w-4 h-4 object-contain flex-shrink-0 mt-0.5" />
                              <span className="font-serif text-[#2c2c2c]">Monthly, quarterly, annually</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <img src={lotusIcon} alt="Lotus" className="w-4 h-4 object-contain flex-shrink-0 mt-0.5" />
                              <span className="font-serif text-[#2c2c2c]">Easy management & pausing</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <img src={lotusIcon} alt="Lotus" className="w-4 h-4 object-contain flex-shrink-0 mt-0.5" />
                              <span className="font-serif text-[#2c2c2c]">Recognition for sustained support</span>
                            </li>
                          </ul>
                        </div>

                        {/* QR Codes & Multiple Methods */}
                        <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6 hover:shadow-xl transition-all duration-300">
                          <div className="flex items-center gap-3 mb-4">
                            <img src={buddhaIcon} alt="Buddha" className="w-10 h-10 object-contain" />
                            <h3 className="font-serif text-lg font-bold text-[#2c2c2c]">QR Codes & Multiple Methods</h3>
                          </div>
                          <p className="font-serif text-sm text-[#2c2c2c]/70 mb-4">
                            Seamlessly accept donations through modern and traditional payment methods
                          </p>
                          <ul className="space-y-2 text-xs">
                            <li className="flex items-start gap-2">
                              <img src={lotusIcon} alt="Lotus" className="w-4 h-4 object-contain flex-shrink-0 mt-0.5" />
                              <span className="font-serif text-[#2c2c2c]">QR codes for instant giving</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <img src={lotusIcon} alt="Lotus" className="w-4 h-4 object-contain flex-shrink-0 mt-0.5" />
                              <span className="font-serif text-[#2c2c2c]">Credit/debit cards, bank transfers</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <img src={lotusIcon} alt="Lotus" className="w-4 h-4 object-contain flex-shrink-0 mt-0.5" />
                              <span className="font-serif text-[#2c2c2c]">Cash App, Apple Pay, Venmo</span>
                            </li>
                          </ul>
                        </div>

                        {/* Merit Dedication & Anonymous Giving */}
                        <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6 hover:shadow-xl transition-all duration-300">
                          <div className="flex items-center gap-3 mb-4">
                            <img src={sutraIcon} alt="Sutra" className="w-10 h-10 object-contain" />
                            <h3 className="font-serif text-lg font-bold text-[#2c2c2c]">Merit Dedication & Anonymous Giving</h3>
                          </div>
                          <p className="font-serif text-sm text-[#2c2c2c]/70 mb-4">
                            Enable donors to dedicate merit and practice selfless giving
                          </p>
                          <ul className="space-y-2 text-xs">
                            <li className="flex items-start gap-2">
                              <img src={lotusIcon} alt="Lotus" className="w-4 h-4 object-contain flex-shrink-0 mt-0.5" />
                              <span className="font-serif text-[#2c2c2c]">Dedicate merit to loved ones</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <img src={lotusIcon} alt="Lotus" className="w-4 h-4 object-contain flex-shrink-0 mt-0.5" />
                              <span className="font-serif text-[#2c2c2c]">Anonymous donations supported</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <img src={lotusIcon} alt="Lotus" className="w-4 h-4 object-contain flex-shrink-0 mt-0.5" />
                              <span className="font-serif text-[#2c2c2c]">Public or private recognition</span>
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* Hồi Hướng Công Đức - Merit Dedication Section */}
                      <div className="bg-gradient-to-br from-[#EFE0BD] to-[#EFE0BD]/80 rounded-2xl border-2 border-[#8B4513]/30 p-8">
                        <div className="text-center mb-8">
                          <div className="flex items-center justify-center gap-3 mb-3">
                            <img src={lotusIcon} alt="Lotus" className="w-10 h-10 object-contain" />
                            <h3 className="font-serif text-3xl font-bold text-[#991b1b]">Hồi Hướng Công Đức</h3>
                          </div>
                          <p className="font-serif text-lg text-[#8B4513] italic">The Act of Returning: Dedicating Merit to All Beings</p>
                        </div>

                        {/* An Offering of Merit */}
                        <div className="mb-8">
                          <h4 className="font-serif text-xl font-bold text-[#2c2c2c] mb-4 flex items-center gap-2">
                            <img src={lotusIcon} alt="Lotus" className="w-6 h-6 object-contain" />
                            An Offering of Merit (Công Đức)
                          </h4>
                          <p className="font-serif text-base text-[#2c2c2c]/80 mb-6 italic">
                            This is more than a donation. It is a practice of selfless offering.
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-[#8B4513]/20">
                              <div className="flex items-start gap-3 mb-3">
                                <img src={lotusIcon} alt="Lotus" className="w-5 h-5 object-contain flex-shrink-0 mt-1" />
                                <h5 className="font-serif text-sm font-bold text-[#991b1b]">Your Action</h5>
                              </div>
                              <p className="font-serif text-sm text-[#2c2c2c]/70 leading-relaxed">
                                By giving without expectation of personal reward, you are performing the act of <span className="font-semibold text-[#991b1b]">Hồi Hướng Công Đức</span>—the selfless dedication of intrinsic merit.
                              </p>
                            </div>

                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-[#8B4513]/20">
                              <div className="flex items-start gap-3 mb-3">
                                <img src={lotusIcon} alt="Lotus" className="w-5 h-5 object-contain flex-shrink-0 mt-1" />
                                <h5 className="font-serif text-sm font-bold text-[#991b1b]">The Intention</h5>
                              </div>
                              <p className="font-serif text-sm text-[#2c2c2c]/70 leading-relaxed">
                                This merit is not for one, but for all. It is dedicated to the liberation and awakening of all beings.
                              </p>
                            </div>

                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-[#8B4513]/20">
                              <div className="flex items-start gap-3 mb-3">
                                <img src={lotusIcon} alt="Lotus" className="w-5 h-5 object-contain flex-shrink-0 mt-1" />
                                <h5 className="font-serif text-sm font-bold text-[#991b1b]">The Result</h5>
                              </div>
                              <p className="font-serif text-sm text-[#2c2c2c]/70 leading-relaxed">
                                You are planting a seed of awakening, free from the bonds of cause and effect that govern worldly blessings.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Supporting the Work of Awakening */}
                        <div>
                          <h4 className="font-serif text-xl font-bold text-[#2c2c2c] mb-4 flex items-center gap-2">
                            <img src={buddhaIcon} alt="Buddha" className="w-6 h-6 object-contain" />
                            Supporting the Work of Awakening (Phật Sự)
                          </h4>
                          <p className="font-serif text-base text-[#2c2c2c]/80 mb-6">
                            100% of your offering directly supports the continuation of the Dharma in this world. Your contribution is used exclusively for:
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-start gap-4 bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-[#8B4513]/20">
                              <img src={lotusIcon} alt="Lotus" className="w-8 h-8 object-contain flex-shrink-0" />
                              <div>
                                <h5 className="font-serif text-sm font-bold text-[#991b1b] mb-2">Sustaining the Sangha</h5>
                                <p className="font-serif text-xs text-[#2c2c2c]/70 leading-relaxed">
                                  Providing for masters and practitioners who dedicate their lives to holding and transmitting the teachings.
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start gap-4 bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-[#8B4513]/20">
                              <img src={sutraIcon} alt="Sutra" className="w-8 h-8 object-contain flex-shrink-0" />
                              <div>
                                <h5 className="font-serif text-sm font-bold text-[#991b1b] mb-2">Spreading the Dharma</h5>
                                <p className="font-serif text-xs text-[#2c2c2c]/70 leading-relaxed">
                                  Funding the creation and sharing of teachings, texts, and digital resources to reach all who are searching.
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start gap-4 bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-[#8B4513]/20">
                              <img src={buddhaIcon} alt="Buddha" className="w-8 h-8 object-contain flex-shrink-0" />
                              <div>
                                <h5 className="font-serif text-sm font-bold text-[#991b1b] mb-2">Maintaining Sacred Space</h5>
                                <p className="font-serif text-xs text-[#2c2c2c]/70 leading-relaxed">
                                  Ensuring our physical and digital sanctuaries remain pure, accessible, and conducive to practice.
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start gap-4 bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-[#8B4513]/20">
                              <Heart className="w-8 h-8 text-[#991b1b] flex-shrink-0" />
                              <div>
                                <h5 className="font-serif text-sm font-bold text-[#991b1b] mb-2">Acts of True Compassion</h5>
                                <p className="font-serif text-xs text-[#2c2c2c]/70 leading-relaxed">
                                  Enabling projects that alleviate suffering and guide others toward the path of liberation.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Donation Interface Demo */}
                      <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-8">
                        <div className="flex items-center gap-3 mb-6">
                          <Heart className="w-10 h-10 text-[#991b1b]" />
                          <h3 className="font-serif text-2xl font-bold text-[#2c2c2c]">Make a Donation</h3>
                        </div>
                        
                        <p className="font-serif text-sm text-[#8B4513]/70 mb-6">
                          Select an amount and payment method to support {center.name}.
                        </p>

                        {/* Donation Amount Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <button
                            onClick={() => { setDonationAmount(100000); setCustomAmount(""); }}
                            className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                              donationAmount === 100000 
                                ? 'border-[#991b1b] bg-[#991b1b]/5' 
                                : 'border-[#8B4513]/20 bg-white/50 hover:border-[#991b1b]/50'
                            }`}
                            data-testid="button-donate-100k"
                          >
                            <div className="flex items-center gap-3">
                              <img src={lotusIcon} alt="Lotus" className="w-6 h-6 object-contain flex-shrink-0" />
                              <div className="text-left flex-1">
                                <div className="font-serif text-lg font-bold text-[#991b1b]">100.000đ</div>
                                <div className="font-serif text-xs text-[#8B4513]/60">Basic support</div>
                              </div>
                            </div>
                          </button>

                          <button
                            onClick={() => { setDonationAmount(500000); setCustomAmount(""); }}
                            className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                              donationAmount === 500000 
                                ? 'border-[#991b1b] bg-[#991b1b]/5' 
                                : 'border-[#8B4513]/20 bg-white/50 hover:border-[#991b1b]/50'
                            }`}
                            data-testid="button-donate-500k"
                          >
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[#991b1b] text-white rounded-full text-xs font-semibold whitespace-nowrap">
                              Popular
                            </div>
                            <div className="flex items-center gap-3">
                              <img src={lotusIcon} alt="Lotus" className="w-6 h-6 object-contain flex-shrink-0" />
                              <div className="text-left flex-1">
                                <div className="font-serif text-lg font-bold text-[#991b1b]">500.000đ</div>
                                <div className="font-serif text-xs text-[#8B4513]/60">Medium support</div>
                              </div>
                            </div>
                          </button>

                          <button
                            onClick={() => { setDonationAmount(1000000); setCustomAmount(""); }}
                            className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                              donationAmount === 1000000 
                                ? 'border-[#991b1b] bg-[#991b1b]/5' 
                                : 'border-[#8B4513]/20 bg-white/50 hover:border-[#991b1b]/50'
                            }`}
                            data-testid="button-donate-1m"
                          >
                            <div className="flex items-center gap-3">
                              <img src={lotusIcon} alt="Lotus" className="w-6 h-6 object-contain flex-shrink-0" />
                              <div className="text-left flex-1">
                                <div className="font-serif text-lg font-bold text-[#991b1b]">1.000.000đ</div>
                                <div className="font-serif text-xs text-[#8B4513]/60">Major support</div>
                              </div>
                            </div>
                          </button>
                        </div>

                        {/* Custom Amount */}
                        <div className="mb-6">
                          <label className="font-serif text-sm text-[#8B4513]/70 block mb-2">
                            Or enter custom amount
                          </label>
                          <input
                            type="text"
                            value={customAmount}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              setCustomAmount(value);
                              if (value) {
                                setDonationAmount(parseInt(value));
                              }
                            }}
                            placeholder="Enter amount (VNĐ)"
                            className="w-full px-4 py-3 rounded-xl border-2 border-[#8B4513]/20 bg-white/70 font-serif text-[#2c2c2c] placeholder-[#8B4513]/40 focus:outline-none focus:border-[#991b1b] transition-colors"
                            data-testid="input-custom-amount"
                          />
                        </div>

                        {/* Payment Method Selector */}
                        <div className="mb-6">
                          <h4 className="font-serif text-sm font-semibold text-[#2c2c2c] mb-3">Payment Method</h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            <button
                              onClick={() => setPaymentMethod('card')}
                              className={`p-3 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${
                                paymentMethod === 'card'
                                  ? 'border-[#991b1b] bg-[#991b1b]/5'
                                  : 'border-[#8B4513]/20 bg-white/50 hover:border-[#991b1b]/50'
                              }`}
                              data-testid="button-payment-card"
                            >
                              <CreditCard className="w-6 h-6 text-[#4285F4]" />
                              <div className="font-serif text-sm font-semibold text-[#2c2c2c]">Card</div>
                            </button>

                            <button
                              onClick={() => setPaymentMethod('cashapp')}
                              className={`p-3 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${
                                paymentMethod === 'cashapp'
                                  ? 'border-[#991b1b] bg-[#991b1b]/5'
                                  : 'border-[#8B4513]/20 bg-white/50 hover:border-[#991b1b]/50'
                              }`}
                              data-testid="button-payment-cashapp"
                            >
                              <SiCashapp className="w-6 h-6 text-[#00D632]" />
                              <div className="font-serif text-sm font-semibold text-[#2c2c2c]">Cash App</div>
                            </button>

                            <button
                              onClick={() => setPaymentMethod('applepay')}
                              className={`p-3 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${
                                paymentMethod === 'applepay'
                                  ? 'border-[#991b1b] bg-[#991b1b]/5'
                                  : 'border-[#8B4513]/20 bg-white/50 hover:border-[#991b1b]/50'
                              }`}
                              data-testid="button-payment-applepay"
                            >
                              <SiApplepay className="w-6 h-6 text-[#000000]" />
                              <div className="font-serif text-sm font-semibold text-[#2c2c2c]">Apple Pay</div>
                            </button>

                            <button
                              onClick={() => setPaymentMethod('venmo')}
                              className={`p-3 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${
                                paymentMethod === 'venmo'
                                  ? 'border-[#991b1b] bg-[#991b1b]/5'
                                  : 'border-[#8B4513]/20 bg-white/50 hover:border-[#991b1b]/50'
                              }`}
                              data-testid="button-payment-venmo"
                            >
                              <div className="w-6 h-6 flex items-center justify-center font-bold text-[#008CFF] text-xl">V</div>
                              <div className="font-serif text-sm font-semibold text-[#2c2c2c]">Venmo</div>
                            </button>

                            <button
                              onClick={() => setPaymentMethod('bank')}
                              className={`p-3 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${
                                paymentMethod === 'bank'
                                  ? 'border-[#991b1b] bg-[#991b1b]/5'
                                  : 'border-[#8B4513]/20 bg-white/50 hover:border-[#991b1b]/50'
                              }`}
                              data-testid="button-payment-bank"
                            >
                              <Landmark className="w-6 h-6 text-[#5C6AC4]" />
                              <div className="font-serif text-sm font-semibold text-[#2c2c2c]">US Bank</div>
                            </button>
                          </div>
                        </div>

                        {/* Card Information */}
                        {paymentMethod === 'card' && (
                          <div className="mb-6 space-y-4">
                            <h4 className="font-serif text-sm font-semibold text-[#2c2c2c]">Card Information</h4>
                          
                          {/* Card Number */}
                          <div>
                            <label className="font-serif text-xs text-[#8B4513]/70 block mb-1">Card number</label>
                            <input
                              type="text"
                              placeholder="1234 1234 1234 1234"
                              className="w-full px-4 py-3 rounded-xl border-2 border-[#8B4513]/20 bg-white/70 font-serif text-[#2c2c2c] placeholder-[#8B4513]/40 focus:outline-none focus:border-[#991b1b] transition-colors"
                              data-testid="input-card-number"
                            />
                          </div>

                          {/* Expiration and CVC */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="font-serif text-xs text-[#8B4513]/70 block mb-1">Expiration</label>
                              <input
                                type="text"
                                placeholder="MM / YY"
                                className="w-full px-4 py-3 rounded-xl border-2 border-[#8B4513]/20 bg-white/70 font-serif text-[#2c2c2c] placeholder-[#8B4513]/40 focus:outline-none focus:border-[#991b1b] transition-colors"
                                data-testid="input-expiration"
                              />
                            </div>
                            <div>
                              <label className="font-serif text-xs text-[#8B4513]/70 block mb-1">CVC</label>
                              <input
                                type="text"
                                placeholder="CVC"
                                className="w-full px-4 py-3 rounded-xl border-2 border-[#8B4513]/20 bg-white/70 font-serif text-[#2c2c2c] placeholder-[#8B4513]/40 focus:outline-none focus:border-[#991b1b] transition-colors"
                                data-testid="input-cvc"
                              />
                            </div>
                          </div>

                          {/* Country and ZIP */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="font-serif text-xs text-[#8B4513]/70 block mb-1">Country</label>
                              <select
                                className="w-full px-4 py-3 rounded-xl border-2 border-[#8B4513]/20 bg-white/70 font-serif text-[#2c2c2c] focus:outline-none focus:border-[#991b1b] transition-colors"
                                data-testid="select-country"
                              >
                                <option>Vietnam</option>
                                <option>United States</option>
                                <option>Singapore</option>
                                <option>Thailand</option>
                              </select>
                            </div>
                            <div>
                              <label className="font-serif text-xs text-[#8B4513]/70 block mb-1">ZIP</label>
                              <input
                                type="text"
                                placeholder="12345"
                                className="w-full px-4 py-3 rounded-xl border-2 border-[#8B4513]/20 bg-white/70 font-serif text-[#2c2c2c] placeholder-[#8B4513]/40 focus:outline-none focus:border-[#991b1b] transition-colors"
                                data-testid="input-zip"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Submit Button */}
                      <button 
                        onClick={handleDonationSubmit}
                        disabled={isCreatingPayment || !donationAmount}
                        className="w-full px-6 py-3 bg-gradient-to-r from-[#991b1b] to-[#7a1515] text-white font-serif font-semibold rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" 
                        data-testid="button-submit-donation"
                      >
                        {isCreatingPayment ? "Processing..." : "Complete Donation"}
                      </button>

                      <p className="font-serif text-xs text-center text-[#8B4513]/60 mt-4 italic">
                        This is a demo. No actual payment will be processed.
                      </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TracingBeam>

        <footer className="border-t border-[#8B4513]/20 py-8 bg-[#EFE0BD]/50 backdrop-blur-sm mt-16">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <span className="font-serif font-bold text-[#991b1b]">Bodhi Lab</span>
              <div className="flex gap-6">
                <Link to="/docs/models" className="font-serif text-[#8B4513]/50 hover:text-[#991b1b] transition-colors">
                    Agent Models
                </Link>
                <Link to="/discovery" className="font-serif text-[#8B4513]/50 hover:text-[#991b1b] transition-colors">
                    Discovery
                </Link>
                <Link to="/docs/manifesto" className="font-serif text-[#8B4513]/50 hover:text-[#991b1b] transition-colors">
                    Docs
                </Link>
              </div>
              <div className="font-serif text-[#8B4513]/50">© {new Date().getFullYear()} Bodhi Technology Lab</div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}


