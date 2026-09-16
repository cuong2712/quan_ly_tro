# ==========================================
# 1. Giai đoạn Build & Publish (.NET 9.0 SDK)
# ==========================================
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Sao chép các file .csproj để tối ưu Docker caching khi restore packages
COPY ["smartrent-api/SmartRent.API/SmartRent.API.csproj", "smartrent-api/SmartRent.API/"]
COPY ["smartrent-api/SmartRent.Application/SmartRent.Application.csproj", "smartrent-api/SmartRent.Application/"]
COPY ["smartrent-api/SmartRent.Core/SmartRent.Core.csproj", "smartrent-api/SmartRent.Core/"]
COPY ["smartrent-api/SmartRent.Infrastructure/SmartRent.Infrastructure.csproj", "smartrent-api/SmartRent.Infrastructure/"]
COPY ["smartrent-api/SmartRent.sln", "smartrent-api/"]

RUN dotnet restore "smartrent-api/SmartRent.API/SmartRent.API.csproj"

# Sao chép toàn bộ source code backend và publish
COPY smartrent-api/ smartrent-api/
WORKDIR "/src/smartrent-api/SmartRent.API"
RUN dotnet publish "SmartRent.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ==========================================
# 2. Giai đoạn Runtime (ASP.NET 9.0 gọn nhẹ)
# ==========================================
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Cài đặt font và thư viện bổ trợ cho QuestPDF xuất file PDF tiếng Việt trên Linux
RUN apt-get update && apt-get install -y --no-install-recommends \
    fontconfig \
    fonts-dejavu \
    libfontconfig1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

# Cấu hình cổng mạng (Render tự động truyền biến PORT khi khởi chạy)
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "SmartRent.API.dll"]

