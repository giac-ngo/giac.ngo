import { useState } from "react";
import { X, Phone, Mail, User, MessageSquare } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageName: string;
  language: 'en' | 'vi';
}

const translations = {
  en: {
    title: "Subscribe to",
    subtitle: "Fill in your details and we'll contact you within 24 hours",
    name: "Full Name",
    namePlaceholder: "Enter your full name",
    phone: "Phone Number",
    phonePlaceholder: "Enter your phone number",
    email: "Email Address",
    emailPlaceholder: "Enter your email",
    interests: "Specific Needs / Interests",
    interestsPlaceholder: "Tell us about your specific needs or what you're looking for...",
    submit: "Submit Request",
    submitting: "Submitting...",
    successTitle: "Request Received!",
    successMessage: "Thank you for your interest. We will contact you within 24 hours to discuss your needs.",
    close: "Close",
    required: "Required fields"
  },
  vi: {
    title: "Đăng ký gói",
    subtitle: "Điền thông tin và chúng tôi sẽ liên hệ trong vòng 24 giờ",
    name: "Họ và Tên",
    namePlaceholder: "Nhập họ và tên của bạn",
    phone: "Số Điện Thoại",
    phonePlaceholder: "Nhập số điện thoại",
    email: "Địa chỉ Email",
    emailPlaceholder: "Nhập email của bạn",
    interests: "Nhu Cầu / Quan Tâm Cụ Thể",
    interestsPlaceholder: "Cho chúng tôi biết về nhu cầu cụ thể hoặc điều bạn đang tìm kiếm...",
    submit: "Gửi Yêu Cầu",
    submitting: "Đang gửi...",
    successTitle: "Đã Nhận Yêu Cầu!",
    successMessage: "Cảm ơn bạn đã quan tâm. Chúng tôi sẽ liên hệ trong vòng 24 giờ để thảo luận về nhu cầu của bạn.",
    close: "Đóng",
    required: "Các trường bắt buộc"
  }
};

export function SubscriptionModal({ isOpen, onClose, packageName, language }: SubscriptionModalProps) {
  const t = translations[language];
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    interests: ""
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData & { package: string }) => {
      const response = await apiRequest("POST", "/api/leads", data);
      return response.json();
    },
    onSuccess: () => {
      setShowSuccess(true);
      setFormData({ name: "", phone: "", email: "", interests: "" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ ...formData, package: packageName });
  };

  const handleClose = () => {
    setShowSuccess(false);
    mutation.reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={handleClose}
      />
      
      <div className="relative bg-[#EFE0BD] rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border-2 border-[#8B4513]/30">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-[#8B4513]/60 hover:text-[#991b1b] transition-colors"
          data-testid="button-close-modal"
        >
          <X className="w-6 h-6" />
        </button>

        {showSuccess ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#991b1b] mb-2" data-testid="text-success-title">
              {t.successTitle}
            </h3>
            <p className="font-serif text-[#8B4513]/70 mb-6" data-testid="text-success-message">
              {t.successMessage}
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-[#991b1b] text-white rounded-xl font-serif font-semibold hover:bg-[#7a1515] transition-all"
              data-testid="button-close-success"
            >
              {t.close}
            </button>
          </div>
        ) : (
          <div className="p-8">
            <h3 className="font-serif text-2xl font-bold text-[#991b1b] mb-2" data-testid="text-modal-title">
              {t.title} {packageName}
            </h3>
            <p className="font-serif text-sm text-[#8B4513]/70 mb-6">
              {t.subtitle}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="flex items-center gap-2 font-serif text-sm font-medium text-[#2c2c2c] mb-1.5">
                  <User className="w-4 h-4 text-[#991b1b]" />
                  {t.name} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t.namePlaceholder}
                  className="w-full px-4 py-2.5 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm text-[#2c2c2c] placeholder:text-[#8B4513]/40 focus:outline-none focus:ring-2 focus:ring-[#991b1b]/50 focus:border-[#991b1b] transition-all"
                  data-testid="input-lead-name"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 font-serif text-sm font-medium text-[#2c2c2c] mb-1.5">
                  <Phone className="w-4 h-4 text-[#991b1b]" />
                  {t.phone} *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t.phonePlaceholder}
                  className="w-full px-4 py-2.5 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm text-[#2c2c2c] placeholder:text-[#8B4513]/40 focus:outline-none focus:ring-2 focus:ring-[#991b1b]/50 focus:border-[#991b1b] transition-all"
                  data-testid="input-lead-phone"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 font-serif text-sm font-medium text-[#2c2c2c] mb-1.5">
                  <Mail className="w-4 h-4 text-[#991b1b]" />
                  {t.email} *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t.emailPlaceholder}
                  className="w-full px-4 py-2.5 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm text-[#2c2c2c] placeholder:text-[#8B4513]/40 focus:outline-none focus:ring-2 focus:ring-[#991b1b]/50 focus:border-[#991b1b] transition-all"
                  data-testid="input-lead-email"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 font-serif text-sm font-medium text-[#2c2c2c] mb-1.5">
                  <MessageSquare className="w-4 h-4 text-[#991b1b]" />
                  {t.interests}
                </label>
                <textarea
                  value={formData.interests}
                  onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                  placeholder={t.interestsPlaceholder}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm text-[#2c2c2c] placeholder:text-[#8B4513]/40 focus:outline-none focus:ring-2 focus:ring-[#991b1b]/50 focus:border-[#991b1b] transition-all resize-none"
                  data-testid="textarea-lead-interests"
                />
              </div>

              <p className="font-serif text-xs text-[#8B4513]/60">
                * {t.required}
              </p>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full px-6 py-3 bg-[#991b1b] text-white rounded-xl font-serif font-semibold hover:bg-[#7a1515] transition-all duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-submit-lead"
              >
                {mutation.isPending ? t.submitting : t.submit}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
