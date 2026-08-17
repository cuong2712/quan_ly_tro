using System.Collections.Generic;

namespace SmartRent.Core.DTOs;

public record MonthlyFinancialItemDto(
    string Month,
    decimal Revenue,
    decimal UnpaidDebt,
    decimal Expense,
    decimal NetProfit
);

public record FinancialSummaryDto(
    decimal TotalRevenue,
    decimal TotalUnpaidDebt,
    decimal TotalMaintenanceExpense,
    decimal TotalNetProfit,
    int TotalInvoicesPaid,
    int TotalInvoicesUnpaid,
    List<MonthlyFinancialItemDto> MonthlyBreakdown
);
