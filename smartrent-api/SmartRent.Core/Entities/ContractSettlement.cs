using System;

namespace SmartRent.Core.Entities;

// Thực thể lưu trữ kết quả Quyết toán Hợp đồng & Hoàn trả tiền cọc
public class ContractSettlement
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ContractId { get; set; }
    public Guid LandlordId { get; set; }
    public Guid TenantProfileId { get; set; }
    public Guid RoomId { get; set; }

    public decimal DepositAmount { get; set; }         // Tiền cọc ban đầu từ hợp đồng
    public decimal UnpaidInvoicesAmount { get; set; }   // Tổng nợ từ các hóa đơn chưa thanh toán
    public decimal DamageDeductionAmount { get; set; } // Khấu trừ hư hỏng thiết bị/phòng
    public decimal OtherDeductionAmount { get; set; }  // Khấu trừ khác (nếu có)
    public decimal RefundAmount { get; set; }          // Số tiền thực tế hoàn trả khách (Cọc - Tổng khấu trừ)

    public string? SettlementNotes { get; set; }        // Ghi chú lý do khấu trừ / thanh lý
    public DateTime SettleDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public Contract Contract { get; set; } = null!;
    public TenantProfile TenantProfile { get; set; } = null!;
    public Room Room { get; set; } = null!;
}
