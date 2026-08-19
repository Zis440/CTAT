import { apiClient } from "./apiClient";

export interface Pricing {
  id: string;
  test_type: string;
  individual_price_paise: number;
  individual_price_rupees: number;
  clinic_price_paise: number;
  clinic_price_rupees: number;
  is_active: boolean;
}

export async function getPricing(): Promise<Pricing[]> {
  const { data } = await apiClient.get<Pricing[]>("/pricing");
  return data;
}
