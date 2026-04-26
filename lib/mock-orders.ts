export type Order = {
  id: string;
  status:
    | "in_transit"
    | "delivered"
    | "label_created"
    | "delivered_partial"
    | "lost"
    | "in_customs"
    | "return_requested";
  carrier: "FedEx" | "UPS" | "SEUR" | "Correos" | "Reveni";
  days_in_transit: number;
  customer: string;
  country: string;
  value_eur: number;
  missing_items?: number;
  duty_unpaid?: number;
  duty_warning?: boolean;
  items?: string[];
};

export const mockOrders: Order[] = [
  {
    id: "1234",
    status: "in_transit",
    carrier: "FedEx",
    days_in_transit: 22,
    customer: "marta@example.com",
    country: "ES",
    value_eur: 75,
    items: ["Iconic Black Hoodie M"],
  },
  {
    id: "1235",
    status: "delivered",
    carrier: "UPS",
    days_in_transit: 4,
    customer: "john@example.com",
    country: "UK",
    value_eur: 120,
    items: ["Radiant Camo Pants L", "Iconic Tee White M"],
  },
  {
    id: "1236",
    status: "label_created",
    carrier: "FedEx",
    days_in_transit: 18,
    customer: "claire@example.com",
    country: "FR",
    value_eur: 95,
    items: ["Knitwear Blue M"],
  },
  {
    id: "1237",
    status: "delivered_partial",
    carrier: "FedEx",
    days_in_transit: 12,
    customer: "luca@example.com",
    country: "IT",
    value_eur: 230,
    missing_items: 2,
    items: ["3 Hoodies (only 1 received)", "Iconic Sneakers Camo"],
  },
  {
    id: "1238",
    status: "lost",
    carrier: "SEUR",
    days_in_transit: 30,
    customer: "carlos@example.com",
    country: "ES",
    value_eur: 68,
    items: ["Iconic Tee Black L"],
  },
  {
    id: "1239",
    status: "in_customs",
    carrier: "FedEx",
    days_in_transit: 14,
    customer: "maria@example.com",
    country: "CL",
    value_eur: 130,
    duty_unpaid: 105,
    items: ["Hoodie Burgundy M", "Iconic Mule Sneaker"],
  },
  {
    id: "1240",
    status: "delivered",
    carrier: "Correos",
    days_in_transit: 3,
    customer: "sofia@example.com",
    country: "ES",
    value_eur: 45,
    items: ["Iconic Tee Olive S"],
  },
  {
    id: "1241",
    status: "return_requested",
    carrier: "Reveni",
    days_in_transit: 28,
    customer: "anna@example.com",
    country: "DE",
    value_eur: 180,
    items: ["Outerwear Beige L"],
  },
  {
    id: "1242",
    status: "delivered",
    carrier: "FedEx",
    days_in_transit: 5,
    customer: "alex@example.com",
    country: "US",
    value_eur: 220,
    items: ["Iconic Suede Boots Brown 42", "Hoodie Cream M"],
  },
  {
    id: "1243",
    status: "in_transit",
    carrier: "FedEx",
    days_in_transit: 8,
    customer: "noah@example.com",
    country: "UK",
    value_eur: 145,
    duty_warning: true,
    items: ["Knitwear Olive L"],
  },
];

export function findOrder(id: string): Order | undefined {
  return mockOrders.find((o) => o.id === id);
}

export function extractOrderId(text: string): string | null {
  const match = text.match(/#?\s*(\d{4,6})/);
  return match ? match[1] : null;
}
