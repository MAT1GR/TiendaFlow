/** Tipos de dominio compartidos entre servidor y cliente. */

export type ProductType =
  | "ebook"
  | "pdf"
  | "template"
  | "guide"
  | "file"
  | "other";

export type ProductStatus = "draft" | "active" | "archived";
export type OfferStatus = "draft" | "active" | "archived";
export type FunnelStatus = "draft" | "published" | "paused";
export type OrderStatus = "paid" | "pending" | "failed" | "refunded";
export type CustomerStatus = "new" | "active" | "returning" | "high_value";

export type FunnelStepType =
  | "landing"
  | "checkout"
  | "upsell"
  | "downsell"
  | "thankyou"
  | "custom";

/**
 * Bloques de una página de venta.
 *
 * Los primeros son los de la estructura base —la que trae una página nueva, en
 * este orden— y después vienen los sueltos que se pueden agregar a mano.
 */
export type LandingSectionType =
  | "hero"
  | "stats"
  | "problems"
  | "gallery"
  | "solution"
  | "modules"
  | "bonuses"
  | "pricing"
  | "testimonials"
  | "guarantee"
  | "faq"
  | "cta"
  | "footer"
  | "headline"
  | "subheadline"
  | "benefits"
  | "features"
  | "mockup"
  | "comparison"
  | "countdown"
  | "social_proof"
  | "video"
  | "image";

export type IntegrationProvider =
  | "meta"
  | "stripe"
  | "mercadopago"
  | "google_analytics"
  | "email";

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  provider: string;
  onboarding_completed: number;
  onboarding_answers: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  country: string;
  currency: string;
  tax_id: string | null;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  workspace_id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  short_description: string | null;
  type: ProductType;
  status: ProductStatus;
  category: string | null;
  audience: string | null;
  main_problem: string | null;
  transformation: string | null;
  benefits: string | null;
  cover_url: string | null;
  cover_style: string | null;
  base_price: number;
  currency: string;
  delivery_type: string;
  delivery_message: string | null;
  source: string;
  outline: string | null;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

export interface ProductFile {
  id: string;
  workspace_id: string;
  product_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number;
  storage_key: string | null;
  position: number;
  created_at: string;
}

export interface Offer {
  id: string;
  workspace_id: string;
  product_id: string | null;
  name: string;
  slug: string;
  headline: string | null;
  promise: string | null;
  benefits: string | null;
  cta_text: string;
  guarantee: string | null;
  price: number;
  compare_at_price: number | null;
  currency: string;
  status: OfferStatus;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

export interface Bonus {
  id: string;
  workspace_id: string;
  offer_id: string | null;
  product_id: string | null;
  name: string;
  description: string | null;
  value: number;
  image_url: string | null;
  file_name: string | null;
  status: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface OrderBump {
  id: string;
  workspace_id: string;
  offer_id: string | null;
  product_id: string | null;
  name: string;
  description: string | null;
  checkbox_label: string;
  price: number;
  image_url: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface Upsell {
  id: string;
  workspace_id: string;
  offer_id: string | null;
  product_id: string | null;
  name: string;
  headline: string | null;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  accept_label: string;
  decline_label: string;
  position: number;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface Downsell {
  id: string;
  workspace_id: string;
  upsell_id: string | null;
  product_id: string | null;
  name: string;
  headline: string | null;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  accept_label: string;
  decline_label: string;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface Funnel {
  id: string;
  workspace_id: string;
  product_id: string | null;
  offer_id: string | null;
  name: string;
  slug: string;
  status: FunnelStatus;
  traffic_source: string;
  published_url: string | null;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

export interface FunnelStep {
  id: string;
  workspace_id: string;
  funnel_id: string;
  type: FunnelStepType;
  name: string;
  position: number;
  config: string | null;
  published: number;
  created_at: string;
  updated_at: string;
}

export interface LandingPage {
  id: string;
  workspace_id: string;
  funnel_step_id: string | null;
  offer_id: string | null;
  name: string;
  slug: string;
  status: string;
  theme: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface LandingSection {
  id: string;
  workspace_id: string;
  landing_page_id: string;
  type: LandingSectionType;
  position: number;
  content: string | null;
  visible: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  workspace_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  country: string | null;
  status: CustomerStatus;
  total_spent: number;
  orders_count: number;
  last_purchase_at: string | null;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  workspace_id: string;
  customer_id: string | null;
  offer_id: string | null;
  funnel_id: string | null;
  affiliate_id: string | null;
  reference: string;
  status: OrderStatus;
  subtotal: number;
  bump_total: number;
  upsell_total: number;
  total: number;
  currency: string;
  access_token: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  /** Comisión de TiendaFlow congelada al momento del cobro. */
  commission_rate: number;
  commission_amount: number;
  paid_at: string | null;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  workspace_id: string;
  order_id: string;
  product_id: string | null;
  kind: "main" | "bump" | "upsell" | "downsell" | "bonus";
  name: string;
  quantity: number;
  unit_price: number;
  downloads_count: number;
  created_at: string;
}

export interface Payment {
  id: string;
  workspace_id: string;
  order_id: string;
  provider: string;
  provider_payment_id: string | null;
  status: string;
  amount: number;
  currency: string;
  error_message: string | null;
  raw_payload: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  workspace_id: string;
  funnel_id: string | null;
  name: string;
  platform: string;
  objective: string | null;
  status: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  daily_budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsEvent {
  id: string;
  workspace_id: string;
  funnel_id: string | null;
  funnel_step_id: string | null;
  order_id: string | null;
  session_key: string | null;
  name: string;
  value: number;
  metadata: string | null;
  is_demo: number;
  created_at: string;
}

export interface Integration {
  id: string;
  workspace_id: string;
  provider: IntegrationProvider;
  status: "disconnected" | "connected" | "error";
  public_config: string | null;
  secret_config: string | null;
  last_checked_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface Domain {
  id: string;
  workspace_id: string;
  hostname: string;
  type: string;
  status: "pending" | "verifying" | "active" | "error";
  ssl_status: "pending" | "issued" | "error";
  is_default: number;
  verification_token: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Affiliate {
  id: string;
  workspace_id: string;
  full_name: string;
  email: string;
  status: string;
  commission_rate: number;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

export interface AffiliateLink {
  id: string;
  workspace_id: string;
  affiliate_id: string;
  funnel_id: string | null;
  code: string;
  clicks: number;
  conversions: number;
  revenue: number;
  created_at: string;
}

export interface Commission {
  id: string;
  workspace_id: string;
  affiliate_id: string;
  order_id: string | null;
  amount: number;
  status: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  workspace_id: string;
  plan: string;
  status: string;
  provider: string | null;
  provider_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  workspace_id: string;
  user_id: string | null;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
}

export interface AiGeneration {
  id: string;
  workspace_id: string;
  user_id: string | null;
  task: string;
  provider: string;
  model: string | null;
  input: string | null;
  output: string | null;
  status: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

export interface OnboardingAnswers {
  productSource?: string;
  channel?: string;
  goal?: string;
}
