import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

from backend.modules.source.repositories.offer_repo import OfferRepository
try:
    from backend.core.email_service_extended import send_offer_letter_email
except ImportError:
    send_offer_letter_email = None

logger = logging.getLogger(__name__)

class OfferService:
    def __init__(self, tenant_id: str = "public"):
        self.tenant_id = tenant_id
        self.repo = OfferRepository(tenant_id=tenant_id)

    def get_all_offers(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        return self.repo.get_all_offers(status)

    def get_offer_by_id(self, offer_id: int) -> Optional[Dict[str, Any]]:
        return self.repo.get_offer_by_id(offer_id)

    def update_offer(self, offer_id: int, updates: Dict[str, Any]) -> bool:
        offer = self.get_offer_by_id(offer_id)
        if not offer:
            raise ValueError("Offer not found")
        if offer["status"] not in ("pending", "changes_requested"):
            raise ValueError(f"Cannot edit an offer with status '{offer['status']}'")

        if not updates:
            return True

        updates["status"] = "pending"
        updates["updated_at"] = datetime.utcnow()
        return self.repo.update_offer(offer_id, updates)

    def approve_offer(self, offer_id: int, user_id: int) -> bool:
        offer = self.get_offer_by_id(offer_id)
        if not offer:
            raise ValueError("Offer not found")
        return self.repo.update_offer_status(offer_id, "approved", user_id=user_id)

    def request_changes(self, offer_id: int, feedback: str) -> bool:
        offer = self.get_offer_by_id(offer_id)
        if not offer:
            raise ValueError("Offer not found")
        return self.repo.update_offer_status(offer_id, "changes_requested", feedback=feedback)

    def reject_offer(self, offer_id: int, feedback: str) -> bool:
        offer = self.get_offer_by_id(offer_id)
        if not offer:
            raise ValueError("Offer not found")
        return self.repo.update_offer_status(offer_id, "rejected", feedback=feedback)

    def send_offer(self, offer_id: int) -> Dict[str, Any]:
        offer = self.get_offer_by_id(offer_id)
        if not offer:
            raise ValueError("Offer not found")
            
        if offer["status"] != "approved":
            raise ValueError(f"Only approved offers can be sent. Current status: {offer['status']}")

        emp_id = self.repo.convert_candidate_to_employee(offer)
        emp_code = f"EMP{emp_id:04d}"

        if send_offer_letter_email:
            try:
                send_offer_letter_email(
                    to_email=offer["candidate_email"],
                    candidate_name=offer["candidate_name"],
                    company_name="Phygitron 360",
                    role_title=offer["role_title"],
                    department=offer.get("department", ""),
                    salary=offer["salary"],
                    location=offer.get("location", ""),
                )
            except Exception as email_exc:
                logger.warning(f"Offer email send failed (non-blocking): {email_exc}")
                
        return {"employee_id": emp_id, "employee_code": emp_code}
