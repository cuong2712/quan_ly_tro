using Microsoft.EntityFrameworkCore;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;
using SmartRent.Core.Interfaces;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Infrastructure.Repositories;

// Repository thao tác cơ sở dữ liệu cho Hợp đồng thuê nhà (Contract)
public class ContractRepository(AppDbContext db) : IContractRepository
{
    // Lấy danh sách hợp đồng thuê nhà thuộc các khu trọ của Chủ trọ
    public async Task<IEnumerable<Contract>> GetByLandlordIdAsync(Guid landlordId) =>
        await db.Contracts.Include(c => c.Room).ThenInclude(r => r.Zone)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .Where(c => c.Room.Zone.LandlordId == landlordId).ToListAsync();

    // Lấy danh sách hợp đồng thuê của một Khách thuê theo ID hồ sơ
    public async Task<IEnumerable<Contract>> GetByTenantIdAsync(Guid tenantProfileId) =>
        await db.Contracts.Include(c => c.Room).ThenInclude(r => r.Zone)
            .Where(c => c.TenantProfileId == tenantProfileId).ToListAsync();

    // Lấy thông tin chi tiết một hợp đồng theo ID
    public async Task<Contract?> GetByIdAsync(Guid id) =>
        await db.Contracts.Include(c => c.Room).ThenInclude(r => r.Zone)
            .Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.Id == id);

    // Lấy hợp đồng đang còn hiệu lực (Active) của một phòng trọ cụ thể
    public async Task<Contract?> GetActiveByRoomIdAsync(Guid roomId) =>
        await db.Contracts.Include(c => c.TenantProfile).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.RoomId == roomId && c.Status == ContractStatus.Active);

    // Tạo mới một hợp đồng thuê nhà
    public async Task<Contract> CreateAsync(Contract contract) { db.Contracts.Add(contract); await db.SaveChangesAsync(); return contract; }

    // Cập nhật thông tin hợp đồng thuê nhà
    public async Task<Contract> UpdateAsync(Contract contract) { db.Contracts.Update(contract); await db.SaveChangesAsync(); return contract; }

    // Xóa một hợp đồng theo ID
    public async Task<bool> DeleteAsync(Guid id)
    {
        var c = await db.Contracts.FindAsync(id);
        if (c is null) return false;
        db.Contracts.Remove(c); await db.SaveChangesAsync(); return true;
    }
}
