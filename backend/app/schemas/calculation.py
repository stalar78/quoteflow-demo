from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, StrictStr, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class QuoteClient(StrictModel):
    displayName: StrictStr = Field(min_length=0, max_length=120)
    contactNote: StrictStr = Field(min_length=0, max_length=300)


class QuoteItem(StrictModel):
    id: StrictStr = Field(min_length=1, max_length=64)
    name: StrictStr = Field(min_length=1, max_length=160)
    description: StrictStr = Field(min_length=0, max_length=1000)
    quantity: StrictStr
    unit: StrictStr = Field(min_length=1, max_length=30)
    unitPriceMinor: StrictInt = Field(ge=0, le=1_000_000_000_000)
    discountBasisPoints: StrictInt = Field(ge=0, le=10000)

    @field_validator("name", "unit")
    @classmethod
    def reject_blank_trimmed(cls, value: str) -> str:
        if value.strip() == "":
            raise ValueError("Value must not be blank")
        return value

    @field_validator("id")
    @classmethod
    def reject_blank_id(cls, value: str) -> str:
        if value.strip() == "":
            raise ValueError("Item ID must not be blank")
        return value


class QuoteCalculationInput(StrictModel):
    schemaVersion: Literal["1"]
    projectName: StrictStr = Field(min_length=0, max_length=120)
    client: QuoteClient
    items: list[QuoteItem] = Field(min_length=1, max_length=100)
    overallDiscountBasisPoints: StrictInt = Field(ge=0, le=10000)
    taxBasisPoints: StrictInt = Field(ge=0, le=10000)
    comment: StrictStr = Field(min_length=0, max_length=2000)
    currency: Literal["RUB"]


class CalculationLineResult(StrictModel):
    itemId: str
    lineGrossMinor: int
    lineDiscountMinor: int
    lineTotalMinor: int


class CalculationResult(StrictModel):
    items: list[CalculationLineResult]
    subtotalMinor: int
    overallDiscountMinor: int
    amountAfterDiscountMinor: int
    taxMinor: int
    totalMinor: int
    currency: Literal["RUB"]
    calculationVersion: Literal["1"]
