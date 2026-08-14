using Microsoft.EntityFrameworkCore;
using SmartRent.Core.Entities;
using SmartRent.Core.Interfaces;
using SmartRent.Infrastructure.Data;

namespace SmartRent.Infrastructure.Repositories;

// Repository thao tác cơ sở dữ liệu cho thực thể Người dùng (User)
public class UserRepository(AppDbContext db) : IUserRepository
{
    // Tìm kiếm người dùng theo địa chỉ Email
    public async Task<User?> GetByEmailAsync(string email) =>
        await db.Users.FirstOrDefaultAsync(u => u.Email == email);

    // Tìm kiếm thông tin chi tiết người dùng theo ID
    public async Task<User?> GetByIdAsync(Guid id) =>
        await db.Users.FindAsync(id);

    // Lấy danh sách người dùng theo vai trò hệ thống (SuperAdmin, Landlord, Tenant)
    public async Task<IEnumerable<User>> GetAllByRoleAsync(string role) =>
        await db.Users.Where(u => u.Role.ToString() == role).ToListAsync();

    // Thêm mới một tài khoản người dùng
    public async Task<User> CreateAsync(User user)
    {
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    // Cập nhật thông tin tài khoản người dùng
    public async Task<User> UpdateAsync(User user)
    {
        db.Users.Update(user);
        await db.SaveChangesAsync();
        return user;
    }

    // Xóa tài khoản người dùng theo ID
    public async Task<bool> DeleteAsync(Guid id)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return false;
        db.Users.Remove(user);
        await db.SaveChangesAsync();
        return true;
    }
}
