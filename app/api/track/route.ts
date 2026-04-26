import { NextResponse } from "next/server";
import { mockOrders } from "@/lib/mock-orders";

export const runtime = "nodejs";

export async function GET() {
  const stuck = mockOrders.filter(
    (o) =>
      (o.status === "in_transit" || o.status === "label_created") &&
      o.days_in_transit > 5,
  );

  const customsRisk = mockOrders.filter(
    (o) =>
      o.country === "UK" &&
      o.value_eur > 135 &&
      (o.duty_warning || o.status === "in_transit"),
  );

  const partial = mockOrders.filter((o) => o.status === "delivered_partial");

  const alerts = [
    ...stuck.map((o) => ({
      type: "shipping_delay" as const,
      severity: "high" as const,
      customer: o.customer,
      order_id: o.id,
      message: `Pedido #${o.id} lleva ${o.days_in_transit} días en tránsito vía ${o.carrier}. Considerar refund proactivo + 10% next order.`,
    })),
    ...customsRisk.map((o) => ({
      type: "duty_risk_uk" as const,
      severity: "medium" as const,
      customer: o.customer,
      order_id: o.id,
      message: `Pedido #${o.id} a UK por ${o.value_eur}€ — riesgo de duty FedEx no pagado. Verificar comprobante de pago duty.`,
    })),
    ...partial.map((o) => ({
      type: "partial_delivery" as const,
      severity: "high" as const,
      customer: o.customer,
      order_id: o.id,
      message: `Pedido #${o.id} entregado parcial: faltan ${o.missing_items} items. Iniciar theft claim FedEx automático + reposición.`,
    })),
  ];

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    total_alerts: alerts.length,
    alerts,
    summary: {
      stuck_in_transit: stuck.length,
      uk_duty_risk: customsRisk.length,
      partial_deliveries: partial.length,
    },
  });
}
