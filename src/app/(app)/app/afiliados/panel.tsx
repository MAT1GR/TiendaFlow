"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { createAffiliateAction } from "@/app/actions/settings";
import { Avatar, Table, Td, Tr } from "@/components/ui/data";
import { Alert, DemoTag } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  useToast,
} from "@/components/ui/primitives";
import { formatMoney, formatNumber, formatPercent } from "@/lib/utils";
import type { Affiliate, AffiliateLink } from "@/lib/types";

export function AffiliatesPanel({
  affiliates,
  links,
  funnels,
  currency,
}: {
  affiliates: Affiliate[];
  links: AffiliateLink[];
  funnels: Array<{ id: string; name: string }>;
  currency: string;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);

  const linkByAffiliate = new Map(links.map((link) => [link.affiliate_id, link]));

  async function copyLink(code: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/r/${code}`);
      toast.success("Link copiado.");
    } catch {
      toast.error("No pudimos copiar el link");
    }
  }

  return (
    <>
      <Card>
        <CardHeader
          title="Programa de afiliados"
          subtitle="Cada afiliado tiene su link con código propio."
          action={
            <Button size="sm" icon="plus" onClick={() => setOpen(true)}>
              Sumar afiliado
            </Button>
          }
        />

        <div className="p-5 pt-4">
          <Alert tone="info" className="mb-4">
            Los clics y conversiones se registran cuando alguien entra por el link del afiliado. La
            liquidación de comisiones se hace por fuera de TiendaFlow: acá llevás la cuenta.
          </Alert>

          {affiliates.length === 0 ? (
            <EmptyState
              icon="handshake"
              title="Todavía no tenés afiliados"
              description="Sumá a alguien que quiera vender tu producto y generá su link. Vas a ver sus clics, conversiones y comisiones acá."
              action={
                <Button icon="plus" onClick={() => setOpen(true)}>
                  Sumar afiliado
                </Button>
              }
            />
          ) : (
            <Table
              columns={[
                { key: "name", label: "Afiliado" },
                { key: "commission", label: "Comisión", align: "right" },
                { key: "clicks", label: "Clics", align: "right" },
                { key: "conversions", label: "Ventas", align: "right" },
                { key: "rate", label: "Conversión", align: "right" },
                { key: "revenue", label: "Facturación", align: "right" },
                { key: "link", label: "Link" },
              ]}
            >
              {affiliates.map((affiliate) => {
                const link = linkByAffiliate.get(affiliate.id);
                const rate = link && link.clicks > 0 ? (link.conversions / link.clicks) * 100 : 0;
                return (
                  <Tr key={affiliate.id}>
                    <Td>
                      <span className="flex items-center gap-2.5">
                        <Avatar name={affiliate.full_name} size={28} />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate font-medium text-ink-900">
                              {affiliate.full_name}
                            </span>
                            {affiliate.is_demo ? <DemoTag /> : null}
                          </span>
                          <span className="block truncate text-[11.5px] text-ink-400">
                            {affiliate.email}
                          </span>
                        </span>
                      </span>
                    </Td>
                    <Td align="right">
                      <Badge tone="brand">{affiliate.commission_rate}%</Badge>
                    </Td>
                    <Td align="right">{formatNumber(link?.clicks ?? 0, true)}</Td>
                    <Td align="right">{formatNumber(link?.conversions ?? 0)}</Td>
                    <Td align="right">{link?.clicks ? formatPercent(rate) : "—"}</Td>
                    <Td align="right" className="font-semibold text-ink-900">
                      {formatMoney(link?.revenue ?? 0, currency, true)}
                    </Td>
                    <Td>
                      {link ? (
                        <button
                          type="button"
                          onClick={() => copyLink(link.code)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-ink-100 px-2.5 py-1 text-[12px] font-medium text-ink-700 transition-colors hover:bg-ink-200"
                        >
                          <Icon name="link" size={13} />
                          {link.code}
                        </button>
                      ) : (
                        "—"
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </Table>
          )}
        </div>
      </Card>

      <AffiliateModal open={open} onClose={() => setOpen(false)} funnels={funnels} />
    </>
  );
}

function AffiliateModal({
  open,
  onClose,
  funnels,
}: {
  open: boolean;
  onClose: () => void;
  funnels: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction, pending] = useActionState(createAffiliateAction, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Afiliado agregado.");
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sumar afiliado"
      description="Le generamos un link con su código de seguimiento."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="affiliate-form" loading={pending} icon="check">
            Sumar afiliado
          </Button>
        </>
      }
    >
      <form id="affiliate-form" action={formAction} className="flex flex-col gap-4">
        {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}

        <Field label="Nombre" required>
          <Input name="full_name" required />
        </Field>
        <Field label="Email" required error={state && !state.ok ? state.fieldErrors?.email : undefined}>
          <Input name="email" type="email" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Comisión (%)"
            error={state && !state.ok ? state.fieldErrors?.commission_rate : undefined}
          >
            <Input name="commission_rate" type="number" min={1} max={90} defaultValue={30} />
          </Field>
          <Field label="Funnel">
            <Select name="funnel_id" defaultValue="">
              <option value="">Todos</option>
              {funnels.map((funnel) => (
                <option key={funnel.id} value={funnel.id}>
                  {funnel.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </form>
    </Modal>
  );
}
