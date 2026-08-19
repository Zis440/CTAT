"""
Wallet and WalletTransaction ORM models.

Wallet stores the current balance for each user (in paise, i.e., ₹1 = 100 paise).
WalletTransaction records every credit and debit with a running balance_after field.
"""
import uuid
import enum
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from app.database import Base
from app.utils.id_generator import generate_id

class TransactionType(str, enum.Enum):
    credit = "credit"
    debit = "debit"

class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(String, primary_key=True, default=lambda: generate_id("WAL"))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    balance_paise = Column(Integer, default=0, nullable=False)
    currency = Column(String, default="INR", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def balance_rupees(self) -> float:
        return self.balance_paise / 100.0

class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(String, primary_key=True, default=lambda: generate_id("WTX"))
    wallet_id = Column(String, ForeignKey("wallets.id"), nullable=False, index=True)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    type = Column(
        SAEnum(TransactionType, name="transactiontype"),
        nullable=False,
    )
    amount_paise = Column(Integer, nullable=False)
    balance_after_paise = Column(Integer, nullable=False)
    description = Column(String, nullable=False)
    razorpay_order_id = Column(String, nullable=True)
    razorpay_payment_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
