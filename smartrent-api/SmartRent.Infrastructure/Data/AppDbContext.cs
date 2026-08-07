using Microsoft.EntityFrameworkCore;
using SmartRent.Core.Entities;
using SmartRent.Core.Enums;

namespace SmartRent.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Zone> Zones => Set<Zone>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<TenantProfile> TenantProfiles => Set<TenantProfile>();
    public DbSet<Contract> Contracts => Set<Contract>();
    public DbSet<UtilityLog> UtilityLogs => Set<UtilityLog>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<MaintenanceRequest> MaintenanceRequests => Set<MaintenanceRequest>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<NotificationRead> NotificationReads => Set<NotificationRead>();
    public DbSet<Complaint> Complaints => Set<Complaint>();
    public DbSet<UtilityRate> UtilityRates => Set<UtilityRate>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Role).HasConversion<int>();
            e.Property(x => x.Email).HasMaxLength(256);
            e.Property(x => x.FullName).HasMaxLength(256);
            e.Property(x => x.Phone).HasMaxLength(20);
        });

        // Zone
        modelBuilder.Entity<Zone>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Landlord).WithMany(u => u.Zones).HasForeignKey(x => x.LandlordId).OnDelete(DeleteBehavior.Restrict);
        });

        // Room
        modelBuilder.Entity<Room>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Zone).WithMany(z => z.Rooms).HasForeignKey(x => x.ZoneId).OnDelete(DeleteBehavior.Cascade);
            e.Property(x => x.Status).HasConversion<int>();
            e.Property(x => x.Price).HasColumnType("decimal(18,2)");
            e.Property(x => x.Area).HasColumnType("decimal(10,2)");
            e.Property(x => x.ElecMeter).HasColumnType("decimal(10,2)");
            e.Property(x => x.WaterMeter).HasColumnType("decimal(10,2)");
        });

        // TenantProfile
        modelBuilder.Entity<TenantProfile>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.User).WithOne(u => u.TenantProfile).HasForeignKey<TenantProfile>(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Room).WithMany(r => r.Tenants).HasForeignKey(x => x.RoomId).OnDelete(DeleteBehavior.SetNull).IsRequired(false);
            e.Property(x => x.Deposit).HasColumnType("decimal(18,2)");
        });

        // Contract
        modelBuilder.Entity<Contract>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Room).WithMany(r => r.Contracts).HasForeignKey(x => x.RoomId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.TenantProfile).WithMany(t => t.Contracts).HasForeignKey(x => x.TenantProfileId).OnDelete(DeleteBehavior.Restrict);
            e.Property(x => x.Status).HasConversion<int>();
            e.Property(x => x.RentAmount).HasColumnType("decimal(18,2)");
            e.Property(x => x.Deposit).HasColumnType("decimal(18,2)");
        });

        // UtilityLog
        modelBuilder.Entity<UtilityLog>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Room).WithMany(r => r.UtilityLogs).HasForeignKey(x => x.RoomId).OnDelete(DeleteBehavior.Cascade);
            e.Property(x => x.ElecCost).HasColumnType("decimal(18,2)");
            e.Property(x => x.WaterCost).HasColumnType("decimal(18,2)");
        });

        // Service
        modelBuilder.Entity<Service>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Landlord).WithMany(u => u.Services).HasForeignKey(x => x.LandlordId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Zone).WithMany().HasForeignKey(x => x.ZoneId).OnDelete(DeleteBehavior.SetNull);
            e.Property(x => x.Price).HasColumnType("decimal(18,2)");
        });

        // Invoice
        modelBuilder.Entity<Invoice>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Room).WithMany(r => r.Invoices).HasForeignKey(x => x.RoomId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.TenantProfile).WithMany(t => t.Invoices).HasForeignKey(x => x.TenantProfileId).OnDelete(DeleteBehavior.Restrict);
            e.Property(x => x.Status).HasConversion<int>();
            e.Property(x => x.TotalAmount).HasColumnType("decimal(18,2)");
            e.Property(x => x.RentFee).HasColumnType("decimal(18,2)");
            e.Property(x => x.ElecFee).HasColumnType("decimal(18,2)");
            e.Property(x => x.WaterFee).HasColumnType("decimal(18,2)");
            e.Property(x => x.ServiceFee).HasColumnType("decimal(18,2)");
        });

        // InvoiceItem
        modelBuilder.Entity<InvoiceItem>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Invoice).WithMany(i => i.Items).HasForeignKey(x => x.InvoiceId).OnDelete(DeleteBehavior.Cascade);
            e.Property(x => x.Amount).HasColumnType("decimal(18,2)");
        });

        // Payment
        modelBuilder.Entity<Payment>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Invoice).WithMany(i => i.Payments).HasForeignKey(x => x.InvoiceId).OnDelete(DeleteBehavior.Cascade);
            e.Property(x => x.Method).HasConversion<int>();
            e.Property(x => x.Status).HasConversion<int>();
            e.Property(x => x.Amount).HasColumnType("decimal(18,2)");
        });

        // MaintenanceRequest
        modelBuilder.Entity<MaintenanceRequest>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Room).WithMany(r => r.MaintenanceRequests).HasForeignKey(x => x.RoomId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.TenantProfile).WithMany(t => t.MaintenanceRequests).HasForeignKey(x => x.TenantProfileId).OnDelete(DeleteBehavior.Restrict);
            e.Property(x => x.Priority).HasConversion<int>();
            e.Property(x => x.Status).HasConversion<int>();
        });

        // Notification
        modelBuilder.Entity<Notification>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Sender).WithMany(u => u.SentNotifications).HasForeignKey(x => x.SenderId).OnDelete(DeleteBehavior.Restrict);
            e.Property(x => x.Target).HasConversion<int>();
        });

        // NotificationRead
        modelBuilder.Entity<NotificationRead>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Notification).WithMany(n => n.Reads).HasForeignKey(x => x.NotificationId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.User).WithMany(u => u.NotificationReads).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // Complaint
        modelBuilder.Entity<Complaint>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Sender).WithMany(u => u.Complaints).HasForeignKey(x => x.SenderId).OnDelete(DeleteBehavior.Cascade);
            e.Property(x => x.Status).HasConversion<int>();
        });

        // UtilityRate
        modelBuilder.Entity<UtilityRate>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Landlord).WithOne(u => u.UtilityRate).HasForeignKey<UtilityRate>(x => x.LandlordId).OnDelete(DeleteBehavior.Cascade);
            e.Property(x => x.ElecPrice).HasColumnType("decimal(10,2)");
            e.Property(x => x.WaterPrice).HasColumnType("decimal(10,2)");
        });
    }
}
