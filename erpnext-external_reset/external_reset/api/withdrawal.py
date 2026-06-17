# -*- coding: utf-8 -*-
"""
Odstúpenie od zmluvy (zákon č. 108/2024 Z. z., účinné od 19.6.2026).

Whitelisted API metóda volaná z e-shopu (server SweetDelight):
    POST /api/method/external_reset.api.withdrawal.create_withdrawal

V jednom kroku:
  1. overí objednávku a identitu (číslo objednávky + e-mail),
  2. založí záznam doctype "Withdrawal Request",
  3. odošle automatické potvrdenie zákazníkovi a notifikáciu cukrárni.

Vzor: external_reset.api.register.register_user
"""

import json

import frappe
from frappe import _
from frappe.utils import flt

# E-mail cukrárne, na ktorý chodia notifikácie o nových odstúpeniach.
# Uprav podľa potreby, alebo nastav v site_config.json kľúč "withdrawal_notify_email".
DEFAULT_SHOP_EMAIL = "marselabakery@gmail.com"


@frappe.whitelist(allow_guest=True)
def create_withdrawal(orderId=None, email=None, fullName=None, iban=None, reason=None, items=None, **kwargs):
    """Vytvorí požiadavku o odstúpenie od zmluvy a pošle potvrdzovacie e-maily.

    Vracia: {"name": <ID záznamu>, "request_id": <ID záznamu>}
    """
    order_id = (orderId or "").strip()
    customer_email = (email or "").strip().lower()

    # items môže prísť ako JSON string (form-encoded) alebo ako list (JSON body)
    if isinstance(items, str):
        try:
            items = json.loads(items)
        except (ValueError, TypeError):
            items = []
    items = items or []

    if not order_id or not customer_email:
        frappe.throw(_("Chýba číslo objednávky alebo e-mail."), frappe.ValidationError)

    if not items:
        frappe.throw(_("Nie sú vybrané žiadne položky na vrátenie."), frappe.ValidationError)

    # ── Overenie objednávky a identity (rovnaká logika ako na strane e-shopu) ──
    order = frappe.db.get_value(
        "Sales Order",
        order_id,
        ["name", "contact_email", "customer", "customer_name", "grand_total", "currency"],
        as_dict=True,
    )
    if not order:
        # Neutrálna hláška – neprezrádzame, či objednávka existuje
        frappe.throw(_("Objednávku sa nepodarilo overiť."), frappe.ValidationError)

    order_email = (order.contact_email or "").strip().lower()
    if not order_email or order_email != customer_email:
        frappe.throw(_("Objednávku sa nepodarilo overiť."), frappe.ValidationError)

    # ── Vytvorenie záznamu ──
    doc = frappe.new_doc("Withdrawal Request")
    doc.sales_order = order_id
    doc.customer_email = customer_email
    doc.customer_name = (fullName or order.customer_name or "").strip()
    doc.iban = (iban or "").strip()
    doc.reason = (reason or "").strip()
    doc.status = "Open"

    for it in items:
        doc.append(
            "items",
            {
                "item_code": (it.get("item_code") or "").strip(),
                "item_name": (it.get("item_name") or "").strip(),
                "qty": flt(it.get("qty")) or 1,
                "rate": flt(it.get("rate")),
            },
        )

    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    # ── Automatické e-maily (potvrdenie zákazníkovi + notifikácia cukrárni) ──
    try:
        _send_emails(doc, order)
    except Exception:
        # E-mail nesmie zhodiť registráciu požiadavky – chybu len zalogujeme
        frappe.log_error(frappe.get_traceback(), "Withdrawal e-mail failed")

    return {"name": doc.name, "request_id": doc.name}


