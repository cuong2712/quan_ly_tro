using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;

namespace SmartRent.Application.Common.Mappings;

public static class InvoiceMappingExtensions
{
    public static InvoiceDto ToInvoiceDto(this Invoice i) => new(
        i.Id,
        i.InvoiceCode,
        i.RoomId,
        i.Room?.RoomNumber ?? "",
        i.TenantProfileId,
        i.TenantProfile?.User?.FullName ?? "",
        i.Month,
        i.RentFee,
        i.ElecFee,
        i.WaterFee,
        i.ServiceFee,
        i.TotalAmount,
        i.Status.ToString(),
        i.DueDate,
        i.PaidDate,
        i.CreatedAt,
        i.Items?.Select(x => new InvoiceItemDto(x.Id, x.Name, x.Amount)).ToList() ?? [],
        i.IsReported,
        i.DisputeReason,
        i.DisputeDescription,
        i.DisputeImageUrl,
        i.DisputeStatus,
        i.DisputeCreatedAt,
        i.DisputeResolvedAt,
        i.DisputeReply,
        i.SuggestedElecNumber,
        i.SuggestedWaterNumber
    );
}
