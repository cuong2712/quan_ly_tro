using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SmartRent.API.Middlewares;
using SmartRent.Application.Services;
using SmartRent.Core.Interfaces;
using SmartRent.Infrastructure.Data;
using SmartRent.Infrastructure.Repositories;
using System.Text;

// Fix cho Npgsql: cho phép DateTime với Kind=Unspecified (treat as UTC)
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// ===== Security Services =====
builder.Services.AddSecurityServices();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();



// ===== Database =====
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
           .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

// ===== JWT Authentication =====
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "SmartRent",
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Issuer"] ?? "SmartRent",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };

        // Bắt lỗi 401 Unauthorized và 403 Forbidden để luôn trả về HTTP 200 kèm Envelope ApiResponse
        options.Events = new JwtBearerEvents
        {
            OnChallenge = async context =>
            {
                context.HandleResponse(); // Bỏ qua response 401 mặc định của framework
                context.Response.StatusCode = StatusCodes.Status200OK;
                context.Response.ContentType = "application/json; charset=utf-8";

                var response = SmartRent.Core.DTOs.ApiResponse.Unauthorized("Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.");
                var jsonOptions = new System.Text.Json.JsonSerializerOptions
                {
                    PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                };
                await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(response, jsonOptions));
            },
            OnForbidden = async context =>
            {
                context.Response.StatusCode = StatusCodes.Status200OK;
                context.Response.ContentType = "application/json; charset=utf-8";

                var response = SmartRent.Core.DTOs.ApiResponse.Forbidden("Bạn không có quyền truy cập chức năng này.");
                var jsonOptions = new System.Text.Json.JsonSerializerOptions
                {
                    PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                };
                await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(response, jsonOptions));
            }
        };
    });

builder.Services.AddAuthorization();

// ===== Controllers & Model Validation =====
builder.Services.AddControllers(options =>
{
    options.Filters.Add<SmartRent.API.Filters.ApiResponseFilter>();
})
    .ConfigureApiBehaviorOptions(options =>
    {
        // Khi Model validation thất bại (Dữ liệu gửi lên sai định dạng), luôn trả về HTTP 200 OK kèm mã code 400
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState
                .Where(e => e.Value?.Errors.Count > 0)
                .SelectMany(e => e.Value!.Errors.Select(x => string.IsNullOrWhiteSpace(x.ErrorMessage) ? "Dữ liệu không hợp lệ" : x.ErrorMessage))
                .ToList();

            var message = errors.Count > 0 ? string.Join("; ", errors) : "Dữ liệu gửi lên không hợp lệ.";
            var envelope = SmartRent.Core.DTOs.ApiResponse.Fail(message, StatusCodes.Status400BadRequest);
            return new OkObjectResult(envelope);
        };
    });


// ===== CORS =====
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
            "http://127.0.0.1:5175",
            "http://127.0.0.1:3000")
              .SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// ===== Swagger =====
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "SmartRent API",
        Version = "v1",
        Description = "API SmartRent - 3 roles: SuperAdmin, Landlord, Tenant"
    });

    var bearerScheme = new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Nhap JWT token (khong can 'Bearer ' prefix)"
    };
    c.AddSecurityDefinition("Bearer", bearerScheme);
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});


// ===== Services Registration =====
// Application Services
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<AdminService>();
builder.Services.AddScoped<ZoneService>();
builder.Services.AddScoped<RoomService>();
builder.Services.AddScoped<TenantService>();
builder.Services.AddScoped<ContractService>();
builder.Services.AddScoped<UtilityService>();
builder.Services.AddScoped<ServiceMgmtService>();
builder.Services.AddScoped<InvoiceService>();
builder.Services.AddScoped<PaymentService>();
builder.Services.AddScoped<MaintenanceService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<ComplaintService>();
builder.Services.AddScoped<ProfileService>();
builder.Services.AddScoped<FileService>();
builder.Services.AddScoped<ReportService>();



// Auth Interface
builder.Services.AddScoped<IAuthService>(sp => sp.GetRequiredService<AuthService>());

// Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IZoneRepository, ZoneRepository>();
builder.Services.AddScoped<IRoomRepository, RoomRepository>();
builder.Services.AddScoped<ITenantRepository, TenantRepository>();
builder.Services.AddScoped<IContractRepository, ContractRepository>();
builder.Services.AddScoped<IUtilityRepository, UtilityRepository>();
builder.Services.AddScoped<IServiceRepository, ServiceRepository>();
builder.Services.AddScoped<IInvoiceRepository, InvoiceRepository>();
builder.Services.AddScoped<IPaymentRepository, PaymentRepository>();
builder.Services.AddScoped<IMaintenanceRepository, MaintenanceRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<IComplaintRepository, ComplaintRepository>();

// ===== Build App =====
var app = builder.Build();

// ===== Middleware Pipeline =====
app.UseAllSecurityMiddlewares();
app.UseStaticFiles();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "SmartRent API v1");
    c.RoutePrefix = "swagger";
    c.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.None);
    c.DefaultModelsExpandDepth(-1);
});

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ===== Seed Data =====
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        await DataSeeder.SeedAsync(db);
    }
    catch (Exception ex)
    {
        Console.WriteLine("DataSeeder exception: " + ex.Message);
    }
}

app.Run();
