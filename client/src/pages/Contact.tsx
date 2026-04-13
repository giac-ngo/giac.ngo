import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTitle } from "@/hooks/use-document-title";
import {
  validateContactForm,
  INITIAL_FORM_DATA,
  type ContactFormData,
} from "@/lib/contact-utils";

export default function Contact() {
  useDocumentTitle("Contact Us", "Get in touch with Bodhi Technology Lab. Inquire about our platform for Buddhist temples, monasteries, and dharma centers.");
  const { toast } = useToast();
  const [form, setForm] = useState<ContactFormData>({ ...INITIAL_FORM_DATA });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof ContactFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateContactForm(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (response.ok) {
        toast({ title: "Message Sent", description: data.message || "Your message has been sent successfully." });
        setForm({ ...INITIAL_FORM_DATA });
      } else {
        toast({ title: "Error", description: data.error || "Failed to send message.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network Error", description: "Lỗi mạng, vui lòng thử lại.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EFE0BD]">
      <header className="bg-white/80 backdrop-blur-md border-b border-[#8B4513]/20 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-serif text-xl font-bold text-[#2c2c2c]">Contact Us</h1>
          <Link to="/" className="flex items-center gap-2 px-4 py-2 bg-[#991b1b] text-white rounded-lg font-serif text-sm hover:bg-[#7a1515] transition-all">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8">
          <h2 className="font-serif text-3xl font-bold text-[#2c2c2c] mb-3">Get in Touch</h2>
          <p className="font-serif text-[#8B4513]/70">We'd love to hear from you. Fill out the form below and we'll get back to you soon.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-md rounded-2xl border border-[#8B4513]/20 p-8 space-y-5">
          {/* Name row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName" className="font-serif text-sm text-[#2c2c2c]">First Name *</Label>
              <Input id="firstName" value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} placeholder="First name" className="mt-1 font-serif" />
              {errors.firstName && <p className="text-red-600 text-xs font-serif mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <Label htmlFor="lastName" className="font-serif text-sm text-[#2c2c2c]">Last Name *</Label>
              <Input id="lastName" value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} placeholder="Last name" className="mt-1 font-serif" />
              {errors.lastName && <p className="text-red-600 text-xs font-serif mt-1">{errors.lastName}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email" className="font-serif text-sm text-[#2c2c2c]">Email *</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="your@email.com" className="mt-1 font-serif" />
            {errors.email && <p className="text-red-600 text-xs font-serif mt-1">{errors.email}</p>}
          </div>

          {/* Organization & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="organizationName" className="font-serif text-sm text-[#2c2c2c]">Organization Name</Label>
              <Input id="organizationName" value={form.organizationName} onChange={(e) => updateField("organizationName", e.target.value)} placeholder="Temple or organization name" className="mt-1 font-serif" />
            </div>
            <div>
              <Label htmlFor="role" className="font-serif text-sm text-[#2c2c2c]">Your Role</Label>
              <Input id="role" value={form.role} onChange={(e) => updateField("role", e.target.value)} placeholder="e.g. Abbot, Administrator" className="mt-1 font-serif" />
            </div>
          </div>

          {/* Organization Type & Community Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="font-serif text-sm text-[#2c2c2c]">Organization Type</Label>
              <Select value={form.organizationType} onValueChange={(v) => updateField("organizationType", v)}>
                <SelectTrigger className="mt-1 font-serif"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="temple">Temple</SelectItem>
                  <SelectItem value="monastery">Monastery</SelectItem>
                  <SelectItem value="center">Meditation Center</SelectItem>
                  <SelectItem value="organization">Buddhist Organization</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-serif text-sm text-[#2c2c2c]">Community Size</Label>
              <Select value={form.communitySize} onValueChange={(v) => updateField("communitySize", v)}>
                <SelectTrigger className="mt-1 font-serif"><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-50">1 – 50</SelectItem>
                  <SelectItem value="51-200">51 – 200</SelectItem>
                  <SelectItem value="201-500">201 – 500</SelectItem>
                  <SelectItem value="500+">500+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="message" className="font-serif text-sm text-[#2c2c2c]">Message</Label>
            <Textarea id="message" value={form.message} onChange={(e) => updateField("message", e.target.value)} placeholder="Tell us about your needs..." rows={4} className="mt-1 font-serif resize-none" />
          </div>

          {/* Submit */}
          <Button type="submit" disabled={isSubmitting} className="w-full bg-[#991b1b] hover:bg-[#7a1515] text-white font-serif font-semibold py-3 rounded-xl">
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" /> Send Message</>
            )}
          </Button>
        </form>
      </main>
    </div>
  );
}

