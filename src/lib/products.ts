export type ProductKey =
  | "report_plan"
  | "ai_subscription"
  | "ai_one_time"
  | "expert_bundle"
  | "report_chat_bonus";

export type ProductMode = "payment" | "subscription";

export type ProductAccess = {
  report?: boolean;
  chatMonths?: number;
};

export type ProductConfig = {
  key: ProductKey;
  priceId: string;
  mode: ProductMode;
  access: ProductAccess;
};

type Definition = {
  key: ProductKey;
  env?: keyof NodeJS.ProcessEnv;
  mode: ProductMode;
  access: ProductAccess;
  priceId?: string;
};

const DEFINITIONS: Definition[] = [
  {
    key: "report_plan",
    env: "PRICE_ID_PLAN",
    mode: "payment",
    access: { report: true },
  },
  {
    key: "ai_subscription",
    env: "PRICE_ID_AI",
    mode: "subscription",
    access: { chatMonths: 1 },
  },
  {
    key: "ai_one_time",
    env: "PRICE_ID_AI_ONE_TIME",
    mode: "payment",
    access: { chatMonths: 1 },
  },
  {
    key: "expert_bundle",
    env: "PRICE_ID_EXPERT",
    mode: "payment",
    access: { report: true, chatMonths: 3 },
  },
  {
    key: "report_chat_bonus",
    mode: "payment",
    access: { chatMonths: 3 },
    priceId: "virtual-report-chat-bonus",
  },
];

function requireEnv(name: keyof NodeJS.ProcessEnv): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

function buildProduct(definition: Definition): ProductConfig {
  const priceId = definition.env
    ? requireEnv(definition.env)
    : definition.priceId ?? `virtual-${definition.key}`;
  return {
    key: definition.key,
    priceId,
    mode: definition.mode,
    access: definition.access,
  };
}

export const PRODUCTS: Record<ProductKey, ProductConfig> = DEFINITIONS.reduce(
  (acc, definition) => {
    const product = buildProduct(definition);
    acc[product.key] = product;
    return acc;
  },
  {} as Record<ProductKey, ProductConfig>,
);

const priceMap = new Map<string, ProductConfig>();
for (const product of Object.values(PRODUCTS)) {
  priceMap.set(product.priceId, product);
}

export const PRODUCT_BY_PRICE_ID = priceMap;

export function getProductByKey(
  key: string | null | undefined,
): ProductConfig | undefined {
  if (!key) return undefined;
  return PRODUCTS[key as ProductKey];
}

export function getProductByPriceId(
  priceId: string | null | undefined,
): ProductConfig | undefined {
  if (!priceId) return undefined;
  return PRODUCT_BY_PRICE_ID.get(priceId);
}
