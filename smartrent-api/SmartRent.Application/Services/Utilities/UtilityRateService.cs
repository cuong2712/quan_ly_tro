using Microsoft.EntityFrameworkCore;
using SmartRent.Core.DTOs;
using SmartRent.Core.Entities;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services.Utilities;

// Phân hệ Quản lý Bảng giá Điện & Nước của từng chủ trọ.
public class UtilityRateService(AppDbContext db)
{
    // Lấy đơn giá điện nước hiện tại của Chủ trọ.
    public async Task<UtilityRateDto?> GetRateAsync(Guid landlordId)
    {
        var r = await db.UtilityRates.AsNoTracking().FirstOrDefaultAsync(r => r.LandlordId == landlordId);
        return r is null ? null : new UtilityRateDto(r.Id, r.ElecPrice, r.WaterPrice, r.UpdatedAt);
    }

    // Cập nhật đơn giá điện (đ/kWh) và giá nước (đ/m³) của Chủ trọ.
    public async Task<UtilityRateDto> UpdateRateAsync(Guid landlordId, UpdateUtilityRateRequest req)
    {
        var r = await db.UtilityRates.FirstOrDefaultAsync(x => x.LandlordId == landlordId);
        if (r is null)
        {
            r = new UtilityRate { LandlordId = landlordId, ElecPrice = req.ElecPrice, WaterPrice = req.WaterPrice };
            db.UtilityRates.Add(r);
        }
        else
        {
            r.ElecPrice = req.ElecPrice;
            r.WaterPrice = req.WaterPrice;
            r.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        return new UtilityRateDto(r.Id, r.ElecPrice, r.WaterPrice, r.UpdatedAt);
    }
}

