export type BuddhistVehicle = "hinayana" | "mahayana" | "vajrayana" | "zen";

export interface BuddhistAgent {
  id: string;
  name: string;
  vehicle: BuddhistVehicle;
  tagline: string;
  purpose: string;
  monastery?: string;
  description?: string;
}

export const vehicleInfo: Record<BuddhistVehicle, { name: string; nameEn?: string; color: string }> = {
  hinayana: { name: "Nguyên Thủy", nameEn: "Theravada", color: "#f59e0b" },
  mahayana: { name: "Đại Thừa", nameEn: "Mahayana", color: "#3b82f6" },
  vajrayana: { name: "Kim Cương Thừa", nameEn: "Vajrayana", color: "#ef4444" },
  zen: { name: "Thiền Tông", nameEn: "Zen", color: "#10b981" },
};

export const buddhistAgents: BuddhistAgent[] = [
  {
    id: "a1",
    name: "Thích Ca Mâu Ni",
    vehicle: "mahayana",
    tagline: "Bậc Đạo Sư",
    purpose: "Hướng dẫn căn bản và cốt lõi của đạo Phật.",
    monastery: "Tịnh xá Kỳ Viên"
  }
];

export const modelPricing: Record<string, { name: string, description: string, inputPrice: number, outputPrice: number, contextWindow: number, maxOutput: number }> = {
  gpt4: { name: "GPT-4", description: "Standard model", inputPrice: 0.03, outputPrice: 0.06, contextWindow: 8000, maxOutput: 4000 }
};