def _items_html(doc):
    rows = []
    for it in doc.items:
        amount = flt(it.qty) * flt(it.rate)
        rows.append(
            "<tr>"
            "<td style='padding:4px 8px;border:1px solid #eee'>{name}</td>"
            "<td style='padding:4px 8px;border:1px solid #eee'>{code}</td>"
            "<td style='padding:4px 8px;border:1px solid #eee;text-align:right'>{qty:g}</td>"
            "<td style='padding:4px 8px;border:1px solid #eee;text-align:right'>{amount:.2f} €</td>"
            "</tr>".format(
                name=frappe.utils.escape_html(it.item_name or ""),
                code=frappe.utils.escape_html(it.item_code or ""),
                qty=flt(it.qty),
                amount=amount,
            )
        )
    return (
        "<table style='border-collapse:collapse;font-size:14px'>"
        "<thead><tr>"
        "<th style='padding:4px 8px;border:1px solid #eee;text-align:left'>Položka</th>"
        "<th style='padding:4px 8px;border:1px solid #eee;text-align:left'>Kód</th>"
        "<th style='padding:4px 8px;border:1px solid #eee'>Množstvo</th>"
        "<th style='padding:4px 8px;border:1px solid #eee'>Suma</th>"
        "</tr></thead><tbody>" + "".join(rows) + "</tbody></table>"
    )


def _send_emails(doc, order):
    items_html = _items_html(doc)
    shop_email = frappe.conf.get("withdrawal_notify_email") or DEFAULT_SHOP_EMAIL

    # 1) Potvrdenie zákazníkovi (vyžaduje zákon)
    customer_subject = "Potvrdenie odstúpenia od zmluvy – objednávka {0}".format(doc.sales_order)
    customer_message = """
        <p>Dobrý deň{name},</p>
        <p>potvrdzujeme, že sme prijali Vaše <strong>odstúpenie od zmluvy</strong>
        k objednávke <strong>{order}</strong>.</p>
        <p>Evidenčné číslo žiadosti: <strong>{req}</strong></p>
        <p>Položky, od ktorých odstupujete:</p>
        {items}
        {iban}
        <p>O ďalšom postupe (vrátenie tovaru a peňazí) Vás budeme informovať.</p>
        <p>S pozdravom,<br>Marsela Bakery</p>
    """.format(
        name=(" " + doc.customer_name) if doc.customer_name else "",
        order=doc.sales_order,
        req=doc.name,
        items=items_html,
        iban=("<p>IBAN na vrátenie peňazí: <strong>{0}</strong></p>".format(
            frappe.utils.escape_html(doc.iban)) if doc.iban else ""),
    )
    frappe.sendmail(
        recipients=[doc.customer_email],
        subject=customer_subject,
        message=customer_message,
        reference_doctype="Withdrawal Request",
        reference_name=doc.name,
        now=True,
    )

    # 2) Notifikácia cukrárni
    shop_subject = "Nové odstúpenie od zmluvy – objednávka {0}".format(doc.sales_order)
    shop_message = """
        <p>Bola podaná nová žiadosť o odstúpenie od zmluvy.</p>
        <ul>
            <li>Žiadosť: <strong>{req}</strong></li>
            <li>Objednávka: <strong>{order}</strong></li>
            <li>Zákazník: {name} ({email})</li>
            {iban}
            {reason}
        </ul>
        <p>Položky na vrátenie:</p>
        {items}
    """.format(
        req=doc.name,
        order=doc.sales_order,
        name=frappe.utils.escape_html(doc.customer_name or "-"),
        email=frappe.utils.escape_html(doc.customer_email or "-"),
        iban=("<li>IBAN: {0}</li>".format(frappe.utils.escape_html(doc.iban)) if doc.iban else ""),
        reason=("<li>Dôvod: {0}</li>".format(frappe.utils.escape_html(doc.reason)) if doc.reason else ""),
        items=items_html,
    )
    frappe.sendmail(
        recipients=[shop_email],
        subject=shop_subject,
        message=shop_message,
        reference_doctype="Withdrawal Request",
        reference_name=doc.name,
        now=True,
    )
