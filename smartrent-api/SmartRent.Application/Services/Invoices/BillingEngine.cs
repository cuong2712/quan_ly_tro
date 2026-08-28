using Microsoft.EntityFrameworkCore;
using SmartRent.Core.Entities;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Application.Services.Invoices;

// Động cơ tính toán hóa đơn tiền phòng, tiền điện nước và các gói dịch vụ
public class BillingEngine(AppDbContext db)
{
    public async Task<(List<InvoiceItem> Items, decimal CalculatedServiceFee, decimal TotalAmount)> CalculateChargesAsync(
        Guid landlordId,
        Room room,
        decimal rentFee,
        decimal elecFee,
        decimal waterFee,
        decimal customServiceFee)
    {
        var activeServices = await db.Services
            .Include(s => s.Zone)
            .Where(s => s.LandlordId == landlordId && s.IsActive && (s.ZoneId == room.ZoneId || s.ZoneId == null))
            .ToListAsync();

        var roomTenants = await db.TenantProfiles.Where(t => t.RoomId == room.Id).ToListAsync();
        int totalRoomVehicles = roomTenants.Sum(t => t.VehicleCount);

        decimal calculatedServiceFee = 0;
        var itemsList = new List<InvoiceItem>
        {
            new() { Name = $"Tiền thuê phòng {room.RoomNumber}", Amount = rentFee },
            new() { Name = "Tiền điện", Amount = elecFee },
            new() { Name = "Tiền nước", Amount = waterFee }
        };

        if (activeServices.Count > 0)
        {
            foreach (var svc in activeServices)
            {
                var isParking = svc.Name.Contains("xe", StringComparison.OrdinalIgnoreCase);
                var zoneTag = svc.Zone != null ? $" ({svc.Zone.Name})" : "";
                if (isParking)
                    if (totalRoomVehicles > 0)
                    {
                        decimal parkCost = totalRoomVehicles * svc.Price;
                        calculatedServiceFee += parkCost;
                    itemsList.Add(new InvoiceItem { Name = $"{svc.Name}{zoneTag}", Amount = svc.Price });
                }
            }
        }

        if (activeServices.Count == 0 && customServiceFee > 0)
        {
            calculatedServiceFee = customServiceFee;
            var vehicleNote = totalRoomVehicles > 0 ? $" ({totalRoomVehicles} xe)" : "";
            itemsList.Add(new InvoiceItem { Name = $"Phí dịch vụ{vehicleNote}", Amount = calculatedServiceFee });
        }

        var totalAmount = rentFee + elecFee + waterFee + calculatedServiceFee;
        return (itemsList, calculatedServiceFee, totalAmount);
    }
}
