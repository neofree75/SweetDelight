# -*- coding: utf-8 -*-
import frappe
from frappe.model.document import Document


class WithdrawalRequest(Document):
    def validate(self):
        if not self.request_date:
            self.request_date = frappe.utils.now_datetime()
